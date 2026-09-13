import type { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import {
  StatusChoiceDialog,
  type StatusChoice,
  type StatusChoiceResult,
} from '../../shared/dialogs/status-choice-dialog';
import { COMMERCIAL_STATUS, LEGAL_STATUS, VERIFICATION_STATUS, type StatusMeaning } from './terrain-status';

export type TerrainStatusKind = 'commercial' | 'juridique' | 'verification';

export interface TerrainStatusDialogData {
  kind: TerrainStatusKind;
  current: string;
  options: string[];
  terrainNom: string;
}

export type TerrainStatusDialogResult = StatusChoiceResult;

const KIND_META: Record<TerrainStatusKind, { title: string; intro: string; map: Record<string, StatusMeaning>; justification: boolean }> = {
  commercial: {
    title: 'Changer la commercialisation',
    intro: 'Le statut commercial décide si le terrain est visible sur le site public et s’il peut être réservé.',
    map: COMMERCIAL_STATUS,
    justification: false,
  },
  juridique: {
    title: 'Changer le statut juridique',
    intro: 'Le statut juridique décrit le titre de propriété. Ce changement est sensible : il est tracé dans le journal d’audit avec votre justification.',
    map: LEGAL_STATUS,
    justification: true,
  },
  verification: {
    title: 'Changer le niveau de vérification',
    intro: 'Indique jusqu’où MTM a contrôlé les documents et la situation du terrain.',
    map: VERIFICATION_STATUS,
    justification: false,
  },
};

/** Changement de statut d'un terrain, sur le dialogue de choix partagé. */
export const TerrainStatusDialog = {
  open(dialog: MatDialog, data: TerrainStatusDialogData): Observable<TerrainStatusDialogResult | undefined> {
    const meta = KIND_META[data.kind];
    const choices: StatusChoice[] = data.options.map((value) => ({
      value,
      help: meta.map[value]?.help ?? '',
      tone: meta.map[value]?.tone ?? 'neutral',
    }));
    return StatusChoiceDialog.open(dialog, {
      title: meta.title,
      intro: meta.intro,
      subject: `Terrain : ${data.terrainNom}`,
      current: data.current,
      choices,
      justification: meta.justification,
    });
  },
};
