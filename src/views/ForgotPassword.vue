<script setup>
import { ref } from 'vue'
import api from '../lib/api'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    // The backend always responds the same way regardless of whether the
    // email matches an account (see AuthController.forgotPassword) - so
    // this generic "sent" state is correct either way, not just on success.
    await api.post('/auth/forgot-password', { email: email.value })
    sent.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <template v-if="sent">
      <h1 class="text-base font-semibold text-ink-900">Check your email</h1>
      <p class="mt-2 text-sm text-ink-500">
        If an account exists for <strong>{{ email }}</strong>, we've sent a link to reset your password. It expires
        in 1 hour.
      </p>
      <router-link :to="{ name: 'sign-in' }" class="btn-secondary mt-5 inline-flex">Back to sign in</router-link>
    </template>

    <template v-else>
      <h1 class="text-base font-semibold text-ink-900">Forgot your password?</h1>
      <p class="mt-1 text-sm text-ink-400">Enter your email and we'll send you a link to reset it.</p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" v-model="email" type="email" required class="input" placeholder="you@business.com" />
        </div>

        <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-ink-500">
        <router-link :to="{ name: 'sign-in' }" class="font-medium text-lilac-600 hover:text-lilac-700">Back to sign in</router-link>
      </p>
    </template>
  </div>
</template>
