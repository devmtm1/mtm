import { describe, expect, it } from 'vitest';
import { prochainePriorite } from './clientPriority';
import type { ClientDossier } from '../types/clientPortal';
import type { ClientBailLocataire } from '../types/locatif';

const MAINTENANT = new Date('2026-10-06T10:00:00Z');

const echeanceLoyer = (id: string, dateEcheance: string, montantPrevu: number, montantPaye = 0, statut = 'en_attente') => ({
  id,
  periode: dateEcheance,
  dateEcheance,
  montantPrevu,
  montantPaye,
  statut,
});

const bail = (echeances: ReturnType<typeof echeanceLoyer>[]) => ({ echeances }) as unknown as ClientBailLocataire;

const dossier = (statut: string, echeances: { numero: number; dateEcheance: string; montantPrevu: number; montantPaye: number; statut: string }[]) =>
  ({ id: 'd1', statut, referenceInterne: 'DOS-1', terrain: { nom: 'Parcelle Saly' }, echeances }) as unknown as ClientDossier;

describe('prochainePriorite', () => {
  it('ne propose rien quand tout est réglé ou qu’il n’y a rien', () => {
    expect(prochainePriorite(null, null, MAINTENANT)).toBeNull();
    expect(prochainePriorite([], bail([echeanceLoyer('1', '2026-10-05', 300000, 300000, 'payee')]), MAINTENANT)).toBeNull();
  });

  it('met en avant le reste dû d’un loyer, pas son montant total', () => {
    const resultat = prochainePriorite(null, bail([echeanceLoyer('1', '2026-10-20', 300000, 100000, 'partielle')]), MAINTENANT);
    expect(resultat).toMatchObject({ nature: 'loyer', cible: 'locataire', reste: 200000, enRetard: false });
  });

  it('passe devant ce qui est en retard, même si une autre échéance est plus proche', () => {
    const resultat = prochainePriorite(
      [dossier('paiement_partiel', [{ numero: 2, dateEcheance: '2026-10-08', montantPrevu: 1000000, montantPaye: 0, statut: 'planifiee' }])],
      bail([echeanceLoyer('1', '2026-10-01', 250000)]),
      MAINTENANT,
    );
    expect(resultat).toMatchObject({ nature: 'loyer', enRetard: true, joursRetard: 5 });
  });

  it('à retard égal, prend la plus proche dans le temps, loyer ou vente', () => {
    const resultat = prochainePriorite(
      [dossier('en_cours', [{ numero: 1, dateEcheance: '2026-10-12', montantPrevu: 500000, montantPaye: 0, statut: 'planifiee' }])],
      bail([echeanceLoyer('1', '2026-10-25', 250000)]),
      MAINTENANT,
    );
    expect(resultat).toMatchObject({ nature: 'echeance', cible: 'dossiers', objet: 'Échéance · Parcelle Saly' });
  });

  it('ignore les dossiers soldés ou annulés', () => {
    const resultat = prochainePriorite(
      [
        dossier('solde', [{ numero: 1, dateEcheance: '2026-09-01', montantPrevu: 500000, montantPaye: 0, statut: 'en_retard' }]),
        dossier('annule', [{ numero: 1, dateEcheance: '2026-09-01', montantPrevu: 500000, montantPaye: 0, statut: 'en_retard' }]),
      ],
      null,
      MAINTENANT,
    );
    expect(resultat).toBeNull();
  });

  it('une échéance du jour n’est pas en retard', () => {
    const resultat = prochainePriorite(null, bail([echeanceLoyer('1', '2026-10-06', 250000)]), MAINTENANT);
    expect(resultat).toMatchObject({ enRetard: false, joursRetard: 0 });
  });
});
