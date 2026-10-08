import { fetchUsdQuotes, parseUsdQuotes } from './usdQuotesService';

const sample = (casa, compra = 1500, venta = 1550) => ({
  casa, compra, venta,
  fechaActualizacion: new Date(Date.now() - 3600000).toISOString(),
});

describe('DolarAPI quote validation and caching', () => {
  it('accepts only validated known market buy/sell quotes and sorts markets', () => {
    const quotes = parseUsdQuotes([
      sample('blue', 1490, 1520),
      sample('oficial', 1400, 1460),
      sample('bolsa', 1475, 1490),
      sample('unknown'),
      sample('cripto', 'not-available', 1600),
    ]);
    expect(quotes.map((x) => x.key)).toEqual(['bolsa', 'oficial', 'blue']);
    expect(quotes[0].compra).toBe(1475);
    expect(quotes[0].venta).toBe(1490);
    expect(quotes[0].updatedAt).toBeTruthy();
  });

  it('does not accept missing, nonpositive, or future prices', () => {
    expect(parseUsdQuotes([
      { ...sample('oficial'), compra: null },
      { ...sample('blue'), venta: 0 },
      { ...sample('bolsa'), fechaActualizacion: 'broken' },
      { ...sample('cripto'), fechaActualizacion: new Date(Date.now() + 7 * 86400000).toISOString() },
    ])).toEqual([]);
  });

  it('caches successful responses and never sends user portfolio data', async () => {
    const previousFetch = global.fetch;
    const fakeFetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => [sample('bolsa')],
    });
    global.fetch = fakeFetch;
    try {
      const first = await fetchUsdQuotes(true);
      const second = await fetchUsdQuotes();
      expect(first).toEqual(second);
      expect(fakeFetch).toHaveBeenCalledTimes(1);
      expect(fakeFetch.mock.calls[0][0]).toBe('https://dolarapi.com/v1/dolares');
      expect(fakeFetch.mock.calls[0][1].credentials).toBe('omit');
      expect(fakeFetch.mock.calls[0][1].body).toBeUndefined();
    } finally {
      global.fetch = previousFetch;
    }
  });
});
