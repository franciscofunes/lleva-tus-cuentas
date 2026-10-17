import { auth } from '../shared/config/firebase/firebase.config';
import { LITA_CHAT_LOCALHOST, LITA_CHAT_VERCEL_URL } from '../shared/constants/urls.const';

const lita = process.env.NODE_ENV === 'development' ? LITA_CHAT_LOCALHOST : LITA_CHAT_VERCEL_URL;

/** Backend proxy only: no Geoapify token or external geocoding call in React. */
export async function searchLitaPlaces(value, { signal } = {}) {
  const query = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (query.length < 3 || query.length > 80) return [];
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para buscar lugares.');
  const token = await user.getIdToken();
  if (signal?.aborted) {
    const aborted = new Error('Búsqueda cancelada');
    aborted.name = 'AbortError';
    throw aborted;
  }
  const url = new URL('/api/ltc/places', lita);
  url.searchParams.set('q', query);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    signal,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudieron buscar lugares. Podés ingresarlo manualmente.');
  if (!Array.isArray(payload.places)) return [];
  return payload.places.filter(item =>
    item && typeof item.label === 'string' && item.label.trim() &&
    typeof item.latitude === 'number' && typeof item.longitude === 'number' &&
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
    Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180).slice(0, 5);
}
