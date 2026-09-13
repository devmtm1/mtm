import type { MatDialog } from '@angular/material/dialog';
import { HistoryDialog } from '../../../shared/dialogs/history-dialog';
import type { MandatsApiService } from '../../../core/services/api/mandats-api.service';

const ACTION_LABELS: Record<string, string> = {
  'mandat.created': 'Création du mandat',
  'mandat.updated': 'Modification du mandat',
  'mandat.deleted': 'Suppression du mandat',
  'mandat.lot.created': 'Terrain rattaché',
  'mandat.lot.updated': 'Avancement d’un lot modifié',
  'mandat.lot.deleted': 'Terrain retiré',
  'mandat.document.created': 'Ajout d’un document',
  'mandat.document.deleted': 'Suppression d’un document',
};

const FIELD_LABELS: Record<string, string> = {
  referenceInterne: 'Référence',
  proprietaireId: 'Propriétaire',
  commercialResponsableId: 'Commercial responsable',
  typeMandat: 'Type',
  dateDebut: 'Début',
  dateFin: 'Fin',
  exclusivite: 'Exclusivité',
  prixConditions: 'Prix et conditions',
  commissions: 'Commissions',
  clauses: 'Clauses',
  restrictionsContractuelles: 'Restrictions',
  objectifsCommercialisation: 'Objectifs',
  alerteEcheanceJours: 'Alerte (jours)',
  statut: 'Statut',
  statutLot: 'Avancement du lot',
  terrainId: 'Terrain',
  title: 'Titre',
  type: 'Type',
};

/** Historique d'un mandat, sur le dialogue d'historique partagé. */
export const MandatHistoryDialog = {
  open(dialog: MatDialog, api: MandatsApiService, mandat: { id: string; referenceInterne: string }): void {
    HistoryDialog.open(dialog, {
      subject: `Mandat ${mandat.referenceInterne}`,
      load: () => api.getHistory(mandat.id),
      actionLabels: ACTION_LABELS,
      fieldLabels: FIELD_LABELS,
    });
  },
};
