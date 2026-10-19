import {importReviewedCardConsumptionMarkdown} from './bankingService';
import {auth,firestore} from '../shared/config/firebase/firebase.config';

jest.mock('../shared/config/firebase/firebase.config',()=>({
 auth:{currentUser:{uid:'alice'}},
 firestore:{collection:jest.fn(),runTransaction:jest.fn()},
}));
const originalCrypto=global.crypto;
const originalTextEncoder=global.TextEncoder;
let storedCharges,cardDoc,transaction;
beforeEach(()=>{
 jest.clearAllMocks();
 auth.currentUser={uid:'alice'};
 Object.defineProperty(global,'crypto',{configurable:true,value:{subtle:{
   digest:jest.fn(async()=>new Uint8Array(Array.from({length:32},(_,i)=>i+1)).buffer),
 }}});
 global.TextEncoder=require('util').TextEncoder;
 storedCharges=new Set();
 const cardRef={kind:'card',id:'visa'};
 const bankCharges={doc:jest.fn(id=>({kind:'charge',id}))};
 const bankCards={doc:jest.fn(()=>cardRef)};
 const user={collection:jest.fn(name=>name==='bankCards'?bankCards:name==='bankCardCharges'?bankCharges:{})};
 firestore.collection.mockReturnValue({doc:jest.fn(()=>user)});
 cardDoc={bankId:'ciudad',nickname:'Visa Gold',brand:'Visa',lastFour:'1234',closingDay:25,dueDay:10,
   statementSnapshot:{asOf:'2026-10-10',currentConsumptionARS:500}};
 transaction={
  get:jest.fn(async ref=>ref.kind==='card'?{exists:true,data:()=>cardDoc}:{exists:storedCharges.has(ref.id)}),
  update:jest.fn((ref,data)=>{cardDoc={...cardDoc,...data};}),
  set:jest.fn((ref,data)=>storedCharges.add(ref.id)),
 };
 firestore.runTransaction.mockImplementation(callback=>callback(transaction));
});
afterAll(()=>{
 Object.defineProperty(global,'crypto',{configurable:true,value:originalCrypto});
 global.TextEncoder=originalTextEncoder;
});
const snapshot={type:'snapshot',bankId:'ciudad',cardId:'visa',snapshot:{
 asOf:'2026-10-18',currentConsumptionARS:700,closingDate:'2026-10-25',
}};
const charge={type:'charge',bankId:'ciudad',cardId:'visa',charge:{
 merchant:'Café',purchaseDate:'2026-10-18',currency:'ARS',amount:30,installments:1,note:'',
}};

test('screenshot import uses one owner-only Firestore transaction, not an expense or payment',async()=>{
 const out=await importReviewedCardConsumptionMarkdown('alice',[snapshot,charge]);
 expect(out).toEqual({snapshots:1,charges:1,duplicates:0});
 expect(transaction.update).toHaveBeenCalledWith(expect.objectContaining({kind:'card'}),
   expect.objectContaining({statementSnapshot:expect.objectContaining({asOf:'2026-10-18',currentConsumptionARS:700})}));
 expect(transaction.set).toHaveBeenCalledWith(expect.objectContaining({kind:'charge'}),expect.objectContaining({
  source:'manual',countedInCashFlow:false,amount:30,
 }));
 expect(firestore.runTransaction).toHaveBeenCalledTimes(1);
 const user=firestore.collection.mock.results[0].value.doc.mock.results[0].value;
 expect(user.collection).not.toHaveBeenCalledWith('expenses');
});

test('replaying the same imported charge skips existing deterministic doc',async()=>{
 await importReviewedCardConsumptionMarkdown('alice',[charge]);
 expect(transaction.set).toHaveBeenCalledTimes(1);
 const second=await importReviewedCardConsumptionMarkdown('alice',[charge]);
 expect(second).toEqual({snapshots:0,charges:0,duplicates:1});
 expect(transaction.set).toHaveBeenCalledTimes(1);
});

test('rejects unauthorized cross-user writes and incorrect bank association',async()=>{
 await expect(importReviewedCardConsumptionMarkdown('bob',[snapshot])).rejects.toThrow(/Iniciá sesión/);
 expect(firestore.runTransaction).not.toHaveBeenCalled();
 await expect(importReviewedCardConsumptionMarkdown('alice',[{...snapshot,bankId:'otro'}]))
  .rejects.toThrow(/tarjeta no pertenece/);
 expect(transaction.update).not.toHaveBeenCalled();
 expect(transaction.set).not.toHaveBeenCalled();
});

test('older bank screenshot never overwrites a newer consumption baseline',async()=>{
 await expect(importReviewedCardConsumptionMarkdown('alice',[{...snapshot,snapshot:{asOf:'2026-10-01',currentConsumptionARS:9}}]))
   .rejects.toThrow(/anterior/);
 expect(transaction.update).not.toHaveBeenCalled();
});
