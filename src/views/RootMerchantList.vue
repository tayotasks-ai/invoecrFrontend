<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import { formatDate } from '../lib/format'
import Spinner from '../components/Spinner.vue'

const loading = ref(true)
const error = ref('')
const merchants = ref([])
const pagination = ref(null)
const plans = ref([])

const q = ref('')
const plan = ref('')
const flag = ref('')
const page = ref(1)

// One-off (but safe to re-run) action for the platform-fee migration - see
// AdminService.syncSubaccountFees. Not tied to any single merchant, so it
// lives here on the list page rather than on a merchant detail page.
const syncing = ref(false)
const syncResult = ref(null)
const syncError = ref('')
async function syncSubaccountFees() {
  syncing.value = true
  syncError.value = ''
  syncResult.value = null
  try {
    const res = await api.post('/admin/subaccounts/sync-fees')
    syncResult.value = res.data
  } catch (e) {
    syncError.value = e.message
  } finally {
    syncing.value = false
  }
}

async function loadPlans() {
  try {
    const res = await api.get('/entity/plans')
    plans.value = res.data || []
  } catch {
    plans.value = []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/admin/merchants', {
      params: { q: q.value || undefined, plan: plan.value || undefined, flag: flag.value || undefined, page: page.value, limit: 20 },
    })
    merchants.value = res.data.data || []
    pagination.value = res.data.pagination || null
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlans()
  load()
})

// Any filter change starts back at page 1 - a stale page number combined
// with a narrower filter can otherwise land past the end of the new result
// set and render nothing, which reads as a bug rather than "no results."
watch([q, plan, flag], () => {
  page.value = 1
  load()
})
watch(page, load)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Merchants</h1>
        <p class="mt-1 text-sm text-ink-400">
          Every business on invoecr. Flag one for full testing, suspend an account, or move it onto a different plan.
        </p>
      </div>
      <button class="btn-secondary flex-none" :disabled="syncing" @click="syncSubaccountFees">
        {{ syncing ? 'Syncing…' : 'Sync subaccount fees to 0%' }}
      </button>
    </div>

    <p v-if="syncError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ syncError }}</p>
    <div v-if="syncResult" class="mt-3 rounded-md bg-ink-50 px-3 py-2.5 text-sm text-ink-700">
      <p>
        Updated {{ syncResult.updated }} of {{ syncResult.total }} subaccount{{ syncResult.total === 1 ? '' : 's' }} to a 0% platform fee.
      </p>
      <ul v-if="syncResult.failed.length" class="mt-1.5 space-y-0.5 text-xs text-red-600">
        <li v-for="f in syncResult.failed" :key="f.bankAccountCode">{{ f.accountName }}: {{ f.message }}</li>
      </ul>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <input v-model="q" type="search" placeholder="Search name or email…" class="input max-w-xs" />
      <select v-model="plan" class="input max-w-[10rem]">
        <option value="">All plans</option>
        <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="flag" class="input max-w-[10rem]">
        <option value="">All merchants</option>
        <option value="test">Test-flagged</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <p v-if="!merchants.length" class="mt-8 text-sm text-ink-400">No merchants match those filters.</p>

      <div v-else class="mt-4 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Business</th>
              <th class="px-4 py-2.5 font-medium">Plan</th>
              <th class="px-4 py-2.5 font-medium">Flags</th>
              <th class="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in merchants"
              :key="m._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-red-50/40"
              @click="$router.push({ name: 'root-merchant-detail', params: { code: m.code } })"
            >
              <td class="px-4 py-3">
                <p class="text-ink-700">{{ m.name }}</p>
                <p class="text-xs text-ink-400">{{ m.email }}</p>
              </td>
              <td class="px-4 py-3 capitalize text-ink-600">{{ m.plan }}</td>
              <td class="px-4 py-3">
                <span v-if="m.isTestMerchant" class="mr-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Test</span>
                <span v-if="m.isSuspended" class="inline-flex items-center rounded-full bg-ink-200 px-2 py-0.5 text-xs font-medium text-ink-600">Suspended</span>
                <span v-if="!m.isTestMerchant && !m.isSuspended" class="text-xs text-ink-300">—</span>
              </td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(m.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination && pagination.pages > 1" class="mt-4 flex items-center justify-between text-sm text-ink-500">
        <span>Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} total)</span>
        <div class="flex gap-2">
          <button class="btn-ghost px-2" :disabled="!pagination.hasPrevPage" @click="page = page - 1">Previous</button>
          <button class="btn-ghost px-2" :disabled="!pagination.hasNextPage" @click="page = page + 1">Next</button>
        </div>
      </div>
    </template>
  </div>
</template>
