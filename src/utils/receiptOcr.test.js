import { parseReceiptOcrText } from './receiptOcr';

test('extracts labeled Argentine receipt total and issue date without saving', () => {
  expect(parseReceiptOcrText('ALMACEN DEL SUR\nCUIT 30123456789\nFECHA 05/11/2026\nSUBTOTAL $ 19.200,00\nTOTAL A PAGAR ARS 19.800,50')).toEqual(expect.objectContaining({
    merchant: 'ALMACEN DEL SUR', amount: 19800.5, currency: 'ARS', date: '2026-11-05', warnings: [],
  }));
});

test('supports clearly labeled USD amounts split across OCR lines', () => {
  expect(parseReceiptOcrText('COMERCIO: LIBRERIA ABC\nFECHA: 2026-11-05\nTOTAL\nUSD 12.45')).toEqual(expect.objectContaining({
    merchant: 'LIBRERIA ABC', currency: 'USD', amount: 12.45, date: '2026-11-05',
  }));
});

test('ambiguous totals, unlabeled balances and invalid dates cannot create suggested amounts', () => {
  const parsed = parseReceiptOcrText('CARTA\nFecha 32/13/2026\nSUBTOTAL $100,00\nTOTAL $110,00\nTOTAL $120,00\nVuelto $5,00');
  expect(parsed.amount).toBeNull();
  expect(parsed.date).toBeNull();
  expect(parsed.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/totales distintos/)]));
  expect(parseReceiptOcrText('Saldo actual $15.000,00\nCuotapartes 150')).toEqual(expect.objectContaining({amount: null, currency: null}));
  expect(parseReceiptOcrText('COMERCIO: PRUEBA\nFECHA 05/11/2026\nTOTAL $ 12.500,00').currency).toBeNull();
});

test('synthetic thermal shop receipt recognizes abbreviated November date and ignores non-fiscal heading', () => {
  const receipt = parseReceiptOcrText('DOCUMENTO NO FISCAL\nCARNES DEL SUR\nFecha: 07/Nov/2026\nHora: 12:41:44\nNº Operacion: 3-84\n(301) PRODUCTO EN OFERTA\n2.015kg 8000$/kg = 16120\nARTICULOS: 1\nTOTAL\n$16120');
  expect(receipt).toEqual(expect.objectContaining({
    merchant: 'CARNES DEL SUR', date: '2026-11-07', amount: 16120, currency: null, documentNumber:'3-84', documentType:'ticket',
  }));
});

test('card voucher can propose a labeled purchase amount but not infer payment currency', () => {
  const receipt = parseReceiptOcrText('COMPROBANTE DE VENTA\nCOMERCIO: FERRETERIA DEL CENTRO\nFECHA: 07/11/26\nCUPON 0078\nIMPORTE DE LA COMPRA $ 2000,00');
  expect(receipt).toEqual(expect.objectContaining({
    merchant: 'FERRETERIA DEL CENTRO', date: '2026-11-07', amount: 2000, currency: null, documentNumber:'0078', documentType:'coupon',
  }));
});

test('cash-payment and itemized slips with competing totals never choose one silently', () => {
  const receipt = parseReceiptOcrText('FRUTAS Y VERDURAS\nFecha 07/11/2026\nTOTAL $10000,00\nRECIBIMOS EFECTIVO\nTOTAL $10000,53');
  expect(receipt.merchant).toBe('FRUTAS Y VERDURAS');
  expect(receipt.amount).toBeNull();
  expect(receipt.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/totales distintos/)]));
});

test('bare voucher reference, installment count or quantity are not misread as money', () => {
  const receipt = parseReceiptOcrText('DOCUMENTO NO FISCAL\nOPERACION 3-84\nCUOTAS 03\nNRO CUPON 940123\nFECHA 07/11/26');
  expect(receipt.amount).toBeNull();
  expect(receipt.merchant).toBeNull();
});
