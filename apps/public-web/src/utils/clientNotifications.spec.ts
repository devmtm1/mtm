import { describe, expect, it } from 'vitest';
import { depuisQuand, groupeParJour, iconeNotification, lienSur } from './clientNotifications';
import type { ClientNotification } from '../types/notification';

const MAINTENANT = new Date('2026-10-07T12:00:00');
const notif = (id: string, createdAt: string): ClientNotification => ({
  id,
  type: 'paiement_valide',
  niveau: 'info',
  titre: id,
  message: null,
  lien: null,
  readAt: null,
  createdAt,
});

describe('groupeParJour', () => {
  it('range par jour calendaire, sans groupe vide', () => {
    const groupes = groupeParJour(
      [notif('a', '2026-10-07T09:00:00'), notif('b', '2026-10-06T23:30:00'), notif('c', '2026-10-01T10:00:00')],
      MAINTENANT,
    );
    expect(groupes.map((groupe) => [groupe.titre, groupe.items.map((item) => item.id)])).toEqual([
      ['Aujourd’hui', ['a']],
      ['Hier', ['b']],
      ['Plus ancien', ['c']],
    ]);
    expect(groupeParJour([notif('a', '2026-10-07T09:00:00')], MAINTENANT)).toHaveLength(1);
    expect(groupeParJour([], MAINTENANT)).toEqual([]);
  });
});

describe('depuisQuand', () => {
  it('parle en minutes, heures, jours, puis donne la date', () => {
    expect(depuisQuand('2026-10-07T11:59:40', MAINTENANT)).toBe('À l’instant');
    expect(depuisQuand('2026-10-07T11:48:00', MAINTENANT)).toBe('il y a 12 min');
    expect(depuisQuand('2026-10-07T09:00:00', MAINTENANT)).toBe('il y a 3 h');
    expect(depuisQuand('2026-10-05T12:00:00', MAINTENANT)).toBe('il y a 2 j');
    expect(depuisQuand('2026-09-01T12:00:00', MAINTENANT)).toContain('2026');
  });
});

describe('iconeNotification et lienSur', () => {
  it('une alerte est rouge, un paiement vert', () => {
    expect(iconeNotification('autre', 'alerte').tone).toBe('accent');
    expect(iconeNotification('paiement_valide', 'info').tone).toBe('success');
    expect(iconeNotification('inconnu', 'info').tone).toBe('primary');
  });

  it('n’ouvre que les routes de l’espace client', () => {
    expect(lienSur('/espace-client/dossiers')).toBe('/espace-client/dossiers');
    expect(lienSur('/espace-client')).toBe('/espace-client');
    expect(lienSur('/ventes/abc')).toBeNull();
    expect(lienSur('https://pirate.example')).toBeNull();
    expect(lienSur(null)).toBeNull();
  });
});
