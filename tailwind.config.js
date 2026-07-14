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
          red: '#bc2f4a',
          green: '#007229',
          blue: '#0033A0',
          yellow: '#FFD100',
          light: '#F8FAFC',
          dark: '#1E293B'
        },
        red: {
          50: '#fdf2f4',
          100: '#fad5db',
          200: '#f4b0bc',
          300: '#ea8a9b',
          400: '#db5e74',
          500: '#bc2f4a',
          600: '#a22840',
          700: '#831f33',
          800: '#621625',
          900: '#420f19',
          950: '#29090f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
