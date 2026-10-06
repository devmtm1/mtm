import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Valeur d'un champ numérique du formulaire : `null` si vide, `undefined` pour l'API. */
export function nombreOuUndefined(valeur: number | string | null | undefined): number | undefined {
  if (valeur === null || valeur === undefined || valeur === '') return undefined;
  const converti = Number(valeur);
  return Number.isFinite(converti) ? converti : undefined;
}

/** La date de fin d'un bail ne peut pas précéder son début. */
export const datesBailCoherentes: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const debut = group.get('dateDebut')?.value as string | null | undefined;
  const fin = group.get('dateFin')?.value as string | null | undefined;
  if (!debut || !fin) return null;
  return fin < debut ? { datesIncoherentes: true } : null;
};

/**
 * Un locataire doit pouvoir être joint : les relances de loyer partent par
 * e-mail ou par téléphone, et l'accès à l'espace locataire demande une adresse.
 */
export const contactRequis: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const phone = String(group.get('phone')?.value ?? '').trim();
  const email = String(group.get('email')?.value ?? '').trim();
  return phone || email ? null : { contactManquant: true };
};

interface SourceMontants {
  loyerMensuel?: number | string | null;
  charges?: number | string | null;
  jourEcheance?: number | null;
  moisCaution?: number | null;
  cautionMontant?: number | string | null;
}

export interface ValeursBail {
  loyerMensuel: number | null;
  charges: number | null;
  jourEcheance: number;
  cautionMontant: number | null;
}

/**
 * Valeurs proposées à l'ouverture d'un bail : celles du bien (loyer, charges,
 * caution annoncée en mois de loyer) ou, pour un changement de locataire,
 * celles du bail qui se termine. L'opérateur les ajuste, il ne les ressaisit pas.
 */
export function valeursParDefautBail(source: SourceMontants | null | undefined): ValeursBail {
  const loyer = nombreOuUndefined(source?.loyerMensuel) ?? null;
  const caution =
    nombreOuUndefined(source?.cautionMontant) ??
    (loyer !== null && source?.moisCaution ? loyer * source.moisCaution : null);
  return {
    loyerMensuel: loyer,
    charges: nombreOuUndefined(source?.charges) ?? null,
    jourEcheance: source?.jourEcheance ?? 5,
    cautionMontant: caution,
  };
}

/** Mêmes types et même taille que l'API : au-delà, l'envoi serait refusé après coup. */
export const TYPES_PHOTOS = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';
export const TYPES_PIECES = 'application/pdf,image/jpeg,image/png,image/webp';
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

/** Sépare les fichiers acceptables de ceux de plus de 10 Mo, à signaler à l'utilisateur. */
export function trierFichiers(fichiers: File[]): { valides: File[]; trop: File[] } {
  return {
    valides: fichiers.filter((fichier) => fichier.size <= TAILLE_MAX_FICHIER),
    trop: fichiers.filter((fichier) => fichier.size > TAILLE_MAX_FICHIER),
  };
}
