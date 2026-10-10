import { normalizeLitaChatMessages } from './litaChatMessages';

test('preserves the original LTC portfolio report beyond the old 12k limit', () => {
  const report = '# Portfolio LTC — contexto para análisis LLM\n' + '### Activo financiero\n'.repeat(1050);
  expect(report.length).toBeGreaterThan(12000);
  expect(report.length).toBeLessThan(32000);
  const normalized = normalizeLitaChatMessages([
    { id: '1', role: 'user', content: report },
    { id: '2', role: 'assistant', content: 'Resumen del portfolio.' },
    { id: '3', role: 'user', content: 'Dale' },
  ]);
  expect(normalized[0].content).toBe(report);
  expect(normalized[2].content).toBe('Dale');
});

test('bounds malicious or excessive chat history data before Firestore persistence', () => {
  const messages = Array.from({ length: 45 }, (_, index) => ({
    id: String(index),
    role: index % 2 ? 'assistant' : 'user',
    content: 'x'.repeat(9000),
  }));
  const result = normalizeLitaChatMessages(messages);
  expect(result.length).toBeLessThanOrEqual(40);
  expect(result.reduce((sum, item) => sum + item.content.length, 0)).toBeLessThanOrEqual(90000);
  expect(normalizeLitaChatMessages([{ role: 'system', content: 'ignored' }])).toEqual([]);
});
