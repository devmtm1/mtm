import { problemeLogo, TAILLE_MAX_LOGO } from './entreprise';

describe('problemeLogo', () => {
  it('accepte une image de taille raisonnable', () => {
    expect(problemeLogo({ type: 'image/png', size: 50_000 })).toBeNull();
  });

  it('refuse un fichier qui n’est pas une image', () => {
    expect(problemeLogo({ type: 'application/pdf', size: 1000 })).toMatch(/image/);
  });

  it('refuse une image trop lourde', () => {
    expect(problemeLogo({ type: 'image/jpeg', size: TAILLE_MAX_LOGO + 1 })).toMatch(/2 Mo/);
  });
});
