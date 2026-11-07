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

test('collapsed Transactions widgets use one grid gap rather than doubling spacing after the summary', () => {
  const workspace = dashboard.slice(dashboard.indexOf('id="transactions-scope"'), dashboard.indexOf('id="transactions-overview"'));
  const summary = workspace.slice(workspace.indexOf('id="transactions-summary"'), workspace.indexOf('</CollapsibleSection>'));
  expect(workspace).toContain('className="grid min-w-0 grid-cols-1 gap-5 items-start lg:grid-cols-3"');
  expect(summary).not.toContain('font-Nunito');
  expect(summary).not.toMatch(/className="[^"]*\b(?:mb|mt|my)-\d+/);
  expect(workspace).toContain('id="transactions-list"');
  expect(workspace).toContain('id="transactions-charts"');
});

test('Transactions summary and charts inherit the shared financial font rather than local Nunito overrides', () => {
  const workspace = dashboard.slice(dashboard.indexOf('id="transactions-summary"'), dashboard.indexOf('<FinancialOverviewPanel'));
  expect(workspace).toContain('id="transactions-charts"');
  expect(workspace).not.toContain('font-Nunito');
  expect(workspace).not.toContain('font-Roboto');
  expect(workspace).not.toContain('font-Montserrat');
});

test('Transactions tools start one standard gap below the main grid', () => {
  const overview = dashboard.slice(dashboard.indexOf('<FinancialOverviewPanel'), dashboard.indexOf('actions={[', dashboard.indexOf('<FinancialOverviewPanel')));
  expect(overview).toContain('id="transactions-overview"');
  expect(overview).toContain('className="mt-5"');
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

test('optional receipt capture is discoverable in Transactions without creating an expense automatically', () => {
  const activity = dashboard.slice(dashboard.indexOf('id="transactions-list"'), dashboard.indexOf('id="transactions-charts"'));
  expect(activity).toContain("title='Registrar compra o escanear ticket'");
  expect(activity).toContain('onAction={openReceiptScanner}');
  expect(activity).toContain('disabled={!isDataVisible}');
  expect(dashboard).toContain('component={QuickPurchaseCapture}');
  expect(dashboard).toContain('onTransactionDraft={continueQuickCaptureAsTransaction}');
  expect(dashboard).toContain('privacyHidden={!isDataVisible}');
});

test('the unified period-and-search toolbar appears once before financial summaries', () => {
  const toolbar = dashboard.slice(dashboard.indexOf('id="transactions-scope"'), dashboard.indexOf('id="transactions-summary"'));
  expect(toolbar).toContain('<ExpenseFilter onPeriodChange={setSelectedPeriodInfo}');
  expect(toolbar).toContain('<SearchBar');
  expect(toolbar).toContain('periodDescription={selectedPeriodInfo?.key === selectedFilter');
  expect((dashboard.match(/<ExpenseFilter /g) || [])).toHaveLength(1);
  expect((dashboard.match(/<SearchBar/g) || [])).toHaveLength(1);
});
