<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await admin.signIn({ email: email.value, password: password.value })
    router.push({ name: 'root-merchants' })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-900 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white">
          In
        </div>
        <p class="text-sm font-semibold uppercase tracking-wide text-red-400">Root access</p>
      </div>

      <form class="rounded-xl border border-white/10 bg-ink-800 p-6 shadow-card" @submit.prevent="submit">
        <div class="space-y-3">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-ink-300">Email</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="username"
              class="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-ink-500 outline-none transition-shadow focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium text-ink-300">Password</label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-ink-500 outline-none transition-shadow focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </div>

        <p v-if="error" class="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{{ error }}</p>

        <button
          type="submit"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="busy"
        >
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
