<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../lib/api'
import { formatMoney } from '../lib/format'
import { grossUpForPaystackFee } from '../lib/paystackFee'

const router = useRouter()

const customers = ref([])
const customerMode = ref('existing') // 'existing' | 'new'
const customerId = ref('')
const newCustomer = ref({ name: '', email: '', phone: '' })

const inventory = ref([])

const form = ref({
  currency: 'NGN',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
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

// Picking an inventory item auto-fills name/price from the catalog (the
// backend re-derives these authoritatively anyway on submit - this is just
// so the on-screen totals are accurate before you hit "Create"). Switching
// back to "Custom item" clears them so stale inventory pricing doesn't
// linger on a now-free-text row.
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
function inventoryStockFor(id) {
  const inv = inventory.value.find((i) => i._id === id)
  return inv ? inv.quantityInStock : 0
}

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
)
// Preview only - the backend recomputes and persists the authoritative
// fee/total on creation (invoice.model.js), this just shows the business
// what their customer will actually be asked to pay before they hit submit.
const paymentFee = computed(() => grossUpForPaystackFee(subtotal.value + (Number(form.value.tax) || 0)).fee)
const total = computed(() => subtotal.value + (Number(form.value.tax) || 0) + paymentFee.value)

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
    issueDate: form.value.issueDate,
    dueDate: form.value.dueDate || undefined,
    notes: form.value.notes || undefined,
    terms: form.value.terms || undefined,
    tax: Number(form.value.tax) || 0,
    items: items.value.map((i) => {
      // Inventory-linked line items only need the id + quantity - the
      // backend fills in name/description/unitPrice from the inventory
      // record itself and ignores anything else sent for those fields.
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
    const res = await api.post('/invoice', payload)
    router.push({ name: 'invoice-detail', params: { code: res.data.invoiceNumber } })
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
      <router-link :to="{ name: 'invoices' }" class="btn-ghost px-2">&larr;</router-link>
      <h1 class="text-lg font-semibold text-ink-900">New invoice</h1>
    </div>

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

      <!-- Details -->
      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">Details</h2>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label class="label">Currency</label>
            <select v-model="form.currency" class="input">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label class="label">Issue date</label>
            <input v-model="form.issueDate" type="date" required class="input" />
          </div>
          <div>
            <label class="label">Due date</label>
            <input v-model="form.dueDate" type="date" class="input" />
          </div>
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
                <option
                  v-for="inv in inventory"
                  :key="inv._id"
                  :value="inv._id"
                  :disabled="inv.quantityInStock <= 0"
                >
                  {{ inv.name }} — {{ inv.quantityInStock }} {{ inv.unit || 'unit' }}{{ inv.quantityInStock === 1 ? '' : 's' }} in stock{{ inv.quantityInStock <= 0 ? ' (out of stock)' : '' }}
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

              <span v-if="item.inventoryItemId" class="col-span-2 self-center text-xs text-ink-400 sm:col-span-1">
                {{ inventoryStockFor(item.inventoryItemId) }} left
              </span>
            </div>

            <p
              v-if="item.inventoryItemId && item.quantity > inventoryStockFor(item.inventoryItemId)"
              class="mt-1 text-xs text-amber-600"
            >
              Only {{ inventoryStockFor(item.inventoryItemId) }} in stock — reduce the quantity or this will be rejected.
            </p>
          </div>
        </div>

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
          <span class="text-ink-500">Payment fee: <strong class="text-ink-800">{{ formatMoney(paymentFee, form.currency) }}</strong></span>
          <span class="text-ink-500">Total: <strong class="text-lilac-700">{{ formatMoney(total, form.currency) }}</strong></span>
        </div>
        <p class="mt-2 text-right text-xs text-ink-400">
          The payment fee is Paystack's processing cost, passed on to your customer - you'll still receive
          {{ formatMoney(subtotal + (Number(form.tax) || 0), form.currency) }} in full.
        </p>
      </section>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <router-link :to="{ name: 'invoices' }" class="btn-secondary">Cancel</router-link>
        <button type="submit" class="btn-primary" :disabled="loading">{{ loading ? 'Creating…' : 'Create invoice' }}</button>
      </div>
    </form>
  </div>
</template>
