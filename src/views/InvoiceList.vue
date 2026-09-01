<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const invoices = ref([])
const pagination = ref({ page: 1, totalPages: 1 })
const search = ref('')
const status = ref('')
const page = ref(1)

const STATUS_OPTIONS = ['', 'draft', 'sent', 'paid', 'partially-paid', 'overdue']

async function load() {
  loading.value = true
  try {
    const res = await api.get('/invoice', {
      params: {
        page: page.value,
        perPage: 12,
        search: search.value || undefined,
        status: status.value || undefined,
      },
    })
    invoices.value = res.data.invoices
    pagination.value = res.data.pagination
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([status, page], load)

let searchTimer
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})

const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    // Respects whatever search/status filter is currently applied -
    // "export what I'm looking at", not always the full list.
    const response = await api.get('/invoice/export/csv', {
      params: { search: search.value || undefined, status: status.value || undefined },
      responseType: 'blob',
    })
    const blob = response instanceof Blob ? response : new Blob([response])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-ink-900">Invoices</h1>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" :disabled="exporting" @click="exportCsv">{{ exporting ? 'Exporting…' : 'Export CSV' }}</button>
        <router-link :to="{ name: 'invoice-create' }" class="btn-primary">+ New invoice</router-link>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <input v-model="search" type="text" placeholder="Search by invoice, customer…" class="input max-w-xs" />
      <select v-model="status" class="input max-w-[10rem]">
        <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">
          {{ opt ? opt.replace('-', ' ') : 'All statuses' }}
        </option>
      </select>
    </div>

    <Spinner v-if="loading" />

    <template v-else>
      <EmptyState
        v-if="!invoices.length"
        title="No invoices found"
        description="Try a different search or status filter, or create a new invoice."
      >
        <template #action>
          <router-link :to="{ name: 'invoice-create' }" class="btn-primary">Create an invoice</router-link>
        </template>
      </EmptyState>

      <div v-else class="mt-4 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Invoice</th>
              <th class="px-4 py-2.5 font-medium">Customer</th>
              <th class="px-4 py-2.5 font-medium">Issued</th>
              <th class="px-4 py-2.5 font-medium">Due</th>
              <th class="px-4 py-2.5 font-medium">Amount</th>
              <th class="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in invoices"
              :key="inv._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
              @click="$router.push({ name: 'invoice-detail', params: { code: inv.invoiceNumber } })"
            >
              <td class="px-4 py-3 font-mono text-xs text-ink-700">{{ inv.invoiceNumber }}</td>
              <td class="px-4 py-3 text-ink-700">{{ inv.customer?.name || '—' }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(inv.issueDate) }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(inv.dueDate) }}</td>
              <td class="px-4 py-3 text-ink-700">{{ formatMoney(inv.total, inv.currency) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="inv.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.totalPages > 1" class="mt-4 flex items-center justify-between text-sm text-ink-500">
        <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
        <div class="flex gap-2">
          <button class="btn-secondary" :disabled="!pagination.hasPrevPage" @click="page = page - 1">Previous</button>
          <button class="btn-secondary" :disabled="!pagination.hasNextPage" @click="page = page + 1">Next</button>
        </div>
      </div>
    </template>
  </div>
</template>
