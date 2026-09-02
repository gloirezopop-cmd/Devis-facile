/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        devis: {
          saisie: '#14479B',
          calcule: '#0F151B',
          herite: '#14634A',
          averifier: '#8A5D00',
          paper: '#EDF0F3',
          surface: '#FBFCFD',
          border: '#C3CCD6'
        }
      },
      fontFamily: {
        sans: ['"Libre Franklin"', 'sans-serif'],
        serif: ['"Source Serif 4"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
