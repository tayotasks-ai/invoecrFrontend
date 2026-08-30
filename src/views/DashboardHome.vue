<script setup>
import { onMounted, ref, computed } from 'vue'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { formatMoney, formatDate } from '../lib/format'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'
import RevenueTrendChart from '../components/RevenueTrendChart.vue'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const invoices = ref([])
const overview = ref(null)

onMounted(async () => {
  try {
    // The recent-invoices table only needs a page of invoices; the
    // financial numbers above it come from a dedicated reporting endpoint
    // that aggregates across *every* invoice/transaction on the backend,
    // not just whatever page happens to be loaded here (see
    // reporting.service.js - this used to be computed client-side over the
    // last 100 invoices, which was never a real total).
    const [invoicesRes, overviewRes] = await Promise.all([
      api.get('/invoice', { params: { perPage: 6, orderBy: 'issueDate', orderDirection: 'desc' } }),
      api.get('/reports/overview'),
    ])
    invoices.value = invoicesRes.data.invoices
    overview.value = overviewRes.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const currency = computed(() => overview.value?.currency || 'NGN')
const maxTopCustomer = computed(() =>
  Math.max(1, ...(overview.value?.topCustomers || []).map((c) => c.totalCollected))
)
const maxAging = computed(() => Math.max(1, ...(overview.value?.aging || []).map((a) => a.total)))
const hasOutstanding = computed(() => (overview.value?.cashFlow.outstanding.count || 0) > 0)

const AGING_BAR_COLOR = {
  current: 'bg-ink-300',
  '1-30': 'bg-amber-300',
  '31-60': 'bg-amber-500',
  '61-90': 'bg-orange-500',
  '90+': 'bg-red-600',
}
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
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Collected this month"
          :value="formatMoney(overview.cashFlow.collected.current, currency)"
          :delta="{ value: overview.cashFlow.collected.changePct, goodDirection: 'up' }"
        />
        <StatCard
          label="Outstanding"
          :value="formatMoney(overview.cashFlow.outstanding.total, currency)"
          :hint="`${overview.cashFlow.outstanding.count} unpaid invoice${overview.cashFlow.outstanding.count === 1 ? '' : 's'}`"
        />
        <StatCard
          label="Overdue"
          :value="formatMoney(overview.cashFlow.overdue.total, currency)"
          :hint="`${overview.cashFlow.overdue.count} overdue invoice${overview.cashFlow.overdue.count === 1 ? '' : 's'}`"
        />
      </div>

      <div class="mt-6 card p-5">
        <div class="mb-1">
          <h2 class="text-sm font-semibold text-ink-800">Revenue</h2>
          <p class="text-xs text-ink-400">Money collected vs. money invoiced, last 12 months.</p>
        </div>
        <RevenueTrendChart :data="overview.revenueTrend" :currency="currency" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <h2 class="mb-3 text-sm font-semibold text-ink-800">Top customers</h2>
          <EmptyState
            v-if="!overview.topCustomers.length"
            title="No payments collected yet"
            description="Your best customers by revenue will show up here once invoices get paid."
          />
          <ul v-else class="space-y-3">
            <li v-for="(c, i) in overview.topCustomers" :key="c.customerId" class="relative">
              <div
                class="absolute inset-y-0 left-0 rounded-md bg-lilac-50"
                :style="{ width: `${(c.totalCollected / maxTopCustomer) * 100}%` }"
              />
              <div class="relative flex items-center justify-between gap-3 px-2 py-1.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-500">{{ i + 1 }}</span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink-800">{{ c.name }}</p>
                    <p class="truncate text-xs text-ink-400">{{ c.invoiceCount }} invoice{{ c.invoiceCount === 1 ? '' : 's' }} paid</p>
                  </div>
                </div>
                <p class="flex-none text-sm font-semibold text-ink-800">{{ formatMoney(c.totalCollected, currency) }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="card p-5">
          <h2 class="mb-3 text-sm font-semibold text-ink-800">Aging</h2>
          <EmptyState
            v-if="!hasOutstanding"
            title="Nothing outstanding"
            description="Every invoice is either paid or not sent yet - nothing to chase."
          />
          <ul v-else class="space-y-2.5">
            <li v-for="a in overview.aging" :key="a.bucket">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="font-medium text-ink-600">{{ a.label }}</span>
                <span class="text-ink-400">{{ formatMoney(a.total, currency) }} &middot; {{ a.count }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  class="h-full rounded-full"
                  :class="AGING_BAR_COLOR[a.bucket]"
                  :style="{ width: `${Math.max((a.total / maxAging) * 100, a.total > 0 ? 3 : 0)}%` }"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-ink-800">Recent invoices</h2>
          <router-link :to="{ name: 'invoices' }" class="text-sm font-medium text-lilac-600 hover:text-lilac-700">View all</router-link>
        </div>

        <EmptyState
          v-if="!invoices.length"
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
                v-for="inv in invoices"
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
