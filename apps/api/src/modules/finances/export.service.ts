import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  ENTETES_EXPORT,
  LIBELLES_ACTIVITE,
  LIBELLES_NATURE,
  type LigneJournal,
  jourIso,
  serieMensuelle,
  totaliser,
  versCsv,
} from './finances.calculs';
import { FinancesService } from './finances.service';
import { ExportDto } from './dto/finances.dto';

export interface FichierExport {
  nom: string;
  type: string;
  contenu: Buffer;
  mouvements: number;
}

const TYPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Exports pour l'exploitation comptable externe (section 18 : « exports pour
 * exploitation comptable externe »). Le CSV est le journal brut, ouvrable dans
 * Excel et repris par la plupart des logiciels comptables ; le classeur Excel
 * ajoute la synthèse par activité, la série mensuelle et ce qu'il reste à encaisser.
 */
@Injectable()
export class ExportFinancesService {
  constructor(private readonly finances: FinancesService) {}

  async generer(dto: ExportDto): Promise<FichierExport> {
    const { lignes, periode } = await this.finances.lignesDe(dto);
    const fin = new Date(periode.au.getTime() - 24 * 3600 * 1000);
    const nomBase = `journal-financier_${jourIso(periode.du)}_${jourIso(fin)}`;

    if (dto.format === 'csv') {
      return {
        nom: `${nomBase}.csv`,
        type: 'text/csv; charset=utf-8',
        contenu: versCsv(lignes),
        mouvements: lignes.length,
      };
    }
    const aEncaisser = await this.finances.aEncaisser();
    return {
      nom: `${nomBase}.xlsx`,
      type: TYPE_XLSX,
      contenu: await this.classeur(lignes, periode, aEncaisser),
      mouvements: lignes.length,
    };
  }

