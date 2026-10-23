import {
  masquerCoordonnees,
  masquerCoordonneesDeLaFiche,
  voitCoordonneesProprietaires,
} from './coordonnees';

const proprietaire = {
  id: 'p1',
  matricule: 'PRO-2026-0001',
  firstName: 'Aminata',
  lastName: 'Ndiaye',
  email: 'a@ex.sn',
  phone: '770000000',
  notes: 'Lot 12',
};

describe('coordonnées des propriétaires', () => {
  it('ne les montre qu’à l’administrateur (ou à un traitement interne)', () => {
    expect(voitCoordonneesProprietaires({ roles: ['administrateur'] })).toBe(
      true,
    );
    expect(voitCoordonneesProprietaires(undefined)).toBe(true);
    expect(voitCoordonneesProprietaires({ roles: ['direction'] })).toBe(false);
    expect(voitCoordonneesProprietaires({ roles: ['commercial'] })).toBe(false);
  });

  it('retire e-mail et téléphone mais garde tout le reste', () => {
    const vu = masquerCoordonnees(proprietaire, { roles: ['commercial'] });
    expect(vu).toMatchObject({
      matricule: 'PRO-2026-0001',
      firstName: 'Aminata',
      notes: 'Lot 12',
      email: null,
      phone: null,
      coordonneesMasquees: true,
    });
  });

  it('rend la fiche intacte à l’administrateur', () => {
    expect(
      masquerCoordonnees(proprietaire, { roles: ['administrateur'] }),
    ).toBe(proprietaire);
  });

  it('masque aussi le propriétaire et le téléphone du vendeur d’une fiche terrain', () => {
    const vu = masquerCoordonneesDeLaFiche(
      {
        nom: 'Lot 1',
        proprietaire,
        contactVendeurNom: 'Moussa',
        contactVendeurTelephone: '780000000',
      },
      { roles: ['responsable_commercial'] },
    );
    expect(vu.proprietaire).toMatchObject({
      phone: null,
      email: null,
      matricule: 'PRO-2026-0001',
    });
    expect(vu.contactVendeurTelephone).toBeNull();
    expect(vu.contactVendeurNom).toBe('Moussa');
  });
});
