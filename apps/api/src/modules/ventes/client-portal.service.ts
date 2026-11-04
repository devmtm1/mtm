import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { ContactService } from '../contact/contact.service';
import { CreateClientAccountDto } from './dto/create-client-account.dto';
import { CreateClientDemandeDto } from './dto/create-client-demande.dto';
import { VentesService } from './ventes.service';

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
    private readonly contacts: ContactService,
    private readonly ventes: VentesService,
    private readonly comptesClient: ClientAccountsService,
  ) {}

  /**
   * Demande déposée par un client connecté. Son identité vient de son
   * compte : la demande est ainsi toujours rattachée à son espace, sans
   * dépendre de ce qu'il aurait saisi dans un formulaire public.
   */
  async createClientDemande(userId: string, dto: CreateClientDemandeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        clientProspect: {
          select: { nom: true, prenom: true, email: true, telephone: true },
        },
      },
    });
    const prospect = user?.clientProspect;
    if (!prospect) {
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    }
    // Une demande part toujours avec une adresse e-mail (la réponse de l'équipe y est envoyée) : un client qui
    // s'est ouvert un espace avec son seul numéro la demande à son conseiller, qui l'ajoute à sa fiche.
    if (!prospect.email) {
      throw new BadRequestException(
        'Pour envoyer une demande depuis votre espace, il faut une adresse e-mail sur votre fiche : demandez à votre conseiller MTM de l’ajouter, ou appelez-nous.',
      );
    }
    const identity = {
      nom: [prospect.prenom, prospect.nom].filter(Boolean).join(' '),
      email: prospect.email,
      telephone: prospect.telephone ?? undefined,
    };

    if (dto.type === 'reservation') {
      if (!dto.terrainId) {
        throw new BadRequestException(
          'Indiquez le terrain que vous souhaitez réserver',
        );
      }
      const request = await this.ventes.createPublicReservationRequest({
        ...identity,
        terrainId: dto.terrainId,
        message: dto.message,
      });
      return { kind: 'reservation' as const, id: request.id };
    }

    const contact = await this.contacts.create({
      ...identity,
      sujet:
        dto.sujet?.trim() ||
        (dto.type === 'visite'
          ? 'Demande de visite'
          : 'Demande d’informations'),
      message: dto.message,
      terrainId: dto.terrainId,
    });
    return { kind: 'message' as const, id: contact.id };
  }

  /**
   * Ouvre l'espace d'un client avec son adresse e-mail OU son numéro de téléphone (beaucoup de clients n'ont pas
   * d'e-mail). La procédure est commune à tous les espaces : voir ClientAccountsService.
   */
  async createClientAccount(dto: CreateClientAccountDto) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: dto.prospectId },
      select: {
        id: true,
        email: true,
        telephone: true,
        nom: true,
        prenom: true,
        clientUser: { select: { id: true } },
      },
    });
    if (!prospect) throw new NotFoundException('Client introuvable');
    if (!prospect.email && !prospect.telephone) {
      throw new BadRequestException(
        'Le client doit avoir une adresse e-mail ou un numéro de téléphone',
      );
    }
    if (prospect.clientUser)
      throw new ConflictException('Un compte client existe déjà');
    return this.comptesClient.ouvrir({
      email: prospect.email,
      telephone: prospect.telephone,
      firstName: prospect.prenom ?? prospect.nom,
      lastName: prospect.prenom ? prospect.nom : 'Client',
      password: dto.password,
      rattachement: { clientProspectId: prospect.id },
      introduction:
        'Votre espace client est ouvert. Vous y retrouverez vos dossiers, vos paiements et vos documents.',
    });
  }

  /**
   * Demandes soumises par le client depuis le site public (section 4 CDC :
   * « demandes » dans l'espace client). Le rattachement se fait sur l'e-mail
   * du prospect, seul lien disponible pour une demande déposée sans compte.
   */
  async getClientDemandes(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        clientProspect: { select: { email: true, telephone: true } },
      },
    });
    const { email, telephone } = user?.clientProspect ?? {};
    if (!user?.clientProspect)
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    // Les demandes se retrouvent par l'e-mail ou, à défaut, par le numéro de téléphone de la fiche.
    const parContact = [
      ...(email ? [{ email }] : []),
      ...(telephone ? [{ telephone }] : []),
    ];
    if (parContact.length === 0) return { messages: [], reservations: [] };

    const [contacts, reservationRequests] = await Promise.all([
      this.prisma.contact.findMany({
        where: { OR: parContact },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sujet: true,
          message: true,
          createdAt: true,
          lu: true,
          reponse: true,
          reponduLe: true,
          terrain: { select: { referenceInterne: true, nom: true } },
        },
      }),
      this.prisma.reservationRequest.findMany({
        where: { OR: parContact },
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
        reponse: contact.reponse,
        reponduLe: contact.reponduLe,
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
            id: true,
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
        echeances: {
          orderBy: { numero: 'asc' },
          select: {
            numero: true,
            dateEcheance: true,
            montantPrevu: true,
            montantPaye: true,
            statut: true,
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
      echeances: dossier.echeances.map((echeance) => ({
        ...echeance,
        montantPrevu: Number(echeance.montantPrevu),
        montantPaye: Number(echeance.montantPaye),
      })),
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
