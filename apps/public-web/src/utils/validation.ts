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

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}
