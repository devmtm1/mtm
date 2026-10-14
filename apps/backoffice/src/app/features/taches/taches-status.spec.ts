import { echeanceDite, libelle, nomPersonne, pastille, PRIORITES, routeDossier, STATUTS } from './taches-status';

describe('échéance dite à l’oral', () => {
  const maintenant = new Date('2026-10-12T10:00:00');

  it('distingue retard, aujourd’hui, demain et à venir', () => {
    expect(echeanceDite('2026-10-09T09:00:00', maintenant)).toBe('En retard de 3 jours');
    expect(echeanceDite('2026-10-11T23:00:00', maintenant)).toBe('En retard d’un jour');
    expect(echeanceDite('2026-10-12T18:00:00', maintenant)).toBe('Aujourd’hui');
    expect(echeanceDite('2026-10-13T08:00:00', maintenant)).toBe('Demain');
    expect(echeanceDite('2026-10-16T08:00:00', maintenant)).toBe('Dans 4 jours');
  });

  it('dit « sans date limite » quand il n’y en a pas', () => {
    expect(echeanceDite(null, maintenant)).toBe('Sans date limite');
  });
});

describe('libellés des tâches', () => {
  it('traduit priorités et statuts, et laisse un code inconnu lisible', () => {
    expect(libelle(PRIORITES, 'urgente')).toBe('Urgente');
    expect(libelle(STATUTS, 'a_faire')).toBe('À faire');
    expect(libelle(STATUTS, 'nouveau_statut')).toBe('nouveau_statut');
    expect(libelle(STATUTS, null)).toBe('—');
  });

  it('colore la pastille selon la teinte', () => {
    expect(pastille(PRIORITES, 'urgente')).toBe('status-pill status-pill--danger');
    expect(pastille(PRIORITES, 'basse')).toBe('status-pill');
    expect(pastille(PRIORITES, 'inconnue')).toBe('status-pill');
  });

  it('compose un nom et une route de dossier', () => {
    expect(nomPersonne({ firstName: 'Awa', lastName: 'Sow' })).toBe('Awa Sow');
    expect(nomPersonne(null)).toBe('—');
    expect(routeDossier('vente', 'v1')).toEqual(['/ventes', 'v1']);
    expect(routeDossier(null, null)).toBeNull();
    expect(routeDossier('planete', 'x')).toBeNull();
  });
});
