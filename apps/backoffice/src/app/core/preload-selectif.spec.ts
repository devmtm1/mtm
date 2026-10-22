import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELAI_PRECHARGEMENT_MS, PreloadSelectif } from './preload-selectif';

describe('PreloadSelectif', () => {
  let strategie: PreloadSelectif;

  beforeEach(() => {
    vi.useFakeTimers();
    strategie = TestBed.inject(PreloadSelectif);
  });

  afterEach(() => vi.useRealTimers());

  it('ne précharge pas un écran non marqué', () => {
    const charger = vi.fn(() => of('chargé'));
    strategie.preload({ path: 'audit' } as Route, charger).subscribe();
    vi.advanceTimersByTime(DELAI_PRECHARGEMENT_MS * 2);
    expect(charger).not.toHaveBeenCalled();
  });

  it('précharge un écran marqué, après une pause', () => {
    const charger = vi.fn(() => of('chargé'));
    strategie.preload({ path: 'terrains', data: { preload: true } } as Route, charger).subscribe();
    expect(charger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DELAI_PRECHARGEMENT_MS + 10);
    expect(charger).toHaveBeenCalledTimes(1);
  });
});
