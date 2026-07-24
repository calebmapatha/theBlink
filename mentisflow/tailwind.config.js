// Semantic colour tokens map to the CSS variables in src/styles/theme.css,
// so every component switches themes by the single "dark" class on <html> —
// no dark: prefixes needed for colour.
//
//   bg-surface, bg-raised, bg-bg
//   text-ink, text-muted, text-faint
//   border-line
//   bg-accent, hover:bg-accent-strong, text-on-accent
//   bg-accent-soft, text-accent-soft-text
//   bg-tint-blush / -mint / -peach / -powder (+ matching -text tokens)
//   text-danger, text-warn, bg-warn-soft
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    // Sharp edges everywhere: the whole radius scale is zeroed so any
    // rounded-* class that slips in renders square. Do not add radii back.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
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
        // Pastel tints — category and data cards only.
        tint: {
          blush: v('--tint-blush'),
          'blush-text': v('--tint-blush-text'),
          mint: v('--tint-mint'),
          'mint-text': v('--tint-mint-text'),
          peach: v('--tint-peach'),
          'peach-text': v('--tint-peach-text'),
          powder: v('--tint-powder'),
          'powder-text': v('--tint-powder-text'),
        },
        // Legacy scales kept for screens not yet migrated to the tokens,
        // re-skinned to the lavender-paper families so no teal, emerald or
        // brownish tone renders anywhere. Migrate usages to tokens over time.
        surface: {
          DEFAULT: v('--surface'),
          50:  '#fafafc',
          100: '#f3f3f7',
          200: '#e6e6ee',
          300: '#d0d0dd',
          400: '#a5a5ba',
          500: '#686576',
          600: '#4e4b5c',
          700: '#3a3847',
          800: '#232230',
          900: '#171622',
          950: '#0e0d16',
        },
        ink: {
          DEFAULT: v('--ink'),
          900: '#15141a',
          800: '#2b2933',
          700: '#3a3847',
          600: '#565364',
          500: '#686576',
          400: '#a19eae',
          300: '#c9c7d3',
          200: '#e0dfe7',
          100: '#f0eff3',
        },
        primary: {
          50:  '#f2f2fb',
          100: '#e8e8f8',
          200: '#d2d2f1',
          300: '#b3b3e9',
          400: '#9a9aeb',
          500: '#7a7ada',
          600: '#6262c4',
          700: '#5252a8',
          800: '#42428a',
          900: '#37376f',
        },
        success: {
          50:  '#f0f8f3',
          100: '#e1f0e6',
          200: '#c4e2cf',
          400: '#6bbf90',
          500: '#48a874',
          600: '#38905f',
          700: '#2f6f4e',
        },
        warm: {
          50:  '#fdf6ee',
          100: '#fae9db',
          200: '#f4d6bb',
          400: '#e0a367',
          500: '#c9853f',
          600: '#a56a15',
          700: '#84550f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        // The one soft, low card shadow. A card gets this OR a hairline
        // border, never both.
        'card':      '0 2px 10px -4px rgba(43,41,51,0.10)',
        'card-dark': '0 2px 14px -4px rgba(0,0,0,0.45)',
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
