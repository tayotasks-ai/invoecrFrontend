<script setup>
import { ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useAuthStore } from '../stores/auth'
import api from '../lib/api'

const auth = useAuthStore()

// Soft-only (see entity.model.js's comment on emailVerified) - nothing is
// gated on this, it's just a nudge with a resend action. `=== false` (not
// falsy) so an entity payload that hasn't loaded the field yet doesn't
// flash the banner before disappearing.
const resendState = ref('') // '', 'sending', 'sent', 'error'
async function resendVerification() {
  resendState.value = 'sending'
  try {
    await api.post('/auth/resend-verification')
    resendState.value = 'sent'
  } catch {
    resendState.value = 'error'
  }
}
</script>

<template>
  <div class="flex h-screen bg-ink-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <div
        v-if="auth.entity?.emailVerified === false"
        class="flex flex-wrap items-center justify-between gap-2 bg-amber-50 px-8 py-2.5 text-sm text-amber-800"
      >
        <span v-if="resendState !== 'sent'">Please verify your email address ({{ auth.entity?.email }}).</span>
        <span v-else>Verification email sent - check your inbox.</span>
        <button
          v-if="resendState !== 'sent'"
          class="font-medium underline disabled:opacity-60"
          :disabled="resendState === 'sending'"
          @click="resendVerification"
        >
          {{ resendState === 'sending' ? 'Sending…' : resendState === 'error' ? 'Failed - try again' : 'Resend email' }}
        </button>
      </div>
      <div class="mx-auto max-w-6xl px-8 py-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
