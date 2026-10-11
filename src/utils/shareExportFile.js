/**
 * Browser-native file sharing. A direct click must reach navigator.share without
 * awaits (otherwise Android may discard transient user activation).
 * Never upload finance data or fall back to publicly accessible URLs.
 */
export const shareExportFile = async ({ blob, filename, title = 'LTC$ · Movimientos' }, options = {}) => {
  const api = options.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  const FileType = options.File || (typeof File !== 'undefined' ? File : null);
  if (!api || typeof api.share !== 'function' || typeof api.canShare !== 'function' ||
      !FileType || !blob || !filename) {
    return { status: 'unsupported' };
  }

  const file = new FileType([blob], filename, {
    type: blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
  try {
    if (!api.canShare({ files: [file] })) return { status: 'unsupported' };
  } catch {
    return { status: 'unsupported' };
  }

  try {
    // Do not await or fetch anything before this call.
    await api.share({ title, files: [file] });
    return { status: 'passed-to-app' };
  } catch (error) {
    if (error?.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'failed', reason: error?.name || 'Error' };
  }
};
