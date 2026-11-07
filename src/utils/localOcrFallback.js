import { tesseractTextInVisualRows } from './tesseractLayout';

/** Tesseract runs in a Web Worker. Only public code/model files are downloaded. */
export async function recognizeWithCompatibleOcr(file, {onProgress, onReading, receiptMode = false} = {}) {
  // Not part of the initial LTC bundle; loaded on explicit owner interaction.
  const {createWorker} = await import('tesseract.js');
  const root = `${window.location.origin}/ocr-compatible`;
  let worker;
  try {
    worker = await createWorker('spa', 1, {
      workerPath: `${root}/worker.min.js`,
      corePath: `${root}/core`,
      langPath: `${root}/lang`,
      workerBlobURL: false,
      gzip: true,
      cacheMethod: 'write',
      logger: (event) => {
        if (event?.status === 'recognizing text') onReading?.();
        if (typeof event?.progress === 'number') onProgress?.(Math.round(event.progress * 100));
      },
    });
    // Thermal receipts are a single text block. The default automatic page
    // layout can miss their isolated bottom TOTAL; keep banking screenshots
    // on the default mode because they often contain multiple columns.
    if (receiptMode) await worker.setParameters({tessedit_pageseg_mode: '6'});
    onReading?.();
    const result = await worker.recognize(file, {}, {text: true, tsv: true});
    const text = tesseractTextInVisualRows(result?.data?.tsv, result?.data?.text);
    return {text, lines: []};
  } finally {
    await worker?.terminate();
  }
}
