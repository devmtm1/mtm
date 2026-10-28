import { describe, expect, it } from 'vitest';
import { profilClient } from './clientProfil';

const base = { chargement: false, nbDossiers: 0, nbMissions: 0, gestion: false, chantier: false };

describe('profilClient', () => {
  it('un propriétaire sans vente ne voit ni « Dossiers » ni « Vérifications »', () => {
    expect(profilClient({ ...base, gestion: true })).toEqual({ dossiers: false, verifications: false, acheteur: false });
  });

  it('un acheteur voit tout, de même qu’un compte qui n’a encore rien', () => {
    expect(profilClient({ ...base, nbDossiers: 2 })).toEqual({ dossiers: true, verifications: true, acheteur: true });
    expect(profilClient(base)).toEqual({ dossiers: true, verifications: true, acheteur: true });
  });

  it('un propriétaire garde « Vérifications » s’il en a déjà demandé une', () => {
    expect(profilClient({ ...base, gestion: true, nbMissions: 1 })).toEqual({ dossiers: false, verifications: true, acheteur: false });
  });

  it('pendant le chargement, rien ne disparaît sous les doigts', () => {
    expect(profilClient({ ...base, chargement: true, gestion: true })).toEqual({ dossiers: true, verifications: true, acheteur: true });
  });

  it('un client qui suit un chantier sans vente n’est pas pris pour un acheteur', () => {
    expect(profilClient({ ...base, chantier: true }).dossiers).toBe(false);
  });
});
