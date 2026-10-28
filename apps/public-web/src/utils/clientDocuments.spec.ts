import { describe, expect, it } from 'vitest';
import { rassemblerDocuments } from './clientDocuments';
import type { ClientDossier } from '../types/clientPortal';
import type { ClientBailLocataire, ClientDocumentLocatif } from '../types/locatif';

const liens = { vente: '/v', bail: '/b', releve: '/r' };

const dossier = {
  referenceInterne: 'DV-1',
  terrain: { nom: 'Terrain Bambilor' },
  documents: [{ id: 'd1', type: 'contrat_vente', title: null, version: 1, createdAt: '2026-10-10T00:00:00Z', secureUrl: 'https://x/d1' }],
} as unknown as ClientDossier;

const bail = {
  referenceInterne: 'B-1',
  bien: { adresse: 'Rue 11, Fann' },
  documents: [{ id: 'q1', type: 'quittance', title: 'Quittance de septembre', createdAt: '2026-10-20T00:00:00Z', secureUrl: 'https://x/q1' }],
} as unknown as ClientBailLocataire;

const releve = {
  id: 'r1',
  type: 'releve_gerance',
  title: null,
  createdAt: '2026-09-01T00:00:00Z',
  secureUrl: 'https://x/r1',
  bailLocatif: { bienLocatif: { referenceInterne: 'L-1', adresse: 'Almadies' } },
} as ClientDocumentLocatif;

describe('rassemblerDocuments', () => {
  it('réunit les documents des trois espaces, du plus récent au plus ancien', () => {
    const documents = rassemblerDocuments({ dossiers: [dossier], baux: [bail], releves: [releve], liens });

    expect(documents.map((d) => d.id)).toEqual(['bail-q1', 'vente-d1', 'releve-r1']);
    expect(documents.map((d) => d.origine)).toEqual(['bail', 'vente', 'releve']);
  });

  it('rattache chaque document à son objet et à son espace', () => {
    const [quittance, contrat, relevé] = rassemblerDocuments({ dossiers: [dossier], baux: [bail], releves: [releve], liens });

    expect(quittance).toMatchObject({ objet: 'Rue 11, Fann', lien: '/b', url: 'https://x/q1' });
    expect(contrat).toMatchObject({ objet: 'Terrain Bambilor', lien: '/v' });
    expect(relevé).toMatchObject({ objet: 'Almadies', lien: '/r' });
  });

  it('accepte des espaces qui ne concernent pas le compte (données nulles)', () => {
    expect(rassemblerDocuments({ dossiers: null, baux: null, releves: null, liens })).toEqual([]);
  });
});
