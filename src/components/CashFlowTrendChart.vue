<script setup>
import { computed, ref } from 'vue'
import { formatMoney } from '../lib/format'

// Same hand-rolled inline-SVG approach as RevenueTrendChart.vue (this app
// doesn't pull in a charting library anywhere) - deliberately a separate
// component rather than a variant of that one: money in/out and net are a
// genuinely different pair of series (collected vs. invoiced are both
// "amount billed" in different states; inflow vs. outflow are opposite
// directions of money moving), and green/red here carries real meaning
// (in = good, out = cost) that would clash with RevenueTrendChart's
// brand-vs-muted-context color grammar.
const props = defineProps({
  // [{ month: '2026-08', label: 'Aug 2026', inflow: number, outflow: number, net: number }, ...]
  data: { type: Array, required: true },
  currency: { type: String, default: 'NGN' },
})

const WIDTH = 760
const HEIGHT = 260
const PAD_LEFT = 56
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 28
const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

// One shared y-axis for inflow and outflow (never a dual-axis chart - both
// are the same unit). `net` isn't plotted as its own line - it can go
// negative, which would force this axis through zero and squash the two
// magnitude series that matter most here; the stat cards above the chart
// already surface net cash flow as a headline number.
const maxValue = computed(() => {
  const values = props.data.flatMap((d) => [d.inflow, d.outflow])
  const max = Math.max(1, ...values)
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

const inflowPoints = computed(() => props.data.map((d, i) => ({ x: xFor(i), y: yFor(d.inflow) })))
const outflowPoints = computed(() => props.data.map((d, i) => ({ x: xFor(i), y: yFor(d.outflow) })))

function pathFor(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}
const inflowPath = computed(() => pathFor(inflowPoints.value))
const outflowPath = computed(() => pathFor(outflowPoints.value))

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
const tooltipOnLeft = computed(() => hoveredX.value > WIDTH - 170)
</script>

<template>
  <div>
    <div class="mb-3 flex items-center gap-4 text-xs font-medium text-ink-600">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-600" />Money in</span>
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500" />Money out</span>
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
      <g v-for="g in gridlines" :key="g.value">
        <line :x1="PAD_LEFT" :x2="WIDTH - PAD_RIGHT" :y1="g.y" :y2="g.y" class="stroke-ink-100" stroke-width="1" />
        <text :x="PAD_LEFT - 8" :y="g.y + 3" text-anchor="end" class="fill-ink-400" font-size="10">
          {{ compactMoney(g.value) }}
        </text>
      </g>

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

      <line
        v-if="hoveredIndex != null"
        :x1="hoveredX"
        :x2="hoveredX"
        :y1="PAD_TOP"
        :y2="PAD_TOP + plotHeight"
        class="stroke-ink-200"
        stroke-width="1"
      />

      <!-- Outflow drawn first so Inflow sits on top, same "context line
           underneath, headline line on top" ordering as RevenueTrendChart -->
      <path :d="outflowPath" fill="none" class="stroke-red-500" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <path :d="inflowPath" fill="none" class="stroke-emerald-600" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <circle :cx="outflowPoints[outflowPoints.length - 1]?.x" :cy="outflowPoints[outflowPoints.length - 1]?.y" r="3" class="fill-red-500" />
      <circle :cx="inflowPoints[inflowPoints.length - 1]?.x" :cy="inflowPoints[inflowPoints.length - 1]?.y" r="3.5" class="fill-emerald-600" />

      <template v-if="hoveredIndex != null">
        <circle :cx="outflowPoints[hoveredIndex].x" :cy="outflowPoints[hoveredIndex].y" r="3.5" class="fill-white stroke-red-500" stroke-width="2" />
        <circle :cx="inflowPoints[hoveredIndex].x" :cy="inflowPoints[hoveredIndex].y" r="4" class="fill-white stroke-emerald-600" stroke-width="2.5" />
      </template>

      <rect :x="PAD_LEFT" :y="PAD_TOP" :width="plotWidth" :height="plotHeight" fill="transparent" />

      <g v-if="hovered" :transform="`translate(${tooltipOnLeft ? hoveredX - 158 : hoveredX + 10}, ${PAD_TOP + 4})`">
        <rect width="150" height="67" rx="8" class="fill-ink-900" opacity="0.95" />
        <text x="10" y="18" class="fill-white" font-size="10" font-weight="600">{{ hovered.label }}</text>
        <text x="10" y="33" class="fill-emerald-300" font-size="10">In: {{ formatMoney(hovered.inflow, currency) }}</text>
        <text x="10" y="46" class="fill-red-300" font-size="10">Out: {{ formatMoney(hovered.outflow, currency) }}</text>
        <text x="10" y="59" class="fill-ink-300" font-size="10">Net: {{ formatMoney(hovered.net, currency) }}</text>
      </g>
    </svg>
  </div>
</template>
