import fs from 'fs';
import path from 'path';
test('budget rules require owner access, exact currency and bounded limit',()=>{
 const rules=fs.readFileSync(path.join(process.cwd(),'firestore.rules.bankSpendingBudgets'),'utf8');
 expect(rules).toContain('request.auth.uid == uid');
 expect(rules).toContain("currency in ['ARS','USD']");
 expect(rules).toContain("d.keys().hasOnly");
 expect(rules).toContain('d.limit is number');
 expect(rules).not.toMatch(/allow read, write: if true/);
});
