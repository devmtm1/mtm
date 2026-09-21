import { Pipe, PipeTransform } from '@angular/core';

/**
 * Libellés français des codes techniques renvoyés par l'API (statuts,
 * modes, types). Un code inconnu est affiché tel quel, en remplaçant les
 * underscores : l'interface reste lisible même si un nouveau référentiel est
 * ajouté dans Paramètres sans mise à jour du back-office.
 */
export const BUSINESS_LABELS: Record<string, string> = {
  // Dossier de vente
  en_cours: 'En cours',
  pre_reserve: 'Pré-réservé',
  reserve: 'Réservé',
  paiement_partiel: 'Paiement partiel',
  solde: 'Soldé',
  annule: 'Annulé',
  // Réservation
  active: 'Active',
  expiree: 'Expirée',
  annulee: 'Annulée',
  confirmee: 'Confirmée',
  // Demande de réservation web
  traitee: 'Traitée',
  // Paiement / échéance
  en_attente: 'En attente',
  valide: 'Validé',
  refuse: 'Refusé',
  planifiee: 'Planifiée',
  payee: 'Payée',
  en_retard: 'En retard',
  especes: 'Espèces',
  virement: 'Virement',
  en_ligne: 'Paiement en ligne',
  cheque: 'Chèque',
  mobile_money: 'Mobile money',
  // Commission
  estimee: 'Estimée',
  validee: 'Validée',
  pourcentage: 'Pourcentage',
  montant_fixe: 'Montant fixe',
  palier: 'Palier',
  bonus: 'Bonus',
  // Documents
  bon_reservation: 'Bon de réservation',
  recu: 'Reçu',
  facture: 'Facture',
  contrat: 'Contrat',
  etat_paiement: 'État de paiement',
  avenant: 'Avenant',
  preuve_signature: 'Preuve de signature',
  correspondance: 'Correspondance',
  justificatif: 'Justificatif',
  piece_identite: 'Pièce d’identité',
  autre: 'Autre document',
  // CRM
  nouveau_contact: 'Nouveau contact',
  qualification: 'Qualification',
  proposition: 'Proposition',
  visite: 'Visite',
  negociation: 'Négociation',
  reservation: 'Réservation',
  vente: 'Vente',
  perdu: 'Perdu',
  appel: 'Appel',
  email: 'Email',
  'rendez-vous': 'Rendez-vous',
  tache: 'Tâche',
  relance: 'Relance',
  note: 'Note',
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  a_faire: 'À faire',
  realise: 'Réalisée',
  reporte: 'Reportée',
  // Terrains
  disponible: 'Disponible',
  vendu: 'Vendu',
  retire: 'Retiré',
  non_verifie: 'Non vérifié',
  en_verification: 'En vérification',
  verifie: 'Vérifié',
  // Origine d'un prospect
  reservation_publique: 'Demande de réservation (site)',
  // Vitrine
  realisation: 'Réalisation',
  projet_a_venir: 'Projet à venir',
};

export function businessLabel(code: string | null | undefined): string {
  if (code === null || code === undefined || code === '') return '—';
  const known = BUSINESS_LABELS[code] ?? BUSINESS_LABELS[code.toLowerCase()];
  if (known) return known;
  const spaced = code.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

@Pipe({ name: 'mtmLabel', standalone: true })
export class LabelPipe implements PipeTransform {
  transform(code: string | null | undefined): string {
    return businessLabel(code);
  }
}
