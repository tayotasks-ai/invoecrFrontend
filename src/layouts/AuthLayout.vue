<script setup></script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-lilac-50 to-white px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex flex-col items-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-lilac-600 text-base font-bold text-white">
          In
        </div>
        <p class="mt-3 text-lg font-semibold text-ink-900">Invoecr</p>
        <p class="text-sm text-ink-400">Invoicing built for Nigerian SMEs</p>
      </div>
      <div class="card p-6">
        <router-view />
      </div>
    </div>
  </div>
</template>
