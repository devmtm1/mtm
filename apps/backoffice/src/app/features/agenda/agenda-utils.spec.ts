import type { ItemAgenda } from '../../core/services/api/agenda-api.service';
import {
  ajouterJours,
  cleJour,
  debutDeSemaine,
  familleDe,
  grilleMois,
  grouperParJour,
  heureDite,
  periodeDeGrille,
  versChampDateHeure,
} from './agenda-utils';

function item(partiel: Partial<ItemAgenda>): ItemAgenda {
  return {
    id: 'x',
    source: 'evenement',
    type: 'rendez_vous',
    titre: 'Rendez-vous',
    debut: '2026-10-12T10:00:00.000Z',
    fin: null,
    journeeEntiere: false,
    modifiable: true,
    ...partiel,
  };
}

describe('grille du mois', () => {
  it('commence un lundi et couvre des semaines entières', () => {
    const semaines = grilleMois(new Date(2026, 9, 15), new Date(2026, 9, 12));
    expect(semaines.length).toBeGreaterThanOrEqual(4);
    expect(semaines.length).toBeLessThanOrEqual(6);
    for (const semaine of semaines) {
      expect(semaine).toHaveLength(7);
      expect(semaine[0].date.getDay()).toBe(1);
    }
    // Octobre 2026 commence un jeudi : la grille démarre le lundi 28 septembre.
    expect(semaines[0][0].cle).toBe('2026-09-28');
    expect(semaines[0][0].dansLeMois).toBe(false);
    expect(semaines[0][3].cle).toBe('2026-10-01');
    expect(semaines[0][3].dansLeMois).toBe(true);
  });

  it('repère aujourd’hui', () => {
    const semaines = grilleMois(new Date(2026, 9, 15), new Date(2026, 9, 12));
    const jours = semaines.flat().filter((jour) => jour.aujourdhui);
    expect(jours).toHaveLength(1);
    expect(jours[0].cle).toBe('2026-10-12');
  });

  it('reste sous la limite de 62 jours de l’API', () => {
    for (let mois = 0; mois < 12; mois += 1) {
      const { du, au } = periodeDeGrille(grilleMois(new Date(2026, mois, 1)));
      expect((au.getTime() - du.getTime()) / 86_400_000).toBeLessThanOrEqual(42);
    }
  });

  it('trouve le lundi d’une semaine et ajoute des jours', () => {
    expect(debutDeSemaine(new Date(2026, 9, 18)).getDate()).toBe(12);
    expect(debutDeSemaine(new Date(2026, 9, 12)).getDate()).toBe(12);
    expect(ajouterJours(new Date(2026, 9, 30), 3).getMonth()).toBe(10);
  });
});

describe('éléments du jour', () => {
  it('une journée entière reste sur son jour calendaire', () => {
    expect(cleJour(item({ debut: '2026-10-12T00:00:00.000Z', journeeEntiere: true }))).toBe(
      '2026-10-12',
    );
  });

  it('groupe par jour, journées entières d’abord puis par heure', () => {
    const groupes = grouperParJour([
      item({ id: 'b', debut: '2026-10-12T15:00:00' }),
      item({ id: 'a', debut: '2026-10-12T09:00:00' }),
      item({ id: 'j', debut: '2026-10-12T00:00:00.000Z', journeeEntiere: true }),
    ]);
    const ordre = groupes.get('2026-10-12')?.map((i) => i.id);
    expect(ordre).toEqual(['j', 'a', 'b']);
  });

  it('range chaque source dans sa famille', () => {
    expect(familleDe({ source: 'evenement' })).toBe('evenements');
    expect(familleDe({ source: 'tache' })).toBe('taches');
    expect(familleDe({ source: 'visite' })).toBe('visites');
    expect(familleDe({ source: 'mandat' })).toBe('echeances');
    expect(familleDe({ source: 'loyer' })).toBe('echeances');
  });

  it('dit l’heure', () => {
    expect(heureDite(item({ journeeEntiere: true }))).toBe('Toute la journée');
    expect(
      heureDite(item({ debut: '2026-10-12T10:00:00', fin: '2026-10-12T11:30:00' })),
    ).toBe('10:00 – 11:30');
  });

  it('produit la valeur d’un champ date-heure local', () => {
    expect(versChampDateHeure(new Date(2026, 9, 12, 9, 5))).toBe('2026-10-12T09:05');
    expect(versChampDateHeure(null)).toBe('');
  });
});
