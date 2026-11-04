import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import {
  type DossierPilotage,
  comptaProgramme,
  financesProgramme,
  ligneClient,
  lignesEcheances,
  lignesVersements,
} from './programmes-pilotage';
import { ProgrammesPilotageService } from './programmes-pilotage.service';

const AUJOURDHUI = new Date('2026-11-03T10:00:00');
const jour = (iso: string) => new Date(`${iso}T00:00:00`);

function dossier(surcharge: Partial<DossierPilotage> = {}): DossierPilotage {
  return {
    id: 'd1',
    referenceInterne: 'DV-1',
    statut: 'paiement_partiel',
    prixVente: 10_000_000,
    prospect: {
      id: 'p1',
      nom: 'Diop',
      prenom: 'Awa',
      telephone: '77 000 00 00',
    },
    terrain: {
      id: 't1',
      referenceInterne: 'TER-1',
      nom: 'Lot',
      numeroLot: 'A-01',
    },
    commercialResponsable: { firstName: 'Moussa', lastName: 'Fall' },
    paiements: [
      {
        id: 'pa1',
        montant: 3_000_000,
        datePaiement: jour('2026-09-01'),
        mode: 'virement',
        statut: 'valide',
        reference: null,
      },
      {
        id: 'pa2',
        montant: 1_000_000,
        datePaiement: jour('2026-10-15'),
        mode: 'especes',
        statut: 'en_attente',
        reference: null,
      },
      {
        id: 'pa3',
        montant: 500_000,
        datePaiement: jour('2026-10-20'),
        mode: 'especes',
        statut: 'refuse',
        reference: null,
      },
    ],
    echeances: [
      {
        numero: 1,
        dateEcheance: jour('2026-10-01'),
        montantPrevu: 3_000_000,
        montantPaye: 3_000_000,
        statut: 'payee',
      },
      {
        numero: 2,
        dateEcheance: jour('2026-10-25'),
        montantPrevu: 3_500_000,
        montantPaye: 500_000,
        statut: 'partielle',
      },
      {
        numero: 3,
        dateEcheance: jour('2026-12-01'),
        montantPrevu: 3_500_000,
        montantPaye: 0,
        statut: 'en_attente',
      },
    ],
    ...surcharge,
  };
}

describe('ligneClient', () => {
  it('ne compte que les paiements validés ; ceux à valider sont mis de côté', () => {
    const ligne = ligneClient(dossier(), AUJOURDHUI);
    expect(ligne.montantPaye).toBe(3_000_000);
    expect(ligne.aValider).toBe(1_000_000);
    expect(ligne.soldeRestant).toBe(7_000_000);
    expect(ligne.tauxPaye).toBe(30);
  });

  it('repère l’échéance en retard (reste dû, jours) et la prochaine à venir', () => {
    const ligne = ligneClient(dossier(), AUJOURDHUI);
    expect(ligne.retard).toEqual({ montant: 3_000_000, jours: 9, nombre: 1 });
    expect(ligne.prochaineEcheance).toEqual({
      date: jour('2026-12-01'),
      montant: 3_500_000,
    });
  });

  it('une échéance du jour n’est pas encore en retard', () => {
    const ligne = ligneClient(
      dossier({
        echeances: [
          {
            numero: 1,
            dateEcheance: jour('2026-11-03'),
            montantPrevu: 1_000_000,
            montantPaye: 0,
            statut: 'en_attente',
          },
        ],
      }),
      AUJOURDHUI,
    );
    expect(ligne.retard).toBeNull();
    expect(ligne.prochaineEcheance?.montant).toBe(1_000_000);
  });

  it('sans prix de vente, pas de reste dû ni de pourcentage', () => {
    const ligne = ligneClient(dossier({ prixVente: null }), AUJOURDHUI);
    expect(ligne.soldeRestant).toBeNull();
    expect(ligne.tauxPaye).toBeNull();
  });
});

