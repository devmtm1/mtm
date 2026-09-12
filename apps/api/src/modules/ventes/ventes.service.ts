import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { UpdateVenteStatusDto } from './dto/update-vente-status.dto';
import { InternalNotificationService } from '../../common/mail/internal-notification.service';
import { PrismaService } from '../../database/prisma.service';
import { VentesWorkflowService } from './ventes-workflow.service';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateDossierVenteDto } from './dto/create-dossier-vente.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreatePublicReservationRequestDto } from './dto/create-public-reservation-request.dto';
import { ConvertReservationRequestDto } from './dto/convert-reservation-request.dto';

const ACTIVE_RESERVATION_STATUSES = ['active', 'prolongee'];

/**
 * Cycle de vie d'un dossier de vente (J1.6, sections 11-12 CDC) : création,
 * consultation dans le périmètre de l'utilisateur, demandes et réservations,
 * transitions de statut. Paiements, commissions, documents, espace client et
 * reporting sont portés par les services voisins du module.
 */
@Injectable()
export class VentesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: VentesAccessService,
    private readonly notifications: InternalNotificationService,
    private readonly workflow: VentesWorkflowService,
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

  private withFinancialSummary<
    T extends {
      prixVente: unknown;
      commissionEstimee?: unknown;
      paiements: Array<{ montant: unknown; statut: string }>;
    },
  >(dossier: T, user: MandatUser) {
    const canViewFinancials = this.access.canViewFinancials(user);
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

  async findAll(user: MandatUser) {
    const where = this.access.ownershipFilter(user);
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
        paiements: this.access.canViewFinancials(user)
          ? { orderBy: { datePaiement: 'desc' } }
          : false,
        _count: { select: { documents: true, commissions: true } },
      },
    });

    return dossiers.map((dossier) => {
      const summary = this.withFinancialSummary(dossier, user);
      if (!this.access.canViewFinancials(user)) {
        const { paiements, ...rest } = summary;
        return rest;
      }
      return summary;
    });
  }

  async findReservationRequests(user: MandatUser) {
    return this.prisma.reservationRequest.findMany({
      where: this.access.hasGlobalScope(user.roles)
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
        terrain: {
          select: {
            id: true,
            statutCommercial: true,
            commercialResponsableId: true,
          },
        },
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
    if (
      !this.access.hasGlobalScope(user.roles) &&
      request.terrain.commercialResponsableId !== user.id
    ) {
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
      select: {
        id: true,
        nom: true,
        referenceInterne: true,
        statutCommercial: true,
      },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');
    // Liste blanche : seul un terrain explicitement « Disponible » accepte une
    // demande publique. Une liste noire laissait passer « Suspendu », « Brouillon »
    // et « Réservé », et testait un statut « Indisponible » qui n'existe pas.
    if (terrain.statutCommercial !== 'Disponible') {
      throw new ConflictException('Ce terrain n’est plus disponible');
    }
    const request = await this.prisma.reservationRequest.create({
      data: {
        terrainId: dto.terrainId,
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        message: dto.message,
      },
      select: { id: true, statut: true, createdAt: true },
    });

    // Une demande de réservation est l'acte le plus engageant du site public :
    // l'équipe doit en être avertie sans délai. Non bloquant.
    void this.notifications.notify(
      `Demande de réservation : ${terrain.referenceInterne} — ${terrain.nom}`,
      [
        `De : ${dto.nom} <${dto.email}>`,
        dto.telephone ? `Téléphone : ${dto.telephone}` : '',
        dto.message ? `\n${dto.message}\n` : '',
        'À convertir en dossier de vente depuis le back-office (Ventes / Demandes de réservation).',
      ],
    );

    return request;
  }

  async findOne(id: string, user?: MandatUser) {
    if (user) await this.access.ensureAccessible(id, user);
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            paysResidence: true,
            besoins: true,
            preferences: true,
          },
        },
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            parcelleMatricule: true,
            statutJuridique: true,
            typeDocumentFoncier: true,
            niveauVerification: true,
            region: true,
            commune: true,
            localisationDetail: true,
            latitude: true,
            longitude: true,
            superficie: true,
            uniteSuperficie: true,
            dimensions: true,
            prixPublic: true,
            statutCommercial: true,
            accesRoutier: true,
            eauDisponible: true,
            electriciteDisponible: true,
            voisinage: true,
            vocation: true,
            proximiteAxes: true,
            pointsInteret: true,
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
    const mappedDocuments = documents.map(
      ({ storageKey, resourceType, ...document }) => ({
        ...document,
        secureUrl: this.cloudinary.url(storageKey, resourceType, false),
      }),
    );

    const response: Record<string, unknown> = {
      ...base,
      documents: mappedDocuments,
    };

    if (this.access.canViewFinancials(effectiveUser)) {
      response.paiements = paiements;
      response.commissions = commissions;
    }

    return response;
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

    const allowedStatuses = await this.workflow.getAllowedSaleStatuses();
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
      const echeanceCount = await this.workflow.getDefaultEcheanceCount();
      const prixVenteNumber = Number(dossier.prixVente);
      const baseMontant = Math.floor(prixVenteNumber / echeanceCount);
      const remainder = prixVenteNumber - baseMontant * echeanceCount;
      const now = new Date();

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

  async createReservation(
    id: string,
    dto: CreateReservationDto,
    user: MandatUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const dossier = await transaction.dossierVente.findFirst({
            where: { id, ...this.access.ownershipFilter(user) },
            select: {
              id: true,
              terrainId: true,
              prixVente: true,
              statut: true,
            },
          });
          if (!dossier)
            throw new NotFoundException('Dossier de vente introuvable');
          if (!dossier.terrainId)
            throw new BadRequestException(
              'Un terrain est requis pour réserver',
            );
          if (['solde', 'annule'].includes(dossier.statut)) {
            throw new ConflictException('Ce dossier ne peut plus être réservé');
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

          const dureeBlocage =
            dto.dureeBlocageJours ??
            (await this.workflow.getDefaultReservationDays());
          const dateExpiration = new Date();
          dateExpiration.setDate(dateExpiration.getDate() + dureeBlocage);

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

  async updateStatus(id: string, dto: UpdateVenteStatusDto, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
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

    const allowedTransitions = await this.workflow.getAllowedTransitions();
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
            where: {
              id: dossier.reservations[0].id,
              statut: { in: ['active', 'prolongee'] },
            },
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
}
