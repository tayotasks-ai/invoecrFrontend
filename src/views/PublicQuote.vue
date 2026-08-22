<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/api'
import { formatMoney, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'
import Spinner from '../components/Spinner.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const route = useRoute()
const code = route.params.code

const quote = ref(null)
const loading = ref(true)
const error = ref('')
const responding = ref(false)

const canRespond = () => quote.value && ['draft', 'sent'].includes(quote.value.status)

onMounted(async () => {
  try {
    const res = await api.get(`/quote/public/${code}`)
    quote.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function respond(response) {
  responding.value = true
  error.value = ''
  try {
    const res = await api.post(`/quote/public/${code}/respond`, { response })
    quote.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    responding.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-ink-50 px-4 py-10">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>
    <div class="mx-auto max-w-xl">
      <Spinner v-if="loading" />

      <div v-else-if="error && !quote" class="card p-6 text-center">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <div v-else-if="quote" class="card overflow-hidden">
        <div class="flex items-center justify-between bg-lilac-600 px-6 py-5 text-white">
          <div>
            <p class="text-xs uppercase tracking-wide text-lilac-100">Quote from</p>
            <p class="text-lg font-semibold">{{ quote.entity?.name }}</p>
          </div>
          <img v-if="quote.entity?.logo" :src="quote.entity.logo" alt="" class="h-10 w-10 rounded-md bg-white object-contain p-1" />
        </div>

        <div class="p-6">
          <div class="flex items-center justify-between">
            <p class="font-mono text-sm text-ink-500">{{ quote.quoteNumber }}</p>
            <StatusBadge :status="quote.status" />
          </div>

          <p class="mt-3 text-3xl font-semibold text-ink-900">{{ formatMoney(quote.total, quote.currency) }}</p>
          <p v-if="quote.expiryDate" class="text-sm text-ink-400">Valid until {{ formatDate(quote.expiryDate) }}</p>

          <div class="mt-6 divide-y divide-ink-100 border-y border-ink-100">
            <div v-for="(item, i) in quote.items" :key="i" class="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p class="text-ink-700">{{ item.name || item.description }}</p>
                <p class="text-xs text-ink-400">Qty {{ item.quantity }} × {{ formatMoney(item.unitPrice, quote.currency) }}</p>
              </div>
              <p class="text-ink-700">{{ formatMoney(item.quantity * item.unitPrice, quote.currency) }}</p>
            </div>
          </div>

          <div class="mt-4 space-y-1 text-sm text-ink-500">
            <div class="flex justify-between"><span>Subtotal</span><span>{{ formatMoney(quote.subtotal, quote.currency) }}</span></div>
            <div class="flex justify-between"><span>Tax</span><span>{{ formatMoney(quote.tax, quote.currency) }}</span></div>
            <div class="flex justify-between text-base font-semibold text-ink-800"><span>Total</span><span>{{ formatMoney(quote.total, quote.currency) }}</span></div>
          </div>

          <p v-if="quote.notes" class="mt-4 text-sm text-ink-500"><span class="font-medium text-ink-700">Notes:</span> {{ quote.notes }}</p>
          <p v-if="quote.terms" class="mt-1 text-sm text-ink-500"><span class="font-medium text-ink-700">Terms:</span> {{ quote.terms }}</p>

          <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

          <div v-if="canRespond()" class="mt-6 flex gap-3 border-t border-ink-100 pt-5">
            <button class="btn-primary flex-1" :disabled="responding" @click="respond('accepted')">
              {{ responding ? 'Please wait…' : 'Accept quote' }}
            </button>
            <button class="btn-secondary flex-1" :disabled="responding" @click="respond('rejected')">
              Decline
            </button>
          </div>
          <p v-else-if="quote.status === 'accepted'" class="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
            You've accepted this quote. The business will follow up with an invoice.
          </p>
          <p v-else-if="quote.status === 'rejected'" class="mt-6 rounded-md bg-ink-100 px-3 py-2 text-center text-sm font-medium text-ink-600">
            You've declined this quote.
          </p>
          <p v-else-if="quote.status === 'converted'" class="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
            This quote has already been turned into an invoice.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
