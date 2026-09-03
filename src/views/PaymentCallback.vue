<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney } from '../lib/format'

const route = useRoute()
// Paystack's checkout redirect carries both `reference` and `trxref` (same
// value, `trxref` is the older/alternate name some Paystack flows use) -
// accept either so this doesn't depend on which one a given checkout
// happens to send.
const reference = route.query.reference || route.query.trxref || ''

const loading = ref(true)
const error = ref('')
const result = ref(null)
// True from the moment a poll is scheduled until either a non-pending
// result arrives or MAX_POLLS is exhausted - this, not a count comparison
// re-derived in the template, is what the template checks to decide
// between "still auto-checking" (spinner) and "gave up, offer a manual
// check" (the amber pending state). Keeping a single source of truth here
// avoids the two places drifting out of sync with each other.
const polling = ref(false)

// The webhook is what actually confirms a payment in the normal case, and
// it's usually near-instant - but "usually" isn't "always" (network hiccup,
// the shared HRMS-forwarding hop being slow - see paystack.utils.js). Rather
// than leave the customer staring at "pending" while the webhook is still
// in flight, poll the same idempotent status endpoint a few times - each
// call is itself a safe second trigger for confirmation (see
// UtilsService.confirmPaystackPayment), so this often resolves to "success"
// well before the webhook would have landed on its own.
const MAX_POLLS = 5
const POLL_INTERVAL_MS = 2500
let pollCount = 0
let pollTimer = null

async function checkStatus() {
  try {
    const res = await api.get(`/invoice/public/payment-status/${encodeURIComponent(reference)}`)
    result.value = res.data
    error.value = ''
  } catch (e) {
    error.value = e.message
    result.value = null
    polling.value = false
    return // Don't keep polling against a reference that doesn't exist at all.
  } finally {
    loading.value = false
  }

  if (result.value?.status === 'pending' && pollCount < MAX_POLLS) {
    pollCount += 1
    polling.value = true
    pollTimer = setTimeout(checkStatus, POLL_INTERVAL_MS)
  } else {
    polling.value = false
  }
}

onMounted(() => {
  if (!reference) {
    loading.value = false
    error.value = 'No payment reference was provided.'
    return
  }
  checkStatus()
})
onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
})

function checkAgain() {
  loading.value = true
  pollCount = 0
  checkStatus()
}
</script>

<template>
  <div class="relative min-h-screen bg-ink-50 px-4 py-10">
    <div class="mx-auto max-w-xl">
      <div class="card overflow-hidden">
        <div class="flex items-center justify-between bg-lilac-600 px-6 py-5 text-white">
          <p class="text-lg font-semibold">Payment status</p>
        </div>

        <div class="p-6 text-center">
          <!-- Still loading (first check) or actively polling for a pending payment. -->
          <template v-if="loading || (result?.status === 'pending' && polling && !error)">
            <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-lilac-200 border-t-lilac-600" />
            <p class="mt-4 text-sm font-medium text-ink-700">Confirming your payment…</p>
            <p class="mt-1 text-xs text-ink-400">This usually only takes a few seconds.</p>
          </template>

          <template v-else-if="error">
            <p class="text-sm text-red-600">{{ error }}</p>
            <p class="mt-2 text-xs text-ink-400">
              If you completed a payment, it may still have gone through - check with the business that sent you the invoice if you're not sure.
            </p>
          </template>

          <template v-else-if="result?.status === 'success' && result.type === 'subscription'">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
            <p class="mt-4 text-base font-semibold text-ink-800">Your plan has been upgraded</p>
            <p class="mt-1 text-sm text-ink-500">You can close this tab and go back to invoecr.</p>
          </template>

          <template v-else-if="result?.status === 'success'">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
            <p class="mt-4 text-base font-semibold text-ink-800">Payment received</p>
            <p class="mt-1 text-sm text-ink-500">
              <span v-if="result.businessName">Thank you for paying {{ result.businessName }}.</span>
              <span v-else>Thank you.</span>
              <span v-if="result.amount"> {{ formatMoney(result.amount, result.currency) }} received.</span>
            </p>
            <router-link
              v-if="result.invoiceNumber"
              :to="{ name: 'public-invoice', params: { code: result.invoiceNumber } }"
              class="btn-primary mt-5 inline-block"
            >
              View invoice
            </router-link>
          </template>

          <template v-else-if="result?.status === 'pending'">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">…</div>
            <p class="mt-4 text-base font-semibold text-ink-800">Still confirming your payment</p>
            <p class="mt-1 text-sm text-ink-500">This can occasionally take a minute or two. It's safe to check again.</p>
            <button class="btn-secondary mt-5" @click="checkAgain">Check again</button>
            <router-link
              v-if="result.invoiceNumber"
              :to="{ name: 'public-invoice', params: { code: result.invoiceNumber } }"
              class="mt-3 block text-sm font-medium text-lilac-600 hover:text-lilac-700"
            >
              View invoice
            </router-link>
          </template>

          <template v-else-if="result?.status === 'failed'">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">✕</div>
            <p class="mt-4 text-base font-semibold text-ink-800">This payment didn't go through</p>
            <p class="mt-1 text-sm text-ink-500">No charge was completed. You can go back to the invoice and try again.</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
