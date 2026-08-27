/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15324F',
        primary: '#234E79',
        medium: '#3E6E94',
        light: '#A9C2D6',
        coral: '#B4543A',
        mist: '#F7F8FA',
        sand: '#EEF3F7',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px rgba(21, 50, 79, 0.10)',
        card: '0 10px 30px rgba(21, 50, 79, 0.06)',
      },
    },
  },
  plugins: [],
}
