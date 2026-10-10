import { filterCardStatementItems } from './cardStatementSearch'

const items = [
  { merchant: 'Farmacity', category: 'Salud 🏥', date: '2026-08-27', amount: '35079.00', currency: 'ARS', receipt: '111111' },
  { merchant: 'Día Tienda', category: 'Alimentación', date: '2026-08-28', amount: '13090.00', currency: 'ARS', receipt: '222222', installment: '2 de 3' },
  { merchant: 'Spotify', category: 'Suscripciones', date: '2026-09-01', amount: '9.49', currency: 'USD', receipt: '333333' },
]

test('searches merchants and accented categories, regardless of case', () => {
  expect(filterCardStatementItems(items, 'FARMA')).toEqual([items[0]])
  expect(filterCardStatementItems(items, 'dia alimentacion')).toEqual([items[1]])
})

test('searches amounts in Argentine, original and US formatting, plus currency', () => {
  expect(filterCardStatementItems(items, '35.079,00')).toEqual([items[0]])
  expect(filterCardStatementItems(items, '35079.00')).toEqual([items[0]])
  expect(filterCardStatementItems(items, '9,49 USD')).toEqual([items[2]])
})

test('searches receipt, date and installment across fields', () => {
  expect(filterCardStatementItems(items, '222222 cuota')).toEqual([items[1]])
  expect(filterCardStatementItems(items, '27/08/2026')).toEqual([items[0]])
})

test('empty search leaves every item untouched, unmatched terms do not change source', () => {
  expect(filterCardStatementItems(items, '  ')).toBe(items)
  expect(filterCardStatementItems(items, 'nada')).toEqual([])
  expect(items).toHaveLength(3)
})
