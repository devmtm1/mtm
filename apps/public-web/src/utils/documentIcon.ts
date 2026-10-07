import { FileBarChart2, FileSignature, FileText, Receipt, type LucideIcon } from 'lucide-react';

/**
 * Icône d'un document d'après son type technique : un contrat, un reçu et un
 * rapport se reconnaissent avant qu'on lise leur nom.
 */
export function documentIcone(type: string | null | undefined): LucideIcon {
  const t = (type ?? '').toLowerCase();
  if (/(contrat|bail|mandat|promesse)/.test(t)) return FileSignature;
  if (/(recu|reçu|quittance|facture|paiement|bon_reservation)/.test(t)) return Receipt;
  if (/(rapport|releve|relevé|etat_lieux|constat)/.test(t)) return FileBarChart2;
  return FileText;
}
