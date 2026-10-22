import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELAI_AUTRES_MS, DELAI_PRIORITAIRES_MS, ECART_MS, PreloadSelectif } from './preload-selectif';

describe('PreloadSelectif', () => {
  let strategie: PreloadSelectif;

  beforeEach(() => {
    vi.useFakeTimers();
    strategie = TestBed.inject(PreloadSelectif);
  });

  afterEach(() => vi.useRealTimers());

  it('charge d’abord les écrans prioritaires, après une courte pause', () => {
    const charger = vi.fn(() => of('chargé'));
    strategie.preload({ path: 'terrains', data: { preload: true } } as Route, charger).subscribe();
    vi.advanceTimersByTime(DELAI_PRIORITAIRES_MS - 100);
    expect(charger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(charger).toHaveBeenCalledTimes(1);
  });

  it('laisse les autres écrans pour bien plus tard', () => {
    const charger = vi.fn(() => of('chargé'));
    strategie.preload({ path: 'audit' } as Route, charger).subscribe();
    vi.advanceTimersByTime(DELAI_PRIORITAIRES_MS * 2);
    expect(charger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DELAI_AUTRES_MS);
    expect(charger).toHaveBeenCalledTimes(1);
  });

  it('charge un seul fichier à la fois, avec une pause entre deux', () => {
    const appels: string[] = [];
    const un = vi.fn(() => { appels.push('un'); return of(1); });
    const deux = vi.fn(() => { appels.push('deux'); return of(2); });
    strategie.preload({ path: 'a', data: { preload: true } } as Route, un).subscribe();
    strategie.preload({ path: 'b', data: { preload: true } } as Route, deux).subscribe();
    vi.advanceTimersByTime(DELAI_PRIORITAIRES_MS + 10);
    expect(appels).toEqual(['un']);
    vi.advanceTimersByTime(ECART_MS + 10);
    expect(appels).toEqual(['un', 'deux']);
  });

  it('sur une connexion lente, ne charge à l’avance que l’essentiel', () => {
    Object.defineProperty(navigator, 'connection', { value: { effectiveType: '3g' }, configurable: true });
    const autre = vi.fn(() => of(1));
    const essentiel = vi.fn(() => of(2));
    strategie.preload({ path: 'audit' } as Route, autre).subscribe();
    strategie.preload({ path: 'terrains', data: { preload: true } } as Route, essentiel).subscribe();
    vi.advanceTimersByTime(DELAI_AUTRES_MS * 2);
    expect(autre).not.toHaveBeenCalled();
    expect(essentiel).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
  });

  it('ne précharge rien quand la connexion économise les données', () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    const charger = vi.fn(() => of('chargé'));
    strategie.preload({ path: 'terrains', data: { preload: true } } as Route, charger).subscribe();
    vi.advanceTimersByTime(DELAI_AUTRES_MS * 2);
    expect(charger).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
  });
});
