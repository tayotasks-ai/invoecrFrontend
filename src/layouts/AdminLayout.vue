<script setup>
import { useRouter } from 'vue-router'
import { useAdminStore } from '../stores/admin'

const admin = useAdminStore()
const router = useRouter()

function signOut() {
  admin.signOut()
  router.push({ name: 'root-login' })
}
</script>

<template>
  <div class="flex h-screen bg-ink-50">
    <!-- Red accent (not lilac) is deliberate - this is the root panel, a
         different, more powerful surface than the business app, and it
         should never be visually confusable with it at a glance. -->
    <aside class="flex h-full w-60 shrink-0 flex-col border-r border-ink-200 bg-ink-900">
      <div class="flex items-center gap-2 px-5 py-5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
          In
        </div>
        <div class="leading-tight">
          <span class="block text-sm font-semibold text-white">invoecr</span>
          <span class="block text-[11px] font-medium uppercase tracking-wide text-red-400">Root</span>
        </div>
      </div>

      <nav class="flex-1 space-y-0.5 px-3">
        <router-link
          :to="{ name: 'root-merchants' }"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
          active-class="bg-red-600/15 text-white"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M7 8a4 4 0 108 0 4 4 0 00-8 0z" />
          </svg>
          Merchants
        </router-link>
      </nav>

      <div class="border-t border-white/10 p-3">
        <div class="rounded-md px-2 py-2">
          <p class="truncate text-xs font-medium text-white">{{ admin.email }}</p>
          <p class="text-[11px] text-ink-400">Root session</p>
        </div>
        <button
          class="mt-1 w-full rounded-md px-2 py-2 text-left text-sm font-medium text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
          @click="signOut"
        >
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
