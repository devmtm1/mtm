export type NiveauStatut = 'solide' | 'standard' | 'attention';

/**
 * Poids visuel d'un statut juridique. Le titre foncier est le plus sûr : il se
 * lit en vert. Les autres titres reconnus (bail, délibération, attribution…)
 * restent en bleu, sans alarme. Un statut encore en cours de régularisation ou
 * de morcellement se signale en orange : le visiteur doit le savoir avant de
 * s'engager, c'est la transparence que MTM revendique.
 */
export function niveauStatutJuridique(statut: string | null | undefined): NiveauStatut {
  const s = (statut ?? '').trim().toLowerCase();
  if (s === 'titre foncier') return 'solide';
  if (/(r[ée]gularisation|morcellement|en cours)/.test(s)) return 'attention';
  return 'standard';
}
