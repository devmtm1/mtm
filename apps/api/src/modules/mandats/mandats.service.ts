import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CreateMandatDto } from './dto/create-mandat.dto';
import { UpdateMandatDto } from './dto/update-mandat.dto';
import { QueryMandatDto } from './dto/query-mandat.dto';
import { CreateMandatLotDto } from './dto/create-mandat-lot.dto';
import { UpdateMandatLotDto } from './dto/update-mandat-lot.dto';
import { CreateMandatDocumentDto } from './dto/create-mandat-document.dto';

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

const DEFAULT_MANDAT_OPTIONS = {
  typeMandat: ['Vente', 'Location', 'Gestion'],
  statut: ['Brouillon', 'Actif', 'Expiré', 'Résilié', 'Clôturé'],
  statutLot: ['Confie', 'Disponible', 'Réservé', 'Vendu'],
};

@Injectable()
export class MandatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(query: QueryMandatDto) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();

    const where: Prisma.MandatWhereInput = {
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

  async findOne(id: string) {
    const mandat = await this.prisma.mandat.findUnique({
      where: { id },
      include: mandatInclude,
    });
    if (!mandat) throw new NotFoundException('Mandat introuvable');
    return this.toInternal(mandat);
  }

  async getOptions() {
    const [typeMandat, statut, statutLot] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: 'mandats.typeMandat' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'mandats.statut' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'mandats.statutLot' },
      }),
    ]);

    return {
      typeMandat: this.asOptions(
        typeMandat?.value,
        DEFAULT_MANDAT_OPTIONS.typeMandat,
      ),
      statut: this.asOptions(statut?.value, DEFAULT_MANDAT_OPTIONS.statut),
      statutLot: this.asOptions(
        statutLot?.value,
        DEFAULT_MANDAT_OPTIONS.statutLot,
      ),
    };
  }

  async getStats() {
    const now = new Date();
    const [totalMandats, actifs, expirant30Jours, totalLots] =
      await Promise.all([
        this.prisma.mandat.count(),
        this.prisma.mandat.count({
          where: {
            statut: 'Actif',
            dateFin: { gte: now },
          },
        }),
        this.prisma.mandat.count({
          where: {
            statut: 'Actif',
            dateFin: {
              lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
              gte: now,
            },
          },
        }),
        this.prisma.mandatLot.count(),
      ]);

    const lotsByStatut = await this.prisma.mandatLot.groupBy({
      by: ['statutLot'],
      _count: { statutLot: true },
    });

    const financial = await this.computeGlobalFinancials();

    return {
      totalMandats,
      actifs,
      expirant30Jours,
      totalLots,
      lotsParStatut: lotsByStatut.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.statutLot] = item._count.statutLot;
          return acc;
        },
        {},
      ),
      financial,
    };
  }

  async getFinancialSummary(id: string) {
    await this.ensureExists(id);
    const mandat = await this.prisma.mandat.findUnique({
      where: { id },
      include: {
        lots: {
          include: {
            terrain: {
              select: { id: true, prixPublic: true, statutCommercial: true },
            },
          },
        },
      },
    });
    if (!mandat) throw new NotFoundException('Mandat introuvable');
    const summary = this.computeFinancials(mandat.lots);
    return { mandatId: id, ...summary };
  }

  private async computeGlobalFinancials() {
    const mandats = await this.prisma.mandat.findMany({
      include: {
        lots: {
          include: {
            terrain: { select: { prixPublic: true, statutCommercial: true } },
          },
        },
      },
    });

    let chiffreAffaires = 0;
    let commissions = 0;
    let reste = 0;

    for (const mandat of mandats) {
      const summary = this.computeFinancials(mandat.lots);
      chiffreAffaires += summary.chiffreAffaires;
      commissions += summary.commissionsEstimees;
      reste += summary.resteACommercialiser;
    }

    return {
      chiffreAffaires,
      commissionsEstimees: commissions,
      resteACommercialiser: reste,
    };
  }

  private computeFinancials(
    lots: Array<{
      terrain: {
        prixPublic: Prisma.Decimal | null;
        statutCommercial: string;
      } | null;
    }>,
  ) {
    let chiffreAffaires = 0;
    let resteACommercialiser = 0;

    for (const lot of lots) {
      const prix = Number(lot?.terrain?.prixPublic ?? 0);
      if (lot?.terrain?.statutCommercial === 'Vendu') {
        chiffreAffaires += prix;
      } else {
        resteACommercialiser += prix;
      }
    }

    return {
      chiffreAffaires,
      resteACommercialiser,
      commissionsEstimees: Math.round(chiffreAffaires * 0.05),
    };
  }

  async getExpirants(jours: number = 30) {
    const now = new Date();
    const dateLimite = new Date(now.getTime() + jours * 24 * 60 * 60 * 1000);
    return this.prisma.mandat.findMany({
      where: {
        statut: 'Actif',
        dateFin: {
          lte: dateLimite,
          gte: now,
        },
      },
      include: {
        proprietaire: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { lots: true } },
      },
      orderBy: { dateFin: 'asc' },
    });
  }

  async checkAlerts() {
    const alerts = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const mandats = await tx.mandat.findMany({
        where: {
          statut: 'Actif',
          dateFin: { gte: now },
        },
        include: {
          proprietaire: {
            select: { email: true, firstName: true, lastName: true },
          },
          commercialResponsable: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      });

      const alerts: Array<{
        mandatId: string;
        referenceInterne: string;
        joursRestants: number;
        destinataires: string[];
      }> = [];

      for (const mandat of mandats) {
        const joursRestants = Math.ceil(
          (mandat.dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (joursRestants <= (mandat.alerteEcheanceJours ?? 30)) {
          const destinataires: string[] = [];
          if (mandat.proprietaire?.email)
            destinataires.push(mandat.proprietaire.email);
          if (mandat.commercialResponsable?.email)
            destinataires.push(mandat.commercialResponsable.email);

          if (destinataires.length) {
            alerts.push({
              mandatId: mandat.id,
              referenceInterne: mandat.referenceInterne,
              joursRestants,
              destinataires,
            });
          }
        }
      }

      return alerts;
    });

    return {
      generatedAt: new Date().toISOString(),
      alerts,
    };
  }

  async create(dto: CreateMandatDto) {
    const existing = await this.prisma.mandat.findUnique({
      where: { referenceInterne: dto.referenceInterne },
    });
    if (existing)
      throw new ConflictException('Une référence de mandat existe déjà');

    await this.validateStatus(dto.statut);
    const mandat = await this.prisma.mandat.create({
      data: {
        referenceInterne: dto.referenceInterne,
        proprietaireId: dto.proprietaireId,
        commercialResponsableId: dto.commercialResponsableId,
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

  async update(id: string, dto: UpdateMandatDto) {
    await this.ensureExists(id);
    await this.validateStatus(dto.statut);
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
    const mandat = await this.prisma.mandat.update({
      where: { id },
      data,
      include: mandatInclude,
    });
    return this.toInternal(mandat);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.mandat.delete({ where: { id } });
  }

  async addLot(mandatId: string, dto: CreateMandatLotDto) {
    await this.ensureExists(mandatId);
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: dto.terrainId },
      select: { id: true },
    });
    if (!terrain) throw new NotFoundException('Terrain introuvable');

    const existing = await this.prisma.mandatLot.findFirst({
      where: { mandatId, terrainId: dto.terrainId },
    });
    if (existing)
      throw new ConflictException('Ce terrain est déjà rattaché à ce mandat');

    return this.prisma.mandatLot.create({
      data: {
        mandatId,
        terrainId: dto.terrainId,
        statutLot: dto.statutLot ?? 'Confie',
      },
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
    });
  }

  async updateLot(mandatId: string, lotId: string, dto: UpdateMandatLotDto) {
    await this.ensureExists(mandatId);
    const lot = await this.prisma.mandatLot.findFirst({
      where: { id: lotId, mandatId },
    });
    if (!lot) throw new NotFoundException('Lot introuvable dans ce mandat');

    return this.prisma.mandatLot.update({
      where: { id: lotId },
      data: dto,
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
    });
  }

  async removeLot(mandatId: string, lotId: string): Promise<void> {
    await this.ensureExists(mandatId);
    const lot = await this.prisma.mandatLot.findFirst({
      where: { id: lotId, mandatId },
    });
    if (!lot) throw new NotFoundException('Lot introuvable dans ce mandat');
    await this.prisma.mandatLot.delete({ where: { id: lotId } });
  }

  async addDocument(
    mandatId: string,
    dto: CreateMandatDocumentDto,
    file: Express.Multer.File,
  ) {
    await this.ensureExists(mandatId);
    this.validateFileSize(file);
    await this.validateDocumentType(dto.type);
    const uploaded = await this.cloudinary.upload(
      file,
      `mtm/mandats/${mandatId}/documents`,
      dto.isPublic ?? false,
    );
    return this.prisma.mandatDocument.create({
      data: {
        mandatId,
        type: dto.type,
        title: dto.title,
        isPublic: dto.isPublic ?? false,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  async removeDocument(mandatId: string, documentId: string): Promise<void> {
    await this.ensureExists(mandatId);
    const document = await this.prisma.mandatDocument.findFirst({
      where: { id: documentId, mandatId },
    });
    if (!document) return;
    await this.prisma.mandatDocument.delete({ where: { id: documentId } });
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      document.isPublic,
    );
  }

  async getHistory(mandatId: string) {
    await this.ensureExists(mandatId);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Mandat', entityId: mandatId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: { entityType: 'Mandat', entityId: mandatId },
      }),
    ]);
    return { items, total };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.mandat.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Mandat introuvable');
  }

  private async validateStatus(statut?: string): Promise<void> {
    if (!statut) return;
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'mandats.statut' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [...DEFAULT_MANDAT_OPTIONS.statut];
    if (!allowed.includes(statut)) {
      throw new BadRequestException('Statut de mandat invalide');
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
    }
  }

  private async validateDocumentType(type: string): Promise<void> {
    const configured = await this.prisma.systemSetting.findUnique({
      where: { key: 'mandats.documentTypes' },
    });
    const allowed: string[] = Array.isArray(configured?.value)
      ? (configured.value as unknown[]).filter(
          (item): item is string => typeof item === 'string',
        )
      : [
          'contrat',
          'avenant',
          'preuve_signature',
          'correspondance',
          'justificatif',
          'autre',
        ];
    if (!allowed.includes(type)) {
      throw new BadRequestException('Type de document invalide');
    }
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

  private asOptions(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : fallback;
  }
}
