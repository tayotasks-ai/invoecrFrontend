import { reactive } from 'vue'

// A single, app-wide confirm dialog - replaces the browser's native
// window.confirm(), which can't be styled, blocks all other extension/tool
// activity while open (see the Chrome-automation guidance this app is
// sometimes driven by), and looks jarringly out of place next to the rest
// of the UI. One reactive singleton + one <ConfirmDialog /> mounted once in
// App.vue (see that file) is simpler than threading a v-model through every
// view that needs a confirmation.
const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  // Only changes button color (btn-danger vs btn-primary) - purely visual,
  // same semantics as the suspend-confirmation modal in RootMerchantDetail.vue.
  danger: false,
})

// Not reactive on purpose - a Promise resolver has no business being
// wrapped in Vue's reactivity, and doing so would just risk it getting
// unwrapped/cloned somewhere.
let resolver = null

// Usage: `if (!(await confirmDialog({ title, message, danger: true }))) return`
// Resolves true on confirm, false on cancel/backdrop-click/Escape - never
// rejects, so callers don't need a try/catch just for the confirmation step.
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  // If a confirmation is already open (shouldn't normally happen - actions
  // are disabled while a dialog is up - but defensively), resolve the
  // stale one as cancelled rather than losing its promise forever.
  if (resolver) {
    resolver(false)
    resolver = null
  }
  state.title = title
  state.message = message
  state.confirmLabel = confirmLabel
  state.cancelLabel = cancelLabel
  state.danger = danger
  state.open = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function useConfirmDialogState() {
  return state
}

export function resolveConfirmDialog(value) {
  state.open = false
  if (resolver) {
    resolver(value)
    resolver = null
  }
}
