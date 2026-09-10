/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs extraites par échantillonnage direct de public/logomtm.jpeg
        // (pixels les plus saturés du "M" et du mot-symbole) — source unique
        // de vérité pour toute la palette du site, ne jamais redéfinir une
        // couleur de marque ailleurs que dans ce fichier.
        'mtm-primary': '#B43036',
        'mtm-primary-dark': '#751F23',
        'mtm-secondary': '#1F4C7A',
        'mtm-secondary-dark': '#14314F',
        'mtm-bg': '#F7F8FA',
        'mtm-surface': '#FFFFFF',
        'mtm-border': '#E5E7EB',
        'mtm-text': '#1F2937',
        'mtm-muted': '#6B7280',
        'mtm-success': '#059669',
        'mtm-warning': '#D97706',
        'mtm-error': '#DC2626',
      },
      fontFamily: {
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 41, 55, 0.06), 0 1px 3px rgba(31, 41, 55, 0.08)',
      },
    },
  },
  plugins: [],
};
