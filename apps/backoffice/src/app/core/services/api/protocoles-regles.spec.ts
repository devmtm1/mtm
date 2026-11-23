import { describe, expect, it } from 'vitest';
import { STATUTS_SIGNES, signatureManquante } from './protocoles-api.service';

const dossier = { statut: 'reserve', montantPaye: 2_000_000 };

describe('signatureManquante', () => {
  it('alerte quand de l’argent est encaissé et qu’aucun protocole n’existe', () => {
    expect(signatureManquante([], dossier)).toBe(true);
  });

  it('« envoyé » n’est jamais « signé » : un protocole envoyé ne lève pas l’alerte', () => {
    for (const statut of ['a_preparer', 'prepare_a_verifier', 'envoye', 'en_attente_signature', 'a_corriger', 'annule']) {
      expect(signatureManquante([{ statut }], dossier), statut).toBe(true);
    }
  });

  it('une copie signée reçue lève l’alerte, quelle que soit l’étape suivante', () => {
    for (const statut of STATUTS_SIGNES) expect(signatureManquante([{ statut }], dossier), statut).toBe(false);
    expect(signatureManquante([{ statut: 'envoye' }, { statut: 'valide' }], dossier)).toBe(false);
  });

  it('n’alerte pas sans argent encaissé, ni sur un dossier annulé', () => {
    expect(signatureManquante([], { statut: 'reserve', montantPaye: 0 })).toBe(false);
    expect(signatureManquante([], { statut: 'reserve', montantPaye: null })).toBe(false);
    expect(signatureManquante([], { statut: 'annule', montantPaye: 5_000_000 })).toBe(false);
  });

  it('accepte un montant donné en texte par l’API', () => {
    expect(signatureManquante([], { statut: 'reserve', montantPaye: '1500000.00' })).toBe(true);
  });

  it('n’alerte pas dans le doute : protocoles pas encore chargés ou dossier absent', () => {
    expect(signatureManquante(null, dossier)).toBe(false);
    expect(signatureManquante([], null)).toBe(false);
  });
});
