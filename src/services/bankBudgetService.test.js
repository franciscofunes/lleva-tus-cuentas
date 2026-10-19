import { validateBankBudget } from './bankBudgetService';
jest.mock('../shared/config/firebase/firebase.config',()=>({
 auth:{currentUser:{uid:'alice'}},firestore:{collection:jest.fn()},
}));
test('validates owner-safe fixed currency thresholds without allowing arbitrary fields',()=>{
 expect(validateBankBudget('ARS',{limit:'120000.00',warnPercent:80,enabled:true})).toEqual({
 currency:'ARS',limit:120000,warnPercent:80,enabled:true});
 expect(()=>validateBankBudget('EUR',{limit:1000})).toThrow();
 expect(()=>validateBankBudget('USD',{limit:0})).toThrow();
 expect(()=>validateBankBudget('ARS',{limit:100, warnPercent:99})).toThrow();
});
