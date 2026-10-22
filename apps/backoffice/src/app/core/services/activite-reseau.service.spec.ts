import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiviteReseau, DELAI_AFFICHAGE_MS, DUREE_MINIMALE_MS } from './activite-reseau.service';

describe('ActiviteReseau (barre de progression)', () => {
  let activite: ActiviteReseau;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    activite = TestBed.inject(ActiviteReseau);
  });

  afterEach(() => vi.useRealTimers());

  it('ne montre rien pour une réponse rapide : pas de clignotement', () => {
    activite.debut();
    vi.advanceTimersByTime(DELAI_AFFICHAGE_MS - 50);
    activite.fin();
    vi.advanceTimersByTime(1000);
    expect(activite.visible()).toBe(false);
  });

  it('apparaît quand l’attente dure, et reste un instant même si elle finit aussitôt', () => {
    activite.debut();
    vi.advanceTimersByTime(DELAI_AFFICHAGE_MS + 10);
    expect(activite.visible()).toBe(true);
    activite.fin();
    vi.advanceTimersByTime(DUREE_MINIMALE_MS - 50);
    expect(activite.visible()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(activite.visible()).toBe(false);
  });

  it('attend la dernière requête avant de se retirer', () => {
    activite.debut();
    activite.debut();
    vi.advanceTimersByTime(DELAI_AFFICHAGE_MS + DUREE_MINIMALE_MS + 10);
    activite.fin();
    vi.advanceTimersByTime(1000);
    expect(activite.visible()).toBe(true);
    activite.fin();
    vi.advanceTimersByTime(1000);
    expect(activite.visible()).toBe(false);
  });

  it('suit le mode silence des chargements de fond', () => {
    expect(activite.enSilence).toBe(false);
    activite.mettreEnSilence();
    expect(activite.enSilence).toBe(true);
    activite.finDeSilence();
    expect(activite.enSilence).toBe(false);
  });
});
