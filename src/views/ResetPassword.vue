<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const token = route.params.token

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords don't match."
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  loading.value = true
  try {
    // Resetting also signs you in (see AuthService.resetPassword) - same
    // _persist as sign-in/sign-up, so this drops straight into the
    // dashboard rather than asking for a second login.
    await auth.completePasswordReset({ token, password: password.value })
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-base font-semibold text-ink-900">Set a new password</h1>
    <p class="mt-1 text-sm text-ink-400">Choose a new password for your account.</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="password">New password</label>
        <input id="password" v-model="password" type="password" required class="input" placeholder="••••••••" />
      </div>
      <div>
        <label class="label" for="confirm">Confirm new password</label>
        <input id="confirm" v-model="confirmPassword" type="password" required class="input" placeholder="••••••••" />
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Saving…' : 'Reset password' }}
      </button>
    </form>

    <p class="mt-5 text-center text-sm text-ink-500">
      <router-link :to="{ name: 'sign-in' }" class="font-medium text-lilac-600 hover:text-lilac-700">Back to sign in</router-link>
    </p>
  </div>
</template>
