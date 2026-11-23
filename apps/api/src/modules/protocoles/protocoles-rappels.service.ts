import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import {
  CLE_DELAI_RAPPEL,
  DELAI_RAPPEL_DEFAUT_JOURS,
  STATUTS_EN_ATTENTE_RETOUR,
} from './protocoles.regles';

const JOUR_MS = 86_400_000;

/**
 * Rappel des signatures en attente : un protocole parti chez le client sans retour signé au-delà du délai (réglable,
 * `protocoles.delaiRappelJours`, 7 jours par défaut) est rappelé au secrétariat et à la Direction, puis de nouveau à chaque
 * période écoulée tant que la copie signée n'est pas déposée. Chaque rappel est dédoublonné : relancer la tâche le même jour
 * n'envoie rien de plus.
 */
@Injectable()
export class ProtocolesRappelsService {
  private readonly logger = new Logger(ProtocolesRappelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Dakar' })
  async rappelerChaqueJour(): Promise<void> {
    try {
      const envoyes = await this.rappeler();
      this.logger.log(`Rappels de signature : ${envoyes} protocole(s).`);
    } catch (error) {
      this.logger.error(
        `Rappels de signature non envoyés : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Renvoie le nombre de protocoles rappelés. */
  async rappeler(maintenant: Date = new Date()): Promise<number> {
    const delai = await this.settings.getPositiveNumber(
      CLE_DELAI_RAPPEL,
      DELAI_RAPPEL_DEFAUT_JOURS,
    );
    const protocoles = await this.prisma.protocoleDossier.findMany({
      where: {
        statut: { in: [...STATUTS_EN_ATTENTE_RETOUR] },
        dateEnvoi: { lt: new Date(maintenant.getTime() - delai * JOUR_MS) },
        OR: [
          { dossierVente: { statut: { not: 'annule' } } },
          {
            bailLocatif: {
              statut: { notIn: ['termine', 'resilie_sans_preavis'] },
            },
          },
          { projetConstruction: { statut: { not: 'annule' } } },
        ],
      },
      select: {
        id: true,
        titre: true,
        dateEnvoi: true,
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            prospect: { select: { nom: true, prenom: true } },
          },
        },
        bailLocatif: {
          select: {
            referenceInterne: true,
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
        projetConstruction: {
          select: {
            referenceInterne: true,
            client: { select: { nom: true, prenom: true } },
          },
        },
      },
      orderBy: { dateEnvoi: 'asc' },
      take: 200,
    });

    let rappeles = 0;
    for (const protocole of protocoles) {
      if (!protocole.dateEnvoi) continue;
      const jours = Math.floor(
        (maintenant.getTime() - protocole.dateEnvoi.getTime()) / JOUR_MS,
      );
      // Un rappel par période de `delai` jours écoulée : le 7e jour, le 14e, le 21e…
      const periode = Math.floor(jours / delai);
      const personne =
        protocole.dossierVente?.prospect ??
        protocole.projetConstruction?.client ??
        null;
      const client = personne
        ? [personne.prenom, personne.nom].filter(Boolean).join(' ')
        : [
            protocole.bailLocatif?.locataire.firstName,
            protocole.bailLocatif?.locataire.lastName,
          ]
            .filter(Boolean)
            .join(' ');
      const reference =
        protocole.dossierVente?.referenceInterne ??
        protocole.bailLocatif?.referenceInterne ??
        protocole.projetConstruction?.referenceInterne ??
        protocole.id;
      const envoyes = await this.notifications.notifierPermission(
        'protocoles:modifier',
        {
          type: 'protocole_rappel',
          titre: `Signature en attente depuis ${jours} jours — ${reference}`,
          message: `${client}${protocole.titre ? ` · ${protocole.titre}` : ''} : relancer le client pour la copie signée.`,
          lien: '/protocoles?filtre=en_retard',
          entityType: 'ProtocoleDossier',
          entityId: protocole.id,
          dedupeKey: `protocole-rappel:${protocole.id}:${periode}`,
        },
      );
      if (envoyes > 0) rappeles++;
    }
    return rappeles;
  }
}
