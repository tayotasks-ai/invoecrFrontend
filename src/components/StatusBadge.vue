<script setup>
import { STATUS_STYLES } from '../lib/format'

defineProps({
  status: { type: String, required: true },
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
    :class="STATUS_STYLES[status] || 'bg-ink-100 text-ink-600'"
  >
    {{ status?.replace('-', ' ') }}
  </span>
</template>
