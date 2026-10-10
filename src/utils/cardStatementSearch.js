// Search is presentation-only: never mutate or recalculate persisted purchases.
const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-AR')
  .trim()
  .replace(/\s+/g, ' ')

const amountTexts = (amount) => {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return String(amount ?? '')
  return [
    String(amount),
    numeric.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ].join(' ')
}

export const filterCardStatementItems = (items = [], query = '') => {
  const terms = normalize(query).split(' ').filter(Boolean)
  if (!terms.length) return items

  return items.filter((item) => {
    const date = String(item.date ?? '')
    const formattedDate = date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
    const searchable = normalize([
      item.merchant, item.category, item.receipt, date, formattedDate,
      item.currency, amountTexts(item.amount),
      item.installment ? 'cuota ' + item.installment : '',
    ].join(' '))
    return terms.every((term) => searchable.includes(term))
  })
}
