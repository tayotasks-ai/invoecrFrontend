<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import StatCard from '../components/StatCard.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const error = ref('')
const expenses = ref([])
const status = ref('')
const stats = ref(null)

const STATUS_OPTIONS = ['', 'pending', 'submitted', 'paid', 'cancelled']

async function load() {
  loading.value = true
  try {
    const res = await api.get('/expense', { params: { status: status.value || undefined } })
    expenses.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(status, load)

// Separate from the filtered list load above - the stat cards always show
// totals across every status, regardless of which status filter the table
// itself is currently narrowed to, so this isn't re-run on `status` changes.
// Best-effort: a failed/slow stats call shouldn't block the list from
// showing.
onMounted(() => {
  api
    .get('/expense/stats')
    .then((res) => {
      stats.value = res.data
    })
    .catch(() => {})
})

const showCreate = ref(false)
const createForm = ref({ vendorEmail: '', vendorName: '', description: '' })
const createBusy = ref(false)
const createError = ref('')

function openCreate() {
  createForm.value = { vendorEmail: '', vendorName: '', description: '' }
  createError.value = ''
  showCreate.value = true
}
function closeCreate() {
  showCreate.value = false
}
async function submitCreate() {
  createError.value = ''
  createBusy.value = true
  try {
    await api.post('/expense', createForm.value)
    showCreate.value = false
    await load()
  } catch (e) {
    createError.value = e.message
  } finally {
    createBusy.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Expenses</h1>
        <p class="mt-1 text-sm text-ink-400">
          Money you owe, not money you're owed - email a vendor, they fill in the amount and where to send it, you pay when ready.
        </p>
      </div>
      <button class="btn-primary flex-none" @click="openCreate">+ New expense</button>
    </div>

    <div v-if="stats" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Awaiting vendor details"
        :value="stats.pending.count"
        hint="Requests sent, waiting for the vendor to fill in amount + bank details"
      />
      <StatCard
        label="Ready to pay"
        :value="formatMoney(stats.submitted.total, stats.currency)"
        :hint="`${stats.submitted.count} expense${stats.submitted.count === 1 ? '' : 's'} with details on file`"
      />
      <StatCard
        label="Paid this month"
        :value="formatMoney(stats.paidThisMonth.total, stats.currency)"
        :hint="`${stats.paidThisMonth.count} expense${stats.paidThisMonth.count === 1 ? '' : 's'} paid`"
      />
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <select v-model="status" class="input max-w-[10rem]">
        <option v-for="opt in STATUS_OPTIONS" :key="opt" :value="opt">
          {{ opt || 'All statuses' }}
        </option>
      </select>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <EmptyState
        v-if="!expenses.length"
        title="No expenses yet"
        description="Email a vendor or supplier to get their payment details on file - you'll see it here the moment they fill it in."
      >
        <template #action>
          <button class="btn-primary" @click="openCreate">Request payment details</button>
        </template>
      </EmptyState>

      <div v-else class="mt-4 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Vendor</th>
              <th class="px-4 py-2.5 font-medium">Description</th>
              <th class="px-4 py-2.5 font-medium">Amount</th>
              <th class="px-4 py-2.5 font-medium">Requested</th>
              <th class="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="e in expenses"
              :key="e._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
              @click="$router.push({ name: 'expense-detail', params: { code: e.code } })"
            >
              <td class="px-4 py-3 text-ink-700">{{ e.payeeName || e.vendorName || e.vendorEmail }}</td>
              <td class="px-4 py-3 text-ink-500">{{ e.description || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ e.amount ? formatMoney(e.amount, e.currency) : '—' }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(e.createdAt) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="e.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- New expense request modal -->
    <div
      v-if="showCreate"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      @click.self="closeCreate"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
        <h2 class="text-sm font-semibold text-ink-800">Request payment details</h2>
        <p class="mt-1 text-xs text-ink-400">
          We'll email this vendor a link to fill in how much you owe and where to send it - you don't need to know either yet.
        </p>

        <div class="mt-4 space-y-3">
          <div>
            <label class="label">Vendor email</label>
            <input v-model="createForm.vendorEmail" type="email" class="input" required placeholder="vendor@supplier.com" />
          </div>
          <div>
            <label class="label">Vendor name <span class="text-ink-400">(optional)</span></label>
            <input v-model="createForm.vendorName" class="input" placeholder="e.g. Bright Supplies Ltd" />
          </div>
          <div>
            <label class="label">What's this for? <span class="text-ink-400">(optional)</span></label>
            <input v-model="createForm.description" class="input" placeholder="e.g. August raw materials" />
          </div>
        </div>

        <p v-if="createError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{{ createError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" :disabled="createBusy" @click="closeCreate">Cancel</button>
          <button class="btn-primary" :disabled="createBusy || !createForm.vendorEmail" @click="submitCreate">
            {{ createBusy ? 'Sending…' : 'Send request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
