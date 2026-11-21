import { firestore } from '../shared/config/firebase/firebase.config';
import { buildLitaSpendingForecast, litaForecastWindow } from '../utils/litaSpendingForecast';

const MAX_FORECAST_ROWS = 1200;

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
  return buildLitaSpendingForecast(snapshot.docs.map((row) => row.data()), categories, today);
}
