import { BadRequestException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import {
  ENVOI_PAR_DEFAUT,
  envoiValide,
  estJourDEnvoi,
  lireEnvoi,
  periodeEcoulee,
} from './envoi-automatique';

const valide = {
  actif: true,
  frequence: 'hebdomadaire',
  rapports: ['ventes_periode'],
  formats: ['pdf'],
  destinataires: ['dg@mtm.sn'],
};

describe('envoi automatique des rapports', () => {
  it('accepte une configuration complète et la valeur par défaut', () => {
    expect(envoiValide(valide)).toBe(true);
    expect(envoiValide(ENVOI_PAR_DEFAUT)).toBe(true);
  });

  it('refuse les valeurs incohérentes', () => {
    expect(envoiValide(null)).toBe(false);
    expect(envoiValide({ ...valide, frequence: 'quotidienne' })).toBe(false);
    expect(envoiValide({ ...valide, rapports: ['inconnu'] })).toBe(false);
    expect(envoiValide({ ...valide, formats: [] })).toBe(false);
    expect(envoiValide({ ...valide, formats: ['doc'] })).toBe(false);
    expect(envoiValide({ ...valide, destinataires: ['pas-un-mail'] })).toBe(
      false,
    );
    expect(envoiValide({ ...valide, actif: 'oui' })).toBe(false);
  });

  it('actif exige au moins un destinataire et un rapport', () => {
    expect(envoiValide({ ...valide, destinataires: [] })).toBe(false);
    expect(envoiValide({ ...valide, rapports: [] })).toBe(false);
    expect(envoiValide({ ...valide, actif: false, destinataires: [] })).toBe(
      true,
    );
  });

  it('lireEnvoi dédoublonne et désactive une valeur abîmée', () => {
    const lu = lireEnvoi({
      ...valide,
      destinataires: ['DG@mtm.sn', 'dg@mtm.sn'],
    });
    expect(lu.destinataires).toEqual(['dg@mtm.sn']);
    expect(lireEnvoi({ n: 1 }).actif).toBe(false);
  });

  it('refuse la valeur depuis la page Paramètres', () => {
    expect(() =>
      SettingsService.assertValeurValide('pilotage.envoiAutomatique', {}),
    ).toThrow(BadRequestException);
    expect(() =>
      SettingsService.assertValeurValide('pilotage.envoiAutomatique', valide),
    ).not.toThrow();
  });

  it('détermine le jour d’envoi', () => {
    expect(
      estJourDEnvoi('hebdomadaire', new Date('2026-10-12T07:00:00Z')),
    ).toBe(true);
    expect(
      estJourDEnvoi('hebdomadaire', new Date('2026-10-13T07:00:00Z')),
    ).toBe(false);
    expect(estJourDEnvoi('mensuelle', new Date('2026-11-01T07:00:00Z'))).toBe(
      true,
    );
  });

  it('calcule la dernière période complète', () => {
    expect(
      periodeEcoulee('hebdomadaire', new Date('2026-10-12T07:00:00Z')),
    ).toEqual({ du: '2026-10-05', au: '2026-10-11' });
    expect(
      periodeEcoulee('mensuelle', new Date('2026-11-01T07:00:00Z')),
    ).toEqual({
      du: '2026-10-01',
      au: '2026-10-31',
    });
    expect(
      periodeEcoulee('mensuelle', new Date('2027-01-01T07:00:00Z')),
    ).toEqual({
      du: '2026-12-01',
      au: '2026-12-31',
    });
    expect(
      periodeEcoulee('mensuelle', new Date('2026-03-01T07:00:00Z')),
    ).toEqual({
      du: '2026-02-01',
      au: '2026-02-28',
    });
  });
});
