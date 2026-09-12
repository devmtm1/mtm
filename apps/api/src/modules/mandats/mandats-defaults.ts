/** Référentiels paramétrables en back-office (section 25 CDC), avec repli. */
export const DEFAULT_MANDAT_OPTIONS = {
  typeMandat: ['Vente', 'Location', 'Gestion'],
  statut: ['Brouillon', 'Actif', 'Expiré', 'Résilié', 'Clôturé'],
  statutLot: ['Confie', 'Disponible', 'Réservé', 'Vendu'],
  documentTypes: [
    'contrat',
    'avenant',
    'preuve_signature',
    'correspondance',
    'justificatif',
    'autre',
  ],
};
export const DEFAULT_COMMISSION_RATE = 5;
