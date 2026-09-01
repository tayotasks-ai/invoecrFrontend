<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  // Optional "+12.4% vs last month" style badge. `null` means "no baseline
  // to compare against yet" (see reporting.service.js's pctChange) rather
  // than 0% - shown as a neutral dash instead of a false "no change".
  delta: { type: Object, default: null }, // { value: number | null, goodDirection: 'up' | 'down' }
})

function deltaTone(delta) {
  if (delta.value == null) return 'text-ink-400'
  const isUp = delta.value >= 0
  const isGood = delta.goodDirection === 'up' ? isUp : !isUp
  if (delta.value === 0) return 'text-ink-400'
  return isGood ? 'text-emerald-600' : 'text-red-600'
}
function deltaLabel(delta) {
  if (delta.value == null) return 'New'
  const sign = delta.value > 0 ? '+' : ''
  return `${sign}${delta.value}% vs last month`
}
</script>

<template>
  <div class="card p-5">
    <p class="text-xs font-medium uppercase tracking-wide text-ink-400">{{ label }}</p>
    <div class="mt-2 flex items-baseline gap-2">
      <p class="text-2xl font-semibold text-ink-900">{{ value }}</p>
      <span v-if="delta" class="text-xs font-semibold" :class="deltaTone(delta)">{{ deltaLabel(delta) }}</span>
    </div>
    <p v-if="hint" class="mt-1 text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>
