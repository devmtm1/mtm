import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientLocatairePage } from './ClientLocatairePage';
import type { ClientBailLocataire, ClientEcheanceLoyer } from '../../types/locatif';

const donnees = vi.hoisted(() => ({
  valeur: {
    locataireBaux: [] as unknown[] | null,
    locatairePaiements: [] as unknown[],
    locataireIncidents: [] as unknown[],
    locataireLoading: false,
    refetchLocataireIncidents: () => {},
  },
}));

vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => donnees.valeur }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ accessToken: 'jeton' }) }));
vi.mock('../../hooks/useClientPortal', () => ({
  useLocataireResiliations: () => ({ data: { demandes: [], preavisJours: 30 }, refetch: () => {} }),
}));
vi.mock('../../components/client/ClientEchanges', () => ({ ClientEchanges: () => null }));

const jours = (decalage: number) => new Date(Date.now() + decalage * 86_400_000).toISOString();

const echeance = (id: string, decalageJours: number, statut: string, paye = 0): ClientEcheanceLoyer => ({
  id,
  periode: jours(decalageJours),
  dateEcheance: jours(decalageJours),
  montantPrevu: 250000,
  montantPaye: paye,
  statut,
});

const bail = (extra: Partial<ClientBailLocataire> = {}): ClientBailLocataire =>
  ({
    id: 'b1',
    referenceInterne: 'B-2026-0001',
    loyerMensuel: 250000,
    charges: null,
    jourEcheance: 5,
    dateDebut: jours(-100),
    dateFin: null,
    statut: 'actif',
    situationPaiement: 'a_jour',
    preavisDonneLe: null,
    preavisDepartPrevu: null,
    dateSortieReelle: null,
    regularisationMontant: null,
    bien: { referenceInterne: 'L-1', adresse: 'Rue 11', commune: 'Fann', region: 'Dakar', type: 'appartement' },
    solde: { loyersDus: 500000, loyersRegles: 0, resteADevoir: 500000, enAttenteDeValidation: 0 },
    caution: { statut: 'non_versee', montantPrevu: 0, montantVerse: 0, montantRetenu: 0, montantRembourse: 0, montantConserve: 0, mouvements: [] },
    echeances: [],
    documents: [],
    ...extra,
  }) as unknown as ClientBailLocataire;

const afficher = () =>
  render(
    <MemoryRouter>
      <ClientLocatairePage />
    </MemoryRouter>,
  );

describe('ClientLocatairePage — échéances', () => {
  it('affiche « Impayée » une échéance dont la date est passée, même si le serveur ne l’a pas encore mise à jour', () => {
    donnees.valeur.locataireBaux = [
      bail({ echeances: [echeance('e1', -60, 'a_venir'), echeance('e2', -30, 'a_venir'), echeance('e3', 30, 'a_venir')] }),
    ];
    afficher();

    expect(screen.getAllByText('Impayée')).toHaveLength(2);
    expect(screen.getAllByText('À venir')).toHaveLength(1);
  });

  it('ne dit plus « À jour » quand un loyer est échu et que le solde est dû', () => {
    donnees.valeur.locataireBaux = [bail({ echeances: [echeance('e1', -60, 'a_venir')] })];
    afficher();

    expect(screen.getByText('Retard')).toBeTruthy();
    expect(screen.queryByText('À jour')).toBeNull();
  });

  it('ne montre que les deux prochaines échéances à venir et propose de déplier le reste', () => {
    donnees.valeur.locataireBaux = [
      bail({
        solde: { loyersDus: 0, loyersRegles: 0, resteADevoir: 0, enAttenteDeValidation: 0 },
        echeances: [echeance('e1', 10, 'a_venir'), echeance('e2', 40, 'a_venir'), echeance('e3', 70, 'a_venir'), echeance('e4', 100, 'a_venir')],
      }),
    ];
    afficher();

    expect(screen.getAllByText('À venir')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Voir les 2 autres échéances/ })).toBeTruthy();
  });

  it('garde « À jour » quand rien n’est dû', () => {
    donnees.valeur.locataireBaux = [
      bail({
        solde: { loyersDus: 250000, loyersRegles: 250000, resteADevoir: 0, enAttenteDeValidation: 0 },
        echeances: [echeance('e1', -30, 'payee', 250000), echeance('e2', 30, 'a_venir')],
      }),
    ];
    afficher();

    expect(screen.getByText('À jour')).toBeTruthy();
  });
});
