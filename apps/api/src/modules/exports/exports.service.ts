import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CompanyProfileService } from '../company/company-profile.service';
import {
  type Cellule,
  type RapportDonnees,
  nomFichier,
} from '../pilotage/pilotage.calculs';
import { renderRapportPdf } from '../pilotage/rapport-pdf';
import { renderRapportXlsx } from '../pilotage/rapport-xlsx';
import { MODULES_EXPORTABLES, type ExportTableauDto } from './exports.dto';

export const TYPES_MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

const LONGUEUR_MAX_CELLULE = 2000;

/** Une cellule reçue de l'écran, ramenée à un texte ou un nombre sûr (jamais un objet, jamais démesuré). */
export function nettoyerCellule(valeur: unknown): Cellule {
  if (valeur === null || valeur === undefined) return null;
  if (typeof valeur === 'number')
    return Number.isFinite(valeur) ? valeur : null;
  if (typeof valeur === 'boolean') return valeur ? 'Oui' : 'Non';
  if (typeof valeur === 'string') {
    const texte = valeur.trim();
    return texte === '' ? null : texte.slice(0, LONGUEUR_MAX_CELLULE);
  }
  return null;
}

/** Les données génériques d'un tableau, au format que lisent déjà le PDF et le classeur des rapports. */
export function construireRapport(dto: ExportTableauDto): RapportDonnees {
  const lignes = dto.lignes.map((ligne) => {
    const sortie: Record<string, Cellule> = {};
    for (const colonne of dto.colonnes) {
      sortie[colonne.cle] = nettoyerCellule(ligne[colonne.cle]);
    }
    return sortie;
  });
  const jour = new Date().toISOString().slice(0, 10);
  return {
    code: `liste_${dto.module}`,
    titre: dto.titre,
    sousTitre: dto.sousTitre?.trim() || `Export du ${jour}`,
    periode: null,
    resume: [{ libelle: 'Nombre de lignes', valeur: String(lignes.length) }],
    sections: [
      {
        titre: dto.titre,
        colonnes: dto.colonnes.map(({ cle, libelle, type }) => ({
          cle,
          libelle,
          type,
        })),
        lignes,
      },
    ],
  };
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly audit: AuditService,
    private readonly company: CompanyProfileService,
  ) {}

  async exporterTableau(
    dto: ExportTableauDto,
    user: AuthenticatedUser,
  ): Promise<{ contenu: Buffer; nom: string; type: string }> {
    const permission = `${MODULES_EXPORTABLES[dto.module]}:exporter`;
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(
        'Vous n’avez pas le droit d’exporter cette liste',
      );
    }
    const rapport = construireRapport(dto);
    const contenu =
      dto.format === 'pdf'
        ? renderRapportPdf(rapport, await this.company.getSociete())
        : await renderRapportXlsx(rapport);
    await this.audit.record({
      userId: user.id,
      action: 'liste.export',
      entityType: 'Liste',
      entityId: dto.module,
      justification: dto.justification,
      newValue: {
        titre: dto.titre,
        format: dto.format,
        lignes: dto.lignes.length,
        colonnes: dto.colonnes.map((colonne) => colonne.libelle),
      },
    });
    const jour = new Date().toISOString().slice(0, 10);
    return {
      contenu,
      nom: `${nomFichier(dto.titre, null, null)}_${jour}.${dto.format}`,
      type: TYPES_MIME[dto.format],
    };
  }
}
