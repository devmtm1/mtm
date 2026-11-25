import { describe, expect, it } from 'vitest';
import {
  COMMISSION_STATUS,
  DOSSIER_STATUS,
  ECHEANCE_STATUS,
  PAYMENT_STATUS,
  RESERVATION_STATUS,
  help,
  label,
  pillClass,
  type StatusMeaning,
} from './ventes-status';

const TONES = ['neutral', 'success', 'warning', 'danger', 'primary', 'info'];

/** Les statuts que l'API produit réellement (workflow des ventes, paiements, réservations, commissions, échéances). */
const STATUTS_API: Record<string, [Record<string, StatusMeaning>, string[]]> = {
  dossier: [DOSSIER_STATUS, ['en_cours', 'pre_reserve', 'reserve', 'paiement_partiel', 'solde', 'annule']],
  paiement: [PAYMENT_STATUS, ['en_attente', 'valide', 'refuse', 'annule']],
  reservation: [RESERVATION_STATUS, ['active', 'confirmee', 'expiree', 'annulee']],
  commission: [COMMISSION_STATUS, ['estimee', 'validee', 'payee']],
  echeance: [ECHEANCE_STATUS, ['en_attente', 'planifiee', 'partielle', 'payee', 'en_retard']],
};

describe('statuts des ventes', () => {
  for (const [nom, [table, valeurs]] of Object.entries(STATUTS_API)) {
    it(`${nom} : chaque statut de l’API a un libellé, une explication et une couleur valide`, () => {
      for (const valeur of valeurs) {
        const sens = table[valeur];
        expect(sens, `${nom} › ${valeur}`).toBeDefined();
        expect(sens.label.trim().length).toBeGreaterThan(0);
        expect(sens.help.trim().length).toBeGreaterThan(3);
        expect(TONES).toContain(sens.tone);
      }
    });
  }

  it('ne propose aucun statut que l’API ne connaît pas', () => {
    for (const [nom, [table, valeurs]] of Object.entries(STATUTS_API)) {
      expect(Object.keys(table).sort(), nom).toEqual([...valeurs].sort());
    }
  });
});

describe('affichage d’un statut', () => {
  it('donne le libellé et l’aide du statut, ou un tiret quand il n’y en a pas', () => {
    expect(label(DOSSIER_STATUS, 'solde')).toBe('Soldé');
    expect(help(DOSSIER_STATUS, 'solde')).toContain('intégralement payé');
    expect(label(DOSSIER_STATUS, null)).toBe('—');
    expect(label(DOSSIER_STATUS, undefined)).toBe('—');
    expect(help(DOSSIER_STATUS, 'inconnu')).toBe('');
  });

  it('rend lisible un statut inconnu au lieu d’afficher le code brut', () => {
    expect(label(DOSSIER_STATUS, 'en_cours_de_revue')).not.toContain('_');
  });

  it('colore la pastille selon le ton, neutre par défaut', () => {
    expect(pillClass(DOSSIER_STATUS, 'solde')).toBe('status-pill status-pill--success');
    expect(pillClass(DOSSIER_STATUS, 'annule')).toBe('status-pill status-pill--danger');
    expect(pillClass(RESERVATION_STATUS, 'expiree')).toBe('status-pill');
    expect(pillClass(DOSSIER_STATUS, 'inconnu')).toBe('status-pill');
    expect(pillClass(DOSSIER_STATUS, null)).toBe('status-pill');
  });
});
