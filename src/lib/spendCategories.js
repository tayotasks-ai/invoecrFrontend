// Mirrors Spend.CATEGORIES on the backend (spend.model.js) - kept as a
// separate small file rather than inline in SpendList.vue since
// DashboardHome.vue's category breakdown needs the same labels. Order here
// is also the dropdown order in the "Log spending" form - roughly most- to
// least-common for a Nigerian SME/freelancer.
export const SPEND_CATEGORIES = [
  { id: 'rent', label: 'Rent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'transport', label: 'Transport & fuel' },
  { id: 'inventory_supplies', label: 'Inventory & supplies' },
  { id: 'salaries_wages', label: 'Salaries & wages' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'software_subscriptions', label: 'Software & subscriptions' },
  { id: 'professional_fees', label: 'Professional fees' },
  { id: 'bank_charges', label: 'Bank charges' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'other', label: 'Other' },
]

// Includes 'vendor_payments' - a category that only ever appears in
// ReportingService's categoryBreakdown (see reporting.service.js), never as
// a value a business picks when logging their own spend. It represents
// paid Expenses (accounts-payable) folded into the same breakdown.
export const CATEGORY_LABEL = {
  ...Object.fromEntries(SPEND_CATEGORIES.map((c) => [c.id, c.label])),
  vendor_payments: 'Vendor payments',
}

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'card', label: 'Card' },
  { id: 'pos', label: 'POS' },
  { id: 'other', label: 'Other' },
]
