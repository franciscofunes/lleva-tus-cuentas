// Optional local authenticated browser QA. Never commit or upload storageState.
const { defineConfig } = require('@playwright/test');
const { existsSync } = require('node:fs');
const path = require('node:path');

const stateFile = path.resolve(process.env.LTC_QA_AUTH_STATE || '.qa-auth/storage-state.json');
const baseURL = process.env.LTC_QA_BASE_URL;
if (!baseURL || !/^https?:\/\//.test(baseURL)) {
  throw new Error('Set LTC_QA_BASE_URL to the authorized LTC test/preview site (not a private Firebase API).');
}
if (!existsSync(stateFile)) {
  throw new Error('Authenticated QA state missing: run node scripts/qa/prepare-auth.cjs with an isolated synthetic test account.');
}

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.authenticated.spec.cjs',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: '.qa-artifacts/playwright',
  use: {
    baseURL,
    browserName: 'chromium',
    storageState: stateFile,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
});
