<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../lib/api'
import { formatMoney } from '../lib/format'

const router = useRouter()

const customers = ref([])
const customerMode = ref('existing') // 'existing' | 'new'
const customerId = ref('')
const newCustomer = ref({ name: '', email: '', phone: '' })

const inventory = ref([])

const form = ref({
  currency: 'NGN',
  frequency: 'monthly',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  dueInDays: 14,
  notes: '',
  terms: '',
  tax: 0,
})
const emptyItem = () => ({ inventoryItemId: '', name: '', description: '', quantity: 1, unitPrice: 0 })
const items = ref([emptyItem()])

const loading = ref(false)
const loadingCustomers = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await api.get('/customer')
    customers.value = res.data
    if (!customers.value.length) customerMode.value = 'new'
  } catch {
    customerMode.value = 'new'
  } finally {
    loadingCustomers.value = false
  }
  // Best-effort - if this fails, the form still works with free-text items.
  try {
    const invRes = await api.get('/inventory')
    inventory.value = invRes.data
  } catch {
    inventory.value = []
  }
})

function addItem() {
  items.value.push(emptyItem())
}
function removeItem(index) {
  if (items.value.length > 1) items.value.splice(index, 1)
}

// Same preview-only auto-fill as the one-off invoice form - the backend
// re-resolves inventory-linked items fresh at *generation* time (each
// cycle), not from whatever was picked here when the schedule was created.
function onInventorySelect(item) {
  if (!item.inventoryItemId) {
    item.name = ''
    item.unitPrice = 0
    return
  }
  const inv = inventory.value.find((i) => i._id === item.inventoryItemId)
  if (inv) {
    item.name = inv.name
    item.unitPrice = inv.unitPrice
    if (!item.description) item.description = inv.description || ''
  }
}

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
)
const previewTotal = computed(() => subtotal.value + (Number(form.value.tax) || 0))

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

