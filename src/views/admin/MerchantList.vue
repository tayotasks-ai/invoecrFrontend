<script setup>
import { onMounted, ref, watch } from 'vue'
import adminApi from '../../lib/adminApi'
import { formatDate } from '../../lib/format'

const merchants = ref([])
const pagination = ref({ page: 1, pages: 1, total: 0, limit: 20 })
const loading = ref(true)
const error = ref('')

const q = ref('')
const plan = ref('')
const flag = ref('')
const PLAN_OPTIONS = ['', 'free', 'starter', 'growth', 'business']
const FLAG_OPTIONS = [
  { value: '', label: 'All merchants' },
  { value: 'test', label: 'Flagged for testing' },
  { value: 'suspended', label: 'Suspended' },
]

let searchDebounce = null
async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await adminApi.get('/admin/merchants', {
      params: { q: q.value || undefined, plan: plan.value || undefined, flag: flag.value || undefined, page, limit: pagination.value.limit },
    })
    merchants.value = res.data.data
    pagination.value = res.data.pagination
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => load(1))

watch([plan, flag], () => load(1))
watch(q, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => load(1), 300)
})
</script>

<template>
  <div>
    <div>
      <h1 class="text-lg font-semibold text-ink-900">Merchants</h1>
      <p class="mt-1 text-sm text-ink-400">Every business on invoecr - search, flag one for full-feature testing, or suspend an account.</p>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <input v-model="q" class="input max-w-xs focus:border-red-400 focus:ring-red-100" placeholder="Search by name or email" />
      <select v-model="plan" class="input max-w-[10rem]">
        <option v-for="p in PLAN_OPTIONS" :key="p" :value="p">{{ p || 'All plans' }}</option>
      </select>
      <select v-model="flag" class="input max-w-[12rem]">
        <option v-for="f in FLAG_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </div>

    <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <div class="mt-4 card overflow-hidden">
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
          <tr v-if="loading">
            <td colspan="4" class="px-4 py-6 text-center text-ink-400">Loading…</td>
          </tr>
          <tr v-else-if="!merchants.length">
            <td colspan="4" class="px-4 py-6 text-center text-ink-400">No merchants match this filter.</td>
          </tr>
          <tr
            v-for="m in merchants"
            v-else
            :key="m._id"
            class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-red-50/40"
            @click="$router.push({ name: 'root-merchant-detail', params: { code: m.code } })"
          >
            <td class="px-4 py-3">
              <p class="text-ink-800">{{ m.name }}</p>
              <p class="text-xs text-ink-400">{{ m.email }}</p>
            </td>
            <td class="px-4 py-3 capitalize text-ink-600">{{ m.plan }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex gap-1.5">
                <span v-if="m.isTestMerchant" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Testing</span>
                <span v-if="m.isSuspended" class="rounded-full bg-ink-800 px-2 py-0.5 text-xs font-medium text-white">Suspended</span>
                <span v-if="!m.emailVerified" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Unverified</span>
              </span>
            </td>
            <td class="px-4 py-3 text-ink-500">{{ formatDate(m.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.pages > 1" class="mt-4 flex items-center justify-between text-sm text-ink-500">
      <span>Page {{ pagination.page }} of {{ pagination.pages }} · {{ pagination.total }} merchants</span>
      <div class="flex gap-2">
        <button class="btn-secondary" :disabled="pagination.page <= 1" @click="load(pagination.page - 1)">Previous</button>
        <button class="btn-secondary" :disabled="pagination.page >= pagination.pages" @click="load(pagination.page + 1)">Next</button>
      </div>
    </div>
  </div>
</template>
