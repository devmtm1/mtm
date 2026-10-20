/** Aides communes aux écrans de trésorerie et de contrôle financier. */

export const MODES_PAIEMENT: { valeur: string; label: string }[] = [
  { valeur: 'especes', label: 'Espèces' },
  { valeur: 'wave', label: 'Wave' },
  { valeur: 'orange_money', label: 'Orange Money' },
  { valeur: 'virement', label: 'Virement bancaire' },
  { valeur: 'cheque', label: 'Chèque' },
  { valeur: 'mobile_money', label: 'Mobile money (opérateur non précisé)' },
];

export const TYPES_COMPTE: { valeur: string; label: string }[] = [
  { valeur: 'caisse', label: 'Caisse' },
  { valeur: 'banque', label: 'Compte bancaire' },
  { valeur: 'wave', label: 'Wave' },
  { valeur: 'orange_money', label: 'Orange Money' },
  { valeur: 'autre', label: 'Autre' },
];

export const TYPES_MOUVEMENT: Record<string, string> = {
  transfert: 'Transfert entre comptes',
  remise_fonds: 'Remise de fonds',
  avance: 'Avance de fonds',
  remboursement: 'Remboursement',
};

export const MODES_REVERSEMENT: Record<string, string> = {
  au_fur_et_a_mesure: 'Au fur et à mesure des paiements du client',
  fin_paiement: 'À la fin du paiement du client',
  echeancier: 'Selon l’échéancier du contrat',
};

export const NIVEAUX_VALIDATION: Record<number, { court: string; ton: string }> = {
  0: { court: 'Comptable', ton: 'neutral' },
  1: { court: 'Autorisation de la Direction', ton: 'warning' },
  2: { court: 'Autorisation expresse', ton: 'warning' },
  3: { court: 'Contrôle renforcé', ton: 'red' },
};

export function libelleMode(code: string | null | undefined): string {
  if (!code) return '—';
  return MODES_PAIEMENT.find((m) => m.valeur === code)?.label ?? code.replace(/_/g, ' ');
}

export function aujourdhuiIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

export function dateFr(valeur: string | null | undefined): string {
  if (!valeur) return '—';
  return new Date(valeur).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

export function nomPersonne(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim() || '—';
}

/** Ouvre le sélecteur de fichiers et rend le fichier choisi (PDF ou image, 10 Mo au plus), ou `null`. */
export function selectionnerFichier(
  accept: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
): Promise<{ file: File | null; erreur: string | null }> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept.join(',');
    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      if (!file) return resolve({ file: null, erreur: null });
      if (file.size > 10 * 1024 * 1024) return resolve({ file: null, erreur: 'Fichier de plus de 10 Mo.' });
      resolve({ file, erreur: null });
    });
    input.addEventListener('cancel', () => resolve({ file: null, erreur: null }));
    input.click();
  });
}

/** Enregistre un fichier reçu de l'API sur le poste de l'utilisateur. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}
