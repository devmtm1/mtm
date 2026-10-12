import { routeDeLien } from './notifications-feed.service';

describe('routeDeLien', () => {
  it('découpe un chemin simple', () => {
    expect(routeDeLien('/ventes/abc')).toEqual({ route: ['/ventes', 'abc'] });
  });

  it('sépare les paramètres de requête du chemin', () => {
    expect(routeDeLien('/taches?tache=abc')).toEqual({
      route: ['/taches'],
      queryParams: { tache: 'abc' },
    });
    expect(routeDeLien('/agenda?evenement=e1&vue=semaine').queryParams).toEqual({
      evenement: 'e1',
      vue: 'semaine',
    });
  });

  it('retombe sur l’accueil sans lien', () => {
    expect(routeDeLien(null)).toEqual({ route: ['/'] });
    expect(routeDeLien('')).toEqual({ route: ['/'] });
  });
});
