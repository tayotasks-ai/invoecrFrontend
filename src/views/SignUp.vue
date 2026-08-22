<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirm_password: '',
  phone: '',
})
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (form.value.password !== form.value.confirm_password) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await auth.signUp({ ...form.value })
    // Same "?redirect=" honoring as SignIn.vue - matters for the accept-
    // invite flow, where someone without an account yet needs to land back
    // on the invite after signing up, not on the dashboard.
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
    <h1 class="text-base font-semibold text-ink-900">Create your business account</h1>
    <p class="mt-1 text-sm text-ink-400">Start sending professional, payable invoices in minutes.</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="name">Business name</label>
        <input id="name" v-model="form.name" type="text" required class="input" placeholder="Acme Studio" />
      </div>
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" v-model="form.email" type="email" required class="input" placeholder="you@business.com" />
      </div>
      <div>
        <label class="label" for="phone">Phone (optional)</label>
        <input id="phone" v-model="form.phone" type="tel" class="input" placeholder="0800 000 0000" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="password">Password</label>
          <input id="password" v-model="form.password" type="password" required class="input" placeholder="••••••••" />
        </div>
        <div>
          <label class="label" for="confirm_password">Confirm</label>
          <input id="confirm_password" v-model="form.confirm_password" type="password" required class="input" placeholder="••••••••" />
        </div>
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <p class="mt-5 text-center text-sm text-ink-500">
      Already have an account?
      <router-link :to="{ name: 'sign-in' }" class="font-medium text-lilac-600 hover:text-lilac-700">Sign in</router-link>
    </p>
  </div>
</template>
