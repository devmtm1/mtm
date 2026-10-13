import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailService } from '../../common/mail/mail.service';
import { CompanyProfileService } from '../company/company-profile.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import {
  CLE_ENVOI_AUTOMATIQUE,
  type ConfigEnvoi,
  estJourDEnvoi,
  lireEnvoi,
  periodeEcoulee,
} from './envoi-automatique';
import { nomFichier } from './pilotage.calculs';
import { renderRapportPdf } from './rapport-pdf';
import { renderRapportXlsx } from './rapport-xlsx';
import { RapportsService } from './rapports.service';

const TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export interface BilanEnvoi {
  envoye: boolean;
  raison?: 'inactif' | 'hors_jour' | 'deja_envoye' | 'mail_indisponible';
  rapports: number;
  destinataires: number;
}

/**
 * Envoi périodique des rapports à la direction (J3.2). Chaque matin, si le
 * jour correspond à la fréquence choisie, les rapports de la période écoulée
 * sont joints à un e-mail. Un envoi n'est fait qu'une fois par période
 * (consigné dans le journal d'audit) : un redémarrage ou deux instances ne
 * produisent pas de doublon.
 */
@Injectable()
export class EnvoiAutomatiqueService {
  private readonly logger = new Logger(EnvoiAutomatiqueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly rapports: RapportsService,
    private readonly company: CompanyProfileService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  @Cron('0 7 * * *')
  async handleEnvoi(): Promise<void> {
    try {
      const bilan = await this.executer();
      if (bilan.envoye) {
        this.logger.log(
          `Rapports envoyés : ${bilan.rapports} rapport(s) à ${bilan.destinataires} destinataire(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Envoi automatique des rapports en échec',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Exposé pour être déclenchable à la main et testable. */
  async executer(maintenant: Date = new Date()): Promise<BilanEnvoi> {
    const vide = { rapports: 0, destinataires: 0 };
    const config = lireEnvoi(
      await this.settings.getRawValue(CLE_ENVOI_AUTOMATIQUE),
    );
    if (!config.actif) return { envoye: false, raison: 'inactif', ...vide };
    if (!estJourDEnvoi(config.frequence, maintenant)) {
      return { envoye: false, raison: 'hors_jour', ...vide };
    }

    const periode = periodeEcoulee(config.frequence, maintenant);
    const cle = `${config.frequence}:${periode.du}`;
    const dejaFait = await this.prisma.auditLog.findFirst({
      where: {
        action: 'rapport.envoi_auto',
        entityType: 'Rapport',
        entityId: cle,
      },
      select: { id: true },
    });
    if (dejaFait) return { envoye: false, raison: 'deja_envoye', ...vide };

    const { societe, pieces, titres, intitule } = await this.composer(
      config,
      periode,
    );
    let envoyes = 0;
    for (const destinataire of config.destinataires) {
      const parti = await this.mail.send({
        to: destinataire,
        subject: `${societe.name} — rapports de la ${intitule}`,
        text: [
          'Bonjour,',
          `Veuillez trouver en pièces jointes les rapports de la ${intitule} :`,
          titres.map((t) => `- ${t}`).join('\n'),
          'Ces rapports sont générés automatiquement. Les chiffres détaillés sont disponibles dans le back-office, menu Rapports.',
        ].join('\n\n'),
        attachments: pieces,
      });
      if (parti) envoyes += 1;
    }

    if (envoyes === 0) {
      this.logger.error('Rapports non envoyés : aucun e-mail n’est parti.');
      return { envoye: false, raison: 'mail_indisponible', ...vide };
    }
    await this.audit.record({
      action: 'rapport.envoi_auto',
      entityType: 'Rapport',
      entityId: cle,
      newValue: {
        ...periode,
        rapports: config.rapports,
        formats: config.formats,
        destinataires: envoyes,
      },
    });
    return {
      envoye: true,
      rapports: config.rapports.length,
      destinataires: envoyes,
    };
  }

  /** Génère les pièces jointes et le libellé de la période. */
  private async composer(
    config: ConfigEnvoi,
    periode: { du: string; au: string },
  ) {
    const societe = await this.company.getSociete();
    const pieces: { filename: string; content: Buffer; contentType: string }[] =
      [];
    const titres: string[] = [];
    for (const code of config.rapports) {
      const donnees = await this.rapports.generer(code, periode);
      titres.push(donnees.titre);
      const base = nomFichier(donnees.titre, periode.du, periode.au);
      for (const format of config.formats) {
        pieces.push({
          filename: `${base}.${format}`,
          content:
            format === 'pdf'
              ? renderRapportPdf(donnees, societe)
              : await renderRapportXlsx(donnees),
          contentType: TYPES[format],
        });
      }
    }
    const intitule =
      config.frequence === 'hebdomadaire'
        ? `semaine du ${periode.du} au ${periode.au}`
        : `mois du ${periode.du} au ${periode.au}`;
    return { societe, pieces, titres, intitule };
  }

  /**
   * Envoie **à une seule personne** un exemplaire de ce que recevront les
   * destinataires, pour vérifier le réglage et la messagerie. N'est pas
   * compté comme l'envoi de la période et ne tient pas compte du jour.
   */
  async envoyerTest(
    destinataire: string,
    maintenant: Date = new Date(),
  ): Promise<{
    envoye: boolean;
    raison?: 'aucun_rapport' | 'mail_indisponible';
  }> {
    const config = lireEnvoi(
      await this.settings.getRawValue(CLE_ENVOI_AUTOMATIQUE),
    );
    if (config.rapports.length === 0) {
      return { envoye: false, raison: 'aucun_rapport' };
    }
    const periode = periodeEcoulee(config.frequence, maintenant);
    const { societe, pieces, titres, intitule } = await this.composer(
      config,
      periode,
    );
    const parti = await this.mail.send({
      to: destinataire,
      subject: `[Essai] ${societe.name} — rapports de la ${intitule}`,
      text: [
        'Bonjour,',
        `Ceci est un essai de l’envoi automatique : voici les rapports de la ${intitule} tels que les destinataires les recevront.`,
        titres.map((t) => `- ${t}`).join('\n'),
        'Aucun autre destinataire n’a reçu ce message.',
      ].join('\n\n'),
      attachments: pieces,
    });
    return parti
      ? { envoye: true }
      : { envoye: false, raison: 'mail_indisponible' };
  }

  /** Les derniers envois réellement partis, du plus récent au plus ancien. */
  async derniersEnvois(limite = 5) {
    const lignes = await this.prisma.auditLog.findMany({
      where: { action: 'rapport.envoi_auto', entityType: 'Rapport' },
      orderBy: { createdAt: 'desc' },
      take: limite,
      select: { createdAt: true, newValue: true },
    });
    return lignes.map((ligne) => {
      const v = (ligne.newValue ?? {}) as Record<string, unknown>;
      return {
        date: ligne.createdAt.toISOString(),
        du: typeof v.du === 'string' ? v.du : null,
        au: typeof v.au === 'string' ? v.au : null,
        rapports: Array.isArray(v.rapports) ? (v.rapports as string[]) : [],
        destinataires:
          typeof v.destinataires === 'number' ? v.destinataires : 0,
      };
    });
  }
}
