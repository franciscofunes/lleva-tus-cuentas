import { preparePortfolioOcrText } from './localPortfolioOcr';
import { parsePortfolioMarkdown } from './portfolioMarkdown';

test('adapts explicit balance and NAV labels without inventing earned interest',()=>{
  const text=preparePortfolioOcrText('Banco Galicia\nSaldo actual\nUS$ 10.500,30\nCuotapartes\n250,50\nValor cuotaparte 41,92\nVariación del saldo +900');
  const {parsed}=parsePortfolioMarkdown(text);
  expect(parsed).toMatchObject({balance:'10500.30',shares:'250.50',nav:'41.92'});
  expect(parsed).not.toHaveProperty('realizedEarnings');
  expect(parsed).not.toHaveProperty('lastEarning');
});

test('does not convert unlabeled amounts into financial fields',()=>{
  const source='Banco Galicia\n1.200,45\n5.5%';
  expect(preparePortfolioOcrText(source)).toBe(source);
  expect(()=>parsePortfolioMarkdown(source)).toThrow('No se reconocieron campos del portfolio');
});

test('recognizes clearly labeled fixed-term deposit fields from a mobile banking screenshot',()=>{
  const text=preparePortfolioOcrText('Depósito a plazo fijo\nMoneda\nUSD\nVencimiento\n25/11/26\nFecha de valor\n28/05/26\nNúmero de contrato\n941955\nTasa de interés nominal\n2,5\nTasa de interés efectiva\n2,55\nIntereses devengados a la fecha\n445,62\nIntereses totales\n501,02\nRenovación automática\nNo');
  const {parsed}=parsePortfolioMarkdown(text);
  expect(parsed).toMatchObject({currency:'USD', annualRate:'2.5', effectiveRate:'2.55', maturityDate:'2026-11-25', startDate:'2026-05-28', depositAccruedInterest:'445.62', depositTotalInterest:'501.02', depositContractNumber:'941955', depositAutoRenewal:'NO'});
  expect(parsed).not.toHaveProperty('realizedEarnings');
  expect(parsed).not.toHaveProperty('lastEarning');
  expect(parsed).not.toHaveProperty('balance');
});

test('recognizes same-line fixed-deposit OCR values and preserves a contract identifier as text',()=>{
  const ocr='Intereses devengados a la fecha 445,62\nIntereses totales 501,02\nNúmero de contrato: 00941955\nRenovación automática No';
  const {parsed}=parsePortfolioMarkdown(preparePortfolioOcrText(ocr));
  expect(parsed).toMatchObject({depositAccruedInterest:'445.62',depositTotalInterest:'501.02',depositContractNumber:'00941955',depositAutoRenewal:'NO'});
  expect(parsed).not.toHaveProperty('realizedEarnings');
});

test('rejects unreadable or negative accrued-interest suggestions rather than inventing earnings',()=>{
  expect(()=>parsePortfolioMarkdown('Intereses devengados: no legible')).toThrow('No se reconocieron campos');
  expect(()=>parsePortfolioMarkdown('Intereses devengados: -445,62')).toThrow('No se reconocieron campos');
  expect(()=>parsePortfolioMarkdown('Renovación automática: quizás')).toThrow('No se reconocieron campos');
});
