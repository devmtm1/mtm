import {
  reperesParDefaut,
  syntheseImmeuble,
  type LogementSynthese,
} from './immeubles.helper';

const loue = (loyer: number, impaye = 0): LogementSynthese => ({
  statut: 'loue',
  modeLocation: 'longue_duree',
  loyerMensuel: loyer,
  bail: { loyerMensuel: loyer, impaye },
});
const libre = (loyerAnnonce: number | null): LogementSynthese => ({
  statut: 'disponible',
  modeLocation: 'longue_duree',
  loyerMensuel: loyerAnnonce,
  bail: null,
});

describe('syntheseImmeuble', () => {
  it('compte les logements, l’occupation et les loyers d’une villa divisée en quatre', () => {
    const resume = syntheseImmeuble([
      loue(250000),
      loue(200000, 200000),
      libre(220000),
      libre(null),
    ]);
    expect(resume).toMatchObject({
      logements: 4,
      loues: 2,
      disponibles: 2,
      horsMarche: 0,
      tauxOccupation: 50,
      loyerMensuelAttendu: 450000,
      // baux en cours + loyer annoncé du logement libre qui en a un
      loyerMensuelPotentiel: 670000,
      logementsEnRetard: 1,
      impayes: 200000,
    });
  });

  it('range à part les logements en travaux ou indisponibles', () => {
    const resume = syntheseImmeuble([
      loue(100000),
      { ...libre(90000), statut: 'en_travaux' },
    ]);
    expect(resume.horsMarche).toBe(1);
    expect(resume.disponibles).toBe(0);
    expect(resume.tauxOccupation).toBe(50);
  });

  it('ne compte pas les séjours de courte durée dans les loyers mensuels, mais dans les logements', () => {
    const resume = syntheseImmeuble([
      loue(300000),
      {
        statut: 'loue',
        modeLocation: 'courte_duree',
        loyerMensuel: null,
        bail: null,
      },
    ]);
    expect(resume.logements).toBe(2);
    expect(resume.loyerMensuelAttendu).toBe(300000);
    expect(resume.loyerMensuelPotentiel).toBe(300000);
  });

  it('ne plante pas sur une propriété sans logement', () => {
    expect(syntheseImmeuble([])).toMatchObject({
      logements: 0,
      tauxOccupation: 0,
      loyerMensuelAttendu: 0,
      impayes: 0,
    });
  });
});

describe('reperesParDefaut', () => {
  it('propose A1, A2, A3…', () => {
    expect(reperesParDefaut(3)).toEqual(['A1', 'A2', 'A3']);
    expect(reperesParDefaut(2, 'Lot ')).toEqual(['Lot 1', 'Lot 2']);
  });
});
