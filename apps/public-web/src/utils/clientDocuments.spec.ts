import { describe, expect, it } from 'vitest';
import { rassemblerDocuments } from './clientDocuments';
import type { ClientDossier } from '../types/clientPortal';

const dossier = {
  id: 'd1',
  referenceInterne: 'DV-1',
  statut: 'reserve',
  prixVente: 10_000_000,
  createdAt: '2026-11-01T00:00:00Z',
  terrain: { id: 't1', referenceInterne: 'T-1', nom: 'Terrain 400 m² Bambilor', region: null, commune: null },
  reservations: [],
  paiements: [
    { id: 'p1', montant: 5_000_000, datePaiement: '2026-11-19T00:00:00Z', mode: 'virement', reference: null },
    { id: 'p2', montant: 5_000_000, datePaiement: '2026-11-18T00:00:00Z', mode: 'especes', reference: null },
  ],
  echeances: [],
  documents: [{ id: 'doc1', type: 'contrat', title: 'Contrat', version: 1, createdAt: '2026-11-10T00:00:00Z', secureUrl: 'https://exemple/contrat.pdf' }],
  montantPaye: 10_000_000,
} as ClientDossier;

const liens = { vente: '/dossiers', bail: '/bail', releve: '/bien' };

describe('rassemblerDocuments', () => {
  it('ajoute un reçu par paiement validé, téléchargeable avec le jeton du client', () => {
    const documents = rassemblerDocuments({ dossiers: [dossier], baux: null, releves: null, liens });
    const recus = documents.filter((document) => document.recu);
    expect(recus).toHaveLength(2);
    expect(recus[0].recu).toEqual({ nature: 'vente', paiementId: 'p1' });
    expect(recus[0].titre).toBe('Reçu de paiement');
    expect(recus[0].url).toBe('');
  });

  it('range tout du plus récent au plus ancien, contrat compris', () => {
    const documents = rassemblerDocuments({ dossiers: [dossier], baux: null, releves: null, liens });
    expect(documents.map((document) => document.id)).toEqual(['recu-p1', 'recu-p2', 'vente-doc1']);
  });

  it('un client sans paiement ni document n’a rien', () => {
    expect(rassemblerDocuments({ dossiers: [{ ...dossier, paiements: [], documents: [] }], baux: null, releves: null, liens })).toEqual([]);
  });
});
