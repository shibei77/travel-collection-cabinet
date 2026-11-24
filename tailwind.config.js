/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F9F9F4',
        ink: '#2C3E2E',
        grass: '#7DBB6C',
        lake: '#83C7D6',
      },
      fontFamily: {
        heading: ['"ZCOOL KuaiLe"', 'cursive'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
