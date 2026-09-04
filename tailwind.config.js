/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eaf2ff',
          100: '#d5e4ff',
          200: '#b4ceff',
          300: '#82adff',
          400: '#4781ff',
          500: '#1f5cff',
          600: '#1346e6',
          700: '#0f34b8',
          800: '#102d94',
          900: '#08245c',
          950: '#061634',
        },
        coral: {
          50: '#fff0f1',
          100: '#ffe1e3',
          500: '#e9363f',
          600: '#d3212a',
        },
        sun: {
          50: '#fffdf0',
          100: '#fff9c7',
          500: '#ffc83d',
          600: '#e6a817',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(8, 36, 92, 0.04)',
        'soft-lg': '0 14px 34px rgba(8, 36, 92, 0.08)',
        'soft-xl': '0 24px 60px rgba(8, 36, 92, 0.12)',
        'btn': '0 14px 28px rgba(31, 92, 255, 0.22)',
        'btn-red': '0 14px 28px rgba(233, 54, 63, 0.22)',
      },
      borderRadius: {
        'card': '20px',
        'btn': '999px',
      }
    },
  },
  plugins: [],
}
