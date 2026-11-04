import { saisieTelephone } from './telephone';
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

  it('accepte le téléphone seul, sans e-mail', () => {
    expect(hasErrors(validateContactForm({ ...validValues, email: '', telephone: '77 123 45 67' }))).toBe(false);
  });

  it("exige au moins l'e-mail ou le téléphone", () => {
    const errors = validateContactForm({ ...validValues, email: '', telephone: '' });
    expect(errors.email).toBeDefined();
    expect(errors.telephone).toBeDefined();
  });

  it('signale un message trop court', () => {
    const errors = validateContactForm({ ...validValues, message: 'Court' });
    expect(errors.message).toBeDefined();
  });
});

describe('validateReservationForm', () => {
  it('accepte le téléphone seul', () => {
    expect(hasErrors(validateReservationForm({ nom: 'Moussa Ndiaye', email: '', telephone: '771234567', message: '' }))).toBe(false);
  });

  it('exige un e-mail valide quand il est saisi', () => {
    const errors = validateReservationForm({
      nom: 'Moussa Ndiaye',
      email: 'invalide',
      telephone: '',
      message: '',
    });
    expect(errors.email).toBeDefined();
  });
});

describe('numéros de téléphone', () => {
  const valeurs = { nom: 'Fatou Diop', email: '', sujet: '', message: 'Je suis intéressée par ce terrain.' };

  it.each(['abcdef', '1234', '00000000', '12 34 56 78 90', '77 12', '77 123 45 6a'])('refuse « %s »', (telephone) => {
    expect(validateContactForm({ ...valeurs, telephone }).telephone).toBeDefined();
  });

  it.each(['77 123 45 67', '771234567', '+221 77 123 45 67', '00221771234567', '+33 6 12 34 56 78', '(+221) 77-123-45-67'])(
    'accepte « %s »',
    (telephone) => {
      expect(validateContactForm({ ...valeurs, telephone }).telephone).toBeUndefined();
    },
  );

  it('plafonne la longueur selon le format', () => {
    expect(saisieTelephone('7644488994884777689')).toBe('764448899');
    expect(saisieTelephone('221771234567999')).toBe('221771234567');
    expect(saisieTelephone('+33 6 12 34 56 78 99 99 99')).toBe('+33 6 12 34 56 78 99 99 ');
    expect(saisieTelephone('12+34+56')).toBe('123456');
  });

  it('ignore les lettres à la frappe', () => {
    expect(saisieTelephone('77 abc 123-45x')).toBe('77  123-45');
  });
});

