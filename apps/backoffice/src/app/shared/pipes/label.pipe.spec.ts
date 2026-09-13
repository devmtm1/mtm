import { LabelPipe, businessLabel } from './label.pipe';

describe('LabelPipe', () => {
  const pipe = new LabelPipe();

  it('traduit les codes techniques connus', () => {
    expect(pipe.transform('en_cours')).toBe('En cours');
    expect(pipe.transform('bon_reservation')).toBe('Bon de réservation');
    expect(pipe.transform('montant_fixe')).toBe('Montant fixe');
  });

  it('reste lisible pour un code inconnu (référentiel ajouté dans Paramètres)', () => {
    expect(pipe.transform('nouveau_statut_metier')).toBe('Nouveau statut metier');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(businessLabel(undefined)).toBe('—');
  });
});
