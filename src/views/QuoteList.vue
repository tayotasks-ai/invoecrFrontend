<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import { useAuthStore } from '../stores/auth'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
// Quotes are a Growth-plan+ feature (see backend config/plans.js). Viewing
// quotes you already made stays available even on a lower plan (e.g. after
// a downgrade) - only creating new ones is gated, which is what the "+ New
// quote" buttons below check for. Strictly `=== true` (not just truthy)
// so the button starts hidden rather than flashing on and then failing,
// before planDetails has loaded from refreshEntity() below.
const allowQuotes = () => auth.entity?.planDetails?.allowQuotes === true

const loading = ref(true)
const quotes = ref([])
const pagination = ref({ page: 1, totalPages: 1 })
const search = ref('')
const status = ref('')
const page = ref(1)

const STATUS_OPTIONS = ['', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']

async function load() {
  loading.value = true
  try {
    const res = await api.get('/quote', {
      params: {
        page: page.value,
        perPage: 12,
        search: search.value || undefined,
        status: status.value || undefined,
      },
    })
    quotes.value = res.data.quotes
    pagination.value = res.data.pagination
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  auth.refreshEntity().catch(() => null)
})
watch([status, page], load)

let searchTimer
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Quotes</h1>
        <p class="mt-1 text-sm text-ink-400">Send a price estimate first, then convert it to a real invoice once the customer's on board.</p>
      </div>
      <router-link v-if="allowQuotes()" :to="{ name: 'quote-create' }" class="btn-primary">+ New quote</router-link>
      <router-link v-else :to="{ name: 'billing' }" class="btn-secondary" title="Quotes are a Growth-plan feature">
        Upgrade to create quotes
      </router-link>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <input v-model="search" type="text" placeholder="Search by quote number…" class="input max-w-xs" />
      <select v-model="status" class="input max-w-[10rem]">
        <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">
          {{ opt ? opt.replace('-', ' ') : 'All statuses' }}
        </option>
      </select>
    </div>

    <Spinner v-if="loading" />

    <template v-else>
      <EmptyState
        v-if="!quotes.length"
        title="No quotes found"
        description="Try a different search or status filter, or create a new quote."
      >
        <template #action>
          <router-link v-if="allowQuotes()" :to="{ name: 'quote-create' }" class="btn-primary">Create a quote</router-link>
          <router-link v-else :to="{ name: 'billing' }" class="btn-primary">Upgrade to create quotes</router-link>
        </template>
      </EmptyState>

      <div v-else class="mt-4 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Quote</th>
              <th class="px-4 py-2.5 font-medium">Customer</th>
              <th class="px-4 py-2.5 font-medium">Issued</th>
              <th class="px-4 py-2.5 font-medium">Valid until</th>
              <th class="px-4 py-2.5 font-medium">Amount</th>
              <th class="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in quotes"
              :key="q._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
              @click="$router.push({ name: 'quote-detail', params: { code: q.quoteNumber } })"
            >
              <td class="px-4 py-3 font-mono text-xs text-ink-700">{{ q.quoteNumber }}</td>
              <td class="px-4 py-3 text-ink-700">{{ q.customer?.name || '—' }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(q.issueDate) }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(q.expiryDate) || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ formatMoney(q.total, q.currency) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="q.status" /></td>
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
