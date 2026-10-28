import { describe, expect, it } from 'vitest';
import { etatAssurance, verifierDepot } from './assurance';
import type { ClientAssurance } from '../types/locatif';

const maintenant = new Date('2026-10-28T10:00:00Z').getTime();
const jours = (n: number) => new Date(maintenant + n * 86_400_000).toISOString();

const assurance = (extra: Partial<ClientAssurance> = {}): ClientAssurance => ({
  statut: 'valide',
  dateExpiration: jours(200),
  motifRejet: null,
  deposeLe: jours(-5),
  expiree: false,
  ...extra,
});

describe('etatAssurance', () => {
  it('« aucune » tant que rien n’est déposé', () => {
    expect(etatAssurance(null, maintenant)).toEqual({ code: 'aucune' });
    expect(etatAssurance(undefined, maintenant)).toEqual({ code: 'aucune' });
  });

  it('« en attente » après le dépôt, avant le contrôle de MTM', () => {
    expect(etatAssurance(assurance({ statut: 'en_attente' }), maintenant)).toEqual({ code: 'en_attente' });
  });

  it('une attestation refusée garde son motif', () => {
    expect(etatAssurance(assurance({ statut: 'rejete', motifRejet: 'Illisible' }), maintenant)).toEqual({ code: 'rejetee', motif: 'Illisible' });
  });

  it('valide : donne les jours restants sans alerter loin de l’échéance', () => {
    expect(etatAssurance(assurance(), maintenant)).toMatchObject({ code: 'valide', joursRestants: 200, bientotExpiree: false });
  });

  it('valide mais proche de l’échéance : à renouveler', () => {
    expect(etatAssurance(assurance({ dateExpiration: jours(12) }), maintenant)).toMatchObject({ code: 'valide', joursRestants: 12, bientotExpiree: true });
  });

  it('périmée : « expirée », même si MTM l’avait validée', () => {
    expect(etatAssurance(assurance({ expiree: true, dateExpiration: jours(-3) }), maintenant)).toEqual({ code: 'expiree' });
  });

  it('une attestation refusée passe devant l’expiration : le locataire doit lire le motif', () => {
    expect(etatAssurance(assurance({ statut: 'rejete', expiree: true, motifRejet: 'Faux' }), maintenant)).toMatchObject({ code: 'rejetee' });
  });
});

describe('verifierDepot', () => {
  const aujourdhui = new Date('2026-10-28T10:00:00');
  const pdf = new File(['%PDF'], 'attestation.pdf', { type: 'application/pdf' });

  it('accepte un PDF avec une date à venir', () => {
    expect(verifierDepot(pdf, '2027-06-30', aujourdhui)).toBeNull();
  });

  it('exige un fichier', () => {
    expect(verifierDepot(null, '2027-06-30', aujourdhui)).toMatch(/fichier/);
  });

  it('refuse un type de fichier non prévu', () => {
    const exe = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    expect(verifierDepot(exe, '2027-06-30', aujourdhui)).toMatch(/PDF ou une image/);
  });

  it('refuse un fichier de plus de 10 Mo', () => {
    const gros = new File(['x'], 'gros.pdf', { type: 'application/pdf' });
    Object.defineProperty(gros, 'size', { value: 11 * 1024 * 1024 });
    expect(verifierDepot(gros, '2027-06-30', aujourdhui)).toMatch(/10 Mo/);
  });

  it('exige la date de fin de validité', () => {
    expect(verifierDepot(pdf, '', aujourdhui)).toMatch(/date de fin/);
  });

  it('refuse une date passée mais accepte celle d’aujourd’hui', () => {
    expect(verifierDepot(pdf, '2026-10-27', aujourdhui)).toMatch(/passée/);
    expect(verifierDepot(pdf, '2026-10-28', aujourdhui)).toBeNull();
  });
});
