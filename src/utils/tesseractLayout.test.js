import {tesseractTextInVisualRows} from './tesseractLayout';
import {preparePortfolioOcrText} from './localPortfolioOcr';
import {parsePortfolioMarkdown} from './portfolioMarkdown';

const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
const word = (left, top, value, block = 1) => `5\t1\t${block}\t1\t1\t1\t${left}\t${top}\t50\t20\t95\t${value}`;

test('joins bank values with their left-hand labels by vertical position, not TSV block order', () => {
  const tsv = [header,
    word(42, 100, 'Moneda'), word(42, 130, 'USD'),
    word(42, 200, 'Vencimiento'), word(42, 230, '25/11/26'),
    word(42, 300, 'Fecha'), word(103, 300, 'de'), word(132, 300, 'valor'),
    word(42, 400, 'Tasa'), word(100, 400, 'de'), word(131, 400, 'interés'), word(212, 400, 'nominal'),
    word(42, 500, 'Tasa'), word(100, 500, 'de'), word(131, 500, 'interés'), word(212, 500, 'efectiva'),
    word(540, 300, '28/05/26', 2), word(610, 400, '2,5', 2), word(598, 500, '2,55', 2),
    word(42, 600, 'Intereses'), word(610, 600, '445,62', 2),
  ].join('\n');
  const text = tesseractTextInVisualRows(tsv);
  expect(text).toContain('Fecha de valor 28/05/26');
  expect(text).toContain('Tasa de interés nominal 2,5');
  expect(text).toContain('Tasa de interés efectiva 2,55');
  const {parsed} = parsePortfolioMarkdown(preparePortfolioOcrText(text));
  expect(parsed).toMatchObject({currency:'USD', maturityDate:'2026-11-25', startDate:'2026-05-28', annualRate:'2.5', effectiveRate:'2.55'});
  expect(parsed).not.toHaveProperty('lastEarning');
  expect(parsed).not.toHaveProperty('realizedEarnings');
});

test('does not invent visual rows when a browser returns malformed TSV', () => {
  expect(tesseractTextInVisualRows('malformed', 'Monto total 3.000')).toBe('Monto total 3.000');
  expect(tesseractTextInVisualRows(null, '')).toBe('');
});
