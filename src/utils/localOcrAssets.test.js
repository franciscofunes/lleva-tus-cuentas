import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

test('local OCR ships matching WebAssembly binaries from the installed ONNX runtime', () => {
  for (const file of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.jsep.wasm']) {
    const built = path.join(root, 'public/ocr-runtime', file);
    const installed = path.join(root, 'node_modules/onnxruntime-web/dist', file);
    expect(fs.existsSync(built)).toBe(true);
    expect(fs.statSync(built).size).toBe(fs.statSync(installed).size);
    expect(fs.readFileSync(built).subarray(0, 4).toString('hex')).toBe('0061736d');
  }

  const entry = fs.readFileSync(path.join(root, 'src/generated/browser-ai/ocr.js'), 'utf8');
  expect(entry).toContain('/ocr-runtime/');
  expect(entry).not.toContain('cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0');
});
