<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import { confirmDialog } from '../composables/useConfirm'

const route = useRoute()
const code = route.params.code

const expense = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const copied = ref(false)

const payLink = computed(() => `${window.location.origin}/pay-expense/${code}`)

async function load() {
  loading.value = true
  try {
    const res = await api.get(`/expense/${code}`)
    expense.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(payLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard access denied - silently ignore, the link is on screen to copy by hand */
  }
}

async function cancelRequest() {
  const ok = await confirmDialog({
    title: 'Cancel this payment request?',
    message: 'The link will stop working.',
    confirmLabel: 'Cancel request',
    cancelLabel: 'Keep it',
    danger: true,
  })
  if (!ok) return
  busy.value = true
  try {
    await api.post(`/expense/${code}/cancel`)
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const showRecordPayment = ref(false)
const recordNote = ref('')
const recordBusy = ref(false)
const recordError = ref('')

function openRecordPayment() {
  recordNote.value = ''
  recordError.value = ''
  showRecordPayment.value = true
}
function closeRecordPayment() {
  showRecordPayment.value = false
}
async function submitRecordPayment() {
  recordError.value = ''
  recordBusy.value = true
  try {
    await api.post(`/expense/${code}/record-payment`, { note: recordNote.value || undefined })
    showRecordPayment.value = false
    await load()
  } catch (e) {
    recordError.value = e.message
  } finally {
    recordBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <router-link :to="{ name: 'expenses' }" class="text-sm font-medium text-lilac-600 hover:text-lilac-700">&larr; Expenses</router-link>

    <Spinner v-if="loading" />
    <p v-else-if="error && !expense" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else-if="expense">
      <div class="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-ink-900">{{ expense.payeeName || expense.vendorName || expense.vendorEmail }}</h1>
          <p class="text-sm text-ink-400">{{ expense.description || 'No description' }}</p>
        </div>
        <StatusBadge :status="expense.status" />
      </div>

      <div class="mt-6 card p-5">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-ink-400">Vendor email</p>
            <p class="mt-0.5 text-ink-700">{{ expense.vendorEmail }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-400">Requested</p>
            <p class="mt-0.5 text-ink-700">{{ formatDate(expense.createdAt) }}</p>
          </div>
          <div v-if="expense.amount">
            <p class="text-xs text-ink-400">Amount owed</p>
            <p class="mt-0.5 text-lg font-semibold text-ink-900">{{ formatMoney(expense.amount, expense.currency) }}</p>
          </div>
          <div v-if="expense.submittedAt">
            <p class="text-xs text-ink-400">Details submitted</p>
            <p class="mt-0.5 text-ink-700">{{ formatDate(expense.submittedAt) }}</p>
          </div>
        </div>

        <div v-if="expense.bankAccountNumber" class="mt-4 rounded-md bg-ink-50 p-3 text-sm">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Pay to</p>
          <p class="mt-1 text-ink-800">{{ expense.bankAccountName }}</p>
          <p class="text-ink-600">{{ expense.bankAccountNumber }} &middot; {{ expense.bankName }}</p>
        </div>

        <div v-if="expense.status === 'paid'" class="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Paid {{ formatDate(expense.paidAt) }}{{ expense.paidVia === 'manual' ? ' (recorded manually)' : '' }}.
          <span v-if="expense.paymentNote"> {{ expense.paymentNote }}</span>
        </div>

        <div v-if="expense.status === 'pending'" class="mt-4">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Share this link with the vendor</p>
          <div class="mt-1.5 flex items-center gap-2">
            <input :value="payLink" readonly class="input flex-1 font-mono text-xs" @focus="$event.target.select()" />
            <button class="btn-secondary flex-none" @click="copyLink">{{ copied ? 'Copied!' : 'Copy' }}</button>
          </div>
          <p class="mt-1 text-xs text-ink-400">Already emailed automatically - this is here in case you'd rather share it yourself.</p>
        </div>
      </div>

      <p v-if="error" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button v-if="expense.status !== 'paid' && expense.status !== 'cancelled'" class="btn-ghost text-red-500" :disabled="busy" @click="cancelRequest">
          Cancel request
        </button>
        <button v-if="expense.status === 'submitted'" class="btn-primary" @click="openRecordPayment">
          Mark as paid
        </button>
      </div>

      <!-- Record-payment modal - the business paid outside invoecr and is
           recording that it's done. -->
      <div
        v-if="showRecordPayment"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
        @click.self="closeRecordPayment"
      >
        <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
          <h2 class="text-sm font-semibold text-ink-800">Mark as paid</h2>
          <p class="mt-1 text-xs text-ink-400">
            Confirms you've sent {{ formatMoney(expense.amount, expense.currency) }} to {{ expense.bankAccountName }} yourself - invoecr doesn't move the money.
          </p>

          <div class="mt-4">
            <label class="label">Note <span class="text-ink-400">(optional)</span></label>
            <input v-model="recordNote" type="text" class="input" placeholder="e.g. transfer reference" />
          </div>

          <p v-if="recordError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{{ recordError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button class="btn-ghost" :disabled="recordBusy" @click="closeRecordPayment">Cancel</button>
            <button class="btn-primary" :disabled="recordBusy" @click="submitRecordPayment">
              {{ recordBusy ? 'Saving…' : 'Confirm paid' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
