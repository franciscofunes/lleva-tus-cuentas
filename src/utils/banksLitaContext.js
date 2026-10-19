import { sumBankBalances } from './bankingModel';
import { statementMonthExtremes, budgetStatus, historicalPeakStatus } from './cardSpendingInsights';

// The assistant receives financial aggregates, never bank account credentials,
// aliases, CBU/CVU, tax IDs, full card numbers, or stored Firestore document IDs.
const finiteAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const cardSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return {};
  const fields = ['asOf', 'closingDate', 'dueDate', 'lastStatementARS', 'lastStatementUSD',
    'minimumPaymentARS', 'currentConsumptionARS', 'currentConsumptionUSD', 'availableLimitARS'];
  return fields.reduce((result, key) => {
    const value = snapshot[key];
    if (value === null || value === undefined || value === '') return result;
    if (['asOf', 'closingDate', 'dueDate'].includes(key)) {
      if (typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value)) result[key] = value;
    } else {
      const amount = finiteAmount(value);
      if (amount !== null) result[key] = amount;
    }
    return result;
  }, {});
};

export function buildBanksLitaContext({ banks = [], accounts = [], cards = [],
  charges = [], statements = [], links = [], history = [], budgets = [], manualSpend = {} } = {}) {
  const active = banks.filter((bank) => bank?.active !== false);
  const byId = new Map(active.map((bank) => [bank.code || bank.id, bank.name || 'Banco']));
  const ownerAccounts = accounts.filter((account) => byId.has(account.bankId));
  const ownerCards = cards.filter((card) => byId.has(card.bankId));
  return {
    scope: 'banks-current-state',
    source: 'manual-user-entered-data',
    totalsByCurrency: sumBankBalances(ownerAccounts),
    bankCount: active.length,
    accountCount: ownerAccounts.length,
    cardCount: ownerCards.length,
    banks: active.slice(0, 40).map((bank) => ({
      name: String(bank.name || '').slice(0, 70),
      accountCount: ownerAccounts.filter((a) => a.bankId === (bank.code || bank.id)).length,
      cardCount: ownerCards.filter((c) => c.bankId === (bank.code || bank.id)).length,
    })),
    accounts: ownerAccounts.slice(0, 80).map((account) => ({
      bank: byId.get(account.bankId),
      name: String(account.name || '').slice(0, 70),
      type: account.type,
      currency: account.currency,
      balance: finiteAmount(account.balance),
    })),
    cards: ownerCards.slice(0, 80).map((card) => ({
      bank: byId.get(card.bankId),
      name: String(card.nickname || '').slice(0, 70),
      brand: card.brand,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      referenceSnapshot: cardSnapshot(card.statementSnapshot),
    })),
    recentManualCharges: charges.filter((charge) => ownerCards.some((card) => card.id === charge.cardId))
      .slice(0, 80).map((charge) => ({
        merchant: String(charge.merchant || '').slice(0, 100),
        date: charge.purchaseDate,
        currency: charge.currency,
        amount: finiteAmount(charge.amount),
        installments: charge.installments,
        // These are reference details only, not additional expenses.
        countedInCashFlow: false,
      })),
    statementCount: statements.length,
    monthlyCardSpending: {
      scope: 'historical-card-statement-purchases',
      warning: 'Use only linked reviewed PDFs as the historical source. Months without a PDF are missing, not zero. Do not add manual charges, card statement expense totals, or different currencies.',
      byCurrency: ['ARS','USD'].map(currency=>{
        const e=statementMonthExtremes(history,currency);
        const config=budgets.find(b=>b.currency===currency);
        const status=budgetStatus(manualSpend,config,currency,manualSpend.month);
        return {
          currency,
          months:e.months.slice(-18).map(row=>({
            month:row.month,amount:row.total,statementCount:row.statementCount,
            estimatedFromTotal:row.estimatedFromTotal,
          })),
          highest:e.high?{month:e.high.month,amount:e.high.total}:null,
          lowest:e.low?{month:e.low.month,amount:e.low.total}:null,
          average:e.average,
          suggestedLimit:e.suggestedLimit,
          currentManualMonth:manualSpend.month||null,
          currentCycleRegisteredAmount:finiteAmount(manualSpend[currency]),
          currentCycleSource:manualSpend.manualOnly?'manual-card-purchases':'bank-consumption-snapshots-plus-later-manual-purchases',
          snapshotCurrencyCounts:manualSpend.snapshotCardCount||0,
          historicalPeakComparison:(()=>{const peak=historicalPeakStatus(manualSpend,history,currency);
            return peak?{level:peak.level,peakMonth:peak.peakMonth,peak:peak.peak,percentage:peak.percentage,partial:true}:null;})(),
          userBudget:config?.enabled?{
            limit:config.limit,warnPercent:config.warnPercent,status:status?.level,
          }:null,
        };
      }),
      llmGuidance: 'Historical months aggregate reviewed PDFs from all linked banks, separated by currency. The current cycle combines bank screenshot consumption totals and manual purchases dated strictly after each snapshot: do not add those purchases twice. Explain maximum and minimum, distance from historical peak, incomplete cycles and missing PDF months. Suggest a user-confirmed ceiling below a personally unsafe peak, never auto-write Firestore. Interpret totals as partial, not verified bank debt or capacity to pay.',
    },
    unlinkedStatementCount: statements.filter((statement) =>
      !links.some((link) => link.expenseId === statement.expenseId)).length,
    // Manual balances and card reference snapshots are not investment gains.
    warning: 'Manual balances, card snapshots, and manual card charges are not audited. Do not add card charges to existing expenses or mix ARS and USD.',
  };
}
