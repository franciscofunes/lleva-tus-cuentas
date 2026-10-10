import { readFileSync } from 'fs';
import { join } from 'path';

// Static browser-permission contract: the Lita iframe is cross-origin and
// needs explicit delegation for clipboard.writeText on Android Chrome.
test('Lita iframe grants clipboard-write but not clipboard-read', () => {
  const jsx = readFileSync(join(process.cwd(), 'src/components/LitaAssitantPanel.js'), 'utf8');
  expect(jsx).toContain("allow='clipboard-write'");
  expect(jsx).not.toContain("allow='clipboard-read'");
});
