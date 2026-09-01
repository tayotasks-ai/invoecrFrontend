<script setup>
import { computed, ref } from 'vue'
import { formatMoney } from '../lib/format'

const props = defineProps({
  // [{ month: '2026-08', label: 'Aug 2026', collected: number, invoiced: number }, ...]
  data: { type: Array, required: true },
  currency: { type: String, default: 'NGN' },
})

// Fixed SVG coordinate space - scales to the container's actual width via
// the viewBox, so no resize listener is needed.
const WIDTH = 760
const HEIGHT = 260
const PAD_LEFT = 56
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 28
const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

// One shared y-axis for both series (never a dual-axis chart - collected and
// invoiced are the same unit, so splitting them onto two scales would make
// their relative sizes lie).
const maxValue = computed(() => {
  const values = props.data.flatMap((d) => [d.collected, d.invoiced])
  const max = Math.max(1, ...values)
  // Round the axis ceiling up to a "nice" number so gridline labels aren't
  // awkward fractions of the real max.
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil((max * 1.15) / magnitude) * magnitude
})

const gridlines = computed(() => {
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => {
    const value = (maxValue.value / steps) * i
    return { value, y: PAD_TOP + plotHeight - (value / maxValue.value) * plotHeight }
  })
})

function xFor(index) {
  if (props.data.length <= 1) return PAD_LEFT
  return PAD_LEFT + (index / (props.data.length - 1)) * plotWidth
}
function yFor(value) {
  return PAD_TOP + plotHeight - (value / maxValue.value) * plotHeight
}

const collectedPoints = computed(() => props.data.map((d, i) => ({ x: xFor(i), y: yFor(d.collected) })))
const invoicedPoints = computed(() => props.data.map((d, i) => ({ x: xFor(i), y: yFor(d.invoiced) })))

function pathFor(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}
const collectedPath = computed(() => pathFor(collectedPoints.value))
const invoicedPath = computed(() => pathFor(invoicedPoints.value))

// Only every other month gets a tick label by default (12 labels on a
// ~760px axis collide) - always keep the first and last so the range is
// unambiguous.
const xTicks = computed(() =>
  props.data
    .map((d, i) => ({ ...d, i }))
    .filter((d, idx, arr) => idx === 0 || idx === arr.length - 1 || idx % 2 === 0)
)

function compactMoney(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

const hoveredIndex = ref(null)
const svgRef = ref(null)

function onMove(event) {
  if (!svgRef.value || !props.data.length) return
  const rect = svgRef.value.getBoundingClientRect()
  const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH
  const ratio = Math.min(1, Math.max(0, (relativeX - PAD_LEFT) / plotWidth))
  hoveredIndex.value = Math.round(ratio * (props.data.length - 1))
}
function onLeave() {
  hoveredIndex.value = null
}

const hovered = computed(() => (hoveredIndex.value != null ? props.data[hoveredIndex.value] : null))
const hoveredX = computed(() => (hoveredIndex.value != null ? xFor(hoveredIndex.value) : 0))
// Flip the tooltip to the left side of the crosshair once it would otherwise
// overflow the chart's right edge.
const tooltipOnLeft = computed(() => hoveredX.value > WIDTH - 170)
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4 text-xs font-medium text-ink-600">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-lilac-600" />Collected</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-ink-300" />Invoiced</span>
    </div>

    <div v-if="!data.length || maxValue <= 1" class="flex h-[220px] items-center justify-center text-sm text-ink-400">
      Not enough activity yet to chart.
    </div>

    <svg
      v-else
      ref="svgRef"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full select-none"
      style="max-height: 260px"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
      <!-- Gridlines + y-axis labels - recessive, never competing with the data -->
      <g v-for="g in gridlines" :key="g.value">
        <line :x1="PAD_LEFT" :x2="WIDTH - PAD_RIGHT" :y1="g.y" :y2="g.y" class="stroke-ink-100" stroke-width="1" />
        <text :x="PAD_LEFT - 8" :y="g.y + 3" text-anchor="end" class="fill-ink-400" font-size="10">
          {{ compactMoney(g.value) }}
        </text>
      </g>

      <!-- X-axis month labels -->
      <text
        v-for="t in xTicks"
        :key="t.month"
        :x="xFor(t.i)"
        :y="HEIGHT - 8"
        text-anchor="middle"
        class="fill-ink-400"
        font-size="10"
      >
        {{ t.label.split(' ')[0] }}
      </text>

      <!-- Hover crosshair -->
      <line
        v-if="hoveredIndex != null"
        :x1="hoveredX"
        :x2="hoveredX"
        :y1="PAD_TOP"
        :y2="PAD_TOP + plotHeight"
        class="stroke-ink-200"
        stroke-width="1"
      />

      <!-- Invoiced (context line - muted, drawn first so Collected sits on top) -->
      <path :d="invoicedPath" fill="none" class="stroke-ink-300" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <!-- Collected (the headline series - brand accent, drawn on top) -->
      <path :d="collectedPath" fill="none" class="stroke-lilac-600" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Anchor the current (most recent) point on each line -->
      <circle :cx="invoicedPoints[invoicedPoints.length - 1]?.x" :cy="invoicedPoints[invoicedPoints.length - 1]?.y" r="3" class="fill-ink-300" />
      <circle :cx="collectedPoints[collectedPoints.length - 1]?.x" :cy="collectedPoints[collectedPoints.length - 1]?.y" r="3.5" class="fill-lilac-600" />

      <!-- Hover markers -->
      <template v-if="hoveredIndex != null">
        <circle :cx="invoicedPoints[hoveredIndex].x" :cy="invoicedPoints[hoveredIndex].y" r="3.5" class="fill-white stroke-ink-300" stroke-width="2" />
        <circle :cx="collectedPoints[hoveredIndex].x" :cy="collectedPoints[hoveredIndex].y" r="4" class="fill-white stroke-lilac-600" stroke-width="2.5" />
      </template>

      <!-- Wide invisible hit area so hover isn't limited to the thin line itself -->
      <rect :x="PAD_LEFT" :y="PAD_TOP" :width="plotWidth" :height="plotHeight" fill="transparent" />

      <!-- Tooltip -->
      <g v-if="hovered" :transform="`translate(${tooltipOnLeft ? hoveredX - 158 : hoveredX + 10}, ${PAD_TOP + 4})`">
        <rect width="150" height="54" rx="8" class="fill-ink-900" opacity="0.95" />
        <text x="10" y="18" class="fill-white" font-size="10" font-weight="600">{{ hovered.label }}</text>
        <text x="10" y="33" class="fill-lilac-300" font-size="10">Collected: {{ formatMoney(hovered.collected, currency) }}</text>
        <text x="10" y="46" class="fill-ink-300" font-size="10">Invoiced: {{ formatMoney(hovered.invoiced, currency) }}</text>
      </g>
    </svg>
  </div>
</template>
