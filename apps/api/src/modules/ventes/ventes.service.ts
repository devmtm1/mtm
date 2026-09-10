import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateClientAccountDto } from './dto/create-client-account.dto';
import { UpdateVenteStatusDto } from './dto/update-vente-status.dto';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateDossierVenteDto } from './dto/create-dossier-vente.dto';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateDocumentVenteDto } from './dto/create-document-vente.dto';
import { CreatePublicReservationRequestDto } from './dto/create-public-reservation-request.dto';
import { ConvertReservationRequestDto } from './dto/convert-reservation-request.dto';
import { validateUploadedAsset } from '../../common/storage/asset-validation';

const ACTIVE_RESERVATION_STATUSES = ['active', 'prolongee'];

type MandatUser = { id: string; roles: string[]; permissions: string[] };

type CommissionRule = {
  id: string;
  typeRegle: 'pourcentage' | 'montant_fixe';
  taux?: number;
  montantFixe?: number;
  palier?: number;
  bonus?: number;
};

@Injectable()
export class VentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async assertMandatExclusivity(
    terrainId: string | undefined,
    mandatId: string | undefined,
  ): Promise<void> {
    if (!terrainId) return;
    const exclusiveMandat = await this.prisma.mandat.findFirst({
      where: {
        statut: 'Actif',
        exclusivite: true,
        lots: { some: { terrainId } },
      },
      select: { id: true },
    });
    if (exclusiveMandat && exclusiveMandat.id !== mandatId) {
      throw new ConflictException(
        'Ce terrain est couvert par un mandat exclusif actif : la vente doit être rattachée à ce mandat',
      );
    }
  }

  private hasGlobalScope(roles: string[]): boolean {
    return roles.some((role) =>
      [
        'administrateur',
        'direction',
        'manager',
        'responsable_commercial',
        'comptable',
      ].includes(role),
    );
  }

  private ownershipFilter(user: MandatUser): Prisma.DossierVenteWhereInput {
    if (this.hasGlobalScope(user.roles)) return {};
    return { commercialResponsableId: user.id };
  }

  private async getAllowedSaleStatuses(): Promise<string[]> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'ventes.statuts' },
    });
    const value = configured?.value;
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : [
          'en_cours',
          'pre_reserve',
          'reserve',
          'paiement_partiel',
          'solde',
          'annule',
        ];
  }

  private async getAllowedTransitions(): Promise<Record<string, string[]>> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'ventes.transitions' },
    });
    const value = configured?.value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const transitions: Record<string, string[]> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (
          Array.isArray(val) &&
          val.every((item) => typeof item === 'string')
        ) {
          transitions[key] = val;
        }
      }
      if (Object.keys(transitions).length > 0) return transitions;
    }
    return {
      en_cours: ['pre_reserve', 'reserve', 'annule'],
      pre_reserve: ['reserve', 'en_cours', 'annule'],
      reserve: ['paiement_partiel', 'solde', 'en_cours', 'annule'],
      paiement_partiel: ['solde', 'annule'],
      solde: [],
      annule: ['en_cours'],
    };
  }

  private async getAllowedPaymentModes(): Promise<string[]> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'paiements.modesAutorises' },
    });
    const value = configured?.value;
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : ['especes', 'virement', 'en_ligne'];
  }

  private async getAllowedDocumentTypes(): Promise<string[]> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'ventes.documentTypes' },
    });
    const value = configured?.value;
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : [
          'bon_reservation',
          'recu',
          'facture',
          'contrat',
          'etat_paiement',
          'justificatif',
          'autre',
        ];
  }

  private async getDefaultEcheanceCount(): Promise<number> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'ventes.echeancesDefaut' },
    });
    const value = configured?.value;
    return typeof value === 'number' && value > 0 ? value : 3;
  }

  private async getCommissionRule(regleId: string): Promise<CommissionRule> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'ventes.reglesCommissions' },
      select: { value: true },
    });
    const value = configured?.value;
    if (!Array.isArray(value)) {
      throw new BadRequestException('Aucune règle de commission n’est configurée');
    }
    const rule = value.find(
      (item): item is CommissionRule =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        (item as Record<string, unknown>).id === regleId &&
        ['pourcentage', 'montant_fixe'].includes(
          (item as Record<string, unknown>).typeRegle as string,
        ),
    );
    if (!rule) throw new BadRequestException('Règle de commission introuvable');
    if (
      (rule.typeRegle === 'pourcentage' &&
        (typeof rule.taux !== 'number' || rule.taux < 0 || rule.taux > 100)) ||
      (rule.typeRegle === 'montant_fixe' &&
        (typeof rule.montantFixe !== 'number' || rule.montantFixe < 0))
    ) {
      throw new BadRequestException('Règle de commission invalide');
    }
    return rule;
  }

  private async ensureAccessible(id: string, user: MandatUser): Promise<void> {
    const exists = await this.prisma.dossierVente.findFirst({
      where: { id, ...this.ownershipFilter(user) },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Dossier de vente introuvable');
  }

  private canViewFinancials(user: MandatUser): boolean {
    return (
      this.hasGlobalScope(user.roles) ||
      user.permissions.includes('ventes:consulter_financier') ||
      user.roles.some((role) =>
        [
          'direction',
          'comptable',
          'manager',
          'responsable_commercial',
        ].includes(role),
      )
    );
  }

  async findAll(user: MandatUser) {
    const where = this.ownershipFilter(user);
    const dossiers = await this.prisma.dossierVente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        prospect: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            statutCommercial: true,
          },
        },
        mandat: { select: { id: true, referenceInterne: true } },
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
        reservations: { orderBy: { createdAt: 'desc' }, take: 1 },
        paiements: this.canViewFinancials(user)
          ? { orderBy: { datePaiement: 'desc' } }
          : false,
        _count: { select: { documents: true, commissions: true } },
      },
    });

    return dossiers.map((dossier) => {
      const summary = this.withFinancialSummary(dossier, user);
      if (!this.canViewFinancials(user)) {
        const { paiements, ...rest } = summary;
        return rest;
      }
      return summary;
    });
  }

  async findReservationRequests(user: MandatUser) {
    return this.prisma.reservationRequest.findMany({
      where: this.hasGlobalScope(user.roles)
        ? {}
        : { terrain: { commercialResponsableId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            statutCommercial: true,
          },
        },
      },
    });
  }

  async convertReservationRequest(
    requestId: string,
    dto: ConvertReservationRequestDto,
    user: MandatUser,
  ) {
    const request = await this.prisma.reservationRequest.findUnique({
      where: { id: requestId },
      include: {
        terrain: { select: { id: true, statutCommercial: true, commercialResponsableId: true } },
        dossierVente: { select: { id: true } },
      },
    });
    if (!request)
      throw new NotFoundException('Demande de réservation introuvable');
    if (request.dossierVente)
      throw new ConflictException(
        'Cette demande est déjà rattachée à un dossier',
      );
    if (['Vendu', 'Indisponible'].includes(request.terrain.statutCommercial)) {
      throw new ConflictException('Ce terrain n’est plus disponible');
    }
    if (!this.hasGlobalScope(user.roles) && request.terrain.commercialResponsableId !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas convertir une demande sur un terrain qui ne vous est pas attribué',
      );
    }

    await this.assertMandatExclusivity(request.terrainId, dto.mandatId);

    const commercialResponsableId = dto.commercialResponsableId ?? user.id;

    const dossier = await this.prisma.$transaction(async (transaction) => {
      let prospect = await transaction.prospect.findFirst({
        where: { email: request.email },
        select: { id: true },
      });
      if (!prospect) {
        prospect = await transaction.prospect.create({
          data: {
            nom: request.nom,
            email: request.email,
            telephone: request.telephone,
            besoins: request.message,
            sourceAcquisition: 'reservation_public',
            statutPipeline: 'reservation',
            commercialResponsableId,
          },
          select: { id: true },
        });
      }
      const created = await transaction.dossierVente.create({
        data: {
          prospectId: prospect.id,
          terrainId: request.terrainId,
          mandatId: dto.mandatId,
          commercialResponsableId,
          prixVente: dto.prixVente,
          notes: dto.notes,
          statut: 'en_cours',
          referenceInterne: `DV-${randomUUID().slice(0, 8).toUpperCase()}`,
          reservationRequestId: request.id,
        },
      });
      await transaction.reservationRequest.update({
        where: { id: request.id },
        data: { statut: 'traitee' },
      });
      return created;
    });
    return this.findOne(dossier.id, {
      id: 'system',
      roles: ['administrateur'],
      permissions: ['ventes:consulter', 'ventes:modifier'],
    });
  }

  async createPublicReservationRequest(dto: CreatePublicReservationRequestDto) {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: dto.terrainId },
      select: { id: true, nom: true, statutCommercial: true },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
    if (['Vendu', 'Indisponible'].includes(terrain.statutCommercial)) {
      throw new ConflictException('Ce terrain n’est plus disponible');
    }
    return this.prisma.reservationRequest.create({
      data: {
        terrainId: dto.terrainId,
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        message: dto.message,
      },
      select: { id: true, statut: true, createdAt: true },
    });
  }

  async findOne(id: string, user?: MandatUser) {
    if (user) await this.ensureAccessible(id, user);
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            id: true, nom: true, prenom: true, email: true, telephone: true,
            paysResidence: true, besoins: true, preferences: true,
          },
        },
        terrain: {
          select: {
            id: true, referenceInterne: true, nom: true, parcelleMatricule: true,
            statutJuridique: true, typeDocumentFoncier: true,
            niveauVerification: true, region: true, commune: true,
            localisationDetail: true, latitude: true, longitude: true,
            superficie: true, uniteSuperficie: true, dimensions: true,
            prixPublic: true, statutCommercial: true, accesRoutier: true,
            eauDisponible: true, electriciteDisponible: true, voisinage: true,
            vocation: true, proximiteAxes: true, pointsInteret: true,
          },
        },
        mandat: { select: { id: true, referenceInterne: true, statut: true } },
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
        reservations: { orderBy: { createdAt: 'desc' } },
        paiements: { orderBy: { datePaiement: 'desc' } },
        commissions: {
          include: {
            commercial: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
    const effectiveUser: MandatUser = user ?? {
      id: 'system',
      roles: ['administrateur'],
      permissions: ['ventes:consulter'],
    };
    const summary = this.withFinancialSummary(dossier, effectiveUser);
    const { documents, commissions, paiements, ...base } = summary;
    const mappedDocuments = documents.map(({ storageKey, resourceType, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, resourceType, false),
    }));

    const response: Record<string, unknown> = {
      ...base,
      documents: mappedDocuments,
    };

    if (this.canViewFinancials(effectiveUser)) {
      response.paiements = paiements;
      response.commissions = commissions;
    }

    return response;
  }

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
    return { ...user, resetToken: rawToken };
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
      documents: dossier.documents.map(({ storageKey, resourceType, ...document }) => ({
        ...document,
        secureUrl: this.cloudinary.url(storageKey, resourceType, false),
      })),
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
      select: { id: true, title: true, type: true, storageKey: true, resourceType: true },
    });
    if (!document) throw new NotFoundException('Document client introuvable');
    return {
      id: document.id,
      title: document.title,
      type: document.type,
      secureUrl: this.cloudinary.url(document.storageKey, document.resourceType, false),
    };
  }

  async create(dto: CreateDossierVenteDto, user: MandatUser) {
    const [prospect, terrain, mandat] = await Promise.all([
      this.prisma.prospect.findUnique({
        where: { id: dto.prospectId },
        select: { id: true },
      }),
      dto.terrainId
        ? this.prisma.terrain.findUnique({
            where: { id: dto.terrainId },
            select: { id: true, statutCommercial: true },
          })
        : null,
      dto.mandatId
        ? this.prisma.mandat.findUnique({
            where: { id: dto.mandatId },
            select: { id: true },
          })
        : null,
    ]);
    if (!prospect) throw new NotFoundException('Prospect introuvable');
    if (dto.terrainId && !terrain)
      throw new NotFoundException('Terrain introuvable');
    if (dto.mandatId && !mandat)
      throw new NotFoundException('Mandat introuvable');
    if (terrain && terrain.statutCommercial !== 'Disponible') {
      throw new ConflictException(
        'Seuls les terrains disponibles peuvent être ajoutés à un nouveau dossier',
      );
    }
    await this.assertMandatExclusivity(dto.terrainId, dto.mandatId);

    const allowedStatuses = await this.getAllowedSaleStatuses();
    const statut = allowedStatuses.includes(dto.statut ?? 'en_cours')
      ? (dto.statut ?? 'en_cours')
      : 'en_cours';

    const dossier = await this.prisma.dossierVente.create({
      data: {
        prospectId: dto.prospectId,
        terrainId: dto.terrainId,
        mandatId: dto.mandatId,
        commercialResponsableId: dto.commercialResponsableId ?? user.id,
        prixVente: dto.prixVente,
        statut,
        notes: dto.notes,
        referenceInterne: `DV-${randomUUID().slice(0, 8).toUpperCase()}`,
      },
    });

    if (dossier.prixVente !== null && Number(dossier.prixVente) > 0) {
      const echeanceCount = await this.getDefaultEcheanceCount();
      const prixVenteNumber = Number(dossier.prixVente);
      const baseMontant = Math.floor(prixVenteNumber / echeanceCount);
      const remainder = prixVenteNumber - baseMontant * echeanceCount;
      const now = new Date();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.echeancePaiement.createMany({
        data: Array.from({ length: echeanceCount }, (_, index) => ({
          dossierVenteId: dossier.id,
          numero: index + 1,
          dateEcheance: new Date(
            now.getFullYear(),
            now.getMonth() + index,
            now.getDate(),
          ),
          montantPrevu: baseMontant + (index < remainder ? 1 : 0),
          statut: index === 0 ? 'en_attente' : 'planifiee',
        })),
      });
    }

    return this.findOne(dossier.id, user);
  }

  async createReservation(id: string, dto: CreateReservationDto, user: MandatUser) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const dossier = await transaction.dossierVente.findFirst({
            where: { id, ...this.ownershipFilter(user) },
            select: { id: true, terrainId: true, prixVente: true, statut: true },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          if (!dossier.terrainId)
            throw new BadRequestException(
              'Un terrain est requis pour réserver',
            );
          if (['solde', 'annule'].includes(dossier.statut)) {
            throw new ConflictException(
              'Ce dossier ne peut plus être réservé',
            );
          }
          if (
            dossier.prixVente !== null &&
            dto.montantAcompte > Number(dossier.prixVente)
          ) {
            throw new BadRequestException(
              'L’acompte ne peut pas dépasser le prix de vente',
            );
          }
          const active = await transaction.reservation.findFirst({
            where: {
              dossierVente: { terrainId: dossier.terrainId },
              statut: { in: ACTIVE_RESERVATION_STATUSES },
              dateExpiration: { gt: new Date() },
            },
            select: { id: true },
          });
          if (active)
            throw new ConflictException(
              'Une réservation active existe déjà pour ce terrain',
            );

          const dureeBlocage = dto.dureeBlocageJours ?? (await this.getDefaultEcheanceCount());
          const dateExpiration = new Date();
          dateExpiration.setDate(
            dateExpiration.getDate() + dureeBlocage,
          );

          const reservation = await transaction.reservation.create({
            data: {
              dossierVenteId: id,
              montantAcompte: dto.montantAcompte,
              dureeBlocageJours: dureeBlocage,
              dateExpiration,
              conditionsAnnulation: dto.conditionsAnnulation,
              reference: `RES-${randomUUID().slice(0, 8).toUpperCase()}`,
              createdById: user.id,
            },
          });

          if (dto.montantAcompte > 0) {
            await transaction.paiement.create({
              data: {
                dossierVenteId: id,
                montant: dto.montantAcompte,
                mode: 'acompte',
                reference: reservation.reference,
                statut: 'valide',
                recordedById: user.id,
                notes: 'Acompte de réservation',
              },
            });
          }

          await transaction.dossierVente.update({
            where: { id },
            data: { statut: 'reserve' },
          });

          if (dossier.terrainId) {
            await transaction.terrain.updateMany({
              where: { id: dossier.terrainId, statutCommercial: 'Disponible' },
              data: { statutCommercial: 'Réservé' },
            });
          }

          return reservation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La réservation est en conflit avec une autre opération',
        );
      }
      throw error;
    }
  }

  async createPaiement(id: string, dto: CreatePaiementDto, user: MandatUser) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.ensureAccessible(id, user);
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: { id: true, prixVente: true, statut: true },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          if (['solde', 'annule'].includes(dossier.statut)) {
            throw new ConflictException(
              'Un dossier soldé ou annulé ne peut plus recevoir de paiement.',
            );
          }
          const allowedModes = await this.getAllowedPaymentModes();
          if (!allowedModes.includes(dto.mode)) {
            throw new BadRequestException(
              `Mode de paiement invalide. Modes autorisés : ${allowedModes.join(', ')}`,
            );
          }
          const total = await transaction.paiement.aggregate({
            where: { dossierVenteId: id, statut: 'valide' },
            _sum: { montant: true },
          });
          const paidBefore = Number(total._sum.montant ?? 0);
          if (
            dossier.prixVente !== null &&
            paidBefore + dto.montant > Number(dossier.prixVente)
          ) {
            throw new BadRequestException(
              'Le total des paiements dépasserait le prix de vente',
            );
          }
          const payment = await transaction.paiement.create({
            data: {
              dossierVenteId: id,
              montant: dto.montant,
              mode: dto.mode,
              datePaiement: dto.datePaiement
                ? new Date(dto.datePaiement)
                : undefined,
              reference: dto.reference,
              justificatifUrl: dto.justificatifUrl,
              notes: dto.notes,
              statut: 'en_attente',
              recordedById: user.id,
            },
          });
          return {
            payment,
            montantPaye: paidBefore,
            soldeRestant:
              dossier.prixVente === null
                ? null
                : Number(dossier.prixVente) - paidBefore,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Le paiement est en conflit avec une autre opération',
        );
      }
      throw error;
    }
  }

  async validatePaiement(id: string, paymentId: string, user: MandatUser) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.ensureAccessible(id, user);
          const payment = await transaction.paiement.findFirst({
            where: { id: paymentId, dossierVenteId: id, statut: 'en_attente' },
          });
          if (!payment)
            throw new NotFoundException('Paiement en attente introuvable');
          const dossier = await transaction.dossierVente.findUnique({
            where: { id },
            select: { prixVente: true, statut: true, terrainId: true },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          const total = await transaction.paiement.aggregate({
            where: { dossierVenteId: id, statut: 'valide' },
            _sum: { montant: true },
          });
          const paidAfter =
            Number(total._sum.montant ?? 0) + Number(payment.montant);
          if (
            dossier.prixVente !== null &&
            paidAfter > Number(dossier.prixVente)
          ) {
            throw new BadRequestException(
              'La validation dépasserait le prix de vente',
            );
          }
          const validated = await transaction.paiement.update({
            where: { id: paymentId },
            data: { statut: 'valide' },
          });
          await this.applyPaymentToEcheances(
            transaction,
            id,
            Number(payment.montant),
          );

          const newStatut =
            dossier.prixVente !== null &&
            paidAfter >= Number(dossier.prixVente)
              ? 'solde'
              : 'paiement_partiel';

          const allowedTransitions = await this.getAllowedTransitions();
          if (!allowedTransitions[dossier.statut]?.includes(newStatut)) {
            throw new ConflictException(
              `Transition impossible : ${dossier.statut} vers ${newStatut}`,
            );
          }

          await transaction.dossierVente.update({
            where: { id },
            data: { statut: newStatut },
          });

          if (newStatut === 'solde' && dossier.terrainId) {
            await transaction.terrain.updateMany({
              where: { id: dossier.terrainId, statutCommercial: { in: ['Réservé', 'Disponible'] } },
              data: { statutCommercial: 'Vendu' },
            });
            await transaction.dossierVente.update({
              where: { id },
              data: { dateVente: new Date() },
            });
          }

          return {
            payment: validated,
            montantPaye: paidAfter,
            soldeRestant:
              dossier.prixVente === null
                ? null
                : Number(dossier.prixVente) - paidAfter,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La validation du paiement est en conflit avec une autre opération',
        );
      }
      throw error;
    }
  }

  async createCommission(id: string, dto: CreateCommissionDto, user: MandatUser) {
    await this.ensureAccessible(id, user);
    const [dossier, commercial, rule] = await Promise.all([
      this.prisma.dossierVente.findUnique({
        where: { id },
        select: { id: true, prixVente: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.commercialId },
        select: {
          id: true,
          isActive: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      }),
      this.getCommissionRule(dto.regleId),
    ]);
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
    if (!commercial || !commercial.isActive)
      throw new NotFoundException('Commercial actif introuvable');
    if (
      !commercial.roles.some(({ role }) =>
        ['commercial', 'responsable_commercial', 'manager'].includes(role.name),
      )
    ) {
      throw new BadRequestException(
        'Le bénéficiaire doit avoir un rôle commercial',
      );
    }
    if (rule.taux !== undefined && rule.montantFixe !== undefined) {
      throw new BadRequestException(
        'Choisissez un taux ou un montant fixe, pas les deux',
      );
    }
    if (rule.taux === undefined && rule.montantFixe === undefined) {
      throw new BadRequestException(
        'Un taux ou un montant fixe est obligatoire',
      );
    }
    if (rule.taux !== undefined && rule.taux > 100) {
      throw new BadRequestException(
        'Le taux de commission ne peut pas dépasser 100 %',
      );
    }

    const prixVente = Number(dossier.prixVente ?? 0);
    const baseCommission =
      rule.montantFixe ?? (prixVente * (rule.taux ?? 0)) / 100;
    const montantEstime =
      rule.palier !== undefined && prixVente >= Number(rule.palier)
        ? baseCommission + Number(rule.bonus ?? 0)
        : baseCommission;

    const commission = await this.prisma.commissionVente.create({
      data: {
        dossierVenteId: id,
        commercialId: dto.commercialId,
        typeRegle: rule.typeRegle,
        taux: rule.taux,
        montantFixe: rule.montantFixe,
        montantEstime,
        bonus: rule.bonus,
        palier: rule.palier,
      },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    await this.prisma.dossierVente.update({
      where: { id },
      data: { commissionEstimee: { increment: montantEstime } },
    });
    return commission;
  }

  async validateCommission(id: string, commissionId: string, user: MandatUser) {
    await this.ensureAccessible(id, user);
    const commission = await this.prisma.commissionVente.findFirst({
      where: { id: commissionId, dossierVenteId: id },
    });
    if (!commission)
      throw new NotFoundException('Commission de vente introuvable');
    if (commission.statut !== 'estimee') {
      throw new ConflictException('Cette commission a déjà été traitée');
    }
    return this.prisma.commissionVente.update({
      where: { id: commissionId },
      data: { statut: 'validee', montantValide: commission.montantEstime },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async payCommission(id: string, commissionId: string, user: MandatUser) {
    await this.ensureAccessible(id, user);
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: { statut: true },
    });
    if (!dossier || dossier.statut !== 'solde') {
      throw new ConflictException(
        'Une commission ne peut être payée que pour une vente soldée.',
      );
    }
    const commission = await this.prisma.commissionVente.findFirst({
      where: { id: commissionId, dossierVenteId: id },
    });
    if (!commission)
      throw new NotFoundException('Commission de vente introuvable');
    if (commission.statut !== 'validee' || commission.montantValide === null) {
      throw new ConflictException(
        'La commission doit être validée avant paiement',
      );
    }
    return this.prisma.commissionVente.update({
      where: { id: commissionId },
      data: { statut: 'payee', montantPaye: commission.montantValide },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateVenteStatusDto, user: MandatUser) {
    await this.ensureAccessible(id, user);
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        prixVente: true,
        terrainId: true,
        reservations: {
          select: {
            id: true,
            statut: true,
            dateExpiration: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        paiements: {
          where: { statut: 'valide' },
          select: { montant: true },
        },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');

    const allowedTransitions = await this.getAllowedTransitions();
    if (
      dossier.statut !== dto.statut &&
      !allowedTransitions[dossier.statut]?.includes(dto.statut)
    ) {
      throw new ConflictException(
        `Transition impossible : ${dossier.statut} vers ${dto.statut}`,
      );
    }

    const totalPaye = dossier.paiements.reduce(
      (sum, payment) => sum + Number(payment.montant ?? 0),
      0,
    );
    const prixVente = Number(dossier.prixVente ?? 0);

    if (dto.statut === 'solde' && prixVente > 0 && totalPaye < prixVente) {
      throw new ConflictException(
        'Le dossier ne peut pas être placé en soldé sans paiement total validé.',
      );
    }

    if (
      dto.statut === 'reserve' &&
      (!dossier.reservations.length ||
        !ACTIVE_RESERVATION_STATUSES.includes(dossier.reservations[0].statut) ||
        dossier.reservations[0].dateExpiration <= new Date())
    ) {
      throw new ConflictException(
        'Une réservation valide est requise avant de passer le dossier en réservé.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.dossierVente.update({
        where: { id },
        data: { statut: dto.statut },
      });

      if (dto.statut === 'solde' && dossier.terrainId) {
        await transaction.terrain.updateMany({
          where: { id: dossier.terrainId },
          data: { statutCommercial: 'Vendu' },
        });
        await transaction.dossierVente.update({
          where: { id },
          data: { dateVente: new Date() },
        });
      }

      if (dto.statut === 'annule') {
        if (dossier.reservations.length) {
          await transaction.reservation.updateMany({
            where: { id: dossier.reservations[0].id, statut: { in: ['active', 'prolongee'] } },
            data: { statut: 'annulee' },
          });
        }
        if (dossier.terrainId) {
          await transaction.terrain.updateMany({
            where: { id: dossier.terrainId, statutCommercial: 'Réservé' },
            data: { statutCommercial: 'Disponible' },
          });
        }
      }

      return updated;
    });
  }

  async addDocument(
    id: string,
    dto: CreateDocumentVenteDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
    user: MandatUser,
    isPublic = false,
  ) {
    await this.ensureAccessible(id, user);
    validateUploadedAsset(file as Express.Multer.File, 'document');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.size > 10 * 1024 * 1024)
      throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    if (!allowedMimeTypes.has(file.mimetype))
      throw new BadRequestException('Type de fichier non autorisé');
    const allowedDocumentTypes = await this.getAllowedDocumentTypes();
    if (!allowedDocumentTypes.includes(dto.type))
      throw new BadRequestException('Type de document invalide');
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    const uploaded = await this.cloudinary.upload(
      file,
      `ventes/${id}`,
      false,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
    return this.prisma.documentVente.create({
      data: {
        dossierVenteId: id,
        type: dto.type,
        title: dto.title,
        isPublic,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
    });
  }

  async generateDocument(
    id: string,
    dto: CreateDocumentVenteDto,
    user: MandatUser,
    isPublic = false,
  ) {
    await this.ensureAccessible(id, user);
    const allowedDocumentTypes = await this.getAllowedDocumentTypes();
    if (!allowedDocumentTypes.includes(dto.type))
      throw new BadRequestException('Type de document invalide');

    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: {
        id: true,
        referenceInterne: true,
        prixVente: true,
        prospect: { select: { nom: true, prenom: true, email: true } },
        terrain: { select: { nom: true, referenceInterne: true } },
        reservations: { orderBy: { createdAt: 'desc' }, take: 1 },
        paiements: { orderBy: { datePaiement: 'desc' }, take: 5 },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');

    const textContent = this.buildGeneratedDocumentText(dto.type, dossier);
    const buffer = this.buildValidPdf(textContent);
    const file = {
      buffer,
      mimetype: 'application/pdf',
      originalname: `${dto.type}.pdf`,
      size: buffer.length,
    } as Express.Multer.File;

    const uploaded = await this.cloudinary.upload(
      file,
      `ventes/${id}/documents`,
      false,
    );
    return this.prisma.documentVente.create({
      data: {
        dossierVenteId: id,
        type: dto.type,
        title: dto.title ?? this.defaultDocumentTitle(dto.type),
        isGenerated: true,
        isPublic,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
    });
  }

  private buildValidPdf(text: string): Buffer {
    const lines = text.split('\n');
    const escapedLines = lines.map((line) =>
      line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
    );

    const contentLines = escapedLines.flatMap((line) => [
      `BT`,
      `/F1 12 Tf`,
      `50 760 Td`,
      `(${line}) Tj`,
      `0 -18 Td`,
      `ET`,
    ]);

    const contentStream = contentLines.join('\n');
    const streamBytes = Buffer.byteLength(contentStream, 'utf8');

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      `<< /Length ${streamBytes} >>\nstream\n${contentStream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    const pdfParts: Buffer[] = [Buffer.from('%PDF-1.4\n')];
    const offsets: number[] = [0];
    let currentOffset = Buffer.byteLength('%PDF-1.4\n');

    for (let index = 0; index < objects.length; index++) {
      const objectText = `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
      offsets.push(currentOffset);
      pdfParts.push(Buffer.from(objectText, 'utf8'));
      currentOffset += Buffer.byteLength(objectText, 'utf8');
    }

    const xrefOffset = currentOffset;
    const xrefEntries = ['0000000000 65535 f \n'];
    for (let index = 1; index < offsets.length; index++) {
      xrefEntries.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
    }

    pdfParts.push(
      Buffer.from(
        `xref\n0 ${objects.length + 1}\n${xrefEntries.join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
        'utf8',
      ),
    );

    return Buffer.concat(pdfParts);
  }

  async removeDocument(id: string, documentId: string, user: MandatUser) {
    await this.ensureAccessible(id, user);
    const document = await this.prisma.documentVente.findFirst({
      where: { id: documentId, dossierVenteId: id },
    });
    if (!document) throw new NotFoundException('Document de vente introuvable');
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      false,
    );
    await this.prisma.documentVente.delete({ where: { id: documentId } });
  }

  private buildGeneratedDocumentText(
    type: string,
    dossier: {
      referenceInterne: string | null;
      prixVente: number | string | Prisma.Decimal | null;
      prospect: {
        nom: string | null;
        prenom: string | null;
        email: string | null;
      } | null;
      terrain: { nom: string | null; referenceInterne: string | null } | null;
      reservations: Array<{
        reference?: string | null;
        montantAcompte?: number | string | Prisma.Decimal | null;
      }>;
      paiements: Array<{
        montant?: number | string | Prisma.Decimal | null;
        reference?: string | null;
        mode?: string | null;
      }>;
    },
  ): string {
    const prix = Number(dossier.prixVente ?? 0);
    const montantAcompte = dossier.reservations[0]
      ? Number(dossier.reservations[0].montantAcompte ?? 0)
      : 0;
    const client =
      [dossier.prospect?.prenom, dossier.prospect?.nom]
        .filter(Boolean)
        .join(' ') || 'Client non renseigné';
    const terrainNom = dossier.terrain?.nom ?? 'Terrain non renseigné';
    const documentTypeLabel = this.defaultDocumentTitle(type);
    const paiementText = dossier.paiements.length
      ? dossier.paiements
          .map(
            (p) =>
              `${p.reference ?? 'Paiement'} - ${Number(p.montant ?? 0)} FCFA (${p.mode ?? 'N/A'})`,
          )
          .join('\n')
      : 'Aucun paiement enregistré';

    return [
      `MTM Immobilier`,
      documentTypeLabel,
      `Dossier : ${dossier.referenceInterne ?? 'N/A'}`,
      `Client : ${client}`,
      `Email : ${dossier.prospect?.email ?? 'N/A'}`,
      `Terrain : ${terrainNom} (${dossier.terrain?.referenceInterne ?? 'N/A'})`,
      `Prix de vente : ${prix} FCFA`,
      `Montant d’acompte : ${montantAcompte} FCFA`,
      `Historique paiements :`,
      paiementText,
    ].join('\n');
  }

  private defaultDocumentTitle(type: string): string {
    const titles: Record<string, string> = {
      bon_reservation: 'Bon de réservation',
      recu: 'Reçu',
      facture: 'Facture',
      contrat: 'Contrat de vente',
      etat_paiement: 'État de paiement',
      justificatif: 'Justificatif',
      autre: 'Document de vente',
    };
    return titles[type] ?? 'Document de vente';
  }

  private async ensureExists(id: string): Promise<void> {
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
  }

  private async applyPaymentToEcheances(
    transaction: Prisma.TransactionClient,
    dossierVenteId: string,
    montant: number,
  ): Promise<void> {
    let montantRestant = montant;
    const echeances = await transaction.echeancePaiement.findMany({
      where: { dossierVenteId },
      orderBy: { numero: 'asc' },
    });

    for (const echeance of echeances) {
      if (montantRestant <= 0) break;
      const restantEcheance =
        Number(echeance.montantPrevu) - Number(echeance.montantPaye);
      if (restantEcheance <= 0) continue;
      const montantAffecte = Math.min(restantEcheance, montantRestant);
      const montantPaye = Number(echeance.montantPaye) + montantAffecte;
      await transaction.echeancePaiement.update({
        where: { id: echeance.id },
        data: {
          montantPaye,
          statut:
            montantPaye >= Number(echeance.montantPrevu) ? 'payee' : 'partielle',
        },
      });
      montantRestant -= montantAffecte;
    }
  }

  private withFinancialSummary<
    T extends {
      prixVente: unknown;
      commissionEstimee?: unknown;
      paiements: Array<{ montant: unknown; statut: string }>;
    },
  >(dossier: T, user: MandatUser) {
    const canViewFinancials = this.canViewFinancials(user);
    const montantPaye = dossier.paiements
      .filter((payment) => payment.statut === 'valide')
      .reduce((sum, payment) => sum + Number(payment.montant), 0);
    const prixVente =
      dossier.prixVente === null ? null : Number(dossier.prixVente);
    const commissionEstimee = canViewFinancials
      ? Number(dossier.commissionEstimee ?? 0)
      : undefined;

    return {
      ...dossier,
      montantPaye: canViewFinancials ? montantPaye : undefined,
      soldeRestant: canViewFinancials
        ? prixVente === null
          ? null
          : prixVente - montantPaye
        : undefined,
      commissionEstimee,
    };
  }

  async getEcheances(
    id: string,
    user: MandatUser,
  ): Promise<unknown[]> {
    await this.ensureAccessible(id, user);
    return this.prisma.echeancePaiement.findMany({
      where: { dossierVenteId: id },
      orderBy: { numero: 'asc' },
    });
  }

  async getDashboardStats(user: MandatUser) {
    const where = this.ownershipFilter(user);
    const canViewFinancials = this.canViewFinancials(user);
    const [
      totalDossiers,
      dossiersParStatut,
      totalPaiementsValides,
      totalCommissionsEstimees,
      totalCommissionsValidees,
      totalCommissionsPayees,
      ventesRecentes,
    ] = await Promise.all([
      this.prisma.dossierVente.count({ where }),
      this.prisma.dossierVente.groupBy({
        by: ['statut'],
        where,
        _count: { statut: true },
      }),
      this.prisma.paiement.aggregate({
        where: { dossierVente: where, statut: 'valide' },
        _sum: { montant: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'estimee' },
        _sum: { montantEstime: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'validee' },
        _sum: { montantValide: true },
      }),
      this.prisma.commissionVente.aggregate({
        where: { dossierVente: where, statut: 'payee' },
        _sum: { montantPaye: true },
      }),
      this.prisma.dossierVente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceInterne: true,
          statut: true,
          prixVente: true,
          createdAt: true,
          prospect: { select: { nom: true, prenom: true } },
          terrain: { select: { nom: true } },
        },
      }),
    ]);

    return {
      totalDossiers,
      dossiersParStatut: dossiersParStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statut] = item._count.statut;
          return acc;
        },
        {},
      ),
      totalPaiementsValides: canViewFinancials
        ? Number(totalPaiementsValides._sum.montant ?? 0)
        : 0,
      totalCommissionsEstimees: canViewFinancials
        ? Number(totalCommissionsEstimees._sum.montantEstime ?? 0)
        : 0,
      totalCommissionsValidees: canViewFinancials
        ? Number(totalCommissionsValidees._sum.montantValide ?? 0)
        : 0,
      totalCommissionsPayees: canViewFinancials
        ? Number(totalCommissionsPayees._sum.montantPaye ?? 0)
        : 0,
      ventesRecentes,
    };
  }

  async getCommercialPerformance(commercialId: string, user: MandatUser) {
    if (!this.hasGlobalScope(user.roles) && commercialId !== user.id) {
      throw new ForbiddenException(
        "Accès refusé aux performances d'un autre commercial",
      );
    }
    const canViewFinancials = this.canViewFinancials(user);
    const where = { commercialResponsableId: commercialId };
    const [totalDossiers, dossiersParStatut, totalPaiements, totalCommissions] =
      await Promise.all([
        this.prisma.dossierVente.count({ where }),
        this.prisma.dossierVente.groupBy({
          by: ['statut'],
          where,
          _count: { statut: true },
        }),
        this.prisma.paiement.aggregate({
          where: { dossierVente: where, statut: 'valide' },
          _sum: { montant: true },
        }),
        this.prisma.commissionVente.aggregate({
          where: { commercialId, statut: 'payee' },
          _sum: { montantPaye: true },
        }),
      ]);

    return {
      commercialId,
      totalDossiers,
      dossiersParStatut: dossiersParStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statut] = item._count.statut;
          return acc;
        },
        {},
      ),
      totalPaiements: canViewFinancials ? Number(totalPaiements._sum.montant ?? 0) : 0,
      totalCommissionsPayees: canViewFinancials
        ? Number(totalCommissions._sum.montantPaye ?? 0)
        : 0,
    };
  }

  async searchDocuments(
    query: {
      dossierVenteId?: string;
      prospectId?: string;
      terrainId?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    user: MandatUser,
  ) {
    const where: Prisma.DocumentVenteWhereInput = {};

    if (query.dossierVenteId) {
      const accessible = await this.prisma.dossierVente.findFirst({
        where: { id: query.dossierVenteId, ...this.ownershipFilter(user) },
        select: { id: true },
      });
      if (!accessible)
        throw new ForbiddenException('Accès refusé à ce dossier');
      where.dossierVenteId = query.dossierVenteId;
    } else if (query.prospectId) {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: { prospectId: query.prospectId, ...this.ownershipFilter(user) },
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    } else if (query.terrainId) {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: { terrainId: query.terrainId, ...this.ownershipFilter(user) },
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    } else {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: this.ownershipFilter(user),
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    }

    if (query.type) where.type = query.type;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const documents = await this.prisma.documentVente.findMany({
      where,
      include: {
        dossierVente: {
          select: { id: true, referenceInterne: true, prospectId: true },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return documents.map(({ storageKey, resourceType, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, resourceType, false),
    }));
  }
}
