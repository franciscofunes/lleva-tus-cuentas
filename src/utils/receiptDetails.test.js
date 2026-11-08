import { sanitizeReceiptDetails, mergeReceiptDetails } from './receiptDetails';
import { receiptCategorySuggestions } from './receiptCategoryMapping';

test('keeps optional invoice references and bounded purchased items independent of category', () => {
  const metadata = sanitizeReceiptDetails({
    documents: [{type:'invoice', number:'0004-00001234', operationNumber:'77'}],
    items: [{description:'MILA CARNE OFERTA', quantity:2.015, unitPrice:8950, total:18034}],
  });
  expect(metadata.documents[0].number).toBe('0004-00001234');
  expect(metadata.items).toEqual([expect.objectContaining({description:'MILA CARNE OFERTA',quantity:2.015})]);
  expect(sanitizeReceiptDetails({documents:[],items:[]})).toBeNull();
  expect(sanitizeReceiptDetails({documents:[],items:Array.from({length:35},()=>({description:'Producto'}))}).items).toHaveLength(30);
});

test('multiple photographs for one purchase keep unique documents without duplicating products', () => {
  const first = {documents:[{type:'non_fiscal',operationNumber:'1-72'}],items:[{description:'MILA CARNE OFERTA'}]};
  const second = {documents:[{type:'coupon',number:'000482',authorizationCode:'9988'}],items:[]};
  const merged = mergeReceiptDetails(first, second);
  expect(merged.documents).toHaveLength(2);
  expect(merged.items).toHaveLength(1);
  expect(mergeReceiptDetails(merged, second).documents).toHaveLength(2);
});

test('maps only the extra fields configured by a custom category', () => {
  const category = {extraFieldIds:['receiptNumber','counterparty','operationDate']};
  const document = {documents:[{type:'invoice',number:'0004-00001234',issuedAt:'2026-11-07'}]};
  expect(receiptCategorySuggestions(category,document,'CARNESANGUS','2026-11-07')).toEqual({
    receiptNumber:'0004-00001234',counterparty:'CARNESANGUS',operationDate:'2026-11-07',
  });
  expect(receiptCategorySuggestions({extraFieldIds:[]},document,'CARNESANGUS','2026-11-07')).toEqual({});
});
