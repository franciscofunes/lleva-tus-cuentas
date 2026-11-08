import { tesseractTextInVisualRows } from './tesseractLayout';
import { parseReceiptOcrText } from './receiptOcr';

const scoreReceipt = (text) => {
  const fields = parseReceiptOcrText(text);
  return Number(Boolean(fields.merchant)) + Number(fields.amount !== null) * 3
    + Number(Boolean(fields.date)) * 2 + Number(Boolean(fields.documentNumber)) + Number(fields.items.length > 0);
};

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
    let text = tesseractTextInVisualRows(result?.data?.tsv, result?.data?.text);
    // Wrinkled thermal tickets can lose the isolated bottom TOTAL in block mode.
    // A sparse-text pass is attempted only for incomplete receipts, on-device.
    if (receiptMode && scoreReceipt(text) < 6) {
      await worker.setParameters({tessedit_pageseg_mode: '11'});
      const alternate = await worker.recognize(file, {}, {text: true, tsv: true});
      const alternateText = tesseractTextInVisualRows(alternate?.data?.tsv, alternate?.data?.text);
      const combinedText = `${text}\n${alternateText}`;
      const possibilities = [text, alternateText, combinedText];
      text = possibilities.sort((a, b) => scoreReceipt(b) - scoreReceipt(a))[0];
    }
    return {text, lines: []};
  } finally {
    await worker?.terminate();
  }
}
