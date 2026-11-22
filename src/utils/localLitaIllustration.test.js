import { generateLitaLocalIllustration, checkLitaLocalIllustrationCapability, describeLitaLocalIllustrationError } from './localLitaIllustration';

const mockGenerate = jest.fn(async () => ({
  // Simulate a cross-realm Blob returned by WebGPU / postMessage.
  image: { type: 'image/png', size: 23, slice: jest.fn() },
}));
const mockDispose = jest.fn();
const mockLoad = jest.fn(async () => {});
const onProgress = jest.fn();
let mockLastOptions;
jest.mock('../generated/browser-ai/image', () => ({
  isImageGenerationSupported: jest.fn(async () => true),
  ImageGenerator: jest.fn().mockImplementation((options) => {
    mockLastOptions = options;
    return { load: mockLoad, generate: mockGenerate, dispose: mockDispose };
  }),
}), { virtual: true });

describe('local decorative report illustration', () => {
  const oldGpu = Object.getOwnPropertyDescriptor(navigator, 'gpu');
  const oldMemory = Object.getOwnPropertyDescriptor(navigator, 'deviceMemory');
  beforeEach(() => {
    mockGenerate.mockClear();
    mockDispose.mockClear();
    mockLoad.mockClear();
    onProgress.mockClear();
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: { requestAdapter: jest.fn(async () => ({ limits: {} })) } });
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
    await expect(generateLitaLocalIllustration(onProgress)).rejects.toThrow('menos de 8 GB');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('blocks browsers without WebGPU before loading 3.4 GB of weights', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    const capability = await checkLitaLocalIllustrationCapability();
    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain('WebGPU');
  });

  it('describes the 8 GB compatibility guard without inventing device specs', async () => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 4 });
    const capability = await checkLitaLocalIllustrationCapability();
    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain('menos de 8 GB');
    await expect(generateLitaLocalIllustration()).rejects.toThrow('menos de 8 GB');
  });

  it('checks for a usable adapter rather than merely the navigator.gpu property', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: {
      requestAdapter: jest.fn(async () => null),
    } });
    const capability = await checkLitaLocalIllustrationCapability();
    expect(capability.supported).toBe(false);
    expect(capability.reason).toContain('GPU compatible');
  });

  it('detects valid WebGPU hardware without starting any model download', async () => {
    const capability = await checkLitaLocalIllustrationCapability();
    expect(capability).toEqual({ supported: true, reason: '' });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('classifies model cache, download and GPU failures into actionable messages', () => {
    expect(describeLitaLocalIllustrationError(new Error('QuotaExceededError: IndexedDB')))
      .toContain('espacio');
    expect(describeLitaLocalIllustrationError(new Error('Failed to fetch model weights')))
      .toContain('descarga');
    expect(describeLitaLocalIllustrationError(new Error('GPU device lost')))
      .toContain('GPU');
  });

  it('explains the model failure phase when WebGPU preflight passed', () => {
    const { describeLitaLocalIllustrationError } = require('./localLitaIllustration');
    expect(describeLitaLocalIllustrationError({ message: 'Unknown error', litaStage: 'runtime' }))
      .toMatch(/preparación del motor local/);
    expect(describeLitaLocalIllustrationError({ message: 'Unknown error', litaStage: 'weights' }))
      .toMatch(/carga del modelo Bonsai/);
    expect(describeLitaLocalIllustrationError({ message: 'Unknown error', litaStage: 'generating' }))
      .toMatch(/El modelo se cargó/);
  });

  it('preserves the stage without exposing SDK internals to the iframe', () => {
    const fs = require('fs');
    const panel = fs.readFileSync(require('path').join(__dirname, '../components/LitaAssitantPanel.js'), 'utf8');
    expect(panel).toContain('payload: { requestId, progress, stage }');
    expect(panel).toContain('describeLitaLocalIllustrationError(error)');
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
    expect(source).toContain('await generator.load()');
  });
});
