import type { ClientDossier } from '../types/clientPortal';
import type { ClientBailLocataire } from '../types/locatif';

export type PrioriteNature = 'loyer' | 'echeance';

/** Ce que le client a de plus urgent à régler : un loyer ou une échéance de vente. */
export interface Priorite {
  nature: PrioriteNature;
  /** Montant restant dû sur cette échéance. */
  reste: number;
  dateEcheance: string;
  enRetard: boolean;
  /** Nombre de jours de retard (0 si l'échéance n'est pas passée). */
  joursRetard: number;
  /** Ce qui est dû : le mois du loyer, ou le bien du dossier. */
  objet: string;
  /** Écran où régler ou se renseigner. */
  cible: 'locataire' | 'dossiers';
  /** Nombre d'autres paiements en retard : le client ne doit pas croire qu'il n'y en a qu'un. */
  autresEnRetard: number;
}

const JOUR = 24 * 60 * 60 * 1000;

function debutDeJournee(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function mois(periode: string): string {
  return new Date(periode).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Choisit l'échéance à mettre en avant sur l'accueil : d'abord ce qui est en
 * retard (la plus ancienne), sinon ce qui arrive le plus tôt. Un loyer et une
 * échéance de vente sont traités à égalité : c'est la date qui décide.
 */
export function prochainePriorite(
  dossiers: ClientDossier[] | null,
  bail: ClientBailLocataire | null,
  maintenant: Date = new Date(),
): Priorite | null {
  const aujourdhui = debutDeJournee(maintenant);
  const candidats: Priorite[] = [];

  const ajouter = (
    nature: PrioriteNature,
    cible: Priorite['cible'],
    objet: string,
    dateEcheance: string,
    montantPrevu: number,
    montantPaye: number,
  ) => {
    const reste = Math.max(0, montantPrevu - montantPaye);
    if (reste <= 0) return;
    const jours = Math.floor((aujourdhui - debutDeJournee(new Date(dateEcheance))) / JOUR);
    candidats.push({
      nature,
      cible,
      objet,
      reste,
      dateEcheance,
      enRetard: jours > 0,
      joursRetard: Math.max(0, jours),
      autresEnRetard: 0,
    });
  };

  for (const echeance of bail?.echeances ?? []) {
    if (echeance.statut === 'payee' || echeance.statut === 'annulee') continue;
    ajouter('loyer', 'locataire', `Loyer de ${mois(echeance.periode)}`, echeance.dateEcheance, echeance.montantPrevu, echeance.montantPaye);
  }
  for (const dossier of dossiers ?? []) {
    if (dossier.statut === 'solde' || dossier.statut === 'annule') continue;
    for (const echeance of dossier.echeances) {
      if (echeance.statut === 'payee') continue;
      ajouter(
        'echeance',
        'dossiers',
        `Échéance · ${dossier.terrain?.nom ?? dossier.referenceInterne ?? 'dossier de vente'}`,
        echeance.dateEcheance,
        echeance.montantPrevu,
        echeance.montantPaye,
      );
    }
  }

  const parDate = (a: Priorite, b: Priorite) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
  const enRetard = candidats.filter((candidat) => candidat.enRetard).sort(parDate);
  if (enRetard.length > 0) return { ...enRetard[0], autresEnRetard: enRetard.length - 1 };
  return candidats.sort(parDate)[0] ?? null;
}
