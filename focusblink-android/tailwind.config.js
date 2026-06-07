/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        accent: {
          100: '#f3e8ff',
          300: '#d8b4fe',
          500: '#a855f7',
          700: '#7e22ce',
        },
        success: {
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warm: {
          100: '#fef9c3',
          400: '#facc15',
          500: '#eab308',
        },
        surface: {
          50:  '#f8f9ff',
          100: '#f1f3fb',
          200: '#e4e7f5',
          700: '#374151',
          800: '#1e2235',
          900: '#141726',
          950: '#0d0f1a',
        },
        ink: {
          900: '#0f1117',
          700: '#374151',
          400: '#9ca3af',
          100: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(99,102,241,0.4)',
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
