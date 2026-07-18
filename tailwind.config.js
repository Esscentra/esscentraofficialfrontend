/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf3ff',
          100: '#d9e5ff',
          200: '#b5ccff',
          300: '#7ea6fe',
          400: '#427dfd',
          500: '#105bfd', // Esscentra logo blue
          600: '#064ce2',
          700: '#0c42b9',
          800: '#1a3f91',
          900: '#213a71',
        },
      },
      fontFamily: {
        sans: ['"Lexend Deca"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Lexend Deca"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        'aurora-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(8%, -6%) scale(1.15)' },
          '66%': { transform: 'translate(-6%, 8%) scale(0.95)' },
        },
        'aurora-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1.1)' },
          '33%': { transform: 'translate(-10%, 6%) scale(0.9)' },
          '66%': { transform: 'translate(6%, -8%) scale(1.2)' },
        },
        'aurora-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(5%, 5%) scale(1.25)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        loader: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'aurora-1': 'aurora-1 18s ease-in-out infinite',
        'aurora-2': 'aurora-2 22s ease-in-out infinite',
        'aurora-3': 'aurora-3 26s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        loader: 'loader 1.15s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
