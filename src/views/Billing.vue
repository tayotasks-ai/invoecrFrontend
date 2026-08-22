<script setup>
import { onMounted, ref, computed } from 'vue'
import api from '../lib/api'
import { formatMoney } from '../lib/format'
import { useAuthStore } from '../stores/auth'
import Spinner from '../components/Spinner.vue'

const auth = useAuthStore()

const plans = ref([])
const loading = ref(true)
const error = ref('')
const subscribingId = ref('')

const currentPlanId = computed(() => auth.entity?.plan || 'free')
const usage = computed(() => auth.entity?.planDetails || null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [plansRes] = await Promise.all([api.get('/entity/plans'), auth.refreshEntity().catch(() => null)])
    plans.value = plansRes.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function subscribe(plan) {
  if (plan.id === 'free' || plan.id === currentPlanId.value) return
  subscribingId.value = plan.id
  error.value = ''
  try {
    const res = await api.post('/entity/subscribe', { plan: plan.id })
    const authUrl = res.data?.data?.authorization_url
    if (authUrl) {
      window.location.href = authUrl
    } else {
      error.value = 'Could not start checkout. Please try again.'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    subscribingId.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="text-lg font-semibold text-ink-900">Plan &amp; billing</h1>
    <p class="mt-1 text-sm text-ink-400">Free tier gets you started; upgrade for more invoices and the logo-branded templates.</p>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <template v-if="!loading">
      <!-- Current usage -->
      <div v-if="usage" class="mt-6 card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-ink-800">
            You're on the <span class="capitalize text-lilac-600">{{ usage.name }}</span> plan
          </p>
          <router-link :to="{ name: 'templates' }" class="text-sm font-medium text-lilac-600 hover:text-lilac-700">
            View templates
          </router-link>
        </div>

        <div class="mt-3">
          <div class="flex items-center justify-between text-xs text-ink-400">
            <span>Invoices this month</span>
            <span>
              {{ usage.invoicesThisMonth }}{{ usage.maxInvoicesPerMonth != null ? ` / ${usage.maxInvoicesPerMonth}` : ' (unlimited)' }}
            </span>
          </div>
          <div v-if="usage.maxInvoicesPerMonth != null" class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              class="h-full rounded-full bg-lilac-500 transition-all"
              :style="{ width: `${Math.min(100, (usage.invoicesThisMonth / usage.maxInvoicesPerMonth) * 100)}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Plans -->
      <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="card flex flex-col p-5"
          :class="plan.id === currentPlanId ? 'ring-2 ring-lilac-500' : ''"
        >
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold capitalize text-ink-800">{{ plan.name }}</p>
            <span v-if="plan.id === currentPlanId" class="rounded-full bg-lilac-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-lilac-700">
              Current
            </span>
          </div>
          <p class="mt-2 text-2xl font-semibold text-ink-900">
            {{ plan.priceNGN ? formatMoney(plan.priceNGN) : 'Free' }}
            <span v-if="plan.priceNGN" class="text-sm font-normal text-ink-400">/mo</span>
          </p>

          <ul class="mt-4 flex-1 space-y-2 text-sm text-ink-600">
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-lilac-600">✓</span>
              {{ plan.maxInvoicesPerMonth != null ? `${plan.maxInvoicesPerMonth} invoices / month` : 'Unlimited invoices' }}
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-lilac-600">✓</span>
              {{ plan.allowPremiumTemplates ? 'All 12 templates, incl. logo-branded' : '6 free templates (no logo)' }}
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5 text-lilac-600">✓</span>
              Paystack collection with instant payout split
            </li>
          </ul>

          <button
            v-if="plan.id !== 'free'"
            class="btn-primary mt-5 w-full"
            :disabled="plan.id === currentPlanId || subscribingId === plan.id"
            @click="subscribe(plan)"
          >
            {{ plan.id === currentPlanId ? 'Current plan' : subscribingId === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}` }}
          </button>
          <button v-else class="btn-secondary mt-5 w-full" disabled>{{ plan.id === currentPlanId ? 'Current plan' : 'Free' }}</button>
        </div>
      </div>

      <p class="mt-4 text-xs text-ink-400">
        Upgrades are confirmed by Paystack after checkout, so your plan may take a minute to update here - refresh this page if it doesn't reflect right away.
      </p>
    </template>
  </div>
</template>
