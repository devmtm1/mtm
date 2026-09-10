import { describe, expect, it } from 'vitest';
import { hasErrors, isValidEmail, validateContactForm, validateReservationForm } from './validation';

describe('isValidEmail', () => {
  it('accepte une adresse valide', () => {
    expect(isValidEmail('client@example.com')).toBe(true);
  });

  it('rejette une adresse sans arobase', () => {
    expect(isValidEmail('client-example.com')).toBe(false);
  });
});

describe('validateContactForm', () => {
  const validValues = {
    nom: 'Fatou Diop',
    email: 'fatou@example.com',
    telephone: '',
    sujet: '',
    message: 'Je suis intéressée par ce terrain, merci de me recontacter.',
  };

  it("n'émet aucune erreur pour un formulaire valide", () => {
    expect(hasErrors(validateContactForm(validValues))).toBe(false);
  });

  it('signale un nom trop court', () => {
    const errors = validateContactForm({ ...validValues, nom: 'A' });
    expect(errors.nom).toBeDefined();
  });

  it('signale un e-mail invalide', () => {
    const errors = validateContactForm({ ...validValues, email: 'pas-un-email' });
    expect(errors.email).toBeDefined();
  });

  it('signale un message trop court', () => {
    const errors = validateContactForm({ ...validValues, message: 'Court' });
    expect(errors.message).toBeDefined();
  });
});

describe('validateReservationForm', () => {
  it('exige un e-mail valide', () => {
    const errors = validateReservationForm({
      nom: 'Moussa Ndiaye',
      email: 'invalide',
      telephone: '',
      message: '',
    });
    expect(errors.email).toBeDefined();
  });
});
