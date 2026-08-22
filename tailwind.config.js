/** @type {import('tailwindcss').Config} */
export default {
  // Class-based dark mode (not `media`) so a manual toggle (see
  // stores/theme.js) always wins over the OS setting, and so it can be
  // persisted. Toggling `.dark` on <html> flips the `--ink-*` CSS variables
  // below, which every existing `text-ink-*`/`bg-ink-*`/`border-ink-*` usage
  // across the app already reads from - so most views need zero per-file
  // dark: variants. Lilac accents and status colors stay fixed in both themes.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Supabase-style neutral surface/border scale, but on a white base
        // instead of Supabase's dark theme. Values come from CSS variables
        // (defined in style.css for :root and .dark) rather than fixed hex,
        // so the same scale can mean "light gray on white" in light mode and
        // "dark charcoal on near-black" in dark mode without changing any
        // class names in the views that use it.
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
        },
        // Primary accent: lilac / purple, replacing Supabase's brand green.
        lilac: {
          50: '#FAF7FF',
          100: '#F3EBFF',
          200: '#E4D3FF',
          300: '#CDB0FF',
          400: '#B084FA',
          500: '#9061E8',
          600: '#7A46D6',
          700: '#6535B3',
          800: '#502A8C',
          900: '#3D2069',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(20, 20, 23, 0.04)',
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}
