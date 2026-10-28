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
