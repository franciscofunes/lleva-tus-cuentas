import { readFileSync } from 'fs';
import { join } from 'path';

const dashboard = readFileSync(join(__dirname, 'Dashboard.js'), 'utf8');

test('the page DOM prioritizes period summary and transactions before optional charts and exports', () => {
  const scope = dashboard.indexOf('id="transactions-scope"');
  const summary = dashboard.indexOf('id="transactions-summary"');
  const list = dashboard.indexOf('id="transactions-list"');
  const charts = dashboard.indexOf('id="transactions-charts"');
  const overview = dashboard.indexOf('id="transactions-overview"');
  expect(scope).toBeGreaterThan(-1);
  expect(summary).toBeGreaterThan(scope);
  expect(list).toBeGreaterThan(summary);
  expect(charts).toBeGreaterThan(list);
  expect(overview).toBeGreaterThan(charts);
});

test('analytics charts default to collapsed only for fresh accounts and persisted choices override defaults', () => {
  expect(dashboard).toContain('charts: true');
  expect(dashboard).toContain('...(saved.collapsedSections || {})');
  expect(dashboard).toContain('transactionPreferenceKey');
  expect(dashboard).toContain('JSON.stringify({ collapsedSections, isDataVisible, sortBy, sortDirection })');
});

test('the visible card subset is distinct from period-scope charts, exports and KPI calculations', () => {
  expect(dashboard).toContain('selectScopedTransactions(docs, categories');
  expect(dashboard).toContain('selectTransactionCards(filteredDocs');
  expect(dashboard).toContain('buildTransactionOverview(filteredDocs');
  expect(dashboard).toContain('prepareTransactionsExport(filteredDocs');
  expect(dashboard).toContain('buildTransactionsLitaMarkdown(filteredDocs');
  expect(dashboard).toContain('chartData={filteredDocs}');
  expect(dashboard).toContain('docs={filteredDocs}');
});

test('authenticated financial movements never leak into a visual review fixture', () => {
  expect(dashboard).not.toContain('UX_FIXTURE_TRANSACTIONS');
  expect(dashboard).not.toContain('fakeAuthenticatedUser');
});

test('the unified period-and-search toolbar appears once before financial summaries', () => {
  const toolbar = dashboard.slice(dashboard.indexOf('id="transactions-scope"'), dashboard.indexOf('id="transactions-summary"'));
  expect(toolbar).toContain('<ExpenseFilter onPeriodChange={setSelectedPeriodInfo}');
  expect(toolbar).toContain('<SearchBar');
  expect(toolbar).toContain('periodDescription={selectedPeriodInfo?.key === selectedFilter');
  expect((dashboard.match(/<ExpenseFilter /g) || [])).toHaveLength(1);
  expect((dashboard.match(/<SearchBar/g) || [])).toHaveLength(1);
});
