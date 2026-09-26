import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import {
  calculerAlertes,
  calculerAvancement,
  calculerBudget,
  situationAlerte,
  synchroniserChantier,
} from './chantier.helper';

const MAINTENANT = new Date('2026-09-26T12:00:00Z');

/** Jalon minimal, que chaque test ajuste sur le seul champ qui l'intéresse. */
function jalon(
  over: Partial<Parameters<typeof calculerAvancement>[0][number]> = {},
) {
  return {
    statut: 'a_venir',
    poids: 1,
    avancement: 0,
    dateFinPrevue: null,
    dateFinReelle: null,
    ...over,
  };
}

describe('calculerAvancement', () => {
  it('rend null sans jalon, pour que l’avancement saisi soit conservé', () => {
    expect(calculerAvancement([], MAINTENANT).pourcentage).toBeNull();
  });

  it('pondère les jalons par leur poids plutôt que de les compter', () => {
    // Un gros œuvre de poids 3 achevé pèse plus que deux finitions à zéro.
    const resultat = calculerAvancement(
      [
        jalon({ statut: 'termine', poids: 3 }),
        jalon({ poids: 1 }),
        jalon({ poids: 1 }),
      ],
      MAINTENANT,
    );
    expect(resultat.pourcentage).toBe(60);
  });

  it('compte un jalon terminé à 100 % même si son pourcentage est resté bas', () => {
    const resultat = calculerAvancement(
      [jalon({ statut: 'termine', avancement: 40 })],
      MAINTENANT,
    );
    expect(resultat.pourcentage).toBe(100);
  });

  it('exclut les jalons annulés du calcul', () => {
    const resultat = calculerAvancement(
      [jalon({ statut: 'termine' }), jalon({ statut: 'annule' })],
      MAINTENANT,
    );
    expect(resultat.pourcentage).toBe(100);
    expect(resultat.jalonsTotal).toBe(1);
  });

  it('repère les jalons dont l’échéance est passée et le pire retard', () => {
    const resultat = calculerAvancement(
      [
        jalon({ dateFinPrevue: new Date('2026-09-20T00:00:00Z') }),
        jalon({ dateFinPrevue: new Date('2026-09-01T00:00:00Z') }),
        // Terminé : sa date passée n'est pas un retard.
        jalon({
          statut: 'termine',
          dateFinPrevue: new Date('2026-08-01T00:00:00Z'),
        }),
        // À venir : pas encore échu.
        jalon({ dateFinPrevue: new Date('2026-12-01T00:00:00Z') }),
      ],
      MAINTENANT,
    );
    expect(resultat.jalonsEnRetard).toBe(2);
    expect(resultat.joursRetardMax).toBe(25);
  });

  it('borne un pourcentage aberrant au lieu de le propager', () => {
    expect(
      calculerAvancement([jalon({ avancement: 250 })], MAINTENANT).pourcentage,
    ).toBe(100);
    expect(
      calculerAvancement([jalon({ avancement: -40 })], MAINTENANT).pourcentage,
    ).toBe(0);
  });
});

describe('calculerBudget', () => {
  const intervenant = (montantContrat: number, statut = 'engage') => ({
    montantContrat,
    statut,
  });

  it('ne compte que les dépenses validées et isole celles en attente', () => {
    const budget = calculerBudget(
      { montantDevis: 10_000_000, budgetPrevu: 8_000_000 },
      [],
      [
        { montant: 3_000_000, statut: 'valide' },
        { montant: 500_000, statut: 'en_attente' },
        { montant: 900_000, statut: 'rejete' },
      ],
      [],
    );
    expect(budget.montantDepense).toBe(3_000_000);
    expect(budget.montantEnAttente).toBe(500_000);
    expect(budget.margeEstimee).toBe(7_000_000);
  });

  it('retombe sur la somme des postes quand aucun budget n’est saisi', () => {
    const budget = calculerBudget(
      { montantDevis: null, budgetPrevu: null },
      [{ montantPrevu: 2_000_000 }, { montantPrevu: 1_000_000 }],
      [],
      [],
    );
    expect(budget.budgetPrevu).toBe(3_000_000);
    expect(budget.totalLignes).toBe(3_000_000);
  });

  it('n’engage pas les contrats seulement pressentis ou résiliés', () => {
    const budget = calculerBudget(
      { montantDevis: null, budgetPrevu: 1 },
      [],
      [],
      [
        intervenant(1_000_000),
        intervenant(500_000, 'pressenti'),
        intervenant(400_000, 'resilie'),
        intervenant(200_000, 'termine'),
      ],
    );
    expect(budget.montantEngage).toBe(1_200_000);
  });

  it('ne constate aucun dépassement sans budget de référence', () => {
    const budget = calculerBudget(
      { montantDevis: null, budgetPrevu: null },
      [],
      [{ montant: 5_000_000, statut: 'valide' }],
      [],
    );
    expect(budget.depassement).toBe(false);
  });

  it('applique le seuil paramétré plutôt qu’un dépassement figé', () => {
    const projet = { montantDevis: null, budgetPrevu: 1_000_000 };
    const depenses = [{ montant: 1_050_000, statut: 'valide' }];
    // 105 % du budget : dépassement au seuil par défaut, toléré à 110 %.
    expect(calculerBudget(projet, [], depenses, [], 100).depassement).toBe(
      true,
    );
    expect(calculerBudget(projet, [], depenses, [], 110).depassement).toBe(
      false,
    );
  });
});

