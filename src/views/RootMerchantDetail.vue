<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatDate } from '../lib/format'
import Spinner from '../components/Spinner.vue'

const route = useRoute()
const code = route.params.code

const merchant = ref(null)
const plans = ref([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [merchantRes, plansRes] = await Promise.all([
      api.get(`/admin/merchants/${code}`),
      plans.value.length ? Promise.resolve({ data: plans.value }) : api.get('/entity/plans'),
    ])
    merchant.value = merchantRes.data
    plans.value = plansRes.data || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function toggleTestFlag() {
  busy.value = true
  error.value = ''
  try {
    await api.patch(`/admin/merchants/${code}/test-flag`, { enabled: !merchant.value.isTestMerchant })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const showSuspend = ref(false)
const suspendReason = ref('')
function openSuspend() {
  suspendReason.value = ''
  showSuspend.value = true
}
async function confirmSuspend() {
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/merchants/${code}/suspend`, { reason: suspendReason.value || undefined })
    showSuspend.value = false
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
async function unsuspend() {
  busy.value = true
  error.value = ''
  try {
    await api.post(`/admin/merchants/${code}/unsuspend`)
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const planSelection = ref('')
async function changePlan() {
  if (!planSelection.value) return
  busy.value = true
  error.value = ''
  try {
    await api.patch(`/admin/merchants/${code}/plan`, { plan: planSelection.value })
    planSelection.value = ''
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <router-link :to="{ name: 'root-merchants' }" class="text-sm font-medium text-red-600 hover:text-red-700">&larr; Merchants</router-link>

    <Spinner v-if="loading" />
    <p v-else-if="error && !merchant" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else-if="merchant">
      <div class="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-ink-900">{{ merchant.name }}</h1>
          <p class="text-sm text-ink-400">{{ merchant.email }} &middot; joined {{ formatDate(merchant.createdAt) }}</p>
        </div>
        <div class="flex flex-none gap-1.5">
          <span v-if="merchant.isTestMerchant" class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Test</span>
          <span v-if="merchant.isSuspended" class="inline-flex items-center rounded-full bg-ink-200 px-2.5 py-0.5 text-xs font-medium text-ink-600">Suspended</span>
        </div>
      </div>

      <!-- Usage snapshot -->
      <div class="mt-6 grid grid-cols-3 gap-3">
        <div class="card p-4">
          <p class="text-xs text-ink-400">Invoices</p>
          <p class="mt-1 text-lg font-semibold text-ink-900">{{ merchant.invoiceCount }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-ink-400">Expenses</p>
          <p class="mt-1 text-lg font-semibold text-ink-900">{{ merchant.expenseCount }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-ink-400">Customers</p>
          <p class="mt-1 text-lg font-semibold text-ink-900">{{ merchant.customerCount }}</p>
        </div>
      </div>

      <!-- Virtual account, if activated -->
      <div v-if="merchant.virtualAccount?.status" class="mt-4 card p-4 text-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Virtual account (Seerbit)</p>
        <p v-if="merchant.virtualAccount.status === 'active'" class="mt-1 text-ink-700">
          {{ merchant.virtualAccount.accountName }} &middot; {{ merchant.virtualAccount.accountNumber }} &middot; {{ merchant.virtualAccount.bankName }}
        </p>
        <p v-else class="mt-1 text-red-600">Failed: {{ merchant.virtualAccount.error }}</p>
      </div>

      <!-- Plan -->
      <div class="mt-4 card p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Plan</p>
        <p class="mt-1 text-sm capitalize text-ink-700">{{ merchant.plan }}</p>
        <div class="mt-3 flex items-center gap-2">
          <select v-model="planSelection" class="input max-w-[10rem] text-sm">
            <option value="">Move to plan…</option>
            <option v-for="p in plans" :key="p.id" :value="p.id" :disabled="p.id === merchant.plan">{{ p.name }}</option>
          </select>
          <button class="btn-secondary text-sm" :disabled="busy || !planSelection" @click="changePlan">Change plan</button>
        </div>
        <p class="mt-1.5 text-xs text-ink-400">Sets the plan directly - bypasses Paystack, no charge to the merchant.</p>
      </div>

      <!-- Testing flag -->
      <div class="mt-4 card p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Full testing</p>
        <p class="mt-1 text-sm text-ink-600">
          {{ merchant.isTestMerchant ? 'Every plan-gated feature is unlocked for this merchant, regardless of their actual plan.' : 'This merchant only has access to features their real plan allows.' }}
        </p>
        <button class="btn-secondary mt-3 text-sm" :disabled="busy" @click="toggleTestFlag">
          {{ merchant.isTestMerchant ? 'Remove test flag' : 'Flag for full testing' }}
        </button>
      </div>

      <!-- Suspend -->
      <div class="mt-4 card p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Account access</p>
        <p v-if="merchant.isSuspended" class="mt-1 text-sm text-ink-600">
          Suspended {{ formatDate(merchant.suspendedAt) }}<span v-if="merchant.suspendedReason"> - {{ merchant.suspendedReason }}</span>. Existing sessions stay valid until they naturally expire; suspension only blocks new sign-ins.
        </p>
        <p v-else class="mt-1 text-sm text-ink-600">This merchant can sign in normally.</p>
        <button v-if="!merchant.isSuspended" class="btn-danger mt-3 text-sm" :disabled="busy" @click="openSuspend">
          Suspend account
        </button>
        <button v-else class="btn-secondary mt-3 text-sm" :disabled="busy" @click="unsuspend">
          Reactivate account
        </button>
      </div>

      <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
    </template>

    <!-- Suspend confirmation modal -->
    <div v-if="showSuspend" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" @click.self="showSuspend = false">
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
        <h2 class="text-sm font-semibold text-ink-800">Suspend {{ merchant?.name }}?</h2>
        <p class="mt-1 text-xs text-ink-400">Blocks new sign-ins immediately. Reversible any time.</p>
        <div class="mt-4">
          <label class="label">Reason <span class="text-ink-400">(optional, internal only)</span></label>
          <input v-model="suspendReason" type="text" class="input" placeholder="e.g. abuse report" />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" :disabled="busy" @click="showSuspend = false">Cancel</button>
          <button class="btn-danger" :disabled="busy" @click="confirmSuspend">
            {{ busy ? 'Suspending…' : 'Suspend' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
