/**
 * Les numéros de MTM Immobilier, dans l'ordre où ils sont proposés au visiteur qui veut appeler. Au Sénégal : 9 chiffres,
 * indicatif +221.
 */
export const NUMEROS_MTM = ['785226565', '774900202', '783662651'];

/** « 785226565 » → « +221 78 522 65 65 », pour l'affichage. */
export function afficherNumero(numero: string): string {
  const chiffres = numero.replace(/\D/g, '').replace(/^221/, '');
  if (chiffres.length !== 9) return numero;
  return `+221 ${chiffres.slice(0, 2)} ${chiffres.slice(2, 5)} ${chiffres.slice(5, 7)} ${chiffres.slice(7)}`;
}

/** « 785226565 » → « tel:+221785226565 » : le lien qui lance l'appel. */
export function lienAppel(numero: string): string {
  const chiffres = numero.replace(/[^\d+]/g, '');
  return chiffres.startsWith('+') ? `tel:${chiffres}` : `tel:+221${chiffres.replace(/^221/, '')}`;
}
