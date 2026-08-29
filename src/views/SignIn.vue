<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await auth.signIn({ email: email.value, password: password.value })
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-base font-semibold text-ink-900">Sign in</h1>
    <p class="mt-1 text-sm text-ink-400">Welcome back — let's get you paid.</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" v-model="email" type="email" required class="input" placeholder="you@business.com" />
      </div>
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs font-medium text-ink-600" for="password">Password</label>
          <router-link :to="{ name: 'forgot-password' }" class="text-xs font-medium text-lilac-600 hover:text-lilac-700">
            Forgot password?
          </router-link>
        </div>
        <input id="password" v-model="password" type="password" required class="input" placeholder="••••••••" />
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <p class="mt-5 text-center text-sm text-ink-500">
      New here?
      <router-link :to="{ name: 'sign-up' }" class="font-medium text-lilac-600 hover:text-lilac-700">Create an account</router-link>
    </p>
  </div>
</template>
