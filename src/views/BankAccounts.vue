<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const banks = ref([])
const bankList = ref([])
const form = ref({ bankCode: '', accountNumber: '', isActive: false })
const resolved = ref(null)
const resolving = ref(false)
const saving = ref(false)
const error = ref('')

async function loadBanks() {
  loading.value = true
  try {
    const [accountsRes, bankListRes] = await Promise.all([
      api.get('/entity/get-banks'),
      api.get('/utils/get-banks'),
    ])
    banks.value = accountsRes.data
    // Paystack's bank list response shape.
    bankList.value = bankListRes.data?.data || bankListRes.data || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(loadBanks)

watch([() => form.value.bankCode, () => form.value.accountNumber], async ([code, number]) => {
  resolved.value = null
  if (!code || !number || number.length < 10) return
  resolving.value = true
  try {
    const res = await api.post('/utils/resolve-bank', { bankCode: code, accountNumber: number })
    resolved.value = res.data
  } catch {
    resolved.value = null
  } finally {
    resolving.value = false
  }
})

async function addBank() {
  error.value = ''
  saving.value = true
  try {
    await api.post('/entity/add-bank', form.value)
    form.value = { bankCode: '', accountNumber: '', isActive: false }
    resolved.value = null
    await loadBanks()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-lg font-semibold text-ink-900">Bank accounts</h1>
    <p class="mt-1 text-sm text-ink-400">Connect a bank account to receive customer payments via Paystack.</p>

    <Spinner v-if="loading" />

    <template v-else>
      <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="lg:col-span-3">
          <EmptyState v-if="!banks.length" title="No bank accounts yet" description="Add one to start collecting payments." />
          <div v-else class="card divide-y divide-ink-100 overflow-hidden">
            <div v-for="b in banks" :key="b._id" class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-sm font-medium text-ink-800">{{ b.accountName }}</p>
                <p class="text-xs text-ink-400">{{ b.bankName }} · {{ b.accountNumber }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'"
              >
                {{ b.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div class="card p-5">
            <h2 class="text-sm font-semibold text-ink-800">Add a bank account</h2>
            <form class="mt-4 space-y-3" @submit.prevent="addBank">
              <div>
                <label class="label">Bank</label>
                <select v-model="form.bankCode" class="input" required>
                  <option value="" disabled>Select bank</option>
                  <option v-for="b in bankList" :key="b.code" :value="b.code">{{ b.name }}</option>
                </select>
              </div>
              <div>
                <label class="label">Account number</label>
                <input v-model="form.accountNumber" class="input" maxlength="10" required />
              </div>
              <p v-if="resolving" class="text-xs text-ink-400">Resolving account…</p>
              <p v-else-if="resolved" class="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {{ resolved.account_name }}
              </p>
              <label class="flex items-center gap-2 text-sm text-ink-600">
                <input v-model="form.isActive" type="checkbox" class="rounded border-ink-300 text-lilac-600 focus:ring-lilac-400" />
                Use this account to receive payments
              </label>

              <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

              <button type="submit" class="btn-primary w-full" :disabled="saving">
                {{ saving ? 'Adding…' : 'Add bank account' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
