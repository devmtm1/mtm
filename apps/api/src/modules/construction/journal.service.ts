import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import {
  ConstructionAccessService,
  type ConstructionUser,
} from './construction-access.service';
import { ConstructionOptionsService } from './construction-options.service';
import { synchroniserChantier } from './chantier.helper';
import {
  CreateEntreeJournalDto,
  QueryJournalDto,
  UpdateEntreeJournalDto,
} from './dto/chantier-suivi.dto';

const entreeInclude = {
  redigePar: { select: { id: true, firstName: true, lastName: true } },
  jalon: { select: { id: true, libelle: true } },
  documents: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      type: true,
      title: true,
      storageKey: true,
      resourceType: true,
      visibleClient: true,
      createdAt: true,
    },
  },
} satisfies Prisma.EntreeJournalChantierInclude;

/**
 * Journal de chantier (section 16 : « date, intervenants, avancement,
 * observations, photos/vidéos, problèmes, décisions et prochaines actions »).
 *
 * C'est la seule chose que le conducteur de travaux saisit vraiment chaque
 * jour, et c'est la mémoire du chantier : le reste du module — avancement,
 * alertes, rapport client — s'appuie dessus. Une journée signalant un
 * problème non résolu reste ouverte et remonte dans les alertes jusqu'à ce
 * que quelqu'un la solde.
 */
