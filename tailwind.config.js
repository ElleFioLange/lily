/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        black: 'var(--ev-c-black)',
        'black-soft': 'var(--ev-c-black-soft)',
        'black-mute': 'var(--ev-c-black-mute)',
        'gray-1': 'var(--ev-c-gray-1)',
        'gray-2': 'var(--ev-c-gray-2)',
        'gray-3': 'var(--ev-c-gray-3)',
        'text-1': 'var(--ev-c-text-1)'
      }
    }
  },
  plugins: []
}
