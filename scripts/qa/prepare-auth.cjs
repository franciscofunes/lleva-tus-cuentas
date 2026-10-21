// Interactive, local-only auth bootstrap for Playwright. Never commit or upload output.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

(async () => {
  const base = process.env.LTC_QA_BASE_URL;
  if (!base || !/^https?:\/\//.test(base)) throw new Error('Provide LTC_QA_BASE_URL for a test/preview environment.');
  const parsed = new URL(base);
  if (parsed.hostname === 'llevatuscuentas.vercel.app' && process.env.LTC_QA_ALLOW_PRODUCTION !== 'yes') {
    throw new Error('Production is deliberately blocked. Use an authorized preview/test deployment.');
  }
  const root = process.cwd();
  const storageFile = path.resolve(root, process.env.LTC_QA_AUTH_STATE || '.qa-auth/storage-state.json');
  fs.mkdirSync(path.dirname(storageFile), { recursive:true });
  const context = await chromium.launchPersistentContext(path.resolve(root, '.qa-auth/browser-profile'), {
    headless:false, viewport:{width:1280,height:850},
  });
  const page = context.pages()[0] || await context.newPage();
  try {
    await page.goto(new URL('/ingresar', parsed).toString(), { waitUntil:'domcontentloaded' });
    console.log('Sign in using an AUTHORIZED ISOLATED TEST USER with synthetic financial data.');
    console.log('When /transacciones is visible, return to this terminal and press Enter.');
    const rl = readline.createInterface({ input:process.stdin, output:process.stdout });
    await rl.question('Press Enter after the authenticated page is ready: ');
    rl.close();
    await page.goto(new URL('/transacciones', parsed).toString(), { waitUntil:'domcontentloaded' });
    await page.locator('#transactions-scope').waitFor({ state:'visible', timeout:25000 });
    await context.storageState({ path:storageFile, indexedDB:true });
    console.log('Local authentication session saved to a gitignored path. Treat it as a password; do NOT share it.');
  } finally {
    await context.close();
  }
})().catch(error => { console.error(error.message); process.exitCode=1; });
