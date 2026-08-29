<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth'
import Spinner from '../components/Spinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const token = route.params.token

const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await api.post(`/auth/verify-email/${token}`)
    // Best-effort - if the visitor happens to be signed in on this device,
    // refresh the cached entity so the "verify your email" dashboard banner
    // drops immediately rather than waiting for the next page's onMounted.
    if (auth.isAuthenticated) await auth.refreshEntity().catch(() => null)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-50 px-4">
    <div class="card w-full max-w-md p-6 text-center">
      <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lilac-600 text-sm font-bold text-white">
        In
      </div>

      <Spinner v-if="loading" />

      <template v-else-if="error">
        <h1 class="text-lg font-semibold text-ink-900">Couldn't verify your email</h1>
        <p class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>

      <template v-else>
        <h1 class="text-lg font-semibold text-ink-900">Email verified</h1>
        <p class="mt-2 text-sm text-ink-500">Your email address has been confirmed.</p>
        <button
          class="btn-primary mt-5 w-full"
          @click="router.push(auth.isAuthenticated ? { name: 'dashboard' } : { name: 'sign-in' })"
        >
          {{ auth.isAuthenticated ? 'Go to dashboard' : 'Sign in' }}
        </button>
      </template>
    </div>
  </div>
</template>
