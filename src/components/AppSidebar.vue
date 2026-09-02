<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// Populates the workspace switcher below (empty for the overwhelming
// majority of accounts, which have never accepted an accountant invite) -
// loaded once per dashboard visit since AppSidebar renders on every
// authenticated page.
onMounted(() => {
  auth.loadMyBusinesses()
  // The cached entity from sign-in doesn't carry `isRoot` (that's computed
  // server-side by EntityService.getMe, not part of the sign-in response) -
  // refreshing here, in the one component guaranteed to mount on every
  // authenticated page, is what makes the Root link below appear reliably
  // right after a root account logs in, regardless of which page they land
  // on first.
  auth.refreshEntity().catch(() => null)
})

// A full reload is deliberate here, not a reactive re-fetch - switching
// workspace changes which business's data every page on-screen is looking
// at, and not every view is built to react to that mid-session. Reloading
// the current page (rather than redirecting to a fixed path) is simple and
// guarantees nothing shows stale cross-business data, without caring
// whether the acting user was on the dashboard, an invoice, etc.
function onWorkspaceChange(e) {
  auth.switchWorkspace(e.target.value || null).then(() => {
    window.location.reload()
  })
}

const nav = [
  { name: 'dashboard', label: 'Overview', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
  { name: 'invoices', label: 'Invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'recurring-invoices', label: 'Recurring', icon: 'M4 4v5h5M20 20v-5h-5M4.5 9a7.5 7.5 0 0113-4.5L20 7M19.5 15a7.5 7.5 0 01-13 4.5L4 17' },
  { name: 'quotes', label: 'Quotes', icon: 'M9 7h6m-6 4h4m-7 8l3-3h9a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v11z' },
  { name: 'expenses', label: 'Expenses', icon: 'M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 2v8m0 0v2m0-2c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'spending', label: 'Spending', icon: 'M3 3v18h18M7 14l4-4 3 3 5-6' },
  { name: 'customers', label: 'Customers', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M7 8a4 4 0 108 0 4 4 0 00-8 0z' },
  { name: 'inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { name: 'bank-accounts', label: 'Bank accounts', icon: 'M3 10h18M5 6l7-3 7 3M5 10v9m4-9v9m6-9v9m4-9v9M3 19h18' },
  { name: 'templates', label: 'Templates', icon: 'M4 5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM13 3v5a1 1 0 001 1h5' },
  { name: 'billing', label: 'Plan & billing', icon: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18' },
  { name: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col border-r border-ink-200 bg-white">
    <div class="flex items-center gap-2 px-5 py-5">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-lilac-600 text-sm font-bold text-white">
        In
      </div>
      <span class="text-sm font-semibold text-ink-900">Invoecr</span>
    </div>

    <nav class="flex-1 space-y-0.5 px-3">
      <router-link
        v-for="item in nav"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-lilac-50 hover:text-lilac-700"
        active-class="bg-lilac-50 text-lilac-700"
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
        </svg>
        {{ item.label }}
      </router-link>
    </nav>

    <div class="border-t border-ink-200 p-3">
      <!-- Workspace switcher - only rendered once this account has actually
           accepted at least one accountant invite, so the vast majority of
           users never see this at all. -->
      <div v-if="auth.myBusinesses.length" class="mb-2">
        <label class="mb-1 block px-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">Viewing</label>
        <select
          class="input py-1.5 text-xs"
          :value="auth.activeWorkspaceId || ''"
          @change="onWorkspaceChange"
        >
          <option value="">My own account</option>
          <option v-for="m in auth.myBusinesses" :key="m._id" :value="m.business?._id">
            {{ m.business?.name }} (client)
          </option>
        </select>
        <p v-if="auth.isActingAsClient" class="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
          You're viewing {{ auth.businessName }}'s books as their accountant.
        </p>
      </div>

      <!-- Only rendered for the handful of accounts whose email is on the
           backend's ROOT_ADMIN_EMAILS allowlist (see EntityService.getMe's
           computed `isRoot`) - invisible to every ordinary merchant. -->
      <router-link
        v-if="auth.entity?.isRoot === true"
        :to="{ name: 'root-merchants' }"
        class="mb-2 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        Root
      </router-link>

      <div class="flex items-center gap-2 rounded-md px-2 py-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-lilac-100 text-xs font-semibold text-lilac-700">
          {{ auth.businessName.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-ink-800">{{ auth.businessName }}</p>
          <p class="truncate text-xs text-ink-400">{{ auth.entity?.email }}</p>
        </div>
      </div>
      <button class="btn-ghost mt-1 w-full justify-start px-2" @click="auth.signOut(); $router.push({ name: 'sign-in' })">
        Sign out
      </button>
    </div>
  </aside>
</template>
