<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import { confirmDialog } from '../composables/useConfirm'

const route = useRoute()
const router = useRouter()
const code = route.params.code

const quote = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const copied = ref(false)

// Static for the life of this page (code/origin never change), so a plain
// const is enough - no need for a reactive computed() here. Singular
// "/quote/" - see router/index.js's public-quote route comment for why.
const publicLink = `${window.location.origin}/quote/${code}`

async function load() {
  loading.value = true
  try {
    const res = await api.get(`/quote/${code}`)
    quote.value = res.data
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
    const response = await api.get(`/quote/${code}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(response instanceof Blob ? response : new Blob([response]))
    const a = document.createElement('a')
    a.href = url
    a.download = `quote_${code}.pdf`
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
    await api.put(`/quote/${code}`, { status })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function removeQuote() {
  const ok = await confirmDialog({
    title: 'Delete this quote?',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (!ok) return
  busy.value = true
  try {
    await api.delete(`/quote/${code}`)
    router.push({ name: 'quotes' })
  } catch (e) {
    error.value = e.message
    busy.value = false
  }
}

const converting = ref(false)
async function convertToInvoice() {
  const ok = await confirmDialog({
    title: 'Convert this quote to a real invoice?',
    message: 'This will check current stock for any inventory items and cannot be undone.',
    confirmLabel: 'Convert',
  })
  if (!ok) return
  converting.value = true
  error.value = ''
  try {
    const res = await api.post(`/quote/${code}/convert`)
    router.push({ name: 'invoice-detail', params: { code: res.data.invoiceNumber } })
  } catch (e) {
    error.value = e.message
    converting.value = false
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(publicLink)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="flex items-center gap-3">
      <router-link :to="{ name: 'quotes' }" class="btn-ghost px-2">&larr;</router-link>
      <h1 class="text-lg font-semibold text-ink-900">Quote</h1>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error && !quote" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else-if="quote">
      <div class="mt-5 card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="font-mono text-sm text-ink-500">{{ quote.quoteNumber }}</p>
            <p class="mt-1 text-2xl font-semibold text-ink-900">{{ formatMoney(quote.total, quote.currency) }}</p>
          </div>
          <StatusBadge :status="quote.status" />
        </div>

        <div class="mt-6 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Customer</p>
            <p class="mt-1 text-ink-800">{{ quote.customer?.name }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Issued</p>
            <p class="mt-1 text-ink-800">{{ formatDate(quote.issueDate) }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Valid until</p>
            <p class="mt-1 text-ink-800">{{ formatDate(quote.expiryDate) || 'No expiry set' }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-ink-400">Subtotal / Tax</p>
            <p class="mt-1 text-ink-800">{{ formatMoney(quote.subtotal, quote.currency) }} / {{ formatMoney(quote.tax, quote.currency) }}</p>
          </div>
        </div>

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
              <tr v-for="(item, i) in quote.items" :key="i" class="border-t border-ink-100">
                <td class="px-3 py-2 text-ink-700">
                  {{ item.name || item.description }}
                  <p v-if="item.description && item.name" class="text-xs text-ink-400">{{ item.description }}</p>
                </td>
                <td class="px-3 py-2 text-ink-500">{{ item.quantity }}</td>
                <td class="px-3 py-2 text-ink-500">{{ formatMoney(item.unitPrice, quote.currency) }}</td>
                <td class="px-3 py-2 text-ink-700">{{ formatMoney(item.quantity * item.unitPrice, quote.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="quote.notes" class="mt-4 text-sm text-ink-500"><span class="font-medium text-ink-700">Notes:</span> {{ quote.notes }}</p>
        <p v-if="quote.terms" class="mt-1 text-sm text-ink-500"><span class="font-medium text-ink-700">Terms:</span> {{ quote.terms }}</p>

        <div v-if="quote.status === 'converted'" class="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          This quote has been converted to an invoice.
          <router-link
            v-if="quote.convertedInvoice?.invoiceNumber"
            :to="{ name: 'invoice-detail', params: { code: quote.convertedInvoice.invoiceNumber } }"
            class="font-medium underline"
          >
            View the invoice
          </router-link>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
          <button class="btn-primary" :disabled="busy" @click="downloadPdf">Download PDF</button>
          <button class="btn-secondary" @click="copyLink">{{ copied ? 'Copied!' : 'Copy quote link' }}</button>
          <button
            v-if="quote.status !== 'converted'"
            class="btn-secondary"
            :disabled="converting"
            @click="convertToInvoice"
          >
            {{ converting ? 'Converting…' : 'Convert to invoice' }}
          </button>
          <select
            v-if="quote.status !== 'converted'"
            class="input w-auto"
            :value="quote.status"
            :disabled="busy"
            @change="updateStatus($event.target.value)"
          >
            <option value="draft">Mark as draft</option>
            <option value="sent">Mark as sent</option>
            <option value="accepted">Mark as accepted</option>
            <option value="rejected">Mark as rejected</option>
            <option value="expired">Mark as expired</option>
          </select>
          <button v-if="quote.status !== 'converted'" class="btn-danger ml-auto" :disabled="busy" @click="removeQuote">Delete</button>
        </div>
      </div>

      <p v-if="error" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
