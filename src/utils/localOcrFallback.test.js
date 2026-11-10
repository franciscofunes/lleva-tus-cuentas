import {createWorker} from 'tesseract.js';
import {prepareCompatibleReceiptImage, recognizeWithCompatibleOcr} from './localOcrFallback';

jest.mock('tesseract.js', () => ({createWorker: jest.fn()}));

let worker;
beforeEach(() => {
  jest.clearAllMocks();
  worker = {
    setParameters: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({data:{text:'TOTAL ARS 100,00',tsv:''}}),
    terminate: jest.fn().mockResolvedValue(undefined),
  };
  createWorker.mockResolvedValue(worker);
});

test('thermal receipts use single-block Tesseract segmentation on-device', async () => {
  const file = new File(['image'], 'synthetic.jpg', {type:'image/jpeg'});
  const result = await recognizeWithCompatibleOcr(file, {receiptMode:true});
  expect(worker.setParameters).toHaveBeenCalledWith({tessedit_pageseg_mode:'6'});
  expect(worker.recognize).toHaveBeenCalledWith(file, {}, {text:true,tsv:true});
  expect(result.text).toBe('TOTAL ARS 100,00');
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

test('bank statements preserve multi-column automatic segmentation', async () => {
  await recognizeWithCompatibleOcr(new File(['image'], 'synthetic.jpg', {type:'image/jpeg'}));
  expect(worker.setParameters).not.toHaveBeenCalled();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

test('keeps the first OCR result when the optional sparse-text retry runs out of memory', async () => {
  worker.recognize.mockResolvedValueOnce({data:{text:'CARNESANGUS\nFECHA 07/11/2026\nMILANESA',tsv:''}})
    .mockRejectedValueOnce(new Error('out of memory'));
  const result = await recognizeWithCompatibleOcr(new File(['image'], 'ticket.jpg', {type:'image/jpeg'}), {receiptMode:true});
  expect(result.text).toContain('CARNESANGUS');
  expect(worker.recognize).toHaveBeenCalledTimes(2);
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

test('prefers the raw thermal ticket when visual-row reconstruction loses the TOTAL', async () => {
  const tsv = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
    + '5\t1\t1\t1\t1\t1\t10\t10\t150\t25\t90\tCARNESANGUS';
  worker.recognize.mockResolvedValue({data:{tsv,text:'CARNESANGUS\nFECHA 07/11/2026\nTOTAL $18.034'}});
  const result = await recognizeWithCompatibleOcr(new File(['image'], 'receipt.jpg', {type:'image/jpeg'}), {receiptMode:true});
  expect(result.text).toContain('TOTAL $18.034');
  expect(worker.recognize).toHaveBeenCalledTimes(1);
});

test('resizes oversized gallery photos before sending them to the Android worker', async () => {
  const originalBitmap = global.createImageBitmap;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const close = jest.fn();
  const drawImage = jest.fn();
  global.createImageBitmap = jest.fn().mockResolvedValue({width: 4000, height: 3000, close});
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({drawImage});
  HTMLCanvasElement.prototype.toBlob = jest.fn().mockImplementation((callback) => callback(new Blob(['reduced'], {type:'image/jpeg'})));
  try {
    const file = new File(['original'], 'phone-photo.jpg', {type:'image/jpeg'});
    const result = await prepareCompatibleReceiptImage(file);
    expect(result).not.toBe(file);
    expect(result.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, expect.any(Number), expect.any(Number));
    expect(close).toHaveBeenCalledTimes(1);
  } finally {
    if (originalBitmap === undefined) delete global.createImageBitmap;
    else global.createImageBitmap = originalBitmap;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  }
});

test('image preprocessing failure never blocks the manual OCR path', async () => {
  const originalBitmap = global.createImageBitmap;
  global.createImageBitmap = jest.fn().mockRejectedValue(new Error('not supported'));
  try {
    const file = new File(['original'], 'photo.jpg', {type:'image/jpeg'});
    expect(await prepareCompatibleReceiptImage(file)).toBe(file);
  } finally {
    if (originalBitmap === undefined) delete global.createImageBitmap;
    else global.createImageBitmap = originalBitmap;
  }
});
