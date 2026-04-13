/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        flux: {
          bg:        '#0f1117',
          surface:   '#1a1d27',
          elevated:  '#222534',
          border:    '#2e3148',
          muted:     '#4a4f6a',
          text:      '#e2e8f0',
          subtext:   '#8892a4',
          accent:    '#6c63ff',
          'accent-h':'#7c73ff',
          sent:      '#6c63ff',
          received:  '#1e2235',
          online:    '#22c55e',
          error:     '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease',
        'slide-up':   'slideUp 0.25s ease',
        'slide-left': 'slideLeft 0.25s ease',
        'pulse-dot':  'pulseDot 2s ease infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideLeft:{ from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseDot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.8)' } },
      },
    },
  },
  plugins: [],
};
