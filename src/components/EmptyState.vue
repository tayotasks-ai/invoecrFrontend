<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-6 py-14 text-center">
    <p class="text-sm font-medium text-ink-700">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-ink-400">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
