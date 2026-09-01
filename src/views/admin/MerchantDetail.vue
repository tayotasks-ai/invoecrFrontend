<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import adminApi from '../../lib/adminApi'
import { formatDate } from '../../lib/format'

const route = useRoute()
const code = route.params.code

const merchant = ref(null)
const loading = ref(true)
const error = ref('')
const actionBusy = ref(false)
const actionError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminApi.get(`/admin/merchants/${code}`)
    merchant.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function toggleTestFlag() {
  actionError.value = ''
  actionBusy.value = true
  try {
    await adminApi.patch(`/admin/merchants/${code}/test-flag`, { enabled: !merchant.value.isTestMerchant })
    await load()
  } catch (e) {
    actionError.value = e.message
  } finally {
    actionBusy.value = false
  }
}

const showSuspend = ref(false)
const suspendReason = ref('')
function openSuspend() {
  suspendReason.value = ''
  actionError.value = ''
  showSuspend.value = true
}
async function confirmSuspend() {
  actionError.value = ''
  actionBusy.value = true
  try {
    await adminApi.post(`/admin/merchants/${code}/suspend`, { reason: suspendReason.value || undefined })
    showSuspend.value = false
    await load()
  } catch (e) {
    actionError.value = e.message
  } finally {
    actionBusy.value = false
  }
}
async function unsuspend() {
  actionError.value = ''
  actionBusy.value = true
  try {
    await adminApi.post(`/admin/merchants/${code}/unsuspend`)
    await load()
  } catch (e) {
    actionError.value = e.message
  } finally {
    actionBusy.value = false
  }
}

// Opens the merchant's own dashboard, signed in as them, in a new tab -
// see admin.service.js's impersonate and router/index.js's `impersonate`
// query-param bootstrap. Note this shares this browser's localStorage with
// the business app's own sign-in - avoid impersonating while also signed
// into a real business account in another tab of the same browser.
async function viewAsMerchant() {
  actionError.value = ''
  actionBusy.value = true
  try {
    const res = await adminApi.post(`/admin/merchants/${code}/impersonate`)
    const url = `${window.location.origin}/dashboard?impersonate=${encodeURIComponent(res.data.token)}`
    window.open(url, '_blank')
  } catch (e) {
    actionError.value = e.message
  } finally {
    actionBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <router-link :to="{ name: 'root-merchants' }" class="text-sm font-medium text-red-600 hover:text-red-700">&larr; Merchants</router-link>

    <p v-if="loading" class="mt-4 text-sm text-ink-400">Loading…</p>
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else-if="merchant">
      <div class="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-ink-900">{{ merchant.name }}</h1>
          <p class="text-sm text-ink-400">{{ merchant.email }}</p>
        </div>
        <span class="inline-flex gap-1.5">
          <span v-if="merchant.isTestMerchant" class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Testing</span>
          <span v-if="merchant.isSuspended" class="rounded-full bg-ink-800 px-2 py-0.5 text-xs font-medium text-white">Suspended</span>
        </span>
      </div>

      <div class="mt-6 card p-5">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-ink-400">Plan</p>
            <p class="mt-0.5 capitalize text-ink-700">{{ merchant.plan }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-400">Joined</p>
            <p class="mt-0.5 text-ink-700">{{ formatDate(merchant.createdAt) }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-400">Invoices created</p>
            <p class="mt-0.5 text-ink-700">{{ merchant.invoiceCount }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-400">Email verified</p>
            <p class="mt-0.5 text-ink-700">{{ merchant.emailVerified ? 'Yes' : 'No' }}</p>
          </div>
          <div v-if="merchant.virtualAccount?.status">
            <p class="text-xs text-ink-400">Virtual account</p>
            <p class="mt-0.5 capitalize text-ink-700">{{ merchant.virtualAccount.status }}</p>
          </div>
          <div v-if="merchant.isSuspended && merchant.suspendedReason">
            <p class="text-xs text-ink-400">Suspension reason</p>
            <p class="mt-0.5 text-ink-700">{{ merchant.suspendedReason }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 card p-5">
        <h2 class="text-sm font-semibold text-ink-800">Full-feature testing</h2>
        <p class="mt-1 text-sm text-ink-400">
          Unlocks every plan-gated feature (inventory, quotes, reminders, recurring invoices, accountant access,
          premium templates) for this merchant, regardless of what they're actually subscribed to - so you can test
          the whole app end-to-end on a real account.
        </p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="merchant.isTestMerchant ? 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50' : 'bg-red-600 text-white hover:bg-red-700'"
          :disabled="actionBusy"
          @click="toggleTestFlag"
        >
          {{ merchant.isTestMerchant ? 'Remove testing access' : 'Flag for full testing' }}
        </button>
      </div>

      <div class="mt-4 card p-5">
        <h2 class="text-sm font-semibold text-ink-800">View as this merchant</h2>
        <p class="mt-1 text-sm text-ink-400">
          Opens their dashboard, signed in as them, in a new tab - for support or debugging without needing their
          password. The session expires in 2 hours.
        </p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionBusy"
          @click="viewAsMerchant"
        >
          Open their dashboard
        </button>
      </div>

      <div class="mt-4 card border-red-100 p-5">
        <h2 class="text-sm font-semibold text-ink-800">{{ merchant.isSuspended ? 'Suspended' : 'Suspend this account' }}</h2>
        <p class="mt-1 text-sm text-ink-400">
          {{ merchant.isSuspended
            ? 'This merchant cannot sign in until unsuspended. A session already active when they were suspended keeps working until its token naturally expires.'
            : "Blocks future sign-ins for this business. Doesn't end an already-active session immediately." }}
        </p>
        <button
          v-if="!merchant.isSuspended"
          class="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionBusy"
          @click="openSuspend"
        >
          Suspend account
        </button>
        <button
          v-else
          class="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actionBusy"
          @click="unsuspend"
        >
          Unsuspend account
        </button>
      </div>

      <p v-if="actionError" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ actionError }}</p>
    </template>

    <!-- Suspend confirmation modal -->
    <div
      v-if="showSuspend"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      @click.self="showSuspend = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
        <h2 class="text-sm font-semibold text-ink-800">Suspend {{ merchant?.name }}?</h2>
        <p class="mt-1 text-xs text-ink-400">They won't be able to sign in until you unsuspend them.</p>
        <div class="mt-4">
          <label class="label">Reason <span class="text-ink-400">(optional, for your own records)</span></label>
          <input v-model="suspendReason" type="text" class="input focus:border-red-400 focus:ring-red-100" placeholder="e.g. abuse report" />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" :disabled="actionBusy" @click="showSuspend = false">Cancel</button>
          <button
            class="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="actionBusy"
            @click="confirmSuspend"
          >
            {{ actionBusy ? 'Suspending…' : 'Suspend' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
