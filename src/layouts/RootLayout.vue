<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function signOut() {
  auth.signOut()
  router.push({ name: 'sign-in' })
}
</script>

<template>
  <div class="flex h-screen bg-ink-50">
    <aside class="flex h-full w-60 shrink-0 flex-col border-r border-red-200 bg-red-950">
      <div class="flex items-center gap-2 px-5 py-5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
          !
        </div>
        <div>
          <span class="block text-sm font-semibold text-white">invoecr root</span>
          <span class="block text-[11px] text-red-300">Internal use only</span>
        </div>
      </div>

      <nav class="flex-1 space-y-0.5 px-3">
        <router-link
          :to="{ name: 'root-merchants' }"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-900 hover:text-white"
          active-class="bg-red-900 text-white"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M7 8a4 4 0 108 0 4 4 0 00-8 0z" />
          </svg>
          Merchants
        </router-link>
      </nav>

      <div class="border-t border-red-900 p-3">
        <router-link
          :to="{ name: 'dashboard' }"
          class="flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-red-300 hover:bg-red-900 hover:text-white"
        >
          <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to my dashboard
        </router-link>
        <div class="mt-2 flex items-center gap-2 rounded-md px-2 py-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-900 text-xs font-semibold text-red-200">
            {{ auth.businessName.slice(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-white">{{ auth.businessName }}</p>
            <p class="truncate text-xs text-red-300">{{ auth.entity?.email }}</p>
          </div>
        </div>
        <button class="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-300 hover:bg-red-900 hover:text-white" @click="signOut">
          Sign out
        </button>
      </div>
    </aside>
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-6xl px-8 py-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