  private async classeur(
    lignes: LigneJournal[],
    periode: { du: Date; au: Date },
    aEncaisser: Awaited<ReturnType<FinancesService['aEncaisser']>>,
  ): Promise<Buffer> {
    const classeur = new ExcelJS.Workbook();
    classeur.creator = 'MTM Immobilier';
    classeur.created = new Date();

    // --- Journal ---
    const journal = classeur.addWorksheet('Journal');
    journal.columns = [
      { header: ENTETES_EXPORT[0], key: 'date', width: 12 },
      { header: ENTETES_EXPORT[1], key: 'activite', width: 28 },
      { header: ENTETES_EXPORT[2], key: 'nature', width: 24 },
      { header: ENTETES_EXPORT[3], key: 'libelle', width: 44 },
      { header: ENTETES_EXPORT[4], key: 'tiers', width: 24 },
      { header: ENTETES_EXPORT[5], key: 'reference', width: 20 },
      { header: ENTETES_EXPORT[6], key: 'mode', width: 14 },
      { header: ENTETES_EXPORT[7], key: 'entree', width: 14 },
      { header: ENTETES_EXPORT[8], key: 'sortie', width: 14 },
      { header: ENTETES_EXPORT[9], key: 'revenu', width: 14 },
    ];
    for (const ligne of lignes) {
      journal.addRow({
        date: ligne.date,
        activite: LIBELLES_ACTIVITE[ligne.activite],
        nature: LIBELLES_NATURE[ligne.nature],
        libelle: this.neutre(ligne.libelle),
        tiers: this.neutre(ligne.tiers ?? ''),
        reference: this.neutre(ligne.reference ?? ''),
        mode: ligne.mode ?? '',
        entree: ligne.sens === 'entree' ? ligne.montant : null,
        sortie: ligne.sens === 'sortie' ? ligne.montant : null,
        revenu: ligne.sens === 'entree' && ligne.revenu ? ligne.revenu : null,
      });
    }
    journal.getColumn('date').numFmt = 'dd/mm/yyyy';
    for (const cle of ['entree', 'sortie', 'revenu']) {
      journal.getColumn(cle).numFmt = '#,##0';
    }
    journal.getRow(1).font = { bold: true };
    journal.views = [{ state: 'frozen', ySplit: 1 }];

    // --- Synthèse ---
    const { global, parActivite } = totaliser(lignes);
    const synthese = classeur.addWorksheet('Synthèse');
    synthese.columns = [
      { header: 'Activité', key: 'activite', width: 32 },
      { header: 'Encaissements', key: 'encaissements', width: 18 },
      { header: 'Revenu MTM', key: 'revenu', width: 18 },
      { header: 'Dépenses', key: 'depenses', width: 18 },
      { header: 'Résultat', key: 'resultat', width: 18 },
    ];
    for (const [activite, totaux] of Object.entries(parActivite)) {
      synthese.addRow({
        activite: LIBELLES_ACTIVITE[activite as keyof typeof LIBELLES_ACTIVITE],
        ...totaux,
      });
    }
    synthese.addRow({ activite: 'Total', ...global }).font = { bold: true };
    synthese.addRow({});
    synthese.addRow([
      `Période du ${jourIso(periode.du)} au ${jourIso(new Date(periode.au.getTime() - 24 * 3600 * 1000))}`,
    ]);
    synthese.addRow([
      'Encaissements : argent reçu (les loyers et le prix d’un bien vendu y figurent). Revenu MTM : marge des ventes, commission de gestion, règlements de prestations, recettes saisies.',
    ]);
    synthese.getRow(1).font = { bold: true };
    for (const cle of ['encaissements', 'revenu', 'depenses', 'resultat']) {
      synthese.getColumn(cle).numFmt = '#,##0';
    }

    // --- Par mois ---
    const mensuel = classeur.addWorksheet('Par mois');
    mensuel.columns = [
      { header: 'Mois', key: 'periode', width: 12 },
      { header: 'Encaissements', key: 'encaissements', width: 18 },
      { header: 'Revenu MTM', key: 'revenu', width: 18 },
      { header: 'Dépenses', key: 'depenses', width: 18 },
    ];
    for (const point of serieMensuelle(lignes, periode.du, periode.au)) {
      mensuel.addRow(point);
    }
    mensuel.getRow(1).font = { bold: true };
    for (const cle of ['encaissements', 'revenu', 'depenses']) {
      mensuel.getColumn(cle).numFmt = '#,##0';
    }

    // --- Ce qu'il reste à encaisser ---
    const du = classeur.addWorksheet('À encaisser');
    du.columns = [
      { header: 'Origine', key: 'origine', width: 24 },
      { header: 'Libellé', key: 'libelle', width: 40 },
      { header: 'Tiers', key: 'tiers', width: 24 },
      { header: 'Échéance', key: 'echeance', width: 12 },
      { header: 'Reste dû', key: 'reste', width: 16 },
    ];
    for (const [origine, bloc] of [
      ['Loyers impayés', aEncaisser.loyers],
      ['Échéances de vente', aEncaisser.ventes],
      ['Missions à solder', aEncaisser.missions],
    ] as const) {
      for (const ligne of bloc.lignes) {
        du.addRow({
          origine,
          libelle: this.neutre(ligne.libelle),
          tiers: this.neutre(ligne.tiers ?? ''),
          echeance: ligne.echeance,
          reste: ligne.reste,
        });
      }
      du.addRow({ origine: `${origine} — total`, reste: bloc.total }).font = {
        bold: true,
      };
    }
    du.getColumn('echeance').numFmt = 'dd/mm/yyyy';
    du.getColumn('reste').numFmt = '#,##0';
    du.getRow(1).font = { bold: true };

    return Buffer.from(await classeur.xlsx.writeBuffer());
  }

  /** Une cellule qui commence par = + - @ serait exécutée comme formule à l'ouverture. */
  private neutre(valeur: string): string {
    return /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  }
}
