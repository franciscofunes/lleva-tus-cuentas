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
