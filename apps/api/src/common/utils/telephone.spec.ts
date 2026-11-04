import { estAdresseEmail, normaliserTelephone } from './telephone';

describe('normaliserTelephone', () => {
  it.each([
    ['77 123 45 67', '+221771234567'],
    ['771234567', '+221771234567'],
    ['+221 77 123 45 67', '+221771234567'],
    ['00221771234567', '+221771234567'],
    ['221771234567', '+221771234567'],
    ['(33) 821-00-00', '+221338210000'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['0033612345678', '+33612345678'],
  ])('%s devient %s', (saisie, attendu) => {
    expect(normaliserTelephone(saisie)).toBe(attendu);
  });

  it.each([
    '',
    '   ',
    'abc',
    '12345',
    '0771234567',
    '77 123 45',
    '+0771234567',
    '+12345',
    'moi@exemple.sn',
  ])('refuse « %s »', (saisie) => {
    expect(normaliserTelephone(saisie)).toBeNull();
  });

  it('refuse un numéro absent', () => {
    expect(normaliserTelephone(null)).toBeNull();
    expect(normaliserTelephone(undefined)).toBeNull();
  });
});

describe('estAdresseEmail', () => {
  it('distingue un e-mail d’un numéro', () => {
    expect(estAdresseEmail('awa@mtm.sn')).toBe(true);
    expect(estAdresseEmail('+221771234567')).toBe(false);
  });
});
