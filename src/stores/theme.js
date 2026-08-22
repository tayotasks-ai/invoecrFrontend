import { defineStore } from 'pinia'

const STORAGE_KEY = 'invoecr_theme'

function applyClass(mode) {
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

// Class-based dark mode (see tailwind.config.js's `darkMode: 'class'`) so a
// manual choice always overrides the OS setting and can be remembered.
// Falls back to the OS preference only the first time a device is seen.
export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode:
      localStorage.getItem(STORAGE_KEY) ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  }),
  actions: {
    // Called once from main.js, before mount, so the correct theme is
    // applied before first paint (no flash of the wrong theme).
    init() {
      applyClass(this.mode)
    },
    toggle() {
      this.set(this.mode === 'dark' ? 'light' : 'dark')
    },
    set(mode) {
      this.mode = mode
      localStorage.setItem(STORAGE_KEY, mode)
      applyClass(mode)
    },
  },
})
