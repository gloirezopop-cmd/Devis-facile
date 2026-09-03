/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Grammaire éditoriale du classeur — bleu saisie, noir calculé, vert
        // hérité, jaune à vérifier. Ce sont des états de donnée, pas une
        // marque : ne jamais les réutiliser pour du chrome applicatif.
        devis: {
          saisie: '#14479B',
          calcule: '#0F151B',
          herite: '#14634A',
          averifier: '#8A5D00',
          paper: '#EDF0F3',
          surface: '#FBFCFD',
          border: '#C3CCD6'
        },
        // Identité DEVIS FACILE — sidebar, header, navigation, CTA. Distincte
        // de la palette éditoriale ci-dessus : brand-accent (orange chantier
        // vif) ne doit jamais être confondu avec devis-averifier (jaune
        // hypothèse, plus sourd) — l'un invite à cliquer, l'autre avertit.
        brand: {
          primary: '#14304D',
          'primary-dark': '#0D2038',
          accent: '#F2994A',
          interactive: '#2F6FDE',
          bg: '#F6F7F9',
          text: '#1B1F27'
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
