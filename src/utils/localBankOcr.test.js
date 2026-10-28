import { extractBankOcrHints, extractBankChargeHint, cardPhotoToMarkdown } from './localBankOcr';
import { parseCardConsumptionMarkdown } from './cardConsumptionMarkdown';

test('extracts only labeled consumption amounts in native currencies', () => {
  const hints=extractBankOcrHints(`Banco Galicia\nConsumos ARS $ 475.000,50\nConsumos USD 20.75\nPago recibido ARS 300.000,00\nFecha de consulta: 18/10/2026`);
  expect(hints).toEqual({asOf:'2026-10-18',currentConsumptionARS:'475.000,50',currentConsumptionUSD:'20.75'});
  const text=cardPhotoToMarkdown({type:'snapshot',bank:'Banco Galicia',card:'Visa',asOf:hints.asOf,ars:hints.currentConsumptionARS,usd:hints.currentConsumptionUSD});
  expect(parseCardConsumptionMarkdown(text)).toMatchObject({valid:true,records:[{snapshot:{currentConsumptionARS:475000.5,currentConsumptionUSD:20.75}}]});
});

test('does not treat payments or ambiguous rows as card consumption', () => {
  expect(extractBankOcrHints('Saldo USD 100.00\nPago de tarjeta ARS 45000\nTotal disponible 700000'))
    .toEqual({asOf:'',currentConsumptionARS:'',currentConsumptionUSD:''});
  expect(extractBankOcrHints('Consumos ARS 500\nConsumos ARS 600').currentConsumptionARS).toBe('');
});

test('a photo charge must satisfy the same reviewed Markdown validation',()=>{
  const text=cardPhotoToMarkdown({type:'charge',bank:'Banco Ciudad',card:'Visa',merchant:'Farmacia',purchaseDate:'2026-10-21',amount:'12.500,50',currency:'ARS',installments:'1'});
  expect(parseCardConsumptionMarkdown(text)).toMatchObject({valid:true,records:[{charge:{amount:12500.5,merchant:'Farmacia'}}]});
  expect(parseCardConsumptionMarkdown(text.replace('2026-10-21','')).valid).toBe(false);
});

test('a single dated purchase may be suggested, but payments and multiple purchases are not',()=>{
  expect(extractBankChargeHint('17/10/2026 Farmacia Central ARS 10.500,25')).toEqual({
    merchant:'Farmacia Central',purchaseDate:'2026-10-17',amount:'10.500,25',currency:'ARS'
  });
  expect(extractBankChargeHint('17/10/2026 Pago recibido ARS 10.500,25')).toBeNull();
  expect(extractBankChargeHint('17/10/2026 Farmacia ARS 100,00\n18/10/2026 Kiosco ARS 300,00')).toBeNull();
});
