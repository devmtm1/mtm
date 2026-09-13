import type { MatDialog } from '@angular/material/dialog';
import { HistoryDialog } from '../../shared/dialogs/history-dialog';
import type { TerrainsApiService } from '../../core/services/api/terrains-api.service';

const ACTION_LABELS: Record<string, string> = {
  'terrain.created': 'Création de la fiche',
  'terrain.updated': 'Modification de la fiche',
  'terrain.statutJuridique.updated': 'Changement du statut juridique',
  'terrain.niveauVerification.updated': 'Changement du niveau de vérification',
  'terrain.statutCommercial.updated': 'Changement de la commercialisation',
  'terrain.media.created': 'Ajout d’une photo ou vidéo',
  'terrain.media.deleted': 'Suppression d’une photo ou vidéo',
  'terrain.document.created': 'Ajout d’un document',
  'terrain.document.deleted': 'Suppression d’un document',
};

const FIELD_LABELS: Record<string, string> = {
  referenceInterne: 'Référence',
  nom: 'Nom',
  parcelleMatricule: 'Parcelle / matricule',
  proprietaireId: 'Propriétaire',
  statutJuridique: 'Statut juridique',
  typeDocumentFoncier: 'Document foncier',
  niveauVerification: 'Vérification',
  statutCommercial: 'Commercialisation',
  region: 'Région',
  commune: 'Commune',
  localisationDetail: 'Localisation',
  latitude: 'Latitude',
  longitude: 'Longitude',
  superficie: 'Superficie',
  prixAcquisition: 'Prix d’acquisition',
  prixPublic: 'Prix public',
  marge: 'Marge',
  commission: 'Commission',
  misEnAvant: 'Mis en avant',
  description: 'Description publique',
  notesInternes: 'Notes internes',
  vocation: 'Vocation',
  accesRoutier: 'Accès routier',
  eauDisponible: 'Eau',
  electriciteDisponible: 'Électricité',
  voisinage: 'Voisinage',
  proximiteAxes: 'Proximité des axes',
  title: 'Titre',
  type: 'Type',
  isPublic: 'Public',
};

/** Historique d'un terrain, sur le dialogue d'historique partagé. */
export const TerrainHistoryDialog = {
  open(dialog: MatDialog, api: TerrainsApiService, terrain: { id: string; nom: string }): void {
    HistoryDialog.open(dialog, {
      subject: `Terrain ${terrain.nom}`,
      load: () => api.getHistory(terrain.id),
      actionLabels: ACTION_LABELS,
      fieldLabels: FIELD_LABELS,
      moneyFields: ['prixAcquisition', 'prixPublic', 'marge', 'commission'],
    });
  },
};
