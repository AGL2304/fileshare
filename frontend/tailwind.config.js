/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce7ff',
          200: '#b3c9ff',
          400: '#6b96ff',
          500: '#3b6ef5',
          600: '#2553e8',
          700: '#1d42c2',
          800: '#1a3499',
          900: '#152770',
        },
      },
    },
  },
  plugins: [],
}
