<script setup>
// App-wide confirmation modal - see composables/useConfirm.js for how
// views trigger this (`await confirmDialog({...})`) instead of the native
// window.confirm(). Mounted once in App.vue so it's available everywhere
// without every view importing/registering it.
import { useConfirmDialogState, resolveConfirmDialog } from '../composables/useConfirm'

const state = useConfirmDialogState()
</script>

<template>
  <div
    v-if="state.open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
    @click.self="resolveConfirmDialog(false)"
    @keydown.esc="resolveConfirmDialog(false)"
  >
    <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-card">
      <h2 class="text-sm font-semibold text-ink-800">{{ state.title }}</h2>
      <p v-if="state.message" class="mt-1.5 text-sm text-ink-500">{{ state.message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="btn-ghost" @click="resolveConfirmDialog(false)">{{ state.cancelLabel }}</button>
        <button
          :class="state.danger ? 'btn-danger' : 'btn-primary'"
          @click="resolveConfirmDialog(true)"
        >
          {{ state.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
