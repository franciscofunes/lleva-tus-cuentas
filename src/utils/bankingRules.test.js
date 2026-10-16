import { readFileSync } from 'fs';
import { join } from 'path';

const rules = readFileSync(join(process.cwd(), 'firestore.rules.banks'), 'utf8');

test('bank rules are a clean additive fragment without duplicate collection blocks', () => {
  const paths = ['banks', 'bankAccounts', 'bankCards', 'bankCardCharges', 'bankStatementLinks'];
  paths.forEach((path) => {
    const matches = rules.match(new RegExp('match /users/\\{uid\\}/' + path + '/\\{[a-zA-Z]+\\} \\{', 'g')) || [];
    expect(matches).toHaveLength(1);
  });
  expect((rules.match(/function ltcBankOwner\(/g) || [])).toHaveLength(1);
  expect((rules.match(/function ltcValidCardSnapshot\(/g) || [])).toHaveLength(1);
  expect(rules).not.toMatch(/\\n\\)\\)\\)\\)/);
});

test('every bank collection is scoped to Firebase Auth owner, with no broad wildcard access', () => {
  expect(rules).toContain('request.auth.uid == uid');
  expect((rules.match(/allow get, list: if ltcBankOwner\(uid\)/g) || [])).toHaveLength(5);
  expect(rules).not.toMatch(/allow (?:read|write|create|update|delete): if true/);
  expect(rules).not.toContain('request.auth != null ||');
});

test('the same atomic batch may create one bank plus accounts and cards', () => {
  expect(rules).toContain('existsAfter(/databases/$(database)/documents/users/$(uid)/banks/$(bankId))');
  expect((rules.match(/ltcBankExistsAfter\(uid, d.bankId\)/g) || [])).toHaveLength(3);
  expect(rules).toContain("d.keys().hasAll([");
  expect(rules).toContain("'accountNumber', 'holder', 'holderTaxId', 'branch'");
  expect(rules).toContain("'statementSnapshot', 'createdAt', 'updatedAt'");
  expect(rules).toContain("d.cbu.matches('^[0-9]{22}$')");
  expect(rules).toContain("d.holderTaxId.matches('^[0-9-]{8,24}$')");
  expect(rules).toContain("d.lastFour.matches('^[0-9]{4}$')");
  expect(rules).toContain('ltcValidCardSnapshot(d.statementSnapshot)');
});

test('the banks rule fragment has properly balanced braces and single quoted strings', () => {
  let braceDepth = 0;
  let inString = false;
  let escaped = false;
  let linesSeen = 0;
  const source = rules.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  for (const character of source) {
    if (character === '\n') { linesSeen++; continue; }
    if (character === "'" && !escaped) inString = !inString;
    if (!inString) {
      if (character === '{') braceDepth++;
      if (character === '}') { braceDepth--; expect(braceDepth).toBeGreaterThanOrEqual(0); }
    }
    if (character === '\\') escaped = !escaped;
    else escaped = false;
  }
  expect(inString).toBe(false);
  expect(braceDepth).toBe(0);
  expect(linesSeen).toBeGreaterThan(100);
});
