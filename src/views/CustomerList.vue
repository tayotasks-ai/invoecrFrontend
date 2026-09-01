<script setup>
import { onMounted, ref } from 'vue'
import api from '../lib/api'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const customers = ref([])
const exporting = ref(false)

onMounted(async () => {
  try {
    const res = await api.get('/customer')
    customers.value = res.data
  } finally {
    loading.value = false
  }
})

async function exportCsv() {
  exporting.value = true
  try {
    const response = await api.get('/customer/export/csv', { responseType: 'blob' })
    const blob = response instanceof Blob ? response : new Blob([response])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-ink-900">Customers</h1>
      <button v-if="customers.length" class="btn-secondary" :disabled="exporting" @click="exportCsv">
        {{ exporting ? 'Exporting…' : 'Export CSV' }}
      </button>
    </div>
    <p class="mt-1 text-sm text-ink-400">
      Customers are added automatically the first time you invoice them — there's no separate "add customer" step.
    </p>

    <Spinner v-if="loading" />

    <template v-else>
      <EmptyState
        v-if="!customers.length"
        title="No customers yet"
        description="Create your first invoice and add a new customer from there."
      >
        <template #action>
          <router-link :to="{ name: 'invoice-create' }" class="btn-primary">Create an invoice</router-link>
        </template>
      </EmptyState>

      <div v-else class="mt-5 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Name</th>
              <th class="px-4 py-2.5 font-medium">Email</th>
              <th class="px-4 py-2.5 font-medium">Phone</th>
              <th class="px-4 py-2.5 font-medium">Code</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in customers"
              :key="c._id"
              class="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-lilac-50/40"
              @click="$router.push({ name: 'customer-detail', params: { code: c.code } })"
            >
              <td class="px-4 py-3 text-ink-700">{{ c.name }}</td>
              <td class="px-4 py-3 text-ink-500">{{ c.email || '—' }}</td>
              <td class="px-4 py-3 text-ink-500">{{ c.phone || '—' }}</td>
              <td class="px-4 py-3 font-mono text-xs text-ink-400">{{ c.code }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
