<script setup></script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-2 bg-white text-center dark:bg-ink-50">
    <p class="text-3xl font-semibold text-ink-900">404</p>
    <p class="text-sm text-ink-400">This page doesn't exist.</p>
    <router-link :to="{ name: 'dashboard' }" class="btn-primary mt-3">Go home</router-link>
  </div>
</template>
