import { shareExportFile } from './shareExportFile';

const blob = new Blob(['LTC$ export'], { type: 'application/pdf' });
const file = { blob, filename: 'movimientos.pdf', title: 'LTC$ · Movimientos' };

test('shares the real document through the native file sheet after a user click', async () => {
  const api = { canShare: jest.fn().mockReturnValue(true), share: jest.fn().mockResolvedValue(undefined) };
  const result = await shareExportFile(file, { navigator: api, File });
  expect(result.status).toBe('passed-to-app');
  expect(api.canShare).toHaveBeenCalledWith({ files: [expect.objectContaining({
    name: 'movimientos.pdf', type: 'application/pdf',
  })] });
  expect(api.share).toHaveBeenCalledWith({
    title: 'LTC$ · Movimientos',
    files: [expect.objectContaining({ name: 'movimientos.pdf', type: 'application/pdf' })],
  });
});

test('unsupported devices never open an empty or text-only share sheet', async () => {
  const api = { canShare: jest.fn().mockReturnValue(false), share: jest.fn() };
  expect(await shareExportFile(file, { navigator: api, File })).toEqual({ status: 'unsupported' });
  expect(api.share).not.toHaveBeenCalled();
  expect(await shareExportFile(file, { navigator: { share: jest.fn() }, File })).toEqual({ status: 'unsupported' });
});

test('cancellation is different from failure and neither is silently swallowed', async () => {
  const api = { canShare: () => true, share: jest.fn().mockRejectedValue({ name: 'AbortError' }) };
  expect(await shareExportFile(file, { navigator: api, File })).toEqual({ status: 'cancelled' });
  api.share.mockRejectedValue({ name: 'NotAllowedError' });
  expect(await shareExportFile(file, { navigator: api, File })).toEqual({ status: 'failed', reason: 'NotAllowedError' });
});
