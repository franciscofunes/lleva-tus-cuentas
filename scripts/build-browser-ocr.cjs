// runonweb@0.1.0 exports raw TypeScript. CRA 5 does not transpile TS under
// node_modules, so prebundle ONLY its OCR entry into a lazy-loadable ESM chunk.
// Do not ship generated artifacts; npm's prebuild/pretest hooks reproduce them.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

async function main() {
  const outdir = path.join(__dirname, '../src/generated/browser-ai');
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
  });
  // ONNX Runtime references its Web Worker through `new URL(..., import.meta.url)`.
  // Keep the worker sibling alongside the generated chunks for CRA's asset loader.
  const ortDist = path.dirname(require.resolve('onnxruntime-web'));
  const workerSource = fs.readFileSync(path.join(ortDist, 'ort.bundle.min.mjs'), 'utf8')
    .replace(/\/\/# sourceMappingURL=ort\.bundle\.min\.mjs\.map\s*$/, '');
  fs.writeFileSync(path.join(outdir, 'ort.bundle.min.mjs'), '/* eslint-disable */\n' + workerSource);
  fs.copyFileSync(path.join(ortDist, 'ort-wasm-simd-threaded.jsep.wasm'), path.join(outdir, 'ort-wasm-simd-threaded.jsep.wasm'));
}

main().catch((error) => {
  console.error('Failed to prepare local OCR runtime:', error.message);
  process.exitCode = 1;
});