@Injectable()
export class JournalChantierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConstructionAccessService,
    private readonly options: ConstructionOptionsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(
    projetId: string,
    query: QueryJournalDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 30, 200);

    const where: Prisma.EntreeJournalChantierWhereInput = {
      projetId,
      ...(query.depuis || query.jusqua
        ? {
            date: {
              ...(query.depuis ? { gte: new Date(query.depuis) } : {}),
              ...(query.jusqua ? { lte: new Date(query.jusqua) } : {}),
            },
          }
        : {}),
      ...(query.vue === 'problemes' ? { resolu: false } : {}),
      ...(query.vue === 'publiees' ? { visibleClient: true } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.entreeJournalChantier.findMany({
        where,
        include: entreeInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.entreeJournalChantier.count({ where }),
    ]);

    return {
      items: items.map((entree) => this.avecLiens(entree)),
      total,
      page,
      pageSize,
    };
  }

  async create(
    projetId: string,
    dto: CreateEntreeJournalDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await this.options.assertMeteo(dto.meteo);
    if (dto.jalonId) await this.assertJalon(projetId, dto.jalonId);

    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Date de journée invalide');
    }
    // On ne consigne pas une journée qui n'a pas eu lieu : une saisie datée
    // de la semaine prochaine est une faute de frappe, pas une prévision.
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'Une entrée de journal ne peut pas être datée dans le futur',
      );
    }

    const entree = await this.prisma.entreeJournalChantier.create({
      data: {
        projetId,
        jalonId: dto.jalonId ?? null,
        date,
        intervenants: dto.intervenants,
        effectif: dto.effectif,
        meteo: dto.meteo,
        avancement: dto.avancement,
        observations: dto.observations,
        probleme: dto.probleme,
        decisions: dto.decisions,
        prochaineAction: dto.prochaineAction,
        // Une journée qui signale un problème s'ouvre : c'est l'état qui
        // demande une suite, et personne ne pense à le cocher lui-même.
        resolu: dto.resolu ?? !dto.probleme,
        visibleClient: dto.visibleClient ?? false,
        redigeParId: user.id,
      },
      include: entreeInclude,
    });

    await this.repercuterAvancement(projetId, dto.jalonId, dto.avancement);
    return this.avecLiens(entree);
  }

  async update(
    projetId: string,
    entreeId: string,
    dto: UpdateEntreeJournalDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const existante = await this.prisma.entreeJournalChantier.findFirst({
      where: { id: entreeId, projetId },
      select: { id: true },
    });
    if (!existante)
      throw new NotFoundException('Entrée de journal introuvable');

    await this.options.assertMeteo(dto.meteo);
    if (dto.jalonId) await this.assertJalon(projetId, dto.jalonId);

    const entree = await this.prisma.entreeJournalChantier.update({
      where: { id: entreeId },
      data: {
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.jalonId !== undefined ? { jalonId: dto.jalonId } : {}),
        ...(dto.intervenants !== undefined
          ? { intervenants: dto.intervenants }
          : {}),
        ...(dto.effectif !== undefined ? { effectif: dto.effectif } : {}),
        ...(dto.meteo !== undefined ? { meteo: dto.meteo } : {}),
        ...(dto.avancement !== undefined ? { avancement: dto.avancement } : {}),
        ...(dto.observations !== undefined
          ? { observations: dto.observations }
          : {}),
        ...(dto.probleme !== undefined ? { probleme: dto.probleme } : {}),
        ...(dto.decisions !== undefined ? { decisions: dto.decisions } : {}),
        ...(dto.prochaineAction !== undefined
          ? { prochaineAction: dto.prochaineAction }
          : {}),
        ...(dto.resolu !== undefined ? { resolu: dto.resolu } : {}),
        ...(dto.visibleClient !== undefined
          ? { visibleClient: dto.visibleClient }
          : {}),
      },
      include: entreeInclude,
    });

    await this.repercuterAvancement(projetId, dto.jalonId, dto.avancement);
    return this.avecLiens(entree);
  }

  async remove(
    projetId: string,
    entreeId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    const entree = await this.prisma.entreeJournalChantier.findFirst({
      where: { id: entreeId, projetId },
      select: { id: true },
    });
    if (!entree) throw new NotFoundException('Entrée de journal introuvable');
    await this.prisma.entreeJournalChantier.delete({ where: { id: entreeId } });
    await this.resynchroniser(projetId);
  }

  /**
   * L'avancement constaté sur le terrain remonte au jalon concerné, qui
   * remonte lui-même à l'avancement du chantier. C'est ce qui permet de ne
   * saisir qu'une fois un chiffre observé une fois.
   */
  private async repercuterAvancement(
    projetId: string,
    jalonId: string | null | undefined,
    avancement: number | undefined,
  ): Promise<void> {
    if (jalonId && avancement !== undefined) {
      const jalon = await this.prisma.jalonChantier.findUnique({
        where: { id: jalonId },
        select: { statut: true, avancement: true },
      });
      // On ne fait jamais reculer un jalon ni ne rouvre un jalon terminé :
      // une entrée saisie en retard ne doit pas défaire l'état courant.
      if (
        jalon &&
        jalon.statut !== 'termine' &&
        jalon.statut !== 'annule' &&
        avancement > jalon.avancement
      ) {
        await this.prisma.jalonChantier.update({
          where: { id: jalonId },
          data: {
            avancement,
            ...(jalon.statut === 'a_venir' ? { statut: 'en_cours' } : {}),
          },
        });
      }
    }
    await this.resynchroniser(projetId);
  }

  private async resynchroniser(projetId: string): Promise<void> {
    const reglages = await this.options.getReglages();
    await this.prisma.$transaction((tx) =>
      synchroniserChantier(tx, projetId, {
        seuilPourcent: reglages.seuilAlerteBudget,
        horizonJours: reglages.horizonEcheanceJours,
      }),
    );
  }

  private async assertJalon(projetId: string, jalonId: string): Promise<void> {
    const jalon = await this.prisma.jalonChantier.findFirst({
      where: { id: jalonId, projetId },
      select: { id: true },
    });
    if (!jalon) {
      throw new BadRequestException('Ce jalon n’appartient pas à ce chantier');
    }
  }

  private avecLiens<
    T extends {
      documents: Array<{ storageKey: string; resourceType: string }>;
    },
  >(entree: T) {
    return {
      ...entree,
      documents: entree.documents.map(({ storageKey, ...document }) => ({
        ...document,
        secureUrl: this.cloudinary.url(
          storageKey,
          document.resourceType,
          false,
        ),
      })),
    };
  }
}
