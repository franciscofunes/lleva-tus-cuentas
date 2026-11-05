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
  const text=preparePortfolioOcrText('Depósito a plazo fijo\nMoneda\nUSD\nVencimiento\n25/11/26\nFecha de valor\n28/05/26\nTasa de interés nominal\n2,5\nTasa de interés efectiva\n2,55\nIntereses devengados a la fecha\n445,62\nIntereses totales\n501,02');
  const {parsed}=parsePortfolioMarkdown(text);
  expect(parsed).toMatchObject({currency:'USD', annualRate:'2.5', effectiveRate:'2.55', maturityDate:'2026-11-25', startDate:'2026-05-28'});
  expect(parsed).not.toHaveProperty('realizedEarnings');
  expect(parsed).not.toHaveProperty('lastEarning');
  expect(parsed).not.toHaveProperty('balance');
});
