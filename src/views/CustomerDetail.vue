<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const route = useRoute()
const code = route.params.code

const statement = ref(null)
const loading = ref(true)
const error = ref('')
const downloading = ref(false)

const currency = computed(() => statement.value?.currency || 'NGN')

onMounted(async () => {
  try {
    const res = await api.get(`/customer/${code}/statement`)
    statement.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function downloadPdf() {
  downloading.value = true
  try {
    const response = await api.get(`/customer/${code}/statement/download`, { responseType: 'blob' })
    const blob = response instanceof Blob ? response : new Blob([response])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_${(statement.value?.customer?.name || code).replace(/[^a-z0-9]/gi, '_')}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div>
    <router-link :to="{ name: 'customers' }" class="text-sm font-medium text-lilac-600 hover:text-lilac-700">&larr; Customers</router-link>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <div class="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-ink-900">{{ statement.customer.name }}</h1>
          <p class="text-sm text-ink-400">
            {{ statement.customer.email || 'No email on file' }}<span v-if="statement.customer.phone"> &middot; {{ statement.customer.phone }}</span>
          </p>
        </div>
        <button class="btn-secondary flex-none" :disabled="downloading" @click="downloadPdf">
          {{ downloading ? 'Preparing…' : 'Download statement PDF' }}
        </button>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="card p-4">
          <p class="text-xs text-ink-400">Total invoiced</p>
          <p class="mt-1 text-lg font-semibold text-ink-900">{{ formatMoney(statement.totalInvoiced, currency) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-ink-400">Total paid</p>
          <p class="mt-1 text-lg font-semibold text-ink-900">{{ formatMoney(statement.totalPaid, currency) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-ink-400">Balance due</p>
          <p class="mt-1 text-lg font-semibold text-lilac-600">{{ formatMoney(statement.balanceDue, currency) }}</p>
        </div>
      </div>

      <div class="mt-6">
        <h2 class="mb-3 text-sm font-semibold text-ink-800">Statement of account</h2>

        <EmptyState
          v-if="!statement.ledger.length"
          title="No activity yet"
          description="Invoices and payments for this customer will show up here."
        />

        <div v-else class="card overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th class="px-4 py-2.5 font-medium">Date</th>
                <th class="px-4 py-2.5 font-medium">Description</th>
                <th class="px-4 py-2.5 font-medium text-right">Charge</th>
                <th class="px-4 py-2.5 font-medium text-right">Payment</th>
                <th class="px-4 py-2.5 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(entry, i) in statement.ledger"
                :key="i"
                class="border-b border-ink-100 last:border-0"
                :class="entry.type === 'invoice' ? 'cursor-pointer hover:bg-lilac-50/40' : ''"
                @click="entry.type === 'invoice' && $router.push({ name: 'invoice-detail', params: { code: entry.invoiceNumber } })"
              >
                <td class="px-4 py-3 text-ink-500">{{ formatDate(entry.date) }}</td>
                <td class="px-4 py-3 text-ink-700">{{ entry.label }}</td>
                <td class="px-4 py-3 text-right text-ink-700">{{ entry.type === 'invoice' ? formatMoney(entry.amount, currency) : '—' }}</td>
                <td class="px-4 py-3 text-right text-ink-700">{{ entry.type === 'payment' ? formatMoney(-entry.amount, currency) : '—' }}</td>
                <td class="px-4 py-3 text-right font-medium text-ink-900">{{ formatMoney(entry.balance, currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
