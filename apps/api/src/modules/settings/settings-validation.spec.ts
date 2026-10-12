import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService.assertValeurValide', () => {
  it('accepte un format de référence avec rang', () => {
    expect(() =>
      SettingsService.assertValeurValide(
        'demarches.referenceFormat',
        'MTM-{code}-{seq:3}/{annee}',
      ),
    ).not.toThrow();
  });

  it('refuse un format sans rang, avec jeton inconnu ou vide', () => {
    for (const valeur of ['MTM-{code}/{annee}', 'X-{seq}-{foo}', '', 12]) {
      expect(() =>
        SettingsService.assertValeurValide('demarches.factureFormat', valeur),
      ).toThrow(BadRequestException);
    }
  });

  it('valide les codes de famille', () => {
    expect(() =>
      SettingsService.assertValeurValide('demarches.codesFamille', {
        verification: 'VF',
      }),
    ).not.toThrow();
    expect(() =>
      SettingsService.assertValeurValide('demarches.codesFamille', {
        verification: 'trop long !',
      }),
    ).toThrow(BadRequestException);
  });

  it('laisse passer les autres paramètres', () => {
    expect(() =>
      SettingsService.assertValeurValide('app.name', 'MTM'),
    ).not.toThrow();
  });
});

describe('clés réservées à l’identité de l’entreprise', () => {
  it('refuse de créer, modifier ou supprimer une clé « entreprise.* » depuis Paramètres', async () => {
    const { SettingsService } = await import('./settings.service');
    expect(() =>
      SettingsService.assertValeurValide('entreprise.logo', 'x'),
    ).toThrow(/Identité de l’entreprise/);
    expect(() =>
      SettingsService.assertValeurValide('entreprise.ninea', '123'),
    ).toThrow(/Identité de l’entreprise/);
    expect(() =>
      SettingsService.assertValeurValide('ventes.documentTypes', ['a']),
    ).not.toThrow();
  });
});
