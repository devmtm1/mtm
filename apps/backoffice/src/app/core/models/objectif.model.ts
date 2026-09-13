/** Objectif mensuel d'un commercial (J1.6 — tableau de bord : ventes, objectifs, commissions). */
export interface ObjectifCommercial {
  id: string;
  commercialId: string;
  /** Mois ciblé, AAAA-MM. */
  periode: string;
  cibleVentes: number | null;
  cibleChiffreAffaires: number | string | null;
  cibleCommissions: number | string | null;
  notes: string | null;
  commercial: { id: string; firstName: string; lastName: string };
}

export interface ObjectifProgress {
  periode: string;
  commercialId: string;
  objectif: {
    cibleVentes: number | null;
    cibleChiffreAffaires: number | null;
    cibleCommissions: number | null;
    notes: string | null;
  } | null;
  realise: { ventes: number; chiffreAffaires: number; commissions: number };
  /** Taux d'atteinte en %, null sans cible. */
  taux: { ventes: number | null; chiffreAffaires: number | null; commissions: number | null };
}

export interface UpsertObjectifPayload {
  commercialId: string;
  periode: string;
  cibleVentes?: number;
  cibleChiffreAffaires?: number;
  cibleCommissions?: number;
  notes?: string;
}

/** Mois courant au format AAAA-MM, tel qu'attendu par l'API. */
export function currentPeriode(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
