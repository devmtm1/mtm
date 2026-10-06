import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';

/** Ce qui rattache le compte à son dossier : un seul lien à la fois. */
export type RattachementClient =
  | { clientProprietaireId: string }
  | { clientLocataireId: string }
  | { clientProspectId: string };

export interface OuvertureCompteClient {
  email: string | null;
  firstName: string;
  lastName: string;
  password: string;
  rattachement: RattachementClient;
  /** Phrase d'accroche propre à l'espace ouvert (bail, bien, dossier…). */
  introduction: string;
}

/**
 * Ouverture d'un compte d'espace client (sections 4 et 11 du cahier des
 * charges). Mutualisée : propriétaires et locataires suivaient la même
 * procédure — mot de passe initial saisi par le collaborateur, invitation par
 * e-mail avec jeton de 7 jours — et la dupliquer laissait deux endroits où une
 * règle de sécurité pouvait diverger.
 */
@Injectable()
export class ClientAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async ouvrir(demande: OuvertureCompteClient) {
    if (!demande.email) {
      throw new BadRequestException(
        'Une adresse e-mail est nécessaire pour ouvrir l’espace client',
      );
    }
    const role = await this.prisma.role.findUnique({
      where: { name: 'client' },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Le rôle client n’est pas configuré');
    }
    const existant = await this.prisma.user.findUnique({
      where: { email: demande.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        clientProspectId: true,
        clientProprietaireId: true,
        clientLocataireId: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (existant) return this.rattacherAuCompteExistant(existant, demande);

    const hashed = await bcrypt.hash(demande.password, 12);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const user = await this.prisma.user.create({
      data: {
        email: demande.email,
        password: hashed,
        firstName: demande.firstName,
        lastName: demande.lastName,
        mustChangePassword: true,
        ...demande.rattachement,
        roles: { create: { roleId: role.id } },
        passwordResetTokens: {
          create: {
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          },
        },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const link = `${baseUrl}/espace-client/connexion?reset=${rawToken}`;
    const sent = await this.mail.send({
      to: user.email,
      subject: 'Votre espace client MTM Immobilier',
      text: [
        `Bonjour ${user.firstName},`,
        demande.introduction,
        'Pour choisir votre mot de passe et vous connecter, ouvrez ce lien (valable 7 jours) :',
        link,
        `Identifiant : ${user.email}`,
        'En cas de difficulté, répondez à ce message ou contactez votre conseiller MTM.',
      ].join('\n\n'),
    });

    // Sans e-mail parti, le collaborateur transmet le lien lui-même : le jeton
    // n'est renvoyé que dans ce cas, jamais en fonctionnement normal.
    return {
      ...user,
      invitationSent: sent,
      resetToken: sent ? undefined : rawToken,
      compteExistant: false,
    };
  }

  /**
   * La personne a déjà un espace client (par exemple comme acheteur) : on y
   * ajoute le nouveau rattachement au lieu de refuser l'adresse e-mail. Sans
   * cela, un client qui devient locataire ou propriétaire ne verrait jamais
   * « Ma location » ou « Mon bien » : l'espace client n'affiche ces onglets
   * que pour un compte rattaché.
   *
   * Seuls les comptes purement « client » sont concernés : jamais un compte du
   * personnel, dont l'adresse serait seulement la même. Le mot de passe n'est
   * pas touché.
   */
  private async rattacherAuCompteExistant(
    existant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      clientProspectId: string | null;
      clientProprietaireId: string | null;
      clientLocataireId: string | null;
      roles: { role: { name: string } }[];
    },
    demande: OuvertureCompteClient,
  ) {
    const estCompteClient =
      existant.roles.length > 0 &&
      existant.roles.every((lien) => lien.role.name === 'client');
    if (!estCompteClient) {
      throw new ConflictException(
        'Cette adresse e-mail est déjà utilisée par un compte du personnel',
      );
    }

    const [champ] = Object.keys(
      demande.rattachement,
    ) as (keyof RattachementClient)[];
    if (existant[champ]) {
      throw new ConflictException(
        'Cette adresse e-mail a déjà un espace client rattaché à un autre dossier de ce type',
      );
    }

    await this.prisma.user.update({
      where: { id: existant.id },
      data: { ...demande.rattachement },
    });

    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const sent = await this.mail.send({
      to: existant.email,
      subject: "Votre espace client MTM Immobilier s'enrichit",
      text: [
        `Bonjour ${existant.firstName},`,
        demande.introduction,
        'Connectez-vous avec votre identifiant habituel : le nouvel espace apparaît dans votre espace client.',
        `${baseUrl}/espace-client/connexion`,
        `Identifiant : ${existant.email}`,
      ].join('\n\n'),
    });

    return {
      id: existant.id,
      email: existant.email,
      firstName: existant.firstName,
      lastName: existant.lastName,
      invitationSent: sent,
      resetToken: undefined,
      /** Le client garde son mot de passe : rien à lui transmettre. */
      compteExistant: true,
    };
  }
}
