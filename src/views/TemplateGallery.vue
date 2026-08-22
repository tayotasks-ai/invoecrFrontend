<script setup>
import { onMounted, ref } from 'vue'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth'
import Spinner from '../components/Spinner.vue'

const auth = useAuthStore()

const templates = ref([])
const loading = ref(true)
const error = ref('')
const savingId = ref('')
const previewingId = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [templatesRes] = await Promise.all([api.get('/entity/templates'), auth.refreshEntity().catch(() => null)])
    templates.value = templatesRes.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function useTemplate(template) {
  if (template.locked) return
  savingId.value = template.id
  error.value = ''
  try {
    await api.patch('/entity', { invoiceTemplate: template.id })
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    savingId.value = ''
  }
}

async function preview(template) {
  previewingId.value = template.id
  error.value = ''
  try {
    const response = await api.get(`/entity/templates/${template.id}/preview`, { responseType: 'blob' })
    const blob = response instanceof Blob ? response : new Blob([response])
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Give the new tab a moment to load the blob before revoking it.
    setTimeout(() => window.URL.revokeObjectURL(url), 30000)
  } catch (e) {
    error.value = e.message
  } finally {
    previewingId.value = ''
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-ink-900">Invoice templates</h1>
        <p class="mt-1 text-sm text-ink-400">
          Pick how your invoices look. 6 free designs, and 6 with your logo on a
          <router-link :to="{ name: 'billing' }" class="font-medium text-lilac-600 hover:text-lilac-700">paid plan</router-link>.
        </p>
      </div>
    </div>

    <Spinner v-if="loading" />
    <p v-else-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

    <div v-if="!loading" class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="t in templates"
        :key="t.id"
        class="card relative flex flex-col overflow-hidden"
        :class="t.selected ? 'ring-2 ring-lilac-500' : ''"
      >
        <span
          v-if="t.selected"
          class="absolute right-3 top-3 z-10 rounded-full bg-lilac-600 px-2 py-0.5 text-xs font-semibold text-white"
        >
          Selected
        </span>

        <!-- Mini visual swatch representing the theme's layout/accent, not a
             full PDF render (that's what "Preview" is for). -->
        <div
          class="relative flex h-28 items-end p-3"
          :style="{ backgroundColor: t.dark ? '#18181c' : (t.accent + '14'), borderBottom: `3px solid ${t.accent}` }"
        >
          <div
            class="rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
            :style="{ backgroundColor: t.accent, color: '#fff' }"
          >
            {{ t.layout }}
          </div>
          <div v-if="t.showLogo" class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-[10px] font-bold" :style="{ color: t.accent }">
            LOGO
          </div>
          <div v-if="t.locked" class="absolute inset-0 flex items-center justify-center bg-ink-900/40 backdrop-blur-[1px]">
            <svg class="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div class="flex flex-1 flex-col p-4">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-ink-800">{{ t.name }}</p>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              :class="t.tier === 'premium' ? 'bg-lilac-100 text-lilac-700' : 'bg-emerald-100 text-emerald-700'"
            >
              {{ t.tier === 'premium' ? 'Premium' : 'Free' }}
            </span>
          </div>
          <p class="mt-1 flex-1 text-xs text-ink-400">{{ t.description }}</p>

          <div class="mt-4 flex items-center gap-2">
            <button class="btn-secondary flex-1" :disabled="previewingId === t.id" @click="preview(t)">
              {{ previewingId === t.id ? 'Loading…' : 'Preview' }}
            </button>
            <button
              v-if="!t.locked"
              class="btn-primary flex-1"
              :disabled="t.selected || savingId === t.id"
              @click="useTemplate(t)"
            >
              {{ t.selected ? 'In use' : savingId === t.id ? 'Saving…' : 'Use this' }}
            </button>
            <router-link v-else :to="{ name: 'billing' }" class="btn-primary flex-1 text-center">
              Upgrade
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
