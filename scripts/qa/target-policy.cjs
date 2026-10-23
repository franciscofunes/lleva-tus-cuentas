// A protected, isolated QA account is mandatory; never default to LTC production.
const PRODUCTION_HOSTS = new Set([
  'lleva-tus-cuentas.netlify.app',
  'llevatuscuentas.vercel.app',
  'lleva-tus-cuentas.vercel.app',
]);
const LOCAL_HOSTS = new Set(['localhost','127.0.0.1','[::1]']);
function validateQaTarget(input, allowProduction = false) {
  if (!input || typeof input !== 'string') {
    throw new Error('Set LTC_QA_BASE_URL to an authorized staging/preview deployment.');
  }
  let url;
  try { url = new URL(input); } catch {
    throw new Error('LTC_QA_BASE_URL must be an absolute HTTPS URL (or localhost).');
  }
  if (!['https:', 'http:'].includes(url.protocol) ||
      (url.protocol !== 'https:' && !LOCAL_HOSTS.has(url.hostname))) {
    throw new Error('Authenticated QA requires HTTPS (except localhost).');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Authenticated QA URL must not contain credentials, query or fragment.');
  }
  if (PRODUCTION_HOSTS.has(url.hostname.toLowerCase()) && !allowProduction) {
    throw new Error('Production LTC is blocked. Use a preview and a synthetic, isolated QA account.');
  }
  return url;
}
module.exports = {validateQaTarget,PRODUCTION_HOSTS};
