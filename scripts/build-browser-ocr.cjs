// runonweb@0.1.0 exports raw TypeScript. CRA 5 does not transpile TS under
// node_modules, so prebundle ONLY its OCR entry into a lazy-loadable ESM chunk.
// Do not ship generated artifacts; npm's prebuild/pretest hooks reproduce them.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

async function main() {
  const outdir = path.join(__dirname, '../src/generated/browser-ai');
  const publicRuntime = path.join(__dirname, '../public/ocr-runtime');
  const compatibleRuntime = path.join(__dirname, '../public/ocr-compatible');
  const ortDist = path.dirname(require.resolve('onnxruntime-web'));
  // The browser must not depend on a third-party WASM CDN to start OCR.
  // Vercel/Netlify serve these assets from the same origin as the app.
  fs.mkdirSync(publicRuntime, { recursive: true });
  for (const name of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.jsep.wasm']) {
    const source = path.join(ortDist, name);
    if (!fs.existsSync(source)) throw new Error(`ONNX runtime asset missing: ${name}`);
    fs.copyFileSync(source, path.join(publicRuntime, name));
  }
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
      name: 'use-same-origin-onnx-wasm',
      setup(build) {
        // runonweb@0.1.0 hardcodes a CDN WASM version that can mismatch its
        // installed JS AND may be blocked by a mobile browser/network.
        // Keep the binaries on our origin and from the exact installed package.
        build.onLoad({filter: /[/\\]runonweb[/\\]src[/\\]ocr[/\\]index\.ts$/}, (args) => {
          const source = fs.readFileSync(args.path, 'utf8');
          const original = "const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/'";
          if (!source.includes(original)) throw new Error('runonweb OCR WASM URL changed; review version compatibility');
          return {
            contents: source.replace(original, "const ORT_WASM = '/ocr-runtime/'"),
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
  // ORT also uses this sibling for its worker resolver in the emitted bundle.
  fs.copyFileSync(path.join(ortDist, 'ort-wasm-simd-threaded.jsep.wasm'), path.join(outdir, 'ort-wasm-simd-threaded.jsep.wasm'));

  // Android/low-memory fallback: ship the independently maintained Tesseract
  // worker, wasm loader and Spanish model from the installed npm packages.
  // All worker/model requests stay on the application's own origin.
  const workerDist = path.join(path.dirname(require.resolve('tesseract.js/package.json')), 'dist');
  const coreDist = path.dirname(require.resolve('tesseract.js-core/package.json'));
  const spanishData = path.join(path.dirname(require.resolve('@tesseract.js-data/spa/package.json')), '4.0.0_best_int', 'spa.traineddata.gz');
  fs.mkdirSync(path.join(compatibleRuntime, 'core'), {recursive: true});
  fs.mkdirSync(path.join(compatibleRuntime, 'lang'), {recursive: true});
  fs.copyFileSync(path.join(workerDist, 'worker.min.js'), path.join(compatibleRuntime, 'worker.min.js'));
  fs.copyFileSync(spanishData, path.join(compatibleRuntime, 'lang', 'spa.traineddata.gz'));
  for (const flavor of ['', '-simd', '-lstm', '-simd-lstm']) {
    for (const extension of ['.wasm.js', '.wasm']) {
      const file = `tesseract-core${flavor}${extension}`;
      fs.copyFileSync(path.join(coreDist, file), path.join(compatibleRuntime, 'core', file));
    }
  }
}

main().catch((error) => {
  console.error('Failed to prepare local OCR runtime:', error.message);
  process.exitCode = 1;
});
