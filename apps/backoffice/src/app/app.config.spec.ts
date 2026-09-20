import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('fournit un adaptateur de date aux calendriers Material', () => {
    // Sans cet adaptateur, tout écran affichant un sélecteur de date plante
    // au chargement (« Cannot read properties of null »).
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });

    const adapter = TestBed.inject(DateAdapter);

    expect(adapter).toBeTruthy();
    expect(adapter.format(new Date(2026, 8, 20), { dateStyle: 'short' })).toContain('2026');
  });
});
