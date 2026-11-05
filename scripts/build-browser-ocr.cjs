// runonweb@0.1.0 exports raw TypeScript. CRA 5 does not transpile TS under
// node_modules, so prebundle ONLY its OCR entry into a lazy-loadable ESM chunk.
// Do not ship generated artifacts; npm's prebuild/pretest hooks reproduce them.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

async function main() {
  const outdir = path.join(__dirname, '../src/generated/browser-ai');
  const ortDist = path.dirname(require.resolve('onnxruntime-web'));
  const ortVersion = JSON.parse(fs.readFileSync(path.join(ortDist, '../package.json'), 'utf8')).version;
  await esbuild.build({
    entryPoints: [require.resolve('runonweb/ocr')],
    outdir,
    entryNames: 'ocr',
    chunkNames: 'chunk-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    logLevel: 'warning',
    legalComments: 'none',
    banner: {js: '/* eslint-disable */'},
    minify: true,
    plugins: [{
      name: 'use-matching-onnx-wasm-version',
      setup(build) {
        // runonweb@0.1.0 hardcodes the 1.30.0 WASM CDN, although its
        // dependency allows newer onnxruntime-web JS. ORT JS and WASM MUST
        // be the same version, otherwise model initialization fails in browser.
        build.onLoad({filter: /[/\\]runonweb[/\\]src[/\\]ocr[/\\]index\.ts$/}, (args) => {
          const source = fs.readFileSync(args.path, 'utf8');
          const original = "const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/'";
          if (!source.includes(original)) throw new Error('runonweb OCR WASM URL changed; review version compatibility');
          return {
            contents: source.replace(original, `const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/'`),
            loader: 'ts',
            resolveDir: path.dirname(args.path),
          };
        });
      },
    }],
  });
  // ONNX Runtime references its Web Worker through `new URL(..., import.meta.url)`.
  // Keep the worker sibling alongside the generated chunks for CRA's asset loader.
  const workerSource = fs.readFileSync(path.join(ortDist, 'ort.bundle.min.mjs'), 'utf8')
    .replace(/\/\/# sourceMappingURL=ort\.bundle\.min\.mjs\.map\s*$/, '');
  fs.writeFileSync(path.join(outdir, 'ort.bundle.min.mjs'), '/* eslint-disable */\n' + workerSource);
  fs.copyFileSync(path.join(ortDist, 'ort-wasm-simd-threaded.jsep.wasm'), path.join(outdir, 'ort-wasm-simd-threaded.jsep.wasm'));
}

main().catch((error) => {
  console.error('Failed to prepare local OCR runtime:', error.message);
  process.exitCode = 1;
});
