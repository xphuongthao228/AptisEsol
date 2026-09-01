/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        brand: {
          50: '#fff7db',
          100: '#ffef99',
          200: '#ffe066',
          300: '#ffd43b',
          500: '#ffde00',
          600: '#d71920',
          700: '#a50f15'
        },
        sky: {
          50: '#fff8f2',
          100: '#ffe9d6',
          200: '#ffd4b3',
          300: '#ffb875'
        },
        navy: '#3b0a0a',
        slatePanel: '#2a1010'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(165, 15, 21, 0.09)',
        lift: '0 18px 45px rgba(165, 15, 21, 0.16)'
      }
    }
  },
  plugins: []
};