async function onSubmit() {
  error.value = ''
  if (customerMode.value === 'existing' && !customerId.value) {
    error.value = 'Please select a customer.'
    return
  }
  if (customerMode.value === 'new' && !newCustomer.value.name) {
    error.value = 'Please enter the new customer’s name.'
    return
  }

  const payload = {
    currency: form.value.currency,
    frequency: form.value.frequency,
    startDate: form.value.startDate,
    endDate: form.value.endDate || undefined,
    dueInDays: Number(form.value.dueInDays) || 0,
    notes: form.value.notes || undefined,
    terms: form.value.terms || undefined,
    tax: Number(form.value.tax) || 0,
    items: items.value.map((i) => {
      if (i.inventoryItemId) {
        return {
          inventoryItemId: i.inventoryItemId,
          description: i.description || undefined,
          quantity: Number(i.quantity) || 1,
        }
      }
      return {
        name: i.name,
        description: i.description || i.name,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
      }
    }),
  }
  if (customerMode.value === 'existing') {
    payload.customerId = customerId.value
  } else {
    payload.customer = { ...newCustomer.value }
  }

  loading.value = true
  try {
    await api.post('/recurring-invoice', payload)
    router.push({ name: 'recurring-invoices' })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="flex items-center gap-3">
      <router-link :to="{ name: 'recurring-invoices' }" class="btn-ghost px-2">&larr;</router-link>
      <h1 class="text-lg font-semibold text-ink-900">New recurring invoice</h1>
    </div>
    <p class="mt-1 pl-11 text-sm text-ink-400">
      A draft invoice is generated automatically on each cycle for you to review and send - nothing goes to your customer on its own.
    </p>

    <form class="mt-6 space-y-6" @submit.prevent="onSubmit">
      <!-- Customer -->
      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">Customer</h2>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="customerMode === 'existing' ? 'bg-lilac-600 text-white' : 'bg-ink-100 text-ink-600'"
            @click="customerMode = 'existing'"
          >
            Existing customer
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="customerMode === 'new' ? 'bg-lilac-600 text-white' : 'bg-ink-100 text-ink-600'"
            @click="customerMode = 'new'"
          >
            New customer
          </button>
        </div>

        <div v-if="customerMode === 'existing'" class="mt-4">
          <select v-model="customerId" class="input" :disabled="loadingCustomers">
            <option value="" disabled>{{ loadingCustomers ? 'Loading customers…' : 'Select a customer' }}</option>
            <option v-for="c in customers" :key="c._id" :value="c._id">{{ c.name }} — {{ c.email || 'no email' }}</option>
          </select>
        </div>
        <div v-else class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input v-model="newCustomer.name" class="input" placeholder="Customer name" required />
          <input v-model="newCustomer.email" type="email" class="input" placeholder="Email (optional)" />
          <input v-model="newCustomer.phone" class="input" placeholder="Phone (optional)" />
        </div>
      </section>

      <!-- Schedule -->
      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">Schedule</h2>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label class="label">Frequency</label>
            <select v-model="form.frequency" class="input">
              <option v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Starts</label>
            <input v-model="form.startDate" type="date" required class="input" />
          </div>
          <div>
            <label class="label">Ends (optional)</label>
            <input v-model="form.endDate" type="date" class="input" />
          </div>
          <div>
            <label class="label">Due (days after issue)</label>
            <input v-model.number="form.dueInDays" type="number" min="0" class="input" />
          </div>
        </div>
        <div class="mt-3">
          <label class="label">Currency</label>
          <select v-model="form.currency" class="input max-w-[10rem]">
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </section>

      <!-- Items -->
      <section class="card p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-ink-800">Items</h2>
          <button type="button" class="btn-ghost text-lilac-600" @click="addItem">+ Add item</button>
        </div>

        <div class="mt-3 space-y-3">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="rounded-md border border-ink-100 p-3"
          >
            <div class="flex items-center gap-2">
              <select v-model="item.inventoryItemId" class="input flex-1" @change="onInventorySelect(item)">
                <option value="">Custom item (type your own)</option>
                <option v-for="inv in inventory" :key="inv._id" :value="inv._id">
                  {{ inv.name }}
                </option>
              </select>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-red-50 hover:text-red-500"
                @click="removeItem(index)"
              >
                &times;
              </button>
            </div>

            <div class="mt-2 grid grid-cols-12 items-start gap-2">
              <input
                v-if="!item.inventoryItemId"
                v-model="item.name"
                placeholder="Item"
                class="input col-span-12 sm:col-span-4"
                required
              />
              <input v-else :value="item.name" disabled class="input col-span-12 sm:col-span-4 bg-ink-50 text-ink-500" />

              <input v-model="item.description" placeholder="Description (optional)" class="input col-span-12 sm:col-span-3" />

              <input v-model.number="item.quantity" type="number" min="1" placeholder="Qty" class="input col-span-4 sm:col-span-2" required />

              <input
                v-if="!item.inventoryItemId"
                v-model.number="item.unitPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price"
                class="input col-span-6 sm:col-span-2"
                required
              />
              <input v-else :value="item.unitPrice" disabled class="input col-span-6 sm:col-span-2 bg-ink-50 text-ink-500" />
            </div>
          </div>
        </div>

        <p class="mt-2 text-xs text-ink-400">
          Stock for inventory-linked items is checked and deducted fresh each time a draft is generated - not reserved now.
        </p>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="label">Notes (optional)</label>
            <textarea v-model="form.notes" rows="2" class="input"></textarea>
          </div>
          <div>
            <label class="label">Terms (optional)</label>
            <textarea v-model="form.terms" rows="2" class="input"></textarea>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-6 border-t border-ink-100 pt-4 text-sm">
          <span class="text-ink-500">Subtotal: <strong class="text-ink-800">{{ formatMoney(subtotal, form.currency) }}</strong></span>
          <label class="flex items-center gap-2">
            Tax
            <input v-model.number="form.tax" type="number" min="0" step="0.01" class="input w-28" />
          </label>
          <span class="text-ink-500">Per cycle: <strong class="text-lilac-700">{{ formatMoney(previewTotal, form.currency) }}</strong></span>
        </div>
        <p class="mt-2 text-right text-xs text-ink-400">
          A processing fee is added on top when a customer actually pays a generated invoice, same as any other invoice - this preview is before that fee.
        </p>
      </section>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <router-link :to="{ name: 'recurring-invoices' }" class="btn-secondary">Cancel</router-link>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Creating…' : 'Create schedule' }}</button>
      </div>
    </form>
  </div>
</template>
