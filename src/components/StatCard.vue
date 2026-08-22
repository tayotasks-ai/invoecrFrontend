<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="card p-5">
    <p class="text-xs font-medium uppercase tracking-wide text-ink-400">{{ label }}</p>
    <p class="mt-2 text-2xl font-semibold text-ink-900">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>
