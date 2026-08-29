<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'

const route = useRoute()
const code = route.params.code

const invoice = ref(null)
const loading = ref(true)
const error = ref('')
const paying = ref(false)

// 'full' pays whatever the remaining balance is; 'partial' lets the customer
// enter their own amount, bounded by that balance - see
// InvoiceService.initiatePayment on the backend for the matching validation.
const payMode = ref('full')
const partialAmount = ref(0)

const amountPaid = computed(() => Number(invoice.value?.amountPaid || 0))
const balanceDue = computed(() => Math.max(Number(invoice.value?.total || 0) - amountPaid.value, 0))
const hasPartialPayment = computed(() => amountPaid.value > 0 && invoice.value?.status !== 'paid')
const isPaid = computed(() => invoice.value?.status === 'paid')

onMounted(async () => {
  try {
    const res = await api.get(`/invoice/public/${code}`)
    invoice.value = res.data
    partialAmount.value = balanceDue.value
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function payNow() {
  error.value = ''
  if (payMode.value === 'partial') {
    const amount = Number(partialAmount.value)
    if (!amount || amount <= 0 || amount > balanceDue.value) {
      error.value = `Enter an amount between ${formatMoney(0.01, invoice.value.currency)} and ${formatMoney(balanceDue.value, invoice.value.currency)}.`
      return
    }
  }

  paying.value = true
  try {
    const payload = payMode.value === 'partial' ? { amount: Number(partialAmount.value) } : {}
    const res = await api.post(`/invoice/${code}/initiate-payment`, payload)
    const authUrl = res.data?.data?.authorization_url
    if (authUrl) {
      window.location.href = authUrl
    } else {
      error.value = 'Could not start payment. Please try again.'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-ink-50 px-4 py-10">
    <div class="mx-auto max-w-xl">
      <Spinner v-if="loading" />

      <div v-else-if="error && !invoice" class="card p-6 text-center">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <div v-else-if="invoice" class="card overflow-hidden">
        <div class="flex items-center justify-between bg-lilac-600 px-6 py-5 text-white">
          <div>
            <p class="text-xs uppercase tracking-wide text-lilac-100">Invoice from</p>
            <p class="text-lg font-semibold">{{ invoice.entity?.name }}</p>
          </div>
          <img v-if="invoice.entity?.logo" :src="invoice.entity.logo" alt="" class="h-10 w-10 rounded-md bg-white object-contain p-1" />
        </div>

        <div class="p-6">
          <div class="flex items-center justify-between">
            <p class="font-mono text-sm text-ink-500">{{ invoice.invoiceNumber }}</p>
            <StatusBadge :status="invoice.status" />
          </div>

          <p class="mt-3 text-3xl font-semibold text-ink-900">{{ formatMoney(invoice.total, invoice.currency) }}</p>
          <p class="text-sm text-ink-400">Due {{ formatDate(invoice.dueDate) }}</p>

          <div class="mt-6 divide-y divide-ink-100 border-y border-ink-100">
            <div v-for="(item, i) in invoice.items" :key="i" class="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p class="text-ink-700">{{ item.name || item.description }}</p>
                <p class="text-xs text-ink-400">Qty {{ item.quantity }} × {{ formatMoney(item.unitPrice, invoice.currency) }}</p>
              </div>
              <p class="text-ink-700">{{ formatMoney(item.quantity * item.unitPrice, invoice.currency) }}</p>
            </div>
          </div>

          <div class="mt-4 space-y-1 text-sm text-ink-500">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ formatMoney(invoice.subtotal, invoice.currency) }}</span></div>
            <div class="flex justify-between"><span>Tax</span><span>{{ formatMoney(invoice.tax, invoice.currency) }}</span></div>
            <div v-if="invoice.paymentFee > 0" class="flex justify-between">
              <span>Payment processing fee</span><span>{{ formatMoney(invoice.paymentFee, invoice.currency) }}</span>
            </div>
            <div class="flex justify-between text-base font-semibold text-ink-800"><span>Total</span><span>{{ formatMoney(invoice.total, invoice.currency) }}</span></div>
            <template v-if="hasPartialPayment">
              <div class="flex justify-between text-emerald-600"><span>Paid so far</span><span>-{{ formatMoney(amountPaid, invoice.currency) }}</span></div>
              <div class="flex justify-between text-base font-semibold text-lilac-700"><span>Balance due</span><span>{{ formatMoney(balanceDue, invoice.currency) }}</span></div>
            </template>
          </div>

          <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

          <template v-if="!isPaid">
            <!-- Partial payment: pay the whole balance, or a custom amount up
                 to it (backend validates against the remaining balance, not
                 the original total, so this can be used more than once). -->
            <div class="mt-6 space-y-3 border-t border-ink-100 pt-5">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  :class="payMode === 'full' ? 'bg-lilac-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'"
                  @click="payMode = 'full'"
                >
                  Pay in full
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  :class="payMode === 'partial' ? 'bg-lilac-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'"
                  @click="payMode = 'partial'"
                >
                  Pay part of it
                </button>
              </div>

              <div v-if="payMode === 'partial'">
                <label class="label">Amount to pay now</label>
                <input
                  v-model.number="partialAmount"
                  type="number"
                  min="0.01"
                  :max="balanceDue"
                  step="0.01"
                  class="input"
                />
                <p class="mt-1 text-xs text-ink-400">
                  Up to {{ formatMoney(balanceDue, invoice.currency) }}. The remaining balance stays on this invoice until paid off.
                </p>
              </div>

              <button class="btn-primary w-full" :disabled="paying" @click="payNow">
                {{
                  paying
                    ? 'Redirecting to payment…'
                    : `Pay ${formatMoney(payMode === 'partial' ? partialAmount : balanceDue, invoice.currency)}`
                }}
              </button>
            </div>
          </template>
          <p v-else class="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
            This invoice has been paid. Thank you!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
