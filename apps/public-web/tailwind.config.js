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
        // Même priorité que le back-office (section 8 des instructions) :
        // le bleu marine est la couleur principale (boutons, liens, actifs,
        // eyebrows, icônes), le rouge carmin est l'accent de marque réservé
        // au mot-symbole, aux mises en avant et aux erreurs, le bleu clair
        // signale une information.
        'mtm-primary': '#1A4974',
        'mtm-primary-dark': '#233D5B',
        'mtm-primary-medium': '#2C6499',
        'mtm-primary-light': '#CFE0EE',
        'mtm-primary-subtle': '#EAF1F7',
        'mtm-accent': '#B52C36',
        'mtm-accent-dark': '#83191D',
        'mtm-accent-subtle': '#F8E8E9',
        'mtm-info': '#5EA8C7',
        'mtm-info-bg': '#E9F4F9',
        'mtm-bg': '#F7F8FA',
        'mtm-surface': '#FFFFFF',
        'mtm-border': '#E5E7EB',
        'mtm-text': '#1F2937',
        'mtm-muted': '#6B7280',
        'mtm-success': '#047857',
        'mtm-warning': '#B45309',
        'mtm-error': '#B52C36',
      },
      fontFamily: {
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 41, 55, 0.06), 0 1px 3px rgba(31, 41, 55, 0.08)',
        'card-hover': '0 6px 16px rgba(31, 41, 55, 0.10), 0 2px 4px rgba(31, 41, 55, 0.06)',
      },
      // Mouvements courts et discrets (≤ 250 ms), toujours utilisés derrière
      // `motion-safe:` pour respecter la préférence « réduire les animations ».
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        // État final « transform: none » (et non translateY(0)) : un transform
        // conservé par fill-mode ferait de la page le référent des éléments
        // position: fixed (barres d'action, fenêtres), décalés hors écran.
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-right': {
          from: { opacity: '0.6', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Entrée des actions rapides : elles jaillissent du bouton, l'une après l'autre.
        'pop-in': {
          from: { opacity: '0', transform: 'translate(var(--pop-x, 0px), 28px) scale(0.7)' },
          to: { opacity: '1', transform: 'translate(var(--pop-x, 0px), 0) scale(1)' },
        },
        // Bouton d'actions rapides : trajectoire courbe (deux courbes d'accélération
        // pour l'axe horizontal et l'axe vertical), dépassement, puis libellé qui se déploie.
        'fab-x': { from: { transform: 'translateX(var(--fab-x0, 30px))' }, to: { transform: 'none' } },
        'fab-y': {
          '0%': { opacity: '0', transform: 'translateY(var(--fab-y0, 56px)) scale(0.35) rotate(-70deg)' },
          '45%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'fab-x-out': { from: { transform: 'none' }, to: { transform: 'translateX(var(--fab-x0, 30px))' } },
        'fab-y-out': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateY(var(--fab-y0, 56px)) scale(0.4) rotate(40deg)' },
        },
        'fab-label': {
          from: { maxWidth: '0px', opacity: '0', paddingRight: '0px' },
          to: { maxWidth: '12rem', opacity: '1', paddingRight: '1rem' },
        },
        'fab-ring': {
          '0%': { opacity: '0.7', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(2.3)' },
        },
        'fab-halo': {
          '0%': { opacity: '0.55', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.9)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'page-in': 'rise-in 250ms ease-out both',
        'scale-in': 'scale-in 180ms ease-out both',
        'sheet-in': 'sheet-in 220ms ease-out both',
        'slide-down': 'slide-down 160ms ease-out both',
        'sheet-right': 'sheet-right 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'pop-in': 'pop-in 260ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both',
        // Les deux axes n'ont pas la même courbe : la trajectoire s'incurve.
        'fab-x': 'fab-x 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fab-y': 'fab-y 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fab-x-out': 'fab-x-out 220ms ease-in both',
        'fab-y-out': 'fab-y-out 240ms cubic-bezier(0.5, 0, 0.75, 0) both',
        'fab-label': 'fab-label 280ms ease-out both',
        'fab-ring': 'fab-ring 700ms ease-out both',
        // Halo au repos : après trois secondes, deux pulsations seulement.
        'fab-halo': 'fab-halo 1500ms ease-out 3s 2 forwards',
      },
    },
  },
  plugins: [],
};
