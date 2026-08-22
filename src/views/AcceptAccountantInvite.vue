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

const invite = ref(null)
const loading = ref(true)
const error = ref('')
const accepting = ref(false)
const accepted = ref(false)

onMounted(async () => {
  try {
    const res = await api.get(`/entity/accountants/invite/${token}`)
    invite.value = res.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function accept() {
  accepting.value = true
  error.value = ''
  try {
    await api.post(`/entity/accountants/invite/${token}/accept`)
    accepted.value = true
    await auth.loadMyBusinesses()
  } catch (e) {
    error.value = e.message
  } finally {
    accepting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-50 px-4">
    <div class="card w-full max-w-md p-6 text-center">
      <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lilac-600 text-sm font-bold text-white">
        In
      </div>

      <Spinner v-if="loading" />

      <template v-else-if="error && !invite">
        <h1 class="text-lg font-semibold text-ink-900">Invite not found</h1>
        <p class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>

      <template v-else-if="accepted">
        <h1 class="text-lg font-semibold text-ink-900">You're in</h1>
        <p class="mt-2 text-sm text-ink-500">
          You can now switch into <strong>{{ invite.businessName }}</strong>'s books from the workspace switcher at
          the bottom of your sidebar.
        </p>
        <button class="btn-primary mt-5 w-full" @click="router.push({ name: 'dashboard' })">Go to dashboard</button>
      </template>

      <template v-else-if="invite">
        <h1 class="text-lg font-semibold text-ink-900">You've been invited</h1>
        <p class="mt-2 text-sm text-ink-500">
          <strong>{{ invite.businessName }}</strong> wants to give you accountant/bookkeeper access to their invoecr
          account (invited as {{ invite.invitedEmail }}).
        </p>

        <p v-if="invite.status !== 'pending'" class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This invite has already been {{ invite.status === 'active' ? 'accepted' : invite.status }}.
        </p>

        <template v-else-if="!auth.isAuthenticated">
          <p class="mt-4 text-sm text-ink-500">Sign in or create an account to accept this invite.</p>
          <div class="mt-4 flex gap-2">
            <router-link
              :to="{ name: 'sign-in', query: { redirect: route.fullPath } }"
              class="btn-primary flex-1"
            >
              Sign in
            </router-link>
            <router-link
              :to="{ name: 'sign-up', query: { redirect: route.fullPath } }"
              class="btn-secondary flex-1"
            >
              Sign up
            </router-link>
          </div>
        </template>

        <template v-else>
          <p v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
          <button class="btn-primary mt-5 w-full" :disabled="accepting" @click="accept">
            {{ accepting ? 'Accepting…' : `Accept and access ${invite.businessName}'s books` }}
          </button>
        </template>
      </template>
    </div>
  </div>
</template>
