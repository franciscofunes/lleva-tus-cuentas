import { requestLitaFinancialAdvice } from './litaAdviceService'
import { auth } from '../shared/config/firebase/firebase.config'

jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: { uid: 'alice', getIdToken: jest.fn().mockResolvedValue('signed-firebase-token') } },
}))

const originalFetch = global.fetch
beforeEach(() => {
  auth.currentUser = { uid: 'alice', getIdToken: jest.fn().mockResolvedValue('signed-firebase-token') }
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(' Ahorrá una parte de tus ingresos. '),
  })
})
afterAll(() => { global.fetch = originalFetch })

test('LTC calls Lita with a signed user token, not an OpenAI API key', async () => {
  await expect(requestLitaFinancialAdvice('  Consejos de ahorro  ')).resolves.toBe('Ahorrá una parte de tus ingresos.')
  expect(global.fetch).toHaveBeenCalledTimes(1)
  const [url, options] = global.fetch.mock.calls[0]
  expect(url).toContain('/api/ltc/advice')
  expect(url).not.toContain('api.openai.com')
  expect(options.headers.Authorization).toBe('Bearer signed-firebase-token')
  expect(JSON.parse(options.body)).toEqual({ message: 'Consejos de ahorro' })
})

test('requires Firebase sign-in and bounds the advice prompt', async () => {
  auth.currentUser = null
  await expect(requestLitaFinancialAdvice('Consejos de ahorro')).rejects.toThrow(/Iniciá sesión/)
  auth.currentUser = { getIdToken: jest.fn() }
  await expect(requestLitaFinancialAdvice('a'.repeat(1501))).rejects.toThrow(/1500/)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('surfaces authenticated Lita endpoint errors to the user', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 429,
    text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Demasiadas consultas. Esperá un minuto.' })),
  })
  await expect(requestLitaFinancialAdvice('Consejos de ahorro')).rejects.toThrow(/Demasiadas consultas/)
})
