import { describe, expect, it } from 'vitest';
import { prochainEtat } from './barre-flottante';

const PAGE = 3000;
const FENETRE = 800;

describe('barre d’onglets flottante : défilement', () => {
  it('reste visible tout en haut de la page', () => {
    expect(prochainEtat({ visible: false, reference: 400 }, 0, PAGE, FENETRE).visible).toBe(true);
    expect(prochainEtat({ visible: false, reference: 400 }, 6, PAGE, FENETRE).visible).toBe(true);
  });

  it('se range quand on descend, et revient quand on remonte', () => {
    const rangee = prochainEtat({ visible: true, reference: 400 }, 460, PAGE, FENETRE);
    expect(rangee).toEqual({ visible: false, reference: 460 });
    const revenue = prochainEtat(rangee, 430, PAGE, FENETRE);
    expect(revenue).toEqual({ visible: true, reference: 430 });
  });

  it('ignore un tremblement de quelques pixels', () => {
    const avant = { visible: true, reference: 400 };
    expect(prochainEtat(avant, 405, PAGE, FENETRE)).toBe(avant);
    const rangee = { visible: false, reference: 400 };
    expect(prochainEtat(rangee, 396, PAGE, FENETRE)).toBe(rangee);
  });

  it('accumule les petits mouvements dans le même sens', () => {
    let etat = { visible: true, reference: 400 };
    etat = prochainEtat(etat, 404, PAGE, FENETRE);
    etat = prochainEtat(etat, 408, PAGE, FENETRE);
    expect(etat.visible).toBe(true);
    etat = prochainEtat(etat, 412, PAGE, FENETRE);
    expect(etat.visible).toBe(false);
  });

  it('revient tout en bas de la page, où se trouve le pied de page', () => {
    expect(prochainEtat({ visible: false, reference: 2100 }, 2200, PAGE, FENETRE).visible).toBe(true);
  });
});
