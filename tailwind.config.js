/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        caracas: {
          red: '#CE1226',
          green: '#007229',
          blue: '#0033A0',
          yellow: '#FFD100',
          light: '#F8FAFC',
          dark: '#1E293B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
