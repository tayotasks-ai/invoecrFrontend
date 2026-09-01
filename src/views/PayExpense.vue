<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney } from '../lib/format'
import Spinner from '../components/Spinner.vue'

const route = useRoute()
const code = route.params.code

const expense = ref(null)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const submitted = ref(false)

const form = ref({
  payeeName: '',
  amount: '',
  currency: 'NGN',
  bankAccountNumber: '',
  bankAccountName: '',
  bankName: '',
})

onMounted(async () => {
  try {
    const res = await api.get(`/expense/public/${code}`)
    expense.value = res.data
    if (res.data.vendorName) form.value.payeeName = res.data.vendorName
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const res = await api.post(`/expense/public/${code}/submit`, {
      payeeName: form.value.payeeName,
      amount: Number(form.value.amount),
      currency: form.value.currency,
      bankAccountNumber: form.value.bankAccountNumber,
      bankAccountName: form.value.bankAccountName,
      bankName: form.value.bankName,
    })
    expense.value = res.data
    submitted.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-ink-50 px-4 py-10">
    <div class="mx-auto max-w-xl">
      <Spinner v-if="loading" />

      <div v-else-if="error && !expense" class="card p-6 text-center">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <div v-else-if="expense" class="card overflow-hidden">
        <div class="flex items-center justify-between bg-lilac-600 px-6 py-5 text-white">
          <div>
            <p class="text-xs uppercase tracking-wide text-lilac-100">Payment request from</p>
            <p class="text-lg font-semibold">{{ expense.entity?.name || 'A business' }}</p>
          </div>
          <img v-if="expense.entity?.logo" :src="expense.entity.logo" alt="" class="h-10 w-10 rounded-md bg-white object-contain p-1" />
        </div>

        <div class="p-6">
          <template v-if="expense.status === 'pending' && !submitted">
            <p class="text-sm text-ink-600">
              <strong>{{ expense.entity?.name || 'This business' }}</strong> owes you a payment{{ expense.description ? ` for: ${expense.description}` : '' }}.
              Enter the amount and where it should be sent, and they'll take it from here.
            </p>

            <form class="mt-5 space-y-4" @submit.prevent="onSubmit">
              <div>
                <label class="label">Your name / business name</label>
                <input v-model="form.payeeName" class="input" required placeholder="Who should this be paid to" />
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="label">Amount owed</label>
                  <input v-model.number="form.amount" type="number" min="0" step="0.01" class="input" required placeholder="0.00" />
                </div>
                <div>
                  <label class="label">Currency</label>
                  <select v-model="form.currency" class="input">
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="label">Bank name</label>
                <input v-model="form.bankName" class="input" required placeholder="e.g. GTBank" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Account number</label>
                  <input v-model="form.bankAccountNumber" class="input" required placeholder="0123456789" />
                </div>
                <div>
                  <label class="label">Account name</label>
                  <input v-model="form.bankAccountName" class="input" required placeholder="As it appears on the account" />
                </div>
              </div>

              <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

              <button type="submit" class="btn-primary w-full" :disabled="submitting">
                {{ submitting ? 'Submitting…' : 'Submit payment details' }}
              </button>
              <p class="text-center text-xs text-ink-400">
                Only {{ expense.entity?.name || 'this business' }} will see these details. Double-check them before submitting - they can't be changed afterwards.
              </p>
            </form>
          </template>

          <div v-else-if="expense.status === 'submitted' || submitted" class="py-4 text-center">
            <p class="text-sm font-medium text-emerald-700">Payment details submitted</p>
            <p v-if="expense.amount" class="mt-2 text-2xl font-semibold text-ink-900">{{ formatMoney(expense.amount, expense.currency) }}</p>
            <p class="mt-2 text-sm text-ink-500">
              {{ expense.entity?.name || 'The business' }} has your details and will pay you soon. No further action needed.
            </p>
          </div>

          <div v-else-if="expense.status === 'paid'" class="py-4 text-center">
            <p class="text-sm font-medium text-emerald-700">This has already been paid</p>
            <p class="mt-2 text-sm text-ink-500">Thanks - nothing more to do here.</p>
          </div>

          <div v-else-if="expense.status === 'cancelled'" class="py-4 text-center">
            <p class="text-sm font-medium text-ink-600">This request has been cancelled</p>
            <p class="mt-2 text-sm text-ink-500">{{ expense.entity?.name || 'The business' }} withdrew this payment request.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
