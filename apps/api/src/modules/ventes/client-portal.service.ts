import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { MailService } from '../../common/mail/mail.service';
import { CreateClientAccountDto } from './dto/create-client-account.dto';

/**
 * Espace client (section 4 CDC) : ouverture du compte rattaché à un prospect,
 * et lecture par le client de ses dossiers, paiements, documents et demandes.
 * Le client n'accède qu'à ce qui est rattaché à son propre prospect.
 */
@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async createClientAccount(dto: CreateClientAccountDto) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: dto.prospectId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        clientUser: { select: { id: true } },
      },
    });
    if (!prospect) throw new NotFoundException('Client introuvable');
    if (!prospect.email)
      throw new BadRequestException('Le client doit avoir une adresse e-mail');
    if (prospect.clientUser)
      throw new ConflictException('Un compte client existe déjà');
    const role = await this.prisma.role.findUnique({
      where: { name: 'client' },
      select: { id: true },
    });
    if (!role)
      throw new BadRequestException('Le rôle client n’est pas configuré');
    const existing = await this.prisma.user.findUnique({
      where: { email: prospect.email },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    const password = await bcrypt.hash(dto.password, 12);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const user = await this.prisma.user.create({
      data: {
        email: prospect.email,
        password,
        firstName: prospect.prenom ?? prospect.nom,
        lastName: prospect.prenom ? prospect.nom : 'Client',
        mustChangePassword: true,
        clientProspectId: prospect.id,
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

    // Invitation : le client choisit lui-même son mot de passe via le jeton
    // (valable 7 jours). Le mot de passe initial saisi par le commercial reste
    // une solution de repli si l'e-mail n'arrive pas.
    const baseUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const link = `${baseUrl}/espace-client/connexion?reset=${rawToken}`;
    const sent = await this.mail.send({
      to: user.email,
      subject: 'Votre espace client MTM Immobilier',
      text: [
        `Bonjour ${user.firstName},`,
        'Votre espace client est ouvert. Vous y retrouverez vos dossiers, vos paiements et vos documents.',
        'Pour choisir votre mot de passe et vous connecter, ouvrez ce lien (valable 7 jours) :',
        link,
        `Identifiant : ${user.email}`,
        'En cas de difficulté, répondez à ce message ou contactez votre conseiller MTM.',
      ].join('\n\n'),
    });

    // Le jeton n'est renvoyé au commercial que si l'e-mail n'est pas parti :
    // il peut alors le transmettre par un autre canal.
    return {
      ...user,
      invitationSent: sent,
      resetToken: sent ? undefined : rawToken,
    };
  }

  /**
   * Demandes soumises par le client depuis le site public (section 4 CDC :
   * « demandes » dans l'espace client). Le rattachement se fait sur l'e-mail
   * du prospect, seul lien disponible pour une demande déposée sans compte.
   */
  async getClientDemandes(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspect: { select: { email: true } } },
    });
    const email = user?.clientProspect?.email;
    if (!email)
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');

    const [contacts, reservationRequests] = await Promise.all([
      this.prisma.contact.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sujet: true,
          message: true,
          createdAt: true,
          lu: true,
          terrain: { select: { referenceInterne: true, nom: true } },
        },
      }),
      this.prisma.reservationRequest.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          statut: true,
          message: true,
          createdAt: true,
          terrain: { select: { referenceInterne: true, nom: true } },
        },
      }),
    ]);

    return {
      messages: contacts.map((contact) => ({
        id: contact.id,
        sujet: contact.sujet,
        message: contact.message,
        createdAt: contact.createdAt,
        traite: contact.lu,
        terrain: contact.terrain,
      })),
      reservations: reservationRequests,
    };
  }

  async getClientPortal(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspectId: true },
    });
    if (!user?.clientProspectId)
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    const dossiers = await this.prisma.dossierVente.findMany({
      where: { prospectId: user.clientProspectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        statut: true,
        prixVente: true,
        createdAt: true,
        terrain: {
          select: {
            referenceInterne: true,
            nom: true,
            region: true,
            commune: true,
          },
        },
        reservations: {
          select: {
            reference: true,
            montantAcompte: true,
            dateExpiration: true,
            statut: true,
          },
        },
        paiements: {
          where: { statut: 'valide' },
          select: {
            montant: true,
            datePaiement: true,
            mode: true,
            reference: true,
          },
        },
        documents: {
          where: { isPublic: true },
          select: {
            id: true,
            type: true,
            title: true,
            version: true,
            createdAt: true,
            storageKey: true,
            resourceType: true,
          },
        },
      },
    });
    return dossiers.map((dossier) => ({
      ...dossier,
      montantPaye: dossier.paiements.reduce(
        (sum, payment) => sum + Number(payment.montant),
        0,
      ),
      prixVente: dossier.prixVente === null ? null : Number(dossier.prixVente),
      documents: dossier.documents.map(
        ({ storageKey, resourceType, ...document }) => ({
          ...document,
          secureUrl: this.cloudinary.url(storageKey, resourceType, false),
        }),
      ),
    }));
  }

  async getClientDocument(userId: string, documentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspectId: true },
    });
    if (!user?.clientProspectId) {
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    }
    const document = await this.prisma.documentVente.findFirst({
      where: {
        id: documentId,
        isPublic: true,
        dossierVente: { prospectId: user.clientProspectId },
      },
      select: {
        id: true,
        title: true,
        type: true,
        storageKey: true,
        resourceType: true,
      },
    });
    if (!document) throw new NotFoundException('Document client introuvable');
    return {
      id: document.id,
      title: document.title,
      type: document.type,
      secureUrl: this.cloudinary.url(
        document.storageKey,
        document.resourceType,
        false,
      ),
    };
  }
}
