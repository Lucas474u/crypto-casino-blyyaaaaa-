/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ton-blue': '#0088cc',
        'ton-dark': '#1a1a1a',
        'ton-purple': '#7c3aed',
        'ton-green': '#10b981',
        'ton-red': '#ef4444',
        'ton-gold': '#f59e0b',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 136, 204, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 136, 204, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