describe('situationAlerte', () => {
  it('combine retard et dépassement en un seul code triable', () => {
    expect(situationAlerte(false, false)).toBe('aucune');
    expect(situationAlerte(true, false)).toBe('retard');
    expect(situationAlerte(false, true)).toBe('depassement_budget');
    expect(situationAlerte(true, true)).toBe('retard_et_depassement');
  });
});

describe('calculerAlertes', () => {
  const budgetSain = calculerBudget(
    { montantDevis: null, budgetPrevu: 1_000_000 },
    [],
    [],
    [],
  );

  it('signale un chantier dont la fin prévue est dépassée', () => {
    const alertes = calculerAlertes(
      { statut: 'en_cours', dateFinPrevue: new Date('2026-09-01T00:00:00Z') },
      { jalonsEnRetard: 0 },
      budgetSain,
      0,
      0,
      MAINTENANT,
    );
    expect(alertes.retard).toBe(true);
    expect(alertes.joursRetardProjet).toBe(25);
    expect(alertes.situation).toBe('retard');
  });

  it('n’alerte plus sur un chantier réceptionné : son retard est de l’histoire', () => {
    const alertes = calculerAlertes(
      {
        statut: 'receptionne',
        dateFinPrevue: new Date('2026-01-01T00:00:00Z'),
      },
      { jalonsEnRetard: 4 },
      budgetSain,
      0,
      3,
      MAINTENANT,
    );
    expect(alertes.retard).toBe(false);
    expect(alertes.jalonsEnRetard).toBe(0);
    expect(alertes.echeancesProches).toBe(0);
    expect(alertes.situation).toBe('aucune');
  });

  it('remonte les problèmes de journal encore ouverts', () => {
    const alertes = calculerAlertes(
      { statut: 'en_cours', dateFinPrevue: null },
      { jalonsEnRetard: 0 },
      budgetSain,
      2,
      0,
      MAINTENANT,
    );
    expect(alertes.problemesOuverts).toBe(2);
  });
});

describe('synchroniserChantier', () => {
  function prismaAvec(jalons: unknown[], depenses: unknown[] = []) {
    const prisma = createPrismaMock();
    prisma.projetConstruction.findUnique.mockResolvedValue({
      id: 'chantier-1',
      statut: 'en_cours',
      montantDevis: 10_000_000,
      budgetPrevu: 8_000_000,
      dateFinPrevue: null,
      avancement: 42,
    });
    prisma.jalonChantier.findMany.mockResolvedValue(jalons);
    prisma.ligneBudgetChantier.findMany.mockResolvedValue([]);
    prisma.depenseChantier.findMany.mockResolvedValue(depenses);
    prisma.intervenantChantier.findMany.mockResolvedValue([]);
    prisma.entreeJournalChantier.count.mockResolvedValue(0);
    prisma.projetConstruction.update.mockResolvedValue({});
    return prisma;
  }

  it('réécrit avancement, montants et alerte sur le projet', async () => {
    const prisma = prismaAvec(
      [jalon({ statut: 'termine' }), jalon()],
      [{ montant: 9_000_000, statut: 'valide' }],
    );

    const synthese = await synchroniserChantier(prisma as never, 'chantier-1', {
      maintenant: MAINTENANT,
    });

    expect(synthese.avancement.pourcentage).toBe(50);
    expect(synthese.alertes.depassementBudget).toBe(true);
    expect(prisma.projetConstruction.update).toHaveBeenCalledWith({
      where: { id: 'chantier-1' },
      data: {
        avancement: 50,
        montantEngage: 0,
        montantDepense: 9_000_000,
        situationAlerte: 'depassement_budget',
      },
    });
  });

  it('conserve l’avancement saisi quand le chantier n’a aucun jalon', async () => {
    const prisma = prismaAvec([]);

    await synchroniserChantier(prisma as never, 'chantier-1', {
      maintenant: MAINTENANT,
    });

    expect(prisma.projetConstruction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avancement: 42 }),
      }),
    );
  });

  it('compte comme proche une échéance dans la fenêtre paramétrée', async () => {
    const prisma = prismaAvec([
      jalon({ dateFinPrevue: new Date('2026-10-02T00:00:00Z') }),
      jalon({ dateFinPrevue: new Date('2026-11-30T00:00:00Z') }),
    ]);

    const synthese = await synchroniserChantier(prisma as never, 'chantier-1', {
      maintenant: MAINTENANT,
      horizonJours: 14,
    });

    expect(synthese.alertes.echeancesProches).toBe(1);
  });

  it('refuse de synchroniser un chantier introuvable', async () => {
    const prisma = createPrismaMock();
    prisma.projetConstruction.findUnique.mockResolvedValue(null);

    await expect(
      synchroniserChantier(prisma as never, 'inconnu'),
    ).rejects.toThrow('Chantier introuvable pour synchronisation : inconnu');
  });
});
