/** @type {import('tailwindcss').Config} */
export default {
  // No dark mode, deliberately - this app used to ship a class-based dark
  // theme plus a manual toggle, but paired with the lilac accent below it
  // kept getting read by customers as a generic "AI-app-template" look
  // rather than invoicing software for their business, so it was removed.
  // If dark mode ever comes back: re-add `darkMode: 'class'` here and
  // restore the `.dark` CSS-variable block this used to read from in
  // style.css (see git history around the removal commit).
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Supabase-style neutral surface/border scale on a white base.
        // Values come from CSS variables (defined in style.css) rather
        // than fixed hex so the whole scale can be retuned in one place.
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
