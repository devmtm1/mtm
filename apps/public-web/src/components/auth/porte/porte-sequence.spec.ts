import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequencePorte, type EtatPorte } from './porte-sequence';

describe('SequencePorte', () => {
  let etats: EtatPorte[];
  let sequence: SequencePorte;

  beforeEach(() => {
    vi.useFakeTimers();
    etats = [];
    sequence = new SequencePorte((etat) => etats.push(etat), () => false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ne s’ouvre jamais sans l’annonce d’une réussite', async () => {
    sequence.demarrer();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(etats).toEqual(['approche', 'attente']);
  });

  it('suit l’ordre approche, attente, ouverture, ouvert après une réussite', async () => {
    sequence.demarrer();
    const fini = sequence.reussir();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await fini).toBe(true);
    expect(etats).toEqual(['approche', 'attente', 'ouverture', 'ouvert']);
  });

  it('attend que la clé soit en place avant d’ouvrir, même si le serveur répond tout de suite', async () => {
    sequence.demarrer();
    void sequence.reussir();
    await vi.advanceTimersByTimeAsync(300);

    expect(etats).toEqual(['approche']);
  });

  it('s’efface aussitôt sur un refus, sans jamais s’ouvrir', async () => {
    sequence.demarrer();
    sequence.refuser();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(etats).toEqual(['approche', 'refus', 'repos']);
  });

  it('une réussite annoncée après un refus n’ouvre rien', async () => {
    sequence.demarrer();
    const fini = sequence.reussir();
    sequence.refuser();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await fini).toBe(false);
    expect(etats).not.toContain('ouverture');
  });

  it('avec le mouvement réduit, la séquence est écourtée', async () => {
    const reduite = new SequencePorte((etat) => etats.push(etat), () => true);
    reduite.demarrer();
    const fini = reduite.reussir();
    await vi.advanceTimersByTimeAsync(500);

    expect(await fini).toBe(true);
    expect(etats).toEqual(['approche', 'attente', 'ouverture', 'ouvert']);
  });
});
