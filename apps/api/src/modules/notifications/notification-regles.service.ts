import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CanalExterneService } from './canal-externe.service';
import {
  CLE_REGLES_NOTIFICATION,
  EVENEMENTS_NOTIFICATION,
  evenementDe,
  type RegleNotification,
  type ReglesNotification,
} from './evenements';
import { NotificationsService } from './notifications.service';
import { PreferencesNotificationDto } from './dto/preferences-notification.dto';

const CHAMPS_BOOLEENS = ['actif', 'email', 'sms', 'whatsapp'] as const;

/**
 * Réglage des notifications (section 25) : pour chaque événement du catalogue,
 * on active ou non l’alerte, on choisit la permission des destinataires et les
 * canaux. Et préférences personnelles : chacun règle ses propres canaux.
 */
@Injectable()
export class NotificationReglesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly canaux: CanalExterneService,
  ) {}

  /** Catalogue avec, pour chaque événement, le réglage enregistré et ce qui s’applique réellement. */
  async catalogue() {
    const regles = await this.notifications.lireRegles();
    return {
      canaux: { email: true, ...this.canaux.etat() },
      evenements: EVENEMENTS_NOTIFICATION.map((evenement) => {
        const regle = regles[evenement.cle] ?? {};
        return {
          ...evenement,
          regle,
          effectif: {
            actif: regle.actif !== false,
            permission: regle.permission || evenement.permission || null,
            email: regle.email ?? evenement.emailParDefaut,
            sms: regle.sms ?? false,
            whatsapp: regle.whatsapp ?? false,
          },
        };
      }),
    };
  }

  /** Remplace les règles. Une règle vide (ou identique au défaut) n’est pas conservée. */
  async enregistrer(brut: Record<string, unknown>, userId: string) {
    const propre: ReglesNotification = {};
    for (const [cle, valeur] of Object.entries(brut)) {
      const evenement = evenementDe(cle);
      if (!evenement) {
        throw new BadRequestException(`Événement inconnu : ${cle}`);
      }
      if (
        valeur === null ||
        typeof valeur !== 'object' ||
        Array.isArray(valeur)
      ) {
        throw new BadRequestException(`Réglage invalide pour ${cle}`);
      }
      const entree = valeur as Record<string, unknown>;
      const regle: RegleNotification = {};
      for (const champ of CHAMPS_BOOLEENS) {
        if (entree[champ] === undefined || entree[champ] === null) continue;
        if (typeof entree[champ] !== 'boolean') {
          throw new BadRequestException(
            `« ${champ} » doit être vrai ou faux (${cle})`,
          );
        }
        regle[champ] = entree[champ];
      }
      const permission = entree.permission;
      if (
        permission !== undefined &&
        permission !== null &&
        permission !== ''
      ) {
        if (typeof permission !== 'string') {
          throw new BadRequestException(`Permission invalide (${cle})`);
        }
        if (evenement.destinataire !== 'permission') {
          throw new BadRequestException(
            `« ${evenement.libelle} » est adressé à une personne précise : on ne règle pas sa permission`,
          );
        }
        const existe = await this.prisma.permission.findUnique({
          where: { name: permission },
          select: { id: true },
        });
        if (!existe) {
          throw new BadRequestException(`Permission inconnue : ${permission}`);
        }
        if (permission !== evenement.permission) regle.permission = permission;
      }
      if (Object.keys(regle).length > 0) propre[cle] = regle;
    }
    await this.prisma.systemSetting.upsert({
      where: { key: CLE_REGLES_NOTIFICATION },
      update: { value: propre as object, updatedById: userId },
      create: {
        key: CLE_REGLES_NOTIFICATION,
        value: propre as object,
        description:
          'Règles de notification par événement (activation, destinataires, canaux)',
        isSensitive: false,
        updatedById: userId,
      },
    });
    this.notifications.oublierRegles();
    return this.catalogue();
  }

  async preferences(userId: string) {
    const utilisateur = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        notificationsEmail: true,
        notificationsSms: true,
        notificationsWhatsapp: true,
        telephone: true,
      },
    });
    return {
      email: utilisateur.notificationsEmail,
      sms: utilisateur.notificationsSms,
      whatsapp: utilisateur.notificationsWhatsapp,
      telephone: utilisateur.telephone ?? '',
      canaux: this.canaux.etat(),
    };
  }

  async enregistrerPreferences(
    userId: string,
    dto: PreferencesNotificationDto,
  ) {
    const actuel = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { telephone: true },
    });
    const telephone =
      dto.telephone === undefined
        ? actuel.telephone
        : dto.telephone.trim() || null;
    if ((dto.sms || dto.whatsapp) && !telephone) {
      throw new BadRequestException(
        'Renseignez votre numéro de téléphone pour recevoir des SMS ou des messages WhatsApp',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email !== undefined ? { notificationsEmail: dto.email } : {}),
        // Sans numéro, ces canaux se coupent d’eux-mêmes.
        ...(dto.sms !== undefined || !telephone
          ? { notificationsSms: telephone ? dto.sms : false }
          : {}),
        ...(dto.whatsapp !== undefined || !telephone
          ? { notificationsWhatsapp: telephone ? dto.whatsapp : false }
          : {}),
        telephone,
      },
    });
    return this.preferences(userId);
  }
}
