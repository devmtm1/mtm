import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  MandatsAccessService,
  type MandatUser,
} from './mandats-access.service';
import { DEFAULT_MANDAT_OPTIONS } from './mandats-defaults';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateMandatDto } from './dto/create-mandat.dto';
import { UpdateMandatDto } from './dto/update-mandat.dto';
import { QueryMandatDto } from './dto/query-mandat.dto';

const mandatInclude = {
  proprietaire: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  lots: {
    include: {
      terrain: {
        select: {
          id: true,
          referenceInterne: true,
          nom: true,
          commune: true,
          region: true,
          superficie: true,
          prixPublic: true,
          statutCommercial: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { lots: true, documents: true } },
} as const;

/**
 * Fiche mandat (J1.4, section 10 CDC) : recherche dans le périmètre,
 * consultation, création, mise à jour, suppression, référentiels. Lots,
 * documents, finances et alertes d'échéance sont portés par les services
 * voisins du module.
 */
@Injectable()
export class MandatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
    private readonly access: MandatsAccessService,
  ) {}

  async findAll(query: QueryMandatDto, user: MandatUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();

    const where: Prisma.MandatWhereInput = {
      ...this.access.ownershipFilter(user),
      ...(search
        ? {
            OR: [
              {
                referenceInterne: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                proprietaire: {
                  lastName: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                proprietaire: {
                  firstName: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(query.commercialResponsableId
        ? { commercialResponsableId: query.commercialResponsableId }
        : {}),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.dateDebutMin || query.dateDebutMax
        ? {
            dateDebut: {
              ...(query.dateDebutMin
                ? { gte: new Date(query.dateDebutMin) }
                : {}),
              ...(query.dateDebutMax
                ? { lte: new Date(query.dateDebutMax) }
                : {}),
            },
          }
        : {}),
      ...(query.dateFinMin || query.dateFinMax
        ? {
            dateFin: {
              ...(query.dateFinMin ? { gte: new Date(query.dateFinMin) } : {}),
              ...(query.dateFinMax ? { lte: new Date(query.dateFinMax) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.mandat.findMany({
        where,
        include: mandatInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mandat.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toInternal(item)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, user: MandatUser) {
    const mandat = await this.prisma.mandat.findFirst({
      where: { id, ...this.access.ownershipFilter(user) },
      include: mandatInclude,
    });
    if (!mandat) throw new NotFoundException('Mandat introuvable');
    return this.toInternal(mandat);
  }

  async getOptions() {
    const [typeMandat, statut, statutLot] = await Promise.all([
      this.settings.getStringList(
        'mandats.typeMandat',
        DEFAULT_MANDAT_OPTIONS.typeMandat,
      ),
      this.settings.getStringList(
        'mandats.statut',
        DEFAULT_MANDAT_OPTIONS.statut,
      ),
      this.settings.getStringList(
        'mandats.statutLot',
        DEFAULT_MANDAT_OPTIONS.statutLot,
      ),
    ]);
    return { typeMandat, statut, statutLot };
  }

  async create(dto: CreateMandatDto, user: MandatUser) {
    const existing = await this.prisma.mandat.findUnique({
      where: { referenceInterne: dto.referenceInterne },
    });
    if (existing)
      throw new ConflictException('Une référence de mandat existe déjà');

    this.validateDateRange(dto.dateDebut, dto.dateFin);

    await this.validateStatus(dto.statut);
    if (
      dto.commercialResponsableId &&
      !this.access.hasGlobalScope(user.roles) &&
      dto.commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas affecter ce mandat à un autre commercial',
      );
    }
    const mandat = await this.prisma.mandat.create({
      data: {
        referenceInterne: dto.referenceInterne,
        proprietaireId: dto.proprietaireId,
        commercialResponsableId: dto.commercialResponsableId ?? user.id,
        typeMandat: dto.typeMandat,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        exclusivite: dto.exclusivite ?? false,
        prixConditions: dto.prixConditions,
        commissions: dto.commissions,
        clauses: dto.clauses,
        restrictionsContractuelles: dto.restrictionsContractuelles,
        objectifsCommercialisation: dto.objectifsCommercialisation,
        alerteEcheanceJours: dto.alerteEcheanceJours ?? 30,
        statut: dto.statut,
      } as Prisma.MandatUncheckedCreateInput,
      include: mandatInclude,
    });
    return this.toInternal(mandat);
  }

  async update(id: string, dto: UpdateMandatDto, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    await this.validateStatus(dto.statut);
    if (dto.dateDebut && dto.dateFin) {
      this.validateDateRange(dto.dateDebut, dto.dateFin);
    }
    const data: Prisma.MandatUncheckedUpdateInput = {
      ...(dto.referenceInterne && { referenceInterne: dto.referenceInterne }),
      ...(dto.proprietaireId && { proprietaireId: dto.proprietaireId }),
      ...(dto.commercialResponsableId !== undefined && {
        commercialResponsableId: dto.commercialResponsableId,
      }),
      ...(dto.typeMandat && { typeMandat: dto.typeMandat }),
      ...(dto.dateDebut && { dateDebut: new Date(dto.dateDebut) }),
      ...(dto.dateFin && { dateFin: new Date(dto.dateFin) }),
      ...(dto.exclusivite !== undefined && { exclusivite: dto.exclusivite }),
      ...(dto.prixConditions !== undefined && {
        prixConditions: dto.prixConditions,
      }),
      ...(dto.commissions !== undefined && { commissions: dto.commissions }),
      ...(dto.clauses !== undefined && { clauses: dto.clauses }),
      ...(dto.restrictionsContractuelles !== undefined && {
        restrictionsContractuelles:
          dto.restrictionsContractuelles as Prisma.InputJsonValue,
      }),
      ...(dto.objectifsCommercialisation !== undefined && {
        objectifsCommercialisation: dto.objectifsCommercialisation,
      }),
      ...(dto.alerteEcheanceJours !== undefined && {
        alerteEcheanceJours: dto.alerteEcheanceJours,
      }),
      ...(dto.statut && { statut: dto.statut }),
    };
    if (
      dto.commercialResponsableId &&
      !this.access.hasGlobalScope(user.roles) &&
      dto.commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas affecter ce mandat à un autre commercial',
      );
    }
    const mandat = await this.prisma.mandat.update({
      where: { id },
      data,
      include: mandatInclude,
    });
    return this.toInternal(mandat);
  }

  async remove(id: string, user: MandatUser): Promise<void> {
    await this.access.ensureAccessible(id, user);
    await this.prisma.mandat.delete({ where: { id } });
  }

  private validateDateRange(dateDebut: string, dateFin: string): void {
    if (new Date(dateFin) < new Date(dateDebut)) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début',
      );
    }
  }

  private validateStatus(statut?: string): Promise<void> {
    return this.settings.assertInList(
      'mandats.statut',
      DEFAULT_MANDAT_OPTIONS.statut,
      statut,
      'Statut de mandat invalide',
    );
  }
  private toInternal<T extends Record<string, unknown>>(mandat: T): T {
    const value: T & {
      lots?: Array<Record<string, unknown>>;
      documents?: Array<Record<string, unknown>>;
    } = mandat;
    return {
      ...mandat,
      lots: value.lots?.map((lot) => ({
        ...lot,
        terrain: {
          ...(lot.terrain as Record<string, unknown>),
        },
      })),
      documents: value.documents?.map((doc) => ({
        ...doc,
        secureUrl: this.cloudinary.url(
          String(doc.storageKey),
          typeof doc.resourceType === 'string' ? doc.resourceType : 'raw',
          Boolean(doc.isPublic),
        ),
      })),
    };
  }
}
