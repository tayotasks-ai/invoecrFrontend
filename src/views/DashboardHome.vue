<script setup>
import { onMounted, ref, computed } from 'vue'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { formatMoney, formatDate } from '../lib/format'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
const loading = ref(true)
const invoices = ref([])

onMounted(async () => {
  try {
    const res = await api.get('/invoice', { params: { perPage: 100, orderBy: 'issueDate', orderDirection: 'desc' } })
    invoices.value = res.data.invoices
  } finally {
    loading.value = false
  }
})

// These stats are computed over the most recent page of invoices fetched
// above (up to 100), not a full historical aggregate - there's no dedicated
// reporting endpoint on the backend yet (it's on the roadmap).
const outstanding = computed(() =>
  invoices.value.filter((i) => ['sent', 'partially-paid', 'overdue'].includes(i.status))
)
const paid = computed(() => invoices.value.filter((i) => i.status === 'paid'))
const outstandingTotal = computed(() => outstanding.value.reduce((sum, i) => sum + (i.total || 0), 0))
const recent = computed(() => invoices.value.slice(0, 6))
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Welcome back{{ auth.entity?.first_name ? `, ${auth.entity.first_name}` : '' }}</h1>
        <p class="text-sm text-ink-400">Here's what's happening with {{ auth.businessName }}.</p>
      </div>
      <router-link :to="{ name: 'invoice-create' }" class="btn-primary">+ New invoice</router-link>
    </div>

    <Spinner v-if="loading" />

    <template v-else>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Invoices" :value="invoices.length" hint="most recent 100" />
        <StatCard label="Outstanding" :value="formatMoney(outstandingTotal)" :hint="`${outstanding.length} unpaid invoices`" />
        <StatCard label="Paid" :value="paid.length" hint="invoices marked paid" />
      </div>

      <div class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-ink-800">Recent invoices</h2>
          <router-link :to="{ name: 'invoices' }" class="text-sm font-medium text-lilac-600 hover:text-lilac-700">View all</router-link>
        </div>

        <EmptyState
          v-if="!recent.length"
          title="No invoices yet"
          description="Create your first invoice to see it show up here."
        >
          <template #action>
            <router-link :to="{ name: 'invoice-create' }" class="btn-primary">Create an invoice</router-link>
          </template>
        </EmptyState>

        <div v-else class="card overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th class="px-4 py-2.5 font-medium">Invoice</th>
                <th class="px-4 py-2.5 font-medium">Customer</th>
                <th class="px-4 py-2.5 font-medium">Amount</th>
                <th class="px-4 py-2.5 font-medium">Due</th>
                <th class="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inv in recent"
                :key="inv._id"
                class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
                @click="$router.push({ name: 'invoice-detail', params: { code: inv.invoiceNumber } })"
              >
                <td class="px-4 py-3 font-mono text-xs text-ink-700">{{ inv.invoiceNumber }}</td>
                <td class="px-4 py-3 text-ink-700">{{ inv.customer?.name || '—' }}</td>
                <td class="px-4 py-3 text-ink-700">{{ formatMoney(inv.total, inv.currency) }}</td>
                <td class="px-4 py-3 text-ink-500">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-4 py-3"><StatusBadge :status="inv.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
