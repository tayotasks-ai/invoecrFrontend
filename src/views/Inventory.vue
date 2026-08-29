<script setup>
import { onMounted, ref, computed } from 'vue'
import api from '../lib/api'
import { formatMoney } from '../lib/format'
import { useAuthStore } from '../stores/auth'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
// Inventory is a Growth-plan+ feature (see backend config/plans.js). Items
// already added stay visible/usable (issuing invoices against them, seeing
// stock) even on a lower plan - only adding/editing items via the form is
// gated. Strictly `=== true` so the form starts hidden rather than flashing
// on before planDetails has loaded from refreshEntity() below. The real
// enforcement is server-side in InventoryService.createInventoryItem.
const allowInventory = computed(() => auth.entity?.planDetails?.allowInventory === true)

const loading = ref(true)
const items = ref([])
const search = ref('')
const error = ref('')

const emptyForm = () => ({
  name: '',
  sku: '',
  description: '',
  unitPrice: 0,
  quantityInStock: 0,
  lowStockThreshold: 0,
  unit: 'unit',
})
const form = ref(emptyForm())
const editingCode = ref(null) // null = "add" mode, otherwise the code being edited
const saving = ref(false)
const formError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/inventory', { params: search.value ? { search: search.value } : {} })
    items.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  load()
  auth.refreshEntity().catch(() => null)
})

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
}

function startEdit(item) {
  editingCode.value = item.code
  form.value = {
    name: item.name,
    sku: item.sku || '',
    description: item.description || '',
    unitPrice: item.unitPrice,
    quantityInStock: item.quantityInStock,
    lowStockThreshold: item.lowStockThreshold || 0,
    unit: item.unit || 'unit',
  }
  formError.value = ''
}

function cancelEdit() {
  editingCode.value = null
  form.value = emptyForm()
  formError.value = ''
}

async function onSubmit() {
  formError.value = ''
  saving.value = true
  try {
    if (editingCode.value) {
      await api.put(`/inventory/${editingCode.value}`, form.value)
    } else {
      await api.post('/inventory', form.value)
    }
    cancelEdit()
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function removeItem(item) {
  if (!confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return
  try {
    await api.delete(`/inventory/${item.code}`)
    await load()
  } catch (e) {
    error.value = e.message
  }
}

function isLowStock(item) {
  return item.lowStockThreshold > 0 && item.quantityInStock <= item.lowStockThreshold
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Inventory</h1>
        <p class="mt-1 text-sm text-ink-400">
          Track stock on hand and issue invoices straight from it — creating an invoice against an item deducts its
          quantity automatically.
        </p>
      </div>
      <input
        v-model="search"
        class="input w-56"
        placeholder="Search by name or SKU…"
        @input="onSearchInput"
      />
    </div>

    <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div class="lg:col-span-3">
        <Spinner v-if="loading" />
        <EmptyState
          v-else-if="!items.length"
          title="No inventory items yet"
          description="Add your first item to start tracking stock and issuing invoices from it."
        />
        <div v-else class="card overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th class="px-4 py-2.5 font-medium">Item</th>
                <th class="px-4 py-2.5 font-medium">Stock</th>
                <th class="px-4 py-2.5 font-medium">Unit price</th>
                <th class="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item._id" class="border-b border-ink-100 last:border-0">
                <td class="px-4 py-3">
                  <p class="font-medium text-ink-800">{{ item.name }}</p>
                  <p class="text-xs text-ink-400">{{ item.sku || item.code }}</p>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="isLowStock(item) ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600'"
                  >
                    {{ item.quantityInStock }} {{ item.unit || 'unit' }}{{ item.quantityInStock === 1 ? '' : 's' }}
                  </span>
                  <span v-if="isLowStock(item)" class="ml-1 text-xs text-amber-600">low</span>
                </td>
                <td class="px-4 py-3 text-ink-700">{{ formatMoney(item.unitPrice, 'NGN') }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="btn-ghost px-2 text-xs" @click="startEdit(item)">Edit</button>
                  <button class="btn-ghost px-2 text-xs text-red-500 hover:bg-red-50" @click="removeItem(item)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div v-if="!allowInventory && !editingCode" class="card p-6 text-center">
          <p class="text-sm font-semibold text-ink-800">Inventory is a Business-plan feature</p>
          <p class="mt-1 text-sm text-ink-500">Upgrade your plan to add and track stock items here.</p>
          <router-link :to="{ name: 'billing' }" class="btn-primary mt-4 inline-flex">See plans</router-link>
        </div>

        <div v-else class="card p-5">
          <h2 class="text-sm font-semibold text-ink-800">{{ editingCode ? 'Edit item' : 'Add an item' }}</h2>
          <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
            <div>
              <label class="label">Name</label>
              <input v-model="form.name" class="input" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">SKU (optional)</label>
                <input v-model="form.sku" class="input" />
              </div>
              <div>
                <label class="label">Unit</label>
                <input v-model="form.unit" class="input" placeholder="pcs, kg, box…" />
              </div>
            </div>
            <div>
              <label class="label">Description (optional)</label>
              <textarea v-model="form.description" rows="2" class="input"></textarea>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="label">Unit price</label>
                <input v-model.number="form.unitPrice" type="number" min="0" step="0.01" class="input" required />
              </div>
              <div>
                <label class="label">In stock</label>
                <input v-model.number="form.quantityInStock" type="number" min="0" class="input" required />
              </div>
              <div>
                <label class="label">Low-stock at</label>
                <input v-model.number="form.lowStockThreshold" type="number" min="0" class="input" />
              </div>
            </div>

            <p v-if="formError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ formError }}</p>

            <div class="flex gap-2">
              <button type="submit" class="btn-primary flex-1" :disabled="saving">
                {{ saving ? 'Saving…' : editingCode ? 'Save changes' : 'Add item' }}
              </button>
              <button v-if="editingCode" type="button" class="btn-secondary" @click="cancelEdit">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
