/**
 * Règles de validation côté client — reflet des contraintes class-validator
 * des DTO backend (CreateContactDto, CreatePublicReservationRequestDto).
 * Ne remplace jamais la validation serveur, qui reste l'autorité : ceci
 * n'existe que pour donner un retour immédiat à l'utilisateur.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export interface FieldErrors {
  [field: string]: string | undefined;
}

export interface ContactFormValues {
  nom: string;
  email: string;
  telephone: string;
  sujet: string;
  message: string;
}

export function validateContactForm(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.nom.trim().length < 2 || values.nom.trim().length > 200) {
    errors.nom = 'Le nom doit contenir entre 2 et 200 caractères.';
  }
  if (!isValidEmail(values.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  if (values.telephone && (values.telephone.trim().length < 4 || values.telephone.trim().length > 30)) {
    errors.telephone = 'Numéro de téléphone invalide.';
  }
  if (values.message.trim().length < 10 || values.message.trim().length > 2000) {
    errors.message = 'Le message doit contenir entre 10 et 2000 caractères.';
  }
  return errors;
}

export interface ReservationFormValues {
  nom: string;
  email: string;
  telephone: string;
  message: string;
}

export function validateReservationForm(values: ReservationFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.nom.trim().length < 2 || values.nom.trim().length > 200) {
    errors.nom = 'Le nom doit contenir entre 2 et 200 caractères.';
  }
  if (!isValidEmail(values.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  if (values.telephone && (values.telephone.trim().length < 4 || values.telephone.trim().length > 30)) {
    errors.telephone = 'Numéro de téléphone invalide.';
  }
  return errors;
}

/** Client connecté : seul le message est à valider, l'identité vient du compte. */
export function validateClientMessage(message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (message.trim().length < 10 || message.trim().length > 2000) {
    errors.message = 'Le message doit contenir entre 10 et 2000 caractères.';
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

export interface ConfierBienValues {
  nom: string;
  email: string;
  telephone: string;
  pays: string;
  typeBien: string;
  commune: string;
  region: string;
  nombreLogements: string;
  situation: string;
  loyerSouhaite: string;
  precisions: string;
  consentement: boolean;
}

/** Reflet de ConfierBienDto (API) : retour immédiat au visiteur, le serveur reste l'autorité. */
export function validateConfierBien(values: ConfierBienValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.nom.trim().length < 2 || values.nom.trim().length > 200) {
    errors.nom = 'Indiquez votre nom.';
  }
  if (!isValidEmail(values.email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  const telephone = values.telephone.trim();
  if (telephone.length < 4 || telephone.length > 30) {
    errors.telephone = 'Indiquez un numéro pour vous rappeler (WhatsApp ou appel).';
  }
  if (!values.typeBien) errors.typeBien = 'Choisissez le type de bien.';
  if (values.commune.trim().length < 2) errors.commune = 'Indiquez la commune ou le quartier.';
  if (!values.situation) errors.situation = 'Précisez la situation du bien.';
  if (values.nombreLogements && !(Number(values.nombreLogements) >= 1 && Number(values.nombreLogements) <= 200)) {
    errors.nombreLogements = 'Entre 1 et 200 logements.';
  }
  if (values.loyerSouhaite && !(Number(values.loyerSouhaite) >= 0)) {
    errors.loyerSouhaite = 'Montant invalide.';
  }
  if (values.precisions.length > 1500) errors.precisions = '1500 caractères au maximum.';
  if (!values.consentement) errors.consentement = 'Acceptez le traitement de vos données pour être rappelé.';
  return errors;
}
