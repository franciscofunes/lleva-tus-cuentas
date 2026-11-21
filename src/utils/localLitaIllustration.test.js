import { generateLitaLocalIllustration } from './localLitaIllustration';

const mockGenerate = jest.fn(async () => ({
  image: new Blob(['valid decorative result'], { type: 'image/png' }),
}));
const mockDispose = jest.fn();
const onProgress = jest.fn();
let mockLastOptions;
jest.mock('../generated/browser-ai/image', () => ({
  isImageGenerationSupported: jest.fn(async () => true),
  ImageGenerator: jest.fn().mockImplementation((options) => {
    mockLastOptions = options;
    return { generate: mockGenerate, dispose: mockDispose };
  }),
}), { virtual: true });

describe('local decorative report illustration', () => {
  const oldGpu = Object.getOwnPropertyDescriptor(navigator, 'gpu');
  const oldMemory = Object.getOwnPropertyDescriptor(navigator, 'deviceMemory');
  beforeEach(() => {
    mockGenerate.mockClear();
    mockDispose.mockClear();
    onProgress.mockClear();
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: {} });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 16 });
  });
  afterAll(() => {
    if (oldGpu) Object.defineProperty(navigator, 'gpu', oldGpu);
    else delete navigator.gpu;
    if (oldMemory) Object.defineProperty(navigator, 'deviceMemory', oldMemory);
    else delete navigator.deviceMemory;
  });

  it('never loads a 3.4 GB model without WebGPU', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    await expect(generateLitaLocalIllustration(onProgress)).rejects.toThrow('WebGPU');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('rejects low-memory devices before loading the model', async () => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    await expect(generateLitaLocalIllustration(onProgress)).rejects.toThrow('poca memoria');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('generates decorative PNG without accounts, amounts or a user-provided prompt', async () => {
    const image = await generateLitaLocalIllustration(onProgress);
    expect(image.type).toBe('image/png');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0]).toContain('abstract finance-inspired artwork');
    expect(mockGenerate.mock.calls[0][0]).not.toMatch(/cuenta|CBU|ARS|USD|saldo|amount|account|transaction/);
    expect(mockLastOptions).toEqual(expect.objectContaining({ size: 'binary', width: 512, height: 512 }));
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});
