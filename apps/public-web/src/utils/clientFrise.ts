export type EtatEtape = 'reglee' | 'prochaine' | 'retard' | 'plus-tard';

export interface EcheanceSource {
  numero: number;
  dateEcheance: string;
  montantPrevu: number;
  montantPaye: number;
  statut: string;
}

export interface EtapeFrise {
  numero: number;
  etat: EtatEtape;
  dateEcheance: string;
  montantPrevu: number;
  /** Ce qui reste à payer sur cette échéance (0 si réglée). */
  reste: number;
  /** Jours écoulés depuis la date limite (0 si elle n'est pas passée). */
  joursRetard: number;
  statut: string;
}

const JOUR = 24 * 60 * 60 * 1000;
const debutDeJournee = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Met en forme l'échéancier d'un dossier : les échéances réglées, celles en
 * retard, LA prochaine à régler (la première à venir) et les suivantes. La
 * prochaine est celle que le client cherche : elle doit se distinguer.
 */
export function construireFrise(echeances: EcheanceSource[], maintenant: Date = new Date()): EtapeFrise[] {
  const aujourdhui = debutDeJournee(maintenant);
  const triees = [...echeances].sort((a, b) => a.numero - b.numero);
  let prochaineTrouvee = false;

  return triees.map((echeance) => {
    const reste = Math.max(0, echeance.montantPrevu - echeance.montantPaye);
    const jours = Math.floor((aujourdhui - debutDeJournee(new Date(echeance.dateEcheance))) / JOUR);
    let etat: EtatEtape;
    if (echeance.statut === 'payee' || reste <= 0) etat = 'reglee';
    else if (jours > 0) etat = 'retard';
    else if (!prochaineTrouvee) {
      etat = 'prochaine';
      prochaineTrouvee = true;
    } else etat = 'plus-tard';
    return {
      numero: echeance.numero,
      etat,
      dateEcheance: echeance.dateEcheance,
      montantPrevu: echeance.montantPrevu,
      reste: etat === 'reglee' ? 0 : reste,
      joursRetard: Math.max(0, jours),
      statut: echeance.statut,
    };
  });
}

/** L'échéance à mettre en avant : la plus ancienne en retard, sinon la prochaine. */
export function echeanceAMettreEnAvant(frise: EtapeFrise[]): EtapeFrise | null {
  return frise.find((etape) => etape.etat === 'retard') ?? frise.find((etape) => etape.etat === 'prochaine') ?? null;
}
