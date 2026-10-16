import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const asset = (file) => readFileSync(join(process.cwd(), 'public', file));
const parsePng = (file, expected) => {
  const bytes = asset(file);
  expect(bytes.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(expected);
  expect(bytes.readUInt32BE(20)).toBe(expected);
};

test('brand favicon, browser metadata and installed app point to the same dark LTC$ identity', () => {
  const html = asset('index.html').toString('utf8');
  expect(html).toContain('href="%PUBLIC_URL%/favicon.svg"');
  expect(html).toContain('href="%PUBLIC_URL%/favicon.ico"');
  expect(html).toContain('href="%PUBLIC_URL%/apple-touch-icon.png"');
  expect(html).toContain('content="#0b1020"');
  const svg = asset('favicon.svg').toString('utf8');
  expect(svg).toContain('LTC$ — Lleva Tus Cuentas');
  expect(svg).toContain('#0b1020');
  expect(svg).toContain('#22c55e');
  expect(svg).toContain('#a855f7');
  const ico = asset('favicon.ico');
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(3);
  expect(existsSync(join(process.cwd(), 'public', 'card.png'))).toBe(true);
});

test('PWA app icons are actual PNG binaries in 192 and 512px rather than broken references', () => {
  parsePng('apple-touch-icon.png', 180);
  parsePng('icon-192.png', 192);
  parsePng('icon-512.png', 512);
  const manifest = JSON.parse(asset('manifest.json').toString('utf8'));
  expect(manifest.short_name).toBe('LTC$');
  expect(manifest.name).toBe('LTC$ — Lleva Tus Cuentas');
  expect(manifest.background_color).toBe('#0b1020');
  expect(manifest.theme_color).toBe('#0b1020');
  for (const icon of manifest.icons) {
    expect(existsSync(join(process.cwd(), 'public', icon.src))).toBe(true);
  }
});

test('Portfolio and Transactions use the same React Icon shortcut for Bancos, never a multicolor emoji', () => {
  const portfolio = readFileSync(join(process.cwd(), 'src/pages/Portfolio.js'), 'utf8');
  const transactions = readFileSync(join(process.cwd(), 'src/pages/Dashboard.js'), 'utf8');
  expect(portfolio).toContain('<FaUniversity aria-hidden=');
  expect(transactions).toContain('<FaUniversity />');
  expect(portfolio).not.toContain('🏦');
});
