import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  TAILLE_MAX_FICHIER,
  contactRequis,
  datesBailCoherentes,
  nombreOuUndefined,
  trierFichiers,
  valeursParDefautBail,
} from './locatif-form';

const groupe = (valeurs: Record<string, string>) =>
  new FormGroup(Object.fromEntries(Object.entries(valeurs).map(([cle, valeur]) => [cle, new FormControl(valeur)])));

describe('formulaires de la gestion locative', () => {
  describe('nombreOuUndefined', () => {
    it('laisse vide ce qui est vide, convertit le reste', () => {
      expect(nombreOuUndefined(null)).toBeUndefined();
      expect(nombreOuUndefined('')).toBeUndefined();
      expect(nombreOuUndefined('350000.00')).toBe(350000);
      expect(nombreOuUndefined(0)).toBe(0);
    });
  });

  describe('datesBailCoherentes', () => {
    it('refuse une fin de bail avant son début', () => {
      expect(datesBailCoherentes(groupe({ dateDebut: '2026-10-01', dateFin: '2026-09-30' }))).toEqual({
        datesIncoherentes: true,
      });
    });
    it('accepte une fin le jour du début, ou pas de fin', () => {
      expect(datesBailCoherentes(groupe({ dateDebut: '2026-10-01', dateFin: '2026-10-01' }))).toBeNull();
      expect(datesBailCoherentes(groupe({ dateDebut: '2026-10-01', dateFin: '' }))).toBeNull();
    });
  });

  describe('contactRequis', () => {
    it('exige un téléphone ou une adresse e-mail', () => {
      expect(contactRequis(groupe({ phone: ' ', email: '' }))).toEqual({ contactManquant: true });
      expect(contactRequis(groupe({ phone: '+221781234567', email: '' }))).toBeNull();
      expect(contactRequis(groupe({ phone: '', email: 'a@b.sn' }))).toBeNull();
    });
  });

  describe('trierFichiers', () => {
    it('écarte les fichiers de plus de 10 Mo et garde les autres', () => {
      const petit = new File(['x'], 'a.jpg');
      const gros = new File([new Uint8Array(TAILLE_MAX_FICHIER + 1)], 'b.mp4');
      expect(trierFichiers([petit, gros])).toEqual({ valides: [petit], trop: [gros] });
    });
  });

  describe('valeursParDefautBail', () => {
    it('reprend loyer et charges du bien, et calcule la caution en mois de loyer', () => {
      expect(valeursParDefautBail({ loyerMensuel: '350000.00', charges: '25000.00', moisCaution: 2 })).toEqual({
        loyerMensuel: 350000,
        charges: 25000,
        jourEcheance: 5,
        cautionMontant: 700000,
      });
    });
    it('reprend tel quel le bail qui se termine (caution en montant, jour d’échéance)', () => {
      expect(
        valeursParDefautBail({ loyerMensuel: 280000, charges: null, jourEcheance: 10, cautionMontant: '560000.00' }),
      ).toEqual({ loyerMensuel: 280000, charges: null, jourEcheance: 10, cautionMontant: 560000 });
    });
    it('ne propose rien quand le bien n’a pas de loyer', () => {
      expect(valeursParDefautBail({ moisCaution: 2 })).toEqual({
        loyerMensuel: null,
        charges: null,
        jourEcheance: 5,
        cautionMontant: null,
      });
      expect(valeursParDefautBail(null).loyerMensuel).toBeNull();
    });
  });
});
