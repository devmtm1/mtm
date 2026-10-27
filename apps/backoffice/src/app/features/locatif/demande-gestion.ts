import type { ContactMessage } from '../../core/services/api/contact-api.service';

/**
 * Une demande « Confier mon bien » (page Gestion locative du site) transformée en valeurs prêtes pour les formulaires
 * de création : le conseiller n'a plus à recopier ce que le propriétaire a déjà saisi.
 */
export interface PreparationDepuisDemande {
  /** Le propriétaire, découpé en prénom et nom pour la fiche propriétaire. */
  proprietaire: { firstName: string; lastName: string; email: string; phone: string };
  commune: string;
  region: string;
  /** Adresse de départ : la commune et la région, à préciser (le site ne demande pas la rue). */
  adresse: string;
  /** Nombre de logements annoncé (propriété à plusieurs logements). */
  nombreLogements: number | null;
  loyerSouhaite: number | null;
  /** Nature du bien dans le formulaire de bien (villa, appartement, bureau…). */
  typeBien: string;
  /** Un bien en courte durée se loue à la nuit, pas au mois. */
  courteDuree: boolean;
  /** Nature de la propriété quand le bien est un immeuble ou une villa divisée. */
  typeImmeuble: string;
  /** Immeuble ou villa divisée : la demande se prépare comme une propriété, pas comme un bien isolé. */
  estImmeuble: boolean;
  /** Ce que le propriétaire a écrit, repris dans les notes. */
  notes: string;
}

/** « Awa Diop Fall » → prénom « Awa », nom « Diop Fall » ; un seul mot : il sert de nom. */
export function separerNom(nomComplet: string): { firstName: string; lastName: string } {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (mots.length <= 1) return { firstName: mots[0] ?? '', lastName: mots[0] ?? '' };
  return { firstName: mots[0], lastName: mots.slice(1).join(' ') };
}

const TYPES_BIEN_FORMULAIRE: Record<string, string> = {
  appartement: 'appartement',
  villa: 'villa',
  bureau: 'bureau',
  commerce: 'commerce',
  courte_duree: 'appartement',
  autre: 'autre',
};

/** Prépare la création d'une propriété ou d'un bien à partir d'une demande reçue du site. */
export function preparerDepuisDemande(demande: ContactMessage): PreparationDepuisDemande {
  const details = demande.details ?? {};
  const { firstName, lastName } = separerNom(demande.nom);
  const commune = details.commune ?? '';
  const region = details.region ?? '';
  const estImmeuble = details.typeBien === 'immeuble';
  return {
    proprietaire: {
      firstName,
      lastName,
      email: demande.email ?? '',
      phone: demande.telephone ?? '',
    },
    commune,
    region,
    adresse: [commune, region].filter(Boolean).join(', '),
    nombreLogements: details.nombreLogements ?? null,
    loyerSouhaite: details.loyerSouhaite ?? null,
    typeBien: TYPES_BIEN_FORMULAIRE[details.typeBien ?? ''] ?? 'appartement',
    courteDuree: details.typeBien === 'courte_duree',
    typeImmeuble: 'immeuble',
    estImmeuble,
    notes: demande.message,
  };
}

/** Le chemin à ouvrir pour créer la fiche : une propriété pour un immeuble, un bien sinon. */
export function cheminCreation(demande: ContactMessage): string[] {
  return demande.details?.typeBien === 'immeuble'
    ? ['/locatif/immeubles/nouveau']
    : ['/locatif/biens/nouveau'];
}
