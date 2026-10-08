// Public indicative rates. This endpoint receives NO user balances or identifiers.
// https://dolarapi.com/docs/argentina/operations/get-dolares
const API = 'https://dolarapi.com/v1/dolares';
const TTL = 10 * 60 * 1000;
const KNOWN_MARKETS = {
  bolsa: 'MEP',
  oficial: 'Oficial',
  blue: 'Blue (informal)',
  cripto: 'Cripto',
};
let cached = null;
let cachedAt = 0;
let pending = null;

export const parseUsdQuotes = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((rate) => Object.prototype.hasOwnProperty.call(KNOWN_MARKETS, rate?.casa))
    .map((rate) => {
      const buy = Number(rate.compra);
      const sell = Number(rate.venta);
      const updated = Date.parse(rate.fechaActualizacion);
      if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(sell) || sell <= 0
        || !Number.isFinite(updated) || updated > Date.now() + 24 * 3600_000) return null;
      return {
        key: rate.casa,
        label: KNOWN_MARKETS[rate.casa],
        compra: buy,
        venta: sell,
        updatedAt: new Date(updated).toISOString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = ['bolsa', 'oficial', 'blue', 'cripto'];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });
};

export const fetchUsdQuotes = (force = false) => {
  if (!force && cached && Date.now() - cachedAt < TTL) return Promise.resolve(cached);
  if (pending) return pending;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  pending = fetch(API, { signal: controller.signal, credentials: 'omit', cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('No se pudieron obtener cotizaciones');
      return response.json();
    })
    .then((body) => {
      const quotes = parseUsdQuotes(body);
      if (!quotes.length) throw new Error('No hay cotizaciones válidas');
      cached = quotes;
      cachedAt = Date.now();
      return quotes;
    })
    .finally(() => {
      clearTimeout(timer);
      pending = null;
    });
  return pending;
};
