<script setup>
import { onMounted, ref } from 'vue'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const error = ref('')
const schedules = ref([])
const busyCode = ref('')

const FREQUENCY_LABEL = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

async function load() {
  loading.value = true
  try {
    const res = await api.get('/recurring-invoice')
    schedules.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

function scheduleTotal(s) {
  return (s.items || []).reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 1), 0)
}

async function toggleActive(s) {
  busyCode.value = s.code
  try {
    await api.post(`/recurring-invoice/${s.code}/${s.isActive ? 'pause' : 'resume'}`)
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busyCode.value = ''
  }
}

async function generateNow(s) {
  busyCode.value = s.code
  try {
    await api.post(`/recurring-invoice/${s.code}/generate-now`)
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busyCode.value = ''
  }
}

async function removeSchedule(s) {
  if (!confirm(`Delete this recurring schedule for ${s.customer?.name || 'this customer'}? This cannot be undone - past generated invoices are unaffected.`)) return
  busyCode.value = s.code
  try {
    await api.delete(`/recurring-invoice/${s.code}`)
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busyCode.value = ''
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Recurring invoices</h1>
        <p class="mt-1 text-sm text-ink-400">
          Set a schedule once and a draft invoice is generated automatically each cycle - review it and send it yourself, nothing goes to your customer on its own.
        </p>
      </div>
      <router-link :to="{ name: 'recurring-invoice-create' }" class="btn-primary flex-none">+ New schedule</router-link>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <EmptyState
        v-if="!schedules.length"
        title="No recurring invoices yet"
        description="Set one up for a customer you bill on a regular schedule - retainers, subscriptions, rent, anything that repeats."
      >
        <template #action>
          <router-link :to="{ name: 'recurring-invoice-create' }" class="btn-primary">Set up a schedule</router-link>
        </template>
      </EmptyState>

      <div v-else class="mt-5 card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="px-4 py-2.5 font-medium">Customer</th>
              <th class="px-4 py-2.5 font-medium">Amount</th>
              <th class="px-4 py-2.5 font-medium">Frequency</th>
              <th class="px-4 py-2.5 font-medium">Next draft</th>
              <th class="px-4 py-2.5 font-medium">Last generated</th>
              <th class="px-4 py-2.5 font-medium">Status</th>
              <th class="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in schedules" :key="s._id" class="border-b border-ink-100 last:border-0">
              <td class="px-4 py-3 text-ink-700">{{ s.customer?.name || '—' }}</td>
              <td class="px-4 py-3 text-ink-700">{{ formatMoney(scheduleTotal(s), s.currency) }}</td>
              <td class="px-4 py-3 text-ink-500">{{ FREQUENCY_LABEL[s.frequency] || s.frequency }}</td>
              <td class="px-4 py-3 text-ink-500">{{ s.isActive ? formatDate(s.nextRunAt) : '—' }}</td>
              <td class="px-4 py-3">
                <router-link
                  v-if="s.lastGeneratedInvoice"
                  :to="{ name: 'invoice-detail', params: { code: s.lastGeneratedInvoice.invoiceNumber } }"
                  class="font-mono text-xs text-lilac-600 hover:text-lilac-700"
                >
                  {{ s.lastGeneratedInvoice.invoiceNumber }}
                </router-link>
                <span v-else class="text-ink-400">Never</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="s.isActive ? 'bg-lilac-50 text-lilac-700' : 'bg-ink-100 text-ink-500'"
                >
                  {{ s.isActive ? 'Active' : 'Paused' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1.5">
                  <button
                    class="btn-ghost px-2 py-1 text-xs"
                    :disabled="busyCode === s.code || !s.isActive"
                    @click="generateNow(s)"
                  >
                    Generate now
                  </button>
                  <button class="btn-ghost px-2 py-1 text-xs" :disabled="busyCode === s.code" @click="toggleActive(s)">
                    {{ s.isActive ? 'Pause' : 'Resume' }}
                  </button>
                  <button
                    class="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    :disabled="busyCode === s.code"
                    @click="removeSchedule(s)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
