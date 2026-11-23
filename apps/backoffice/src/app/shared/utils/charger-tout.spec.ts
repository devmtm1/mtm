import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { chargerTout } from './charger-tout';

const lignes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i + 1}` }));

/** Une « API » de 450 lignes qui sert des pages de la taille demandée. */
function api(total: number) {
  const toutes = lignes(total);
  return vi.fn((page: number, taille: number) => of({ items: toutes.slice((page - 1) * taille, page * taille), total }));
}

describe('chargerTout', () => {
  it('ne fait qu’un appel quand tout tient dans la première page', async () => {
    const charger = api(120);
    const resultat = await firstValueFrom(chargerTout(charger, 200));
    expect(resultat.items).toHaveLength(120);
    expect(charger).toHaveBeenCalledTimes(1);
  });

  it('complète les pages suivantes : plus aucune ligne perdue au-delà de 200', async () => {
    const charger = api(450);
    const resultat = await firstValueFrom(chargerTout(charger, 200));
    expect(resultat.items).toHaveLength(450);
    expect(resultat.total).toBe(450);
    expect(charger).toHaveBeenCalledTimes(3);
    expect(resultat.items[449].id).toBe('l450');
    expect(new Set(resultat.items.map((ligne) => ligne.id)).size).toBe(450);
  });

  it('une liste vide reste vide', async () => {
    const resultat = await firstValueFrom(chargerTout(api(0), 200));
    expect(resultat).toEqual({ items: [], total: 0 });
  });

  it('s’arrête au plafond pour ne pas bloquer l’écran, en gardant le vrai total', async () => {
    const charger = api(1000);
    const resultat = await firstValueFrom(chargerTout(charger, 200, 400));
    expect(resultat.items).toHaveLength(400);
    expect(resultat.total).toBe(1000);
    expect(charger).toHaveBeenCalledTimes(2);
  });
});
