import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { normaliserTelephone } from '../../common/utils/telephone';
import {
  type CanalExterne,
  CanalExterneService,
} from '../notifications/canal-externe.service';

/** Ce qui rattache le compte à son dossier : un seul lien à la fois. */
export type RattachementClient =
  | { clientProprietaireId: string }
  | { clientLocataireId: string }
  | { clientProspectId: string };

export interface OuvertureCompteClient {
  /** Adresse e-mail du client, si elle existe : l'espace s'ouvre avec un e-mail OU un numéro de téléphone. */
  email: string | null;
  /** Numéro de téléphone du client (toute écriture usuelle) : identifiant de connexion quand il n'a pas d'e-mail. */
  telephone: string | null;
  firstName: string;
  lastName: string;
  password: string;
  rattachement: RattachementClient;
  /** Phrase d'accroche propre à l'espace ouvert (bail, bien, dossier…). */
  introduction: string;
}

/** Par où l'invitation est partie ; `null` quand rien n'a pu partir et que le collaborateur doit la transmettre. */
export type CanalInvitation = 'email' | CanalExterne | null;

interface CompteExistant {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  telephoneConnexion: string | null;
  clientProspectId: string | null;
  clientProprietaireId: string | null;
  clientLocataireId: string | null;
  roles: { role: { name: string } }[];
}

/**
 * Ouverture d'un compte d'espace client (sections 4 et 11 du cahier des
 * charges). Mutualisée : prospects, propriétaires et locataires suivent la même
 * procédure — mot de passe initial saisi par le collaborateur, invitation avec
 * jeton de 7 jours — et la dupliquer laissait plusieurs endroits où une règle
 * de sécurité pouvait diverger.
 *
 * Le compte s'ouvre avec une adresse e-mail **ou** un numéro de téléphone : beaucoup de clients n'ont pas
 * d'e-mail. Sans e-mail, le numéro (format international) sert d'identifiant de connexion, et l'invitation
 * part par WhatsApp ou SMS quand un fournisseur est configuré.
 */
