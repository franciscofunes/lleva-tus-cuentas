import { firestore } from '../shared/config/firebase/firebase.config';
import { buildLitaSpendingForecast, litaForecastWindow } from '../utils/litaSpendingForecast';
import { summarizeLitaPortfolioBalances } from '../utils/litaPortfolioBalances';

const MAX_FORECAST_ROWS = 1200;
const MAX_PORTFOLIO_POSITIONS = 250;

const queryPortfolioBalances = async (userId, today) => {
  try {
    const positions = await firestore.collection('users').doc(userId)
      .collection('portfolioPositions')
      .limit(MAX_PORTFOLIO_POSITIONS + 1)
      .get();
    // Do not publish misleading totals if the position collection is truncated.
    if (positions.docs.length > MAX_PORTFOLIO_POSITIONS) {
      return { source: 'portfolioPositions', status: 'too-many' };
    }
    return summarizeLitaPortfolioBalances(
      positions.docs.map((position) => position.data()), today);
  } catch {
    // An unavailable Portfolio must not block the spending forecast.
    return { source: 'portfolioPositions', status: 'unavailable' };
  }
};

/**
 * Bound the on-demand forecast read to six finished months. Firestore's
 * authenticated browser session and owner rules gate this query. Only
 * aggregated values cross the parent/iframe boundary.
 */
export async function queryLitaSpendingForecast(userId, categories = []) {
  if (!userId) throw new Error('Iniciá sesión en LTC para consultar la proyección.');
  const today = new Date();
  const { from, to } = litaForecastWindow(today);
  const snapshot = await firestore.collection('users').doc(userId)
    .collection('expenses')
    .where('selectedDate', '>=', from)
    .where('selectedDate', '<=', to)
    .orderBy('selectedDate', 'desc')
    .limit(MAX_FORECAST_ROWS + 1)
    .get();

  if (snapshot.docs.length > MAX_FORECAST_ROWS) {
    throw new Error('Hay más de 1200 movimientos en los últimos seis meses. No puedo proyectar con un historial incompleto.');
  }
  const result = buildLitaSpendingForecast(snapshot.docs.map((row) => row.data()), categories, today);
  result.portfolioBalances = await queryPortfolioBalances(userId, today);
  return result;
}
