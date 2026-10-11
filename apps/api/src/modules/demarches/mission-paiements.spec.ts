import { syntheseReglement } from './mission-paiements';

/** Le dossier réel : 250 000 F convenus, deux transferts Wave. */
const wave = [
  { montantEnvoye: 150000, frais: 1485, montantNet: 148515 },
  { montantEnvoye: 50000, frais: 500, montantNet: 49500 },
];

describe('syntheseReglement', () => {
  it('calcule le solde sur le montant envoyé, frais Wave à part', () => {
    expect(syntheseReglement(250000, wave)).toEqual({
      montantConvenu: 250000,
      totalEnvoye: 200000,
      totalFrais: 1985,
      totalNet: 198015,
      solde: 50000,
      excedent: 0,
      statut: 'partiel',
    });
  });

  it('distingue non réglé, soldé et trop-perçu', () => {
    expect(syntheseReglement(250000, []).statut).toBe('non_regle');
    expect(
      syntheseReglement(250000, [
        ...wave,
        { montantEnvoye: 50000, frais: 500, montantNet: 49500 },
      ]),
    ).toMatchObject({ statut: 'solde', solde: 0 });
    expect(
      syntheseReglement(100000, [
        { montantEnvoye: 120000, frais: 0, montantNet: 120000 },
      ]),
    ).toMatchObject({ statut: 'trop_percu', solde: 0, excedent: 20000 });
  });

  it('n’annonce pas de solde tant que le prix n’est pas fixé', () => {
    expect(syntheseReglement(null, wave)).toMatchObject({
      statut: 'a_facturer',
      solde: null,
      totalEnvoye: 200000,
    });
    expect(syntheseReglement(0, [])).toMatchObject({ statut: 'a_facturer' });
  });
});
