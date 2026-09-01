export function formatMoney(amount, currency = 'NGN') {
  const value = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(date)
  )
}

export const STATUS_STYLES = {
  draft: 'bg-ink-100 text-ink-600',
  sent: 'bg-lilac-100 text-lilac-700',
  paid: 'bg-emerald-100 text-emerald-700',
  'partially-paid': 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  // Expense statuses - 'paid' above is shared with invoices/quotes.
  pending: 'bg-ink-100 text-ink-600',
  submitted: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-ink-100 text-ink-400',
}
