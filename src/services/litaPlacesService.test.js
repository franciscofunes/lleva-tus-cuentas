import { searchLitaPlaces } from './litaPlacesService';
import { auth } from '../shared/config/firebase/firebase.config';

jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('signed-token') } },
}));

const oldFetch = global.fetch;
beforeEach(() => {
  auth.currentUser = { getIdToken: jest.fn().mockResolvedValue('signed-token') };
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:jest.fn().mockResolvedValue({
    places:[{id:'1',label:'Café',detail:'Buenos Aires',latitude:-34.6,longitude:-58.4}],
  })});
});
afterAll(()=>{global.fetch=oldFetch;});

test('uses the authenticated Lita backend rather than exposing a Geoapify API key',async()=>{
  const result=await searchLitaPlaces('  Café   ');
  expect(result).toHaveLength(1);
  const [url,options]=global.fetch.mock.calls[0];
  expect(url).toContain('/api/ltc/places?q=Caf');
  expect(url).not.toContain('geoapify.com');
  expect(options.headers.Authorization).toBe('Bearer signed-token');
  expect(options.method).toBe('GET');
});

test('very short queries never hit a paid provider',async()=>{
  expect(await searchLitaPlaces('ca')).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('upstream config errors show helpful manual-entry fallback',async()=>{
  global.fetch.mockResolvedValueOnce({ok:false,status:503,json:jest.fn().mockResolvedValue({
    error:'La búsqueda de lugares todavía no está configurada. Podés escribir el lugar manualmente.'
  })});
  await expect(searchLitaPlaces('Café')).rejects.toThrow(/no está configurada/);
});
