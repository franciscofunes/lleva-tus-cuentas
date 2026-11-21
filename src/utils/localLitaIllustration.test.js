import { generateLitaLocalIllustration } from './localLitaIllustration';

const mockGenerate = jest.fn(async () => ({
  // Simulate a cross-realm Blob returned by WebGPU / postMessage.
  image: { type: 'image/png', size: 23, slice: jest.fn() },
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

  it('uses a fixed public decorative prompt and retains strict PNG validation', () => {
    const { readFileSync } = require('fs');
    const source = readFileSync(require('path').join(__dirname, 'localLitaIllustration.js'), 'utf8');
    const match = source.match(/const DECORATIVE_PROMPT = '([^']+)'/);
    expect(match).not.toBeNull();
    expect(match[1]).toContain('abstract finance-inspired artwork');
    expect(match[1]).not.toMatch(/cuenta|CBU|ARS|USD|saldo|amount|account|transaction/);
    expect(source).toContain("result.image.type !== 'image/png'");
    expect(source).toContain("size > 8_000_000");
    expect(source).toContain("size: 'binary'");
  });
});
