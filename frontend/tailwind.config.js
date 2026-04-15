/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Poppins', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        bmw: {
          // Primary colors
          blue: '#1C69D4',
          navy: '#001a33',
          'navy-light': '#031E49',
          // Accent & status
          red: '#E60105',
          green: '#00AA44',
          'gray-light': '#F5F7FA',
          'gray-medium': '#E8ECEF',
          'gray-dark': '#B5BFCA',
          // UI elements
          white: '#FFFFFF',
          'text-primary': '#001a33',
          'text-secondary': '#666666',
          border: '#E0E4E8',
        },
      },
      boxShadow: {
        'light': '0 1px 3px rgba(0, 26, 51, 0.08)',
        'medium': '0 4px 6px rgba(0, 26, 51, 0.12)',
        'strong': '0 10px 25px rgba(0, 26, 51, 0.15)',
      },
    },
  },
  plugins: [],
}