describe('financesProgramme', () => {
  it('additionne attendu, encaissé, reste et retard des dossiers vivants — pas des annulés', () => {
    const annule = dossier({
      id: 'd2',
      statut: 'annule',
      prixVente: 8_000_000,
    });
    const solde = dossier({
      id: 'd3',
      statut: 'solde',
      prixVente: 5_000_000,
      paiements: [
        {
          id: 'x',
          montant: 5_000_000,
          datePaiement: jour('2026-08-01'),
          mode: 'virement',
          statut: 'valide',
          reference: null,
        },
      ],
      echeances: [],
    });
    const finances = financesProgramme([dossier(), annule, solde], AUJOURDHUI);
    expect(finances).toEqual({
      dossiers: 2,
      dossiersSoldes: 1,
      totalAttendu: 15_000_000,
      encaisse: 8_000_000,
      aValider: 1_000_000,
      resteAEncaisser: 7_000_000,
      enRetard: 3_000_000,
      echeancesEnRetard: 1,
    });
  });
});

describe('listes', () => {
  it('range les versements du plus récent au plus ancien, tous statuts', () => {
    const lignes = lignesVersements([dossier()]);
    expect(lignes.map((l) => l.id)).toEqual(['pa3', 'pa2', 'pa1']);
    expect(lignes[0]).toMatchObject({ client: 'Awa Diop', lot: 'A-01' });
  });

  it('liste les échéances impayées, les plus anciennes d’abord, sans les dossiers annulés', () => {
    const lignes = lignesEcheances(
      [dossier(), dossier({ id: 'd2', statut: 'annule' })],
      AUJOURDHUI,
    );
    expect(lignes.map((l) => l.numero)).toEqual([2, 3]);
    expect(lignes[0].joursRetard).toBe(9);
    expect(lignes[1].joursRetard).toBe(0);
  });
});

describe('ProgrammesPilotageService — périmètre de chacun', () => {
  function contexte() {
    const prismaMock = createPrismaMock();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({
      id: 'prog',
    });
    prismaMock.dossierVente.findMany.mockResolvedValue([]);
    const service = new ProgrammesPilotageService(
      prismaMock as unknown as PrismaService,
    );
    return { prismaMock, service };
  }

  const commercial = {
    id: 'c1',
    roles: ['commercial'],
    permissions: ['ventes:consulter', 'crm:consulter', 'mandats:consulter'],
  };
  const direction = {
    id: 'd1',
    roles: ['direction'],
    permissions: ['ventes:consulter'],
  };

  it('refuse un programme inconnu', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(null);
    await expect(service.ventes('x', direction)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('un commercial ne voit que ses dossiers ; la direction les voit tous', async () => {
    const { prismaMock, service } = contexte();
    const reponse = await service.ventes('prog', commercial);
    expect(reponse.perimetre).toBe('les_votres');
    expect(prismaMock.dossierVente.findMany.mock.calls[0][0].where).toEqual({
      terrain: { programmeId: 'prog' },
      commercialResponsableId: 'c1',
    });

    await service.ventes('prog', direction);
    expect(prismaMock.dossierVente.findMany.mock.calls[1][0].where).toEqual({
      terrain: { programmeId: 'prog' },
    });
  });

  it('sans le droit de consulter les ventes, rien n’est lu', async () => {
    const { prismaMock, service } = contexte();
    const reponse = await service.ventes('prog', {
      id: 'u',
      roles: ['commercial'],
      permissions: [],
    });
    expect(reponse.acces).toBe(false);
    expect(prismaMock.dossierVente.findMany).not.toHaveBeenCalled();
  });

  it('un commercial ne voit que les commissions qui sont les siennes', async () => {
    const { prismaMock, service } = contexte();
    const base = {
      ...dossier(),
      commissions: [
        {
          id: 'k1',
          commercialId: 'c1',
          commercial: { id: 'c1', firstName: 'A', lastName: 'B' },
          statut: 'estimee',
          montantEstime: 100,
          montantValide: null,
          montantPaye: null,
        },
        {
          id: 'k2',
          commercialId: 'autre',
          commercial: { id: 'autre', firstName: 'C', lastName: 'D' },
          statut: 'estimee',
          montantEstime: 200,
          montantValide: null,
          montantPaye: null,
        },
      ],
    };
    prismaMock.dossierVente.findMany.mockResolvedValue([base]);
    const reponse = await service.ventes('prog', commercial);
    expect(reponse.commissions.map((c) => c.id)).toEqual(['k1']);

    const tout = await service.ventes('prog', direction);
    expect(tout.commissions.map((c) => c.id)).toEqual(['k1', 'k2']);
  });

  it('visites : un commercial ne voit que celles de ses prospects', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.visiteProspect.findMany.mockResolvedValue([]);
    await service.visites('prog', commercial);
    expect(prismaMock.visiteProspect.findMany.mock.calls[0][0].where).toEqual({
      terrain: { programmeId: 'prog' },
      prospect: { commercialResponsableId: 'c1' },
    });
    const sans = await service.visites('prog', {
      id: 'u',
      roles: ['commercial'],
      permissions: [],
    });
    expect(sans.acces).toBe(false);
  });

  it('mandats : un commercial ne voit que ses mandats', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.mandat.findMany.mockResolvedValue([]);
    await service.mandats('prog', commercial);
    expect(prismaMock.mandat.findMany.mock.calls[0][0].where).toEqual({
      lots: { some: { terrain: { programmeId: 'prog' } } },
      commercialResponsableId: 'c1',
    });
  });
});

