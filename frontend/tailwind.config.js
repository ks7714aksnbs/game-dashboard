/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        doom: {
          red:    '#cc2200',
          orange: '#ff6600',
          dark:   '#0a0a0a',
          panel:  '#111111',
          border: '#2a2a2a',
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
