import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DossierLienService,
  PERMISSION_DOSSIER,
  type DossierRef,
  type TypeDossier,
} from '../dossiers/dossier-lien.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Dossiers dont le client lit et écrit le fil depuis son espace. */
export const TYPES_DOSSIER_CLIENT: readonly TypeDossier[] = [
  'vente',
  'mission',
  'chantier',
  'bail',
];

/** Un client qui écrit plus de cinq messages par minute est arrêté : le fil n'est pas un canal de spam. */
const LIMITE_CLIENT_PAR_MINUTE = 5;

type Interne = {
  id: string;
  roles: string[];
  permissions: string[];
  firstName?: string;
  lastName?: string;
};

const auteur = {
  select: { id: true, firstName: true, lastName: true },
} as const;

function nomComplet(utilisateur?: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return (
    [utilisateur?.firstName, utilisateur?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Un collègue'
  );
}

/**
 * Fil de discussion par dossier (section 22) : historique conservé, droits
 * d'accès identiques à ceux du dossier. Un message est une note interne, ou
 * un message au client (visible dans son espace) ; le client, lui, ne voit
 * que ces derniers et peut y répondre.
 */
@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossierLienService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- côté collaborateurs ---

  async lister(entityType: string, entityId: string, user: Interne) {
    await this.dossiers.verifier(entityType, entityId, user);
    const messages = await this.prisma.messageDossier.findMany({
      where: { entityType, entityId },
      include: { auteur },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return {
      items: messages.map((message) => this.presenter(message)),
      clientPeutLire: TYPES_DOSSIER_CLIENT.includes(entityType as TypeDossier),
    };
  }

  async poster(
    entityType: string,
    entityId: string,
    corps: string,
    visibleClient: boolean,
    user: Interne,
  ) {
    const dossier = await this.dossiers.verifier(entityType, entityId, user);
    if (visibleClient && !TYPES_DOSSIER_CLIENT.includes(dossier.entityType)) {
      throw new BadRequestException(
        'Ce type de dossier n’a pas d’espace client : le message reste interne',
      );
    }
    const message = await this.prisma.messageDossier.create({
      data: {
        entityType: dossier.entityType,
        entityId: dossier.entityId,
        entityLabel: dossier.entityLabel,
        auteurId: user.id,
        corps: corps.trim(),
        visibleClient,
        deClient: false,
      },
      include: { auteur },
    });

    if (visibleClient) {
      await this.prevenirClient(dossier, message.corps);
    }
    await this.prevenirCollegues(dossier, user.id, user, message.corps);
    return this.presenter(message);
  }

  // --- côté client ---

  async listerClient(entityType: string, entityId: string, userId: string) {
    await this.dossiers.verifierPourClient(entityType, entityId, userId);
    const messages = await this.prisma.messageDossier.findMany({
      where: { entityType, entityId, visibleClient: true },
      include: { auteur },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      items: messages.map((message) => ({
        id: message.id,
        corps: message.corps,
        createdAt: message.createdAt,
        deClient: message.deClient,
        // Le client lit « MTM » et un prénom, jamais l'organisation interne.
        auteur: message.deClient ? 'Vous' : message.auteur.firstName,
      })),
    };
  }

  async posterClient(
    entityType: string,
    entityId: string,
    corps: string,
    userId: string,
  ) {
    const dossier = await this.dossiers.verifierPourClient(
      entityType,
      entityId,
      userId,
    );
    const recents = await this.prisma.messageDossier.count({
      where: {
        auteurId: userId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recents >= LIMITE_CLIENT_PAR_MINUTE) {
      throw new HttpException(
        'Trop de messages envoyés : patientez une minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const client = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });
    const message = await this.prisma.messageDossier.create({
      data: {
        entityType: dossier.entityType,
        entityId: dossier.entityId,
        entityLabel: dossier.entityLabel,
        auteurId: userId,
        corps: corps.trim(),
        visibleClient: true,
        deClient: true,
      },
    });
    await this.prevenirEquipe(dossier, client, message.corps);
    return {
      id: message.id,
      corps: message.corps,
      createdAt: message.createdAt,
      deClient: true,
      auteur: 'Vous',
    };
  }

  // --- notifications ---

  /** Le client est prévenu dans son espace, et par e-mail. */
  private async prevenirClient(dossier: DossierRef, corps: string) {
    const cible = await this.cibleClient(dossier);
    if (!cible) return;
    await this.notifications.notifierClient(cible, {
      type: 'message_mtm',
      titre: `MTM vous a écrit à propos de ${dossier.entityLabel}`,
      message: apercu(corps),
      lien: this.dossiers.lienClient(dossier.entityType),
      entityType: 'MessageDossier',
      entityId: dossier.entityId,
      email: true,
    });
  }

  /** Les collègues qui suivent le dossier : son responsable et ceux qui y ont déjà écrit. */
  private async prevenirCollegues(
    dossier: DossierRef,
    auteurId: string,
    user: Interne,
    corps: string,
  ) {
    const ecrivains = await this.prisma.messageDossier.findMany({
      where: {
        entityType: dossier.entityType,
        entityId: dossier.entityId,
        deClient: false,
      },
      select: { auteurId: true },
      distinct: ['auteurId'],
    });
    const responsable = await this.dossiers.responsable(
      dossier.entityType,
      dossier.entityId,
    );
    const destinataires = [
      ...ecrivains.map((e) => e.auteurId),
      ...(responsable ? [responsable] : []),
    ].filter((id) => id !== auteurId);
    if (destinataires.length === 0) return;
    await this.notifications.notifier(destinataires, {
      type: 'message_dossier',
      titre: `${nomComplet(user)} a écrit sur ${dossier.entityLabel}`,
      message: apercu(corps),
      lien: dossier.lien,
      entityType: 'MessageDossier',
      entityId: dossier.entityId,
    });
  }

  /** Le client a écrit : l'équipe qui porte le dossier est prévenue. */
  private async prevenirEquipe(
    dossier: DossierRef,
    client: { firstName: string; lastName: string },
    corps: string,
  ) {
    const input = {
      type: 'message_dossier',
      niveau: 'alerte' as const,
      titre: `${nomComplet(client)} a écrit sur ${dossier.entityLabel}`,
      message: apercu(corps),
      lien: dossier.lien,
      entityType: 'MessageDossier',
      entityId: dossier.entityId,
    };
    const responsable = await this.dossiers.responsable(
      dossier.entityType,
      dossier.entityId,
    );
    if (responsable) {
      await this.notifications.notifier([responsable], input);
    }
    // Quel que soit le dossier, les valideurs du module le savent aussi.
    await this.notifications.notifierPermission(
      PERMISSION_VALIDEUR[dossier.entityType] ??
        PERMISSION_DOSSIER[dossier.entityType],
      input,
      responsable ?? undefined,
    );
  }

  private async cibleClient(dossier: DossierRef) {
    if (dossier.entityType === 'bail') {
      const bail = await this.prisma.bailLocatif.findUnique({
        where: { id: dossier.entityId },
        select: { locataireId: true },
      });
      return bail ? { locataireId: bail.locataireId } : null;
    }
    const proprietaire =
      dossier.entityType === 'vente'
        ? (
            await this.prisma.dossierVente.findUnique({
              where: { id: dossier.entityId },
              select: { prospectId: true },
            })
          )?.prospectId
        : dossier.entityType === 'mission'
          ? (
              await this.prisma.missionVerification.findUnique({
                where: { id: dossier.entityId },
                select: { prospectId: true },
              })
            )?.prospectId
          : (
              await this.prisma.projetConstruction.findUnique({
                where: { id: dossier.entityId },
                select: { clientId: true },
              })
            )?.clientId;
    return proprietaire ? { prospectId: proprietaire } : null;
  }

  private presenter(message: {
    id: string;
    corps: string;
    visibleClient: boolean;
    deClient: boolean;
    createdAt: Date;
    auteur: { id: string; firstName: string; lastName: string };
  }) {
    return {
      id: message.id,
      corps: message.corps,
      visibleClient: message.visibleClient,
      deClient: message.deClient,
      createdAt: message.createdAt,
      auteur: message.auteur,
    };
  }
}

/** Qui valide dans chaque module : prévenu quand le client écrit. */
const PERMISSION_VALIDEUR: Partial<Record<TypeDossier, string>> = {
  vente: 'ventes:valider',
  mission: 'demarches:valider',
  chantier: 'construction:administrer',
  bail: 'locatif:modifier',
};

function apercu(texte: string): string {
  const net = texte.replace(/\s+/g, ' ').trim();
  return net.length > 140 ? `${net.slice(0, 137)}…` : net;
}
