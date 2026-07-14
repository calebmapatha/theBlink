// Semantic colour tokens map to the CSS variables in src/styles/theme.css,
// so every component switches themes by the single "dark" class on <html> —
// no dark: prefixes needed for colour.
//
//   bg-surface, bg-raised, bg-bg
//   text-ink, text-muted, text-faint
//   border-line
//   bg-accent, hover:bg-accent-strong, text-on-accent
//   bg-accent-soft, text-accent-soft-text
//   text-danger, text-warn, bg-warn-soft
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('--bg'),
        raised: v('--raised'),
        line: v('--line'),
        muted: v('--muted'),
        faint: v('--faint'),
        'on-accent': v('--on-accent'),
        danger: v('--danger'),
        warn: v('--warn'),
        'warn-soft': v('--warn-soft'),
        accent: {
          DEFAULT: v('--accent'),
          strong: v('--accent-strong'),
          soft: v('--accent-soft'),
          'soft-text': v('--accent-soft-text'),
        },
        // Legacy scales kept for screens not yet migrated to the tokens.
        // The bare names (bg-surface, text-ink) resolve to the DEFAULT token.
        surface: {
          DEFAULT: v('--surface'),
          50:  '#f8f9ff',
          100: '#f1f3fb',
          200: '#e4e7f5',
          300: '#cdd2e4',
          400: '#a3aac2',
          500: '#646c88',
          600: '#4b5266',
          700: '#374151',
          800: '#1e2235',
          900: '#141726',
          950: '#0d0f1a',
        },
        ink: {
          DEFAULT: v('--ink'),
          900: '#0f1117',
          800: '#1f2430',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
        },
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warm: {
          50:  '#fefce8',
          100: '#fef9c3',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(20,184,166,0.4)',
        'glow-success': '0 0 20px -5px rgba(34,197,94,0.35)',
        'card':         '0 2px 12px -2px rgba(15,17,23,0.08)',
        'card-dark':    '0 2px 16px -2px rgba(0,0,0,0.4)',
      },
      animation: {
        'bounce-in': 'bounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up':   'fadeUp 0.3s ease-out',
        'fade-in':   'fadeIn 0.2s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        fadeUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
