import { auth } from '../shared/config/firebase/firebase.config'
import { LITA_CHAT_LOCALHOST, LITA_CHAT_VERCEL_URL } from '../shared/constants/urls.const'

const baseUrl = process.env.NODE_ENV === 'development'
  ? LITA_CHAT_LOCALHOST : LITA_CHAT_VERCEL_URL
const MAX_ADVICE_CHARS = 1500

/** Only Lita's authenticated server endpoint may call AI providers. */
export async function requestLitaFinancialAdvice(input) {
  const message = typeof input === 'string' ? input.trim() : ''
  if (!message || message.length > MAX_ADVICE_CHARS) {
    throw new Error('Escribí una consulta financiera de hasta 1500 caracteres.')
  }
  const current = auth.currentUser
  if (!current) throw new Error('Iniciá sesión para consultar a Lita.')

  const token = await current.getIdToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 65000)
  try {
    const response = await fetch(new URL('/api/ltc/advice', baseUrl).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
      cache: 'no-store',
    })
    const body = await response.text()
    if (!response.ok) {
      let error = ''
      try { error = JSON.parse(body)?.error || '' } catch { /* Text response */ }
      throw new Error(error || (response.status === 401
        ? 'Tu sesión venció. Volvé a iniciar sesión.'
        : 'Lita no pudo procesar la consulta. Intentá nuevamente.'))
    }
    if (!body.trim()) throw new Error('Lita devolvió una respuesta vacía. Intentá nuevamente.')
    return body.trim()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Lita tardó demasiado en responder. Intentá nuevamente.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
