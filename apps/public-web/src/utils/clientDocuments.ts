import type { ClientDossier } from '../types/clientPortal';
import type { ClientBailLocataire, ClientDocumentLocatif } from '../types/locatif';

/** D'où vient un document : on le rattache à l'espace du client où il se trouve aussi. */
export type OrigineDocument = 'vente' | 'bail' | 'releve';

export interface DocumentClient {
  id: string;
  /** Code technique (contrat, quittance, recu…) : donne l'icône et le libellé. */
  type: string;
  titre: string | null;
  date: string;
  url: string;
  origine: OrigineDocument;
  /** Ce à quoi il se rapporte : le bien du dossier, la référence du bail ou du logement. */
  objet: string;
  /** Écran où le document est présenté avec son contexte. */
  lien: string;
}

export const LIBELLES_ORIGINE: Record<OrigineDocument, string> = {
  vente: 'Achat',
  bail: 'Location',
  releve: 'Mon bien',
};

interface Sources {
  dossiers: ClientDossier[] | null;
  baux: ClientBailLocataire[] | null;
  releves: ClientDocumentLocatif[] | null;
  liens: { vente: string; bail: string; releve: string };
}

/**
 * Tous les documents du client en une liste, du plus récent au plus ancien : un reçu d'achat, une quittance et un relevé
 * de gérance se retrouvent au même endroit, sans savoir dans quel espace chercher.
 */
export function rassemblerDocuments({ dossiers, baux, releves, liens }: Sources): DocumentClient[] {
  const documents: DocumentClient[] = [
    ...(dossiers ?? []).flatMap((dossier) =>
      dossier.documents.map((document) => ({
        id: `vente-${document.id}`,
        type: document.type,
        titre: document.title,
        date: document.createdAt,
        url: document.secureUrl,
        origine: 'vente' as const,
        objet: dossier.terrain?.nom ?? dossier.referenceInterne ?? 'Dossier de vente',
        lien: liens.vente,
      })),
    ),
    ...(baux ?? []).flatMap((bail) =>
      bail.documents.map((document) => ({
        id: `bail-${document.id}`,
        type: document.type,
        titre: document.title,
        date: document.createdAt,
        url: document.secureUrl,
        origine: 'bail' as const,
        objet: bail.bien.adresse || bail.referenceInterne || 'Mon bail',
        lien: liens.bail,
      })),
    ),
    ...(releves ?? []).map((document) => ({
      id: `releve-${document.id}`,
      type: document.type,
      titre: document.title,
      date: document.createdAt,
      url: document.secureUrl,
      origine: 'releve' as const,
      objet: document.bailLocatif.bienLocatif.adresse || document.bailLocatif.bienLocatif.referenceInterne,
      lien: liens.releve,
    })),
  ];
  return documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
