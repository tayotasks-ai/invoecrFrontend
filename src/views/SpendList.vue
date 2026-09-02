<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import { SPEND_CATEGORIES, CATEGORY_LABEL, PAYMENT_METHODS } from '../lib/spendCategories'
import { confirmDialog } from '../composables/useConfirm'
import StatCard from '../components/StatCard.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const error = ref('')
const spend = ref([])
const category = ref('')
const stats = ref(null)

const MAX_RECEIPT_BYTES = 2 * 1024 * 1024

async function load() {
  loading.value = true
  try {
    const res = await api.get('/spend', { params: { category: category.value || undefined } })
    spend.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(category, load)

// Separate from the filtered list above, same reasoning as ExpenseList.vue's
// stats call - always totals across every category, not just the current
// filter, and best-effort so a slow/failed stats call never blocks the list.
function loadStats() {
  api
    .get('/spend/stats')
    .then((res) => {
      stats.value = res.data
    })
    .catch(() => {})
}
onMounted(loadStats)

const emptyForm = () => ({
  category: '',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash',
  payee: '',
})

const showForm = ref(false)
const editingCode = ref(null) // null = creating, otherwise editing this record
const form = ref(emptyForm())
const receiptFile = ref(null)
const formBusy = ref(false)
const formError = ref('')

function openCreate() {
  editingCode.value = null
  form.value = emptyForm()
  receiptFile.value = null
  formError.value = ''
  showForm.value = true
}
function openEdit(s) {
  editingCode.value = s.code
  form.value = {
    category: s.category,
    description: s.description || '',
    amount: s.amount,
    date: (s.date || s.createdAt || '').slice(0, 10),
    paymentMethod: s.paymentMethod || 'other',
    payee: s.payee || '',
  }
  receiptFile.value = null
  formError.value = ''
  showForm.value = true
}
function closeForm() {
  showForm.value = false
}

function onReceiptChange(e) {
  const file = e.target.files?.[0]
  if (!file) {
    receiptFile.value = null
    return
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    formError.value = 'Receipt image must be smaller than 2MB.'
    e.target.value = ''
    receiptFile.value = null
    return
  }
  receiptFile.value = file
}

async function uploadReceiptIfAny(code) {
  if (!receiptFile.value) return
  const formData = new FormData()
  formData.append('file', receiptFile.value)
  // Best-effort - the spend record itself is already saved at this point,
  // so a failed receipt upload shouldn't lose the rest of the entry or
  // block navigation away from the form.
  await api.post(`/spend/${code}/receipt`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => null)
}

async function submitForm() {
  formError.value = ''
  formBusy.value = true
  try {
    const payload = {
      category: form.value.category,
      description: form.value.description || undefined,
      amount: Number(form.value.amount),
      date: form.value.date || undefined,
      paymentMethod: form.value.paymentMethod,
      payee: form.value.payee || undefined,
    }
    let code = editingCode.value
    if (code) {
      await api.patch(`/spend/${code}`, payload)
    } else {
      const res = await api.post('/spend', payload)
      code = res.data.code
    }
    await uploadReceiptIfAny(code)
    showForm.value = false
    await Promise.all([load(), loadStats()])
  } catch (e) {
    formError.value = e.message
  } finally {
    formBusy.value = false
  }
}

async function removeSpend(s) {
  const ok = await confirmDialog({
    title: 'Delete this spend record?',
    message: `${CATEGORY_LABEL[s.category] || s.category} - ${formatMoney(s.amount, s.currency)}. This cannot be undone.`,
    confirmLabel: 'Delete',
    danger: true,
  })
  if (!ok) return
  try {
    await api.delete(`/spend/${s.code}`)
    await Promise.all([load(), loadStats()])
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Spending</h1>
        <p class="mt-1 text-sm text-ink-400">
          Money you've actually spent - rent, fuel, supplies, subscriptions. Categorized so your cash-flow numbers on the Overview page show where it went, not just how much left.
        </p>
      </div>
      <button class="btn-primary flex-none" @click="openCreate">+ Log spending</button>
    </div>

    <div v-if="stats" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        label="Spent this month"
        :value="formatMoney(stats.thisMonth.total, stats.currency)"
        :hint="`${stats.thisMonth.count} record${stats.thisMonth.count === 1 ? '' : 's'} logged`"
      />
      <StatCard
        v-if="stats.byCategory.length"
        label="Biggest category this month"
        :value="CATEGORY_LABEL[stats.byCategory[0].category] || stats.byCategory[0].category"
        :hint="formatMoney(stats.byCategory[0].total, stats.currency)"
      />
      <StatCard v-else label="Biggest category this month" value="—" hint="Nothing logged yet this month" />
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <select v-model="category" class="input max-w-[14rem]">
        <option value="">All categories</option>
        <option v-for="c in SPEND_CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <EmptyState
        v-if="!spend.length"
        title="Nothing logged yet"
        description="Log what you spend - rent, fuel, supplies, software - and it'll show up in your cash-flow breakdown on the Overview page."
      >
        <template #action>
          <button class="btn-primary" @click="openCreate">Log spending</button>
        </template>
      </EmptyState>

      <div v-else class="mt-4 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Date</th>
              <th class="px-4 py-2.5 font-medium">Category</th>
              <th class="px-4 py-2.5 font-medium">Description</th>
              <th class="px-4 py-2.5 font-medium">Paid to</th>
              <th class="px-4 py-2.5 font-medium">Amount</th>
              <th class="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in spend"
              :key="s._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
              @click="openEdit(s)"
            >
              <td class="px-4 py-3 text-ink-500">{{ formatDate(s.date || s.createdAt) }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {{ CATEGORY_LABEL[s.category] || s.category }}
                </span>
              </td>
              <td class="px-4 py-3 text-ink-500">{{ s.description || '—' }}</td>
              <td class="px-4 py-3 text-ink-500">{{ s.payee || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ formatMoney(s.amount, s.currency) }}</td>
              <td class="px-4 py-3 text-right">
                <button class="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50" @click.stop="removeSpend(s)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Log / edit spending modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      @click.self="closeForm"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-card">
        <h2 class="text-sm font-semibold text-ink-800">{{ editingCode ? 'Edit spending' : 'Log spending' }}</h2>

        <div class="mt-4 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Category</label>
              <select v-model="form.category" class="input" required>
                <option value="" disabled>Select a category</option>
                <option v-for="c in SPEND_CATEGORIES" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="label">Amount</label>
              <input v-model.number="form.amount" type="number" min="0.01" step="0.01" class="input" required placeholder="0.00" />
            </div>
          </div>
          <div>
            <label class="label">What was this for? <span class="text-ink-400">(optional)</span></label>
            <input v-model="form.description" class="input" placeholder="e.g. Diesel for generator" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Date</label>
              <input v-model="form.date" type="date" class="input" required />
            </div>
            <div>
              <label class="label">Paid by</label>
              <select v-model="form.paymentMethod" class="input">
                <option v-for="m in PAYMENT_METHODS" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Paid to <span class="text-ink-400">(optional)</span></label>
            <input v-model="form.payee" class="input" placeholder="e.g. Total filling station" />
          </div>
          <div>
            <label class="label">Receipt <span class="text-ink-400">(optional, max 2MB)</span></label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="input" @change="onReceiptChange" />
          </div>
        </div>

        <p v-if="formError" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" :disabled="formBusy" @click="closeForm">Cancel</button>
          <button class="btn-primary" :disabled="formBusy || !form.category || !form.amount" @click="submitForm">
            {{ formBusy ? 'Saving…' : editingCode ? 'Save changes' : 'Log spending' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
