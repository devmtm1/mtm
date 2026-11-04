import { numeroApercu, suiteDeNumerotation } from './generer-lots-dialog';
import { clientDuLot, estFige } from './programme-detail';
import { tauxVendu } from './programmes';

describe('programmes', () => {
  it('numérote sur deux chiffres au moins, comme l’API', () => {
    expect(numeroApercu('A-', 1, 2)).toBe('A-01');
    expect(numeroApercu('A-', 100, 3)).toBe('A-100');
  });

  it('propose la suite de la numérotation existante, sans collision', () => {
    expect(suiteDeNumerotation(['A-01', 'A-02', 'A-30'])).toEqual({ prefixe: 'A-', debut: 31 });
    expect(suiteDeNumerotation([])).toEqual({ prefixe: 'Lot ', debut: 1 });
    expect(suiteDeNumerotation(['', 'sans chiffre'])).toEqual({ prefixe: 'Lot ', debut: 1 });
  });

  it('calcule le taux de lots vendus, 0 sans lots', () => {
    expect(tauxVendu({ nombreLots: 30, lotsVendus: 12 })).toBe(40);
    expect(tauxVendu({ nombreLots: 0, lotsVendus: 0 })).toBe(0);
  });

  it('fige les lots réservés ou vendus : ils ne se modifient pas en bloc', () => {
    expect(estFige({ statutCommercial: 'Vendu' })).toBe(true);
    expect(estFige({ statutCommercial: 'Réservé' })).toBe(true);
    expect(estFige({ statutCommercial: 'Disponible' })).toBe(false);
    expect(estFige({ statutCommercial: 'Brouillon' })).toBe(false);
  });

  it('retient le dossier le plus avancé d’un lot et compte les autres, sans les annulés', () => {
    const lot = { id: 'L1', numero: 'A-01', nom: 'Lot' };
    const clients = [
      { dossierId: 'd1', statut: 'en_cours', lot },
      { dossierId: 'd2', statut: 'paiement_partiel', lot },
      { dossierId: 'd3', statut: 'annule', lot },
      { dossierId: 'd4', statut: 'solde', lot: { ...lot, id: 'L2' } },
    ];
    expect(clientDuLot(clients, 'L1')).toEqual({ principal: clients[1], autres: 1 });
    expect(clientDuLot(clients, 'L2')?.autres).toBe(0);
    expect(clientDuLot(clients, 'L3')).toBeUndefined();
  });
});
