import {createWorker} from 'tesseract.js';
import {recognizeWithCompatibleOcr} from './localOcrFallback';

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
