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
      select: { id: true },
    });
    if (existant) {
      throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    }

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
    };
  }
}
