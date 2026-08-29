// Client-side mirror of the backend's src/utils/paystackFee.util.js -
// used only to show a live preview while creating an invoice, before the
// backend computes and persists the authoritative value. Keep these two
// files in sync if Paystack's fee schedule ever changes.
//
// See the backend file for the full explanation of why this is a gross-up
// calculation rather than a simple percentage add-on.
const FEE_RATE = 0.015
const FLAT_FEE = 100
const FLAT_FEE_THRESHOLD = 2500
const FEE_CAP = 2000

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function grossUpForPaystackFee(netAmount) {
  const amount = Number(netAmount) || 0
  if (amount <= 0) return { total: 0, fee: 0 }

  const totalNoFlat = amount / (1 - FEE_RATE)
  if (totalNoFlat < FLAT_FEE_THRESHOLD) {
    return { total: round2(totalNoFlat), fee: round2(totalNoFlat - amount) }
  }

  const totalWithFlat = (amount + FLAT_FEE) / (1 - FEE_RATE)
  const uncappedFee = totalWithFlat * FEE_RATE + FLAT_FEE
  if (uncappedFee <= FEE_CAP) {
    return { total: round2(totalWithFlat), fee: round2(uncappedFee) }
  }

  return { total: round2(amount + FEE_CAP), fee: FEE_CAP }
}