describe('comptaProgramme — mêmes formules que le journal comptable', () => {
  const confie = (surcharge: Partial<DossierPilotage> = {}) =>
    dossier({
      terrain: {
        id: 't1',
        referenceInterne: 'TER-1',
        nom: 'Lot',
        numeroLot: 'A-01',
        proprietaireId: 'o1',
        produitDirect: false,
        commission: 1_000_000,
        marge: null,
      },
      paiements: [
        {
          id: 'a',
          montant: 4_000_000,
          datePaiement: jour('2026-09-01'),
          mode: 'virement',
          statut: 'valide',
          reference: null,
        },
        {
          id: 'b',
          montant: 1_000_000,
          datePaiement: jour('2026-10-01'),
          mode: 'especes',
          statut: 'en_attente',
          reference: null,
        },
      ],
      reversements: [
        { montant: 2_000_000, statut: 'paye' },
        { montant: 500_000, statut: 'en_attente' },
      ],
      ...surcharge,
    });

  it('un bien confié rapporte sa commission au prorata ; le reste revient au propriétaire', () => {
    const c = comptaProgramme([confie()]);
    // 1 000 000 de commission sur 10 000 000 de prix : 10 % de chaque paiement validé.
    expect(c.revenuAcquis).toBe(400_000);
    expect(c.encaisseJournal).toBe(4_000_000);
    expect(c.partProprietaires).toBe(3_600_000);
    expect(c.reverse).toBe(2_000_000);
    expect(c.enCoursReversement).toBe(500_000);
    // Dû au propriétaire sur la vente entière : 10 M − 1 M de commission − 2 M déjà reversés.
    expect(c.resteAReverser).toBe(7_000_000);
    expect(c.dossiersSansBase).toBe(0);
  });

  it('un bien en propre rapporte sa marge ; sans marge, le dossier est signalé et compte pour zéro', () => {
    const enPropre = (marge: number | null) =>
      confie({
        terrain: {
          id: 't2',
          referenceInterne: 'TER-2',
          nom: 'Lot',
          numeroLot: 'A-02',
          proprietaireId: null,
          produitDirect: false,
          commission: null,
          marge,
        },
      });
    expect(comptaProgramme([enPropre(2_000_000)]).revenuAcquis).toBe(800_000);
    const sans = comptaProgramme([enPropre(null)]);
    expect(sans.revenuAcquis).toBe(0);
    expect(sans.dossiersSansBase).toBe(1);
  });

  it('un bien confié sans commission compte pour zéro et sort des reversements', () => {
    const c = comptaProgramme([
      confie({
        terrain: {
          id: 't1',
          referenceInterne: 'TER-1',
          nom: 'Lot',
          numeroLot: 'A-01',
          proprietaireId: 'o1',
          produitDirect: false,
          commission: null,
          marge: null,
        },
      }),
    ]);
    expect(c.revenuAcquis).toBe(0);
    expect(c.resteAReverser).toBe(0);
    expect(c.dossiersSansBase).toBe(1);
  });

  it('l’argent d’un dossier annulé est rentré et son revenu reste acquis, comme au journal — mais il ne donne lieu à aucun reversement', () => {
    const c = comptaProgramme([
      confie(),
      confie({ id: 'd2', statut: 'annule' }),
    ]);
    expect(c.encaisseJournal).toBe(8_000_000);
    expect(c.encaisseSurAnnules).toBe(4_000_000);
    expect(c.revenuAcquis).toBe(800_000);
    expect(c.revenuSurAnnules).toBe(400_000);
    expect(c.partProprietaires).toBe(3_600_000);
    expect(c.resteAReverser).toBe(7_000_000);
  });
});
