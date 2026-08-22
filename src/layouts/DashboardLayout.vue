<script setup>
import AppSidebar from '../components/AppSidebar.vue'
</script>

<template>
  <div class="flex h-screen bg-ink-50">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-6xl px-8 py-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
