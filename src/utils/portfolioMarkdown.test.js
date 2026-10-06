import { parsePortfolioMarkdown } from './portfolioMarkdown';

describe('parsePortfolioMarkdown monthly FCI returns', () => {
	it('parses a Balanz-style monthly return section and preserves the published total', () => {
		const markdown = `
Institución: Balanz
Producto: ESTRA1A - Dólar Corto Plazo
Categoría: FCI
Moneda: USD
Inversión mínima: US$ 100

Rentabilidad mensual 2026:
- Ene: 0,62%
- Feb: 0,29%
- Mar: 0,95%
- Abr: 0,34%
- May: 0,18%
- Jun: 0,53%
- Jul: 0,33%
- Ago: 0,28%
- Sep: 0,14%
- Oct: 0,04%

Total YTD publicado: 3,75%
`;

		const { parsed, unknown } = parsePortfolioMarkdown(markdown);

		expect(parsed.institution).toBe('Balanz');
		expect(parsed.name).toBe('ESTRA1A - Dólar Corto Plazo');
		expect(parsed.category).toBe('FCI');
		expect(parsed.currency).toBe('USD');
		expect(parsed.minimumInvestment).toBe('100');
		expect(parsed.monthlyReturns).toEqual({
			jan: '0.62',
			feb: '0.29',
			mar: '0.95',
			apr: '0.34',
			may: '0.18',
			jun: '0.53',
			jul: '0.33',
			aug: '0.28',
			sep: '0.14',
			oct: '0.04',
		});
		expect(parsed.publishedYtdReturn).toBe('3.75');
		expect(unknown).toEqual([]);
	});

	it('parses direct monthlyReturns month keys', () => {
		const { parsed } = parsePortfolioMarkdown(`
monthlyReturns.jan: 0.62%
monthlyReturns.feb: 0.29%
publishedYtdReturn: 3.75%
`);

		expect(parsed.monthlyReturns).toEqual({
			jan: '0.62',
			feb: '0.29',
		});
		expect(parsed.publishedYtdReturn).toBe('3.75');
	});
});