@Injectable()
export class ClientAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @Optional() private readonly canaux?: CanalExterneService,
  ) {}

  async ouvrir(demande: OuvertureCompteClient) {
    const email = demande.email?.trim() || null;
    const telephoneSaisi = demande.telephone?.trim() || null;
    const telephone = normaliserTelephone(telephoneSaisi);
    if (!email && !telephoneSaisi) {
      throw new BadRequestException(
        'Une adresse e-mail ou un numéro de téléphone est nécessaire pour ouvrir l’espace client',
      );
    }
    if (!email && !telephone) {
      throw new BadRequestException(
        'Ce numéro de téléphone n’est pas valable : écrivez-le avec 9 chiffres (77 123 45 67) ou avec son indicatif (+33…)',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { name: 'client' },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Le rôle client n’est pas configuré');
    }

    const select = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      telephoneConnexion: true,
      clientProspectId: true,
      clientProprietaireId: true,
      clientLocataireId: true,
      roles: { select: { role: { select: { name: true } } } },
    } as const;
    const parEmail = email
      ? await this.prisma.user.findUnique({ where: { email }, select })
      : null;
    const parTelephone = telephone
      ? await this.prisma.user.findUnique({
          where: { telephoneConnexion: telephone },
          select,
        })
      : null;
    if (parEmail && parTelephone && parEmail.id !== parTelephone.id) {
      throw new ConflictException(
        'Cette adresse e-mail et ce numéro appartiennent à deux comptes différents : corrigez l’un des deux avant d’ouvrir l’espace client',
      );
    }
    const existant = parEmail ?? parTelephone;
    if (existant) return this.rattacherAuCompteExistant(existant, demande);

    const hashed = await bcrypt.hash(demande.password, 12);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const user = await this.prisma.user.create({
      data: {
        email,
        // Le numéro est un second identifiant, même quand l'e-mail existe : le client peut se connecter avec l'un ou l'autre.
        telephoneConnexion: telephone,
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
      select: {
        id: true,
        email: true,
        telephoneConnexion: true,
        firstName: true,
        lastName: true,
      },
    });

    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const link = `${baseUrl}/espace-client/connexion?reset=${rawToken}`;
    const identifiant = user.email ?? user.telephoneConnexion ?? '';
    const canal = await this.inviter(user, {
      objet: 'Votre espace client MTM Immobilier',
      lignes: [
        demande.introduction,
        'Pour choisir votre mot de passe et vous connecter, ouvrez ce lien (valable 7 jours) :',
        link,
        `Identifiant : ${identifiant}`,
        'En cas de difficulté, contactez votre conseiller MTM.',
      ],
    });

    // Sans invitation partie, le collaborateur transmet le lien lui-même : le jeton
    // n'est renvoyé que dans ce cas, jamais en fonctionnement normal.
    return {
      id: user.id,
      email: user.email,
      telephone: user.telephoneConnexion,
      firstName: user.firstName,
      lastName: user.lastName,
      invitationSent: canal !== null,
      canalInvitation: canal,
      resetToken: canal ? undefined : rawToken,
      compteExistant: false,
    };
  }

  /**
   * Envoie l'invitation : par e-mail quand le client en a un, sinon par WhatsApp puis SMS sur son numéro.
   * Renvoie le canal qui a accepté le message, ou `null`.
   */
  private async inviter(
    destinataire: {
      firstName: string;
      email: string | null;
      telephoneConnexion: string | null;
    },
    message: { objet: string; lignes: string[] },
  ): Promise<CanalInvitation> {
    if (destinataire.email) {
      const envoye = await this.mail.send({
        to: destinataire.email,
        subject: message.objet,
        text: [`Bonjour ${destinataire.firstName},`, ...message.lignes].join(
          '\n\n',
        ),
      });
      return envoye ? 'email' : null;
    }
    if (!destinataire.telephoneConnexion || !this.canaux) return null;
    // Un message court : le même texte, sur une seule ligne par information.
    const texte = [
      `MTM Immobilier : bonjour ${destinataire.firstName},`,
      ...message.lignes,
    ].join('\n');
    for (const canal of ['whatsapp', 'sms'] as const) {
      if (!this.canaux.estConfigure(canal)) continue;
      const envoye = await this.canaux.envoyer({
        canal,
        destinataire: destinataire.telephoneConnexion,
        texte,
      });
      if (envoye) return canal;
    }
    return null;
  }

  /**
   * La personne a déjà un espace client (par exemple comme acheteur) : on y
   * ajoute le nouveau rattachement au lieu de refuser l'identifiant. Sans
   * cela, un client qui devient locataire ou propriétaire ne verrait jamais
   * « Ma location » ou « Mon bien » : l'espace client n'affiche ces onglets
   * que pour un compte rattaché.
   *
   * Seuls les comptes purement « client » sont concernés : jamais un compte du
   * personnel, dont l'adresse ou le numéro serait seulement le même. Le mot de
   * passe n'est pas touché.
   */
  private async rattacherAuCompteExistant(
    existant: CompteExistant,
    demande: OuvertureCompteClient,
  ) {
    const estCompteClient =
      existant.roles.length > 0 &&
      existant.roles.every((lien) => lien.role.name === 'client');
    if (!estCompteClient) {
      throw new ConflictException(
        'Cette adresse e-mail ou ce numéro est déjà utilisé par un compte du personnel',
      );
    }

    const [champ] = Object.keys(
      demande.rattachement,
    ) as (keyof RattachementClient)[];
    if (existant[champ]) {
      throw new ConflictException(
        'Cette personne a déjà un espace client rattaché à un autre dossier de ce type',
      );
    }

    await this.prisma.user.update({
      where: { id: existant.id },
      data: { ...demande.rattachement },
    });

    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const identifiant = existant.email ?? existant.telephoneConnexion ?? '';
    const canal = await this.inviter(existant, {
      objet: "Votre espace client MTM Immobilier s'enrichit",
      lignes: [
        demande.introduction,
        'Connectez-vous avec votre identifiant habituel : le nouvel espace apparaît dans votre espace client.',
        `${baseUrl}/espace-client/connexion`,
        `Identifiant : ${identifiant}`,
      ],
    });

    return {
      id: existant.id,
      email: existant.email,
      telephone: existant.telephoneConnexion,
      firstName: existant.firstName,
      lastName: existant.lastName,
      invitationSent: canal !== null,
      canalInvitation: canal,
      resetToken: undefined,
      /** Le client garde son mot de passe : rien à lui transmettre. */
      compteExistant: true,
    };
  }
}
