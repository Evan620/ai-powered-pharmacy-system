/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'ui-sans-serif'],
      },
      colors: {
        brand: {
          50: '#F4F6FF',
          100: '#E9EFFF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6474F7',
          600: '#3E63F2',
          700: '#3356E6',
          800: '#2A48C7',
          900: '#233BA6',
        },
        accent: {
          500: '#9B6BFF',
          600: '#864EFF',
        },
      },
      borderRadius: {
        card: '12px',
        frame: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06)',
        lift: '0 6px 16px rgba(15,23,42,0.06)',
        frame: '0 32px 60px rgba(124,58,237,0.18), 0 6px 16px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
};

