import { tesseractTextInVisualRows } from './tesseractLayout';
import { parseReceiptOcrText } from './receiptOcr';

// A gallery photo can be <8 MB on disk but expand to hundreds of MB when
// Tesseract decodes it on an Android phone. Reduce pixels, not text quality,
// before passing the image to its (separate) worker.
const MAX_RECEIPT_PIXELS = 3_000_000;
const MAX_RECEIPT_SIDE = 2200;

export async function prepareCompatibleReceiptImage(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_RECEIPT_SIDE / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(MAX_RECEIPT_PIXELS / (bitmap.width * bitmap.height)));
    if (!(scale < 1)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    return blob || file;
  } catch (_) {
    // A browser without canvas decoding must still support manual OCR retry.
    return file;
  } finally {
    bitmap?.close?.();
  }
}

const scoreReceipt = (text) => {
  const fields = parseReceiptOcrText(text);
  return Number(Boolean(fields.merchant)) + Number(fields.amount !== null) * 3
    + Number(Boolean(fields.date)) * 2 + Number(Boolean(fields.documentNumber)) + Number(fields.items.length > 0);
};

const bestReceiptText = (data) => {
  const visualRows = tesseractTextInVisualRows(data?.tsv, data?.text);
  const plainText = String(data?.text || '');
  // TSV's row reconstruction is useful for bank columns, but poor-confidence
  // thermal-ticket words can be omitted from TSV while surviving in plain text.
  return scoreReceipt(plainText) > scoreReceipt(visualRows) ? plainText : visualRows;
};

/** Tesseract runs in a Web Worker. Only public code/model files are downloaded. */
export async function recognizeWithCompatibleOcr(file, {onProgress, onReading, receiptMode = false} = {}) {
  // Not part of the initial LTC bundle; loaded on explicit owner interaction.
  const {createWorker} = await import('tesseract.js');
  const root = `${window.location.origin}/ocr-compatible`;
  let worker;
  try {
    const image = receiptMode ? await prepareCompatibleReceiptImage(file) : file;
    worker = await createWorker('spa', 1, {
      workerPath: `${root}/worker.min.js`,
      corePath: `${root}/core`,
      langPath: `${root}/lang`,
      workerBlobURL: false,
      gzip: true,
      cacheMethod: 'write',
      // Prevent the library's default worker message handler from throwing a
      // second uncaught error when an OCR job itself rejects.
      errorHandler: () => {},
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
    const result = await worker.recognize(image, {}, {text: true, tsv: true});
    let text = receiptMode ? bestReceiptText(result?.data)
      : tesseractTextInVisualRows(result?.data?.tsv, result?.data?.text);
    // Wrinkled thermal tickets can lose the isolated bottom TOTAL in block mode.
    // A sparse-text pass is attempted only for incomplete receipts, on-device.
    if (receiptMode && scoreReceipt(text) < 6) {
      try {
        await worker.setParameters({tessedit_pageseg_mode: '11'});
        const alternate = await worker.recognize(image, {}, {text: true, tsv: true});
        const alternateText = bestReceiptText(alternate?.data);
        const combinedText = `${text}\n${alternateText}`;
        const possibilities = [text, alternateText, combinedText];
        text = possibilities.sort((a, b) => scoreReceipt(b) - scoreReceipt(a))[0];
      } catch (_) {
        // A memory error in the optional second pass must not discard the
        // first pass or force the owner to upload the same photo again.
      }
    }
    return {text, lines: []};
  } finally {
    await worker?.terminate();
  }
}
