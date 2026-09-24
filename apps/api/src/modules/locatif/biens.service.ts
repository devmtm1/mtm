import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  LocatifAccessService,
  LOCATIF_ROLES,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { CreateBienDto, QueryBienDto, UpdateBienDto } from './dto/bien.dto';

const bailActifInclude = {
  where: { statut: { in: ['actif', 'preavis'] } },
  take: 1,
  orderBy: { dateDebut: 'desc' as const },
  include: {
    locataire: {
      select: { id: true, firstName: true, lastName: true, phone: true },
    },
  },
} satisfies Prisma.BienLocatif$bauxArgs;

const bienListInclude = {
  proprietaire: { select: { id: true, firstName: true, lastName: true } },
  responsable: { select: { id: true, firstName: true, lastName: true } },
  baux: bailActifInclude,
} satisfies Prisma.BienLocatifInclude;

const bienInclude = {
  ...bienListInclude,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.BienLocatifInclude;

/**
 * Biens mis en location (J2.1, section 15 du cahier des charges).
 *
 * Le bien est l'actif qui reste ; le bail (module séparé) porte le
 * locataire, le loyer et les dates. Ce service ne gère que la fiche du
 * bien et son affectation à un responsable.
 */
@Injectable()
export class BiensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
  ) {}

  async findAll(query: QueryBienDto, user: LocatifUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });

    const where: Prisma.BienLocatifWhereInput = {
      ...this.access.ownershipFilter(user),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(query.responsableId ? { responsableId: query.responsableId } : {}),
      ...(search
        ? {
            OR: [
              { referenceInterne: contains(search) },
              { adresse: contains(search) },
              { commune: contains(search) },
              { proprietaire: { firstName: contains(search) } },
              { proprietaire: { lastName: contains(search) } },
            ],
          }
        : {}),
      ...this.vueFilter(query.vue),
    };

    const [items, total] = await Promise.all([
      this.prisma.bienLocatif.findMany({
        where,
        include: bienListInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bienLocatif.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * Vues rapides : ce qui est loué, disponible, sans porteur, en retard de
   * loyer ou en impayé prolongé.
   *
   * Le retard se lit sur les dates d'échéance, pas sur le statut stocké : la
   * liste et les statistiques restent justes même entre deux passages de la
   * tâche quotidienne.
   */
  private vueFilter(
    vue?: string,
    maintenant: Date = new Date(),
  ): Prisma.BienLocatifWhereInput {
    switch (vue) {
      case 'loue':
        return { statut: 'loue' };
      case 'disponible':
        return { statut: 'disponible' };
      case 'sans_responsable':
        return { responsableId: null };
      case 'loyers_en_retard':
        return {
          baux: {
            some: {
              statut: { in: ['actif', 'preavis'] },
              echeances: {
                some: {
                  dateEcheance: { lt: maintenant },
                  statut: { notIn: ['payee', 'annulee'] },
                },
              },
            },
          },
        };
      case 'impayes_prolonges':
        return {
          baux: {
            some: {
              statut: { in: ['actif', 'preavis'] },
              situationPaiement: 'impaye_prolonge',
            },
          },
        };
      default:
        return {};
    }
  }

  async findOne(id: string, user: LocatifUser) {
    await this.access.ensureBienAccessible(id, user);
    const bien = await this.prisma.bienLocatif.findUnique({
      where: { id },
      include: bienInclude,
    });
    if (!bien) throw new NotFoundException('Bien locatif introuvable');
    return bien;
  }

  async create(dto: CreateBienDto, user: LocatifUser) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id: dto.proprietaireId },
      select: { id: true },
    });
    if (!proprietaire)
      throw new BadRequestException('Propriétaire introuvable');
    await this.options.assertTypeBien(dto.type);
    const responsableId = await this.access.resolveResponsable(
      dto.responsableId,
      user,
    );

    const bien = await this.prisma.bienLocatif.create({
      data: {
        referenceInterne: await this.nextReference(),
        proprietaireId: dto.proprietaireId,
        type: dto.type,
        adresse: dto.adresse,
        commune: dto.commune,
        region: dto.region,
        superficie: dto.superficie,
        notes: dto.notes,
        responsableId,
        createdById: user.id,
      },
      include: bienInclude,
    });
    return bien;
  }

  async update(id: string, dto: UpdateBienDto, user: LocatifUser) {
    await this.access.ensureBienAccessible(id, user);
    await Promise.all([
      this.options.assertTypeBien(dto.type),
      this.options.assertStatutBien(dto.statut),
    ]);
    if (dto.proprietaireId) {
      const proprietaire = await this.prisma.proprietaire.findUnique({
        where: { id: dto.proprietaireId },
        select: { id: true },
      });
      if (!proprietaire)
        throw new BadRequestException('Propriétaire introuvable');
    }
    const responsableId =
      dto.responsableId === undefined
        ? undefined
        : await this.access.resolveResponsable(dto.responsableId, user);

    const bien = await this.prisma.bienLocatif.update({
      where: { id },
      data: {
        ...(dto.proprietaireId !== undefined
          ? { proprietaireId: dto.proprietaireId }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.adresse !== undefined ? { adresse: dto.adresse } : {}),
        ...(dto.commune !== undefined ? { commune: dto.commune } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.superficie !== undefined ? { superficie: dto.superficie } : {}),
        ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(responsableId !== undefined ? { responsableId } : {}),
      },
      include: bienInclude,
    });
    return bien;
  }

  async remove(id: string, user: LocatifUser) {
    await this.access.ensureBienAccessible(id, user);
    const baux = await this.prisma.bailLocatif.count({
      where: { bienLocatifId: id },
    });
    if (baux > 0) {
      throw new ConflictException(
        'Ce bien a un historique de baux : il ne peut pas être supprimé, seulement passé en indisponible',
      );
    }
    await this.prisma.bienLocatif.delete({ where: { id } });
  }

  /** Collaborateurs à qui confier un bien. */
  async getCollaborateurs() {
    const roles = await this.prisma.role.findMany({
      where: { name: { in: [...LOCATIF_ROLES] } },
      select: { id: true },
    });
    const roleIds = roles.map((role) => role.id);
    const utilisateurs = await this.prisma.user.findMany({
      where: { isActive: true, roles: { some: { roleId: { in: roleIds } } } },
      include: {
        roles: {
          where: { roleId: { in: roleIds } },
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return utilisateurs.map((utilisateur) => ({
      id: utilisateur.id,
      firstName: utilisateur.firstName,
      lastName: utilisateur.lastName,
      roles: utilisateur.roles.map((lien) => lien.role.name),
    }));
  }

  /**
   * Indicateurs du portefeuille : ce qui est loué, disponible, en retard de
   * loyer. Périmètre de l'utilisateur, comme la liste.
   */
  async getStats(user: LocatifUser) {
    const perimetre = this.access.ownershipFilter(user);
    const maintenant = new Date();
    const debutDuMois = new Date(
      Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
    );
    const [
      total,
      loues,
      disponibles,
      sansResponsable,
      biensEnRetard,
      impayesProlonges,
      echeancesEnRetard,
      encaisseMoisAgg,
      enAttenteAgg,
      soldeAgg,
    ] = await Promise.all([
      this.prisma.bienLocatif.count({ where: perimetre }),
      this.prisma.bienLocatif.count({
        where: { ...perimetre, statut: 'loue' },
      }),
      this.prisma.bienLocatif.count({
        where: { ...perimetre, statut: 'disponible' },
      }),
      this.prisma.bienLocatif.count({
        where: { ...perimetre, responsableId: null },
      }),
      this.prisma.bienLocatif.count({
        where: {
          ...perimetre,
          ...this.vueFilter('loyers_en_retard', maintenant),
        },
      }),
      this.prisma.bienLocatif.count({
        where: { ...perimetre, ...this.vueFilter('impayes_prolonges') },
      }),
      this.prisma.echeanceLoyer.count({
        where: {
          dateEcheance: { lt: maintenant },
          statut: { notIn: ['payee', 'annulee'] },
          bailLocatif: { bienLocatif: perimetre },
        },
      }),
      this.prisma.paiementLoyer.aggregate({
        where: {
          statut: 'valide',
          datePaiement: { gte: debutDuMois },
          bailLocatif: { bienLocatif: perimetre },
        },
        _sum: { montant: true },
      }),
      this.prisma.paiementLoyer.aggregate({
        where: {
          statut: 'en_attente',
          bailLocatif: { bienLocatif: perimetre },
        },
        _sum: { montant: true },
      }),
      this.prisma.echeanceLoyer.aggregate({
        where: {
          statut: { notIn: ['payee', 'annulee'] },
          dateEcheance: { lt: maintenant },
          bailLocatif: { bienLocatif: perimetre },
        },
        _sum: { montantPrevu: true, montantPaye: true },
      }),
    ]);

    return {
      total,
      loues,
      disponibles,
      sansResponsable,
      /** Nombre de biens concernés par au moins un loyer en retard. */
      biensEnRetard,
      /** Nombre d'échéances effectivement en retard, tous biens confondus. */
      echeancesEnRetard,
      impayesProlonges,
      /** Encaissements validés du mois en cours (section 18 : encaissements). */
      loyersEncaissesMois: Number(encaisseMoisAgg._sum.montant ?? 0),
      /** Versements saisis mais pas encore validés (section 24). */
      encaissementsEnAttente: Number(enAttenteAgg._sum.montant ?? 0),
      /** Reste à recouvrer sur les échéances déjà échues. */
      impayesTotal:
        Number(soldeAgg._sum.montantPrevu ?? 0) -
        Number(soldeAgg._sum.montantPaye ?? 0),
    };
  }

  /**
   * Référence lisible d'un bien : `L-2026-0007`. Même principe que les
   * terrains et les missions de vérification.
   */
  private async nextReference(): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `L-${annee}-`;
    const emises = await this.prisma.bienLocatif.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await this.prisma.bienLocatif.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      'Impossible d’attribuer une référence de bien, réessayez',
    );
  }
}
