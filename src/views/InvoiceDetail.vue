<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'

const route = useRoute()
const router = useRouter()
const code = route.params.code

const invoice = ref(null)
const transactions = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const copied = ref(false)

const paymentLink = computed(() => `${window.location.origin}/payment/${code}`)
const amountPaid = computed(() => Number(invoice.value?.amountPaid || 0))
const balanceDue = computed(() => Math.max(Number(invoice.value?.total || 0) - amountPaid.value, 0))
const hasPartialPayment = computed(() => amountPaid.value > 0 && invoice.value?.status !== 'paid')

async function load() {
  loading.value = true
  try {
    const [invoiceRes, transactionsRes] = await Promise.all([
      api.get(`/invoice/${code}`),
      // Partial-payment history - best-effort, doesn't block the page.
      api.get(`/invoice/${code}/transactions`).catch(() => null),
    ])
    invoice.value = invoiceRes.data
    transactions.value = transactionsRes?.data?.transactions || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function downloadPdf() {
  busy.value = true
  try {
    const response = await api.get(`/invoice/${code}/download`, { responseType: 'blob' })
    // The response interceptor unwraps to response.data for JSON calls, but
    // for a blob response there's no envelope to unwrap - `response` here
    // *is* the blob itself.
    const url = window.URL.createObjectURL(response instanceof Blob ? response : new Blob([response]))
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice_${code}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function updateStatus(status) {
  busy.value = true
  try {
    await api.put(`/invoice/${code}`, { status })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function removeInvoice() {
  if (!confirm('Delete this invoice? This cannot be undone.')) return
  busy.value = true
  try {
    await api.delete(`/invoice/${code}`)
    router.push({ name: 'invoices' })
  } catch (e) {
    error.value = e.message
    busy.value = false
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(paymentLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

const reminderStatus = ref('') // '', 'sending', 'sent', 'error'
const reminderMessage = ref('')
const canSendReminder = computed(() => invoice.value && invoice.value.status !== 'paid')

async function sendReminder() {
  reminderStatus.value = 'sending'
  reminderMessage.value = ''
  try {
    const res = await api.post(`/invoice/${code}/send-reminder`)
    reminderStatus.value = 'sent'
    // Email and WhatsApp are attempted independently now - say which
    // channel(s) actually went out rather than assuming WhatsApp.
    const channels = []
    if (res.data?.email?.sent) channels.push('email')
    if (res.data?.whatsapp?.sent) channels.push('WhatsApp')
    reminderMessage.value = channels.length ? `Reminder sent via ${channels.join(' and ')}.` : 'Reminder sent.'
  } catch (e) {
    reminderStatus.value = 'error'
    reminderMessage.value = e.message
  } finally {
    setTimeout(() => {
      if (reminderStatus.value !== 'sending') reminderStatus.value = ''
    }, 4000)
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="flex items-center gap-3">
      <router-link :to="{ name: 'invoices' }" class="btn-ghost px-2">&larr;</router-link>
      <h1 class="text-lg font-semibold text-ink-900">Invoice</h1>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error && !invoice" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else-if="invoice">
      <div class="mt-5 card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="font-mono text-sm text-ink-500">{{ invoice.invoiceNumber }}</p>
            <p class="mt-1 text-2xl font-semibold text-ink-900">{{ formatMoney(invoice.total, invoice.currency) }}</p>
          </div>
          <StatusBadge :status="invoice.status" />
        </div>

        <div class="mt-6 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Customer</p>
            <p class="mt-1 text-ink-800">{{ invoice.customer?.name }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Issued</p>
            <p class="mt-1 text-ink-800">{{ formatDate(invoice.issueDate) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Due</p>
            <p class="mt-1 text-ink-800">{{ formatDate(invoice.dueDate) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Subtotal / Tax / Fee</p>
            <p class="mt-1 text-ink-800">
              {{ formatMoney(invoice.subtotal, invoice.currency) }} / {{ formatMoney(invoice.tax, invoice.currency) }} /
              {{ formatMoney(invoice.paymentFee || 0, invoice.currency) }}
            </p>
          </div>
        </div>
        <p v-if="invoice.paymentFee > 0" class="mt-2 text-xs text-ink-400">
          Total includes a {{ formatMoney(invoice.paymentFee, invoice.currency) }} payment processing fee, passed on
          to {{ invoice.customer?.name || 'the customer' }} - you receive
          {{ formatMoney(invoice.subtotal + invoice.tax, invoice.currency) }} in full.
        </p>

        <div class="mt-6 overflow-hidden rounded-md border border-ink-100">
          <table class="w-full text-left text-sm">
            <thead class="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th class="px-3 py-2 font-medium">Item</th>
                <th class="px-3 py-2 font-medium">Qty</th>
                <th class="px-3 py-2 font-medium">Unit price</th>
                <th class="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in invoice.items" :key="i" class="border-t border-ink-100">
                <td class="px-3 py-2 text-ink-700">
                  {{ item.name || item.description }}
                  <p v-if="item.description && item.name" class="text-xs text-ink-400">{{ item.description }}</p>
                </td>
                <td class="px-3 py-2 text-ink-500">{{ item.quantity }}</td>
                <td class="px-3 py-2 text-ink-500">{{ formatMoney(item.unitPrice, invoice.currency) }}</td>
                <td class="px-3 py-2 text-ink-700">{{ formatMoney(item.quantity * item.unitPrice, invoice.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="invoice.notes" class="mt-4 text-sm text-ink-500"><span class="font-medium text-ink-700">Notes:</span> {{ invoice.notes }}</p>
        <p v-if="invoice.terms" class="mt-1 text-sm text-ink-500"><span class="font-medium text-ink-700">Terms:</span> {{ invoice.terms }}</p>

        <!-- Partial-payment summary - only shown once a payment has landed,
             so a never-paid invoice doesn't clutter with zeroes. -->
        <div v-if="hasPartialPayment" class="mt-4 flex flex-wrap gap-6 rounded-md bg-amber-50 px-4 py-3 text-sm">
          <div><span class="text-amber-700">Amount paid</span> <strong class="text-amber-900">{{ formatMoney(amountPaid, invoice.currency) }}</strong></div>
          <div><span class="text-amber-700">Balance due</span> <strong class="text-amber-900">{{ formatMoney(balanceDue, invoice.currency) }}</strong></div>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
          <button class="btn-primary" :disabled="busy" @click="downloadPdf">Download PDF</button>
          <button class="btn-secondary" @click="copyLink">{{ copied ? 'Copied!' : 'Copy payment link' }}</button>
          <button
            v-if="canSendReminder"
            class="btn-secondary"
            :disabled="reminderStatus === 'sending'"
            @click="sendReminder"
          >
            {{ reminderStatus === 'sending' ? 'Sending…' : 'Send reminder' }}
          </button>
          <select class="input w-auto" :value="invoice.status" :disabled="busy" @change="updateStatus($event.target.value)">
            <option value="draft">Mark as draft</option>
            <option value="sent">Mark as sent</option>
            <option value="paid">Mark as paid</option>
            <option value="partially-paid">Mark as partially paid</option>
            <option value="overdue">Mark as overdue</option>
          </select>
          <button class="btn-danger ml-auto" :disabled="busy" @click="removeInvoice">Delete</button>
        </div>
        <p
          v-if="reminderMessage"
          class="mt-3 rounded-md px-3 py-2 text-sm"
          :class="reminderStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'"
        >
          {{ reminderMessage }}
        </p>
      </div>

      <!-- Payment history - every attempted transaction against this
           invoice, including failed/pending ones, oldest first from the
           backend reversed here so the newest shows on top. -->
      <div v-if="transactions && transactions.length" class="mt-5 card overflow-hidden">
        <div class="border-b border-ink-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-ink-800">Payment history</h2>
        </div>
        <table class="w-full text-left text-sm">
          <thead class="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2 font-medium">Date</th>
              <th class="px-4 py-2 font-medium">Amount</th>
              <th class="px-4 py-2 font-medium">Reference</th>
              <th class="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transactions" :key="t._id" class="border-t border-ink-100">
              <td class="px-4 py-2.5 text-ink-500">{{ formatDate(t.createdAt) }}</td>
              <td class="px-4 py-2.5 text-ink-700">{{ formatMoney(t.amount, t.currency) }}</td>
              <td class="px-4 py-2.5 font-mono text-xs text-ink-400">{{ t.reference }}</td>
              <td class="px-4 py-2.5">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-emerald-100 text-emerald-700': t.status === 'SUCCESS',
                    'bg-amber-100 text-amber-700': t.status === 'PENDING',
                    'bg-red-100 text-red-700': ['FAILED', 'CANCELLED'].includes(t.status),
                  }"
                >
                  {{ t.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
