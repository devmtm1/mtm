/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#32124F',
        primary: '#4B1D73',
        medium: '#6B3E8A',
        light: '#E9DDF2',
        coral: '#B45309',
        mist: '#F7F8FA',
        sand: '#F3EEF7',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(50, 18, 79, 0.09)',
        card: '0 8px 24px rgba(50, 18, 79, 0.06)',
      },
    },
  },
  plugins: [],
}
