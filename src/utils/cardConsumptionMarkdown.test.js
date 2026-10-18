import {parseCardConsumptionMarkdown,duplicateChargeFingerprint,suggestCardMatch} from './cardConsumptionMarkdown';

test('ChatGPT screenshot markdown supports aggregated home-banking totals and itemized purchases',()=>{
 const markdown=`# Capturas
- type: snapshot
  banco: Ciudad
  tarjeta: Visa
  fechaConsulta: 2026-10-18
  consumosARS: $1.234.567,89
  consumosUSD: US$ 34,50
  cierre: 2026-10-25
- type: charge
  banco: Santander
  tarjeta: Mastercard
  comercio: Farmacia
  fechaCompra: 2026-10-16
  importe: 15000,50
  moneda: ARS
  cuotas: 3
  referencia: 12945`;
 const result=parseCardConsumptionMarkdown(markdown);
 expect(result.errors).toEqual([]);
 expect(result.records[0].snapshot).toMatchObject({currentConsumptionARS:1234567.89,currentConsumptionUSD:34.5,asOf:'2026-10-18'});
 expect(result.records[1].charge).toMatchObject({merchant:'Farmacia',amount:15000.5,installments:3,reference:'12945'});
});
test('rejects ambiguity instead of silently inflating card spend',()=>{
 const r=parseCardConsumptionMarkdown(`- type: snapshot
fechaConsulta: 2026-10-18
consumosARS: 1.500`);
 expect(r.valid).toBe(false);
 expect(r.errors.join(' ')).toMatch(/Separadores de miles ambiguos/);
});
test('prevents fabricated missing totals and line/field ambiguity',()=>{
 expect(parseCardConsumptionMarkdown(`- type: snapshot
fechaConsulta: 2026-10-18`).valid).toBe(false);
 expect(parseCardConsumptionMarkdown(`- type: charge
comercio: Farmacia
fechaCompra: 2026-10-18
importe: 20
moneda: ARS
cuotas: 1
cuotas: 12`).valid).toBe(false);
});
test('card suggestions only apply when exact and unique: never merge banks by loose name',()=>{
 const banks=[{code:'ciudad',name:'Banco Ciudad'},{code:'santander',name:'Santander'}];
 const cards=[{id:'visa1',bankId:'ciudad',nickname:'Visa Gold'},{id:'visa2',bankId:'ciudad',nickname:'Visa Classic'}];
 expect(suggestCardMatch({bankHint:'Banco Ciudad',cardHint:'Visa Gold'},banks,cards)).toBe('visa1');
 expect(suggestCardMatch({bankHint:'Ciudad',cardHint:'Visa Gold'},banks,cards)).toBe('');
});
test('fingerprints include bank/card/date/amount/installment and optional operation reference',()=>{
 const row={bankId:'city',cardId:'visa',merchant:' CAFÉ ',purchaseDate:'2026-10-12',currency:'ARS',amount:1200,installments:1};
 expect(duplicateChargeFingerprint(row)).toBe(duplicateChargeFingerprint({...row,merchant:'Café',amount:1200.00}));
 expect(duplicateChargeFingerprint(row)).not.toBe(duplicateChargeFingerprint({...row,cardId:'master'}));
 expect(duplicateChargeFingerprint(row)).not.toBe(duplicateChargeFingerprint({...row,reference:'second'}));
});
