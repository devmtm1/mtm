import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ConstructionAccessService,
  type ConstructionUser,
} from './construction-access.service';
import { ConstructionOptionsService } from './construction-options.service';
import { synchroniserChantier } from './chantier.helper';
import {
  CreateJalonDto,
  ReordonnerJalonsDto,
  UpdateJalonDto,
} from './dto/chantier-suivi.dto';

/**
 * Planning du chantier (section 16 : « planning avec jalons et, si possible,
 * vue de type Gantt »).
 *
 * Les dates prévues et réelles cohabitent sur chaque jalon : c'est leur écart
 * qui dessine le Gantt côté back-office et qui alimente les alertes de
 * retard. Tout mouvement de jalon resynchronise l'avancement du chantier —
 * personne n'a à le tenir à jour à la main.
 */
@Injectable()
export class JalonsChantierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConstructionAccessService,
    private readonly options: ConstructionOptionsService,
  ) {}

  async findAll(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    return this.prisma.jalonChantier.findMany({
      where: { projetId },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(projetId: string, dto: CreateJalonDto, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    this.assertPeriode(dto.dateDebutPrevue, dto.dateFinPrevue);

    // Deux « Fondations » sur le même planning ne veulent rien dire : on ne
    // sait plus laquelle est en retard, ni laquelle une journée de journal
    // vise.
    const homonyme = await this.prisma.jalonChantier.findFirst({
      where: {
        projetId,
        libelle: { equals: dto.libelle.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (homonyme) {
      throw new ConflictException(
        `Une étape « ${dto.libelle.trim()} » existe déjà sur ce chantier`,
      );
    }

    // Un jalon sans rang explicite se pose à la fin du planning plutôt qu'en
    // tête, où il bousculerait l'ordre déjà établi.
    const ordre =
      dto.ordre ??
      (await this.prisma.jalonChantier.count({ where: { projetId } }));

    const jalon = await this.prisma.jalonChantier.create({
      data: {
        projetId,
        libelle: dto.libelle,
        description: dto.description,
        ordre,
        poids: dto.poids ?? 1,
        dateDebutPrevue: dto.dateDebutPrevue
          ? new Date(dto.dateDebutPrevue)
          : null,
        dateFinPrevue: dto.dateFinPrevue ? new Date(dto.dateFinPrevue) : null,
      },
    });
    await this.resynchroniser(projetId);
    return jalon;
  }

  async update(
    projetId: string,
    jalonId: string,
    dto: UpdateJalonDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const existant = await this.prisma.jalonChantier.findFirst({
      where: { id: jalonId, projetId },
    });
    if (!existant) throw new NotFoundException('Jalon introuvable');

    await this.options.assertStatutJalon(dto.statut);
    this.assertPeriode(
      dto.dateDebutPrevue ?? existant.dateDebutPrevue?.toISOString(),
      dto.dateFinPrevue ?? existant.dateFinPrevue?.toISOString(),
    );

    const statut = dto.statut ?? existant.statut;
    // Un jalon terminé est terminé : son avancement vaut 100 % et sa date de
    // fin réelle se pose d'elle-même si personne ne l'a saisie. Sans ça, un
    // planning soldé resterait à 90 % parce qu'un pourcentage a été oublié.
    const termine = statut === 'termine';

    const jalon = await this.prisma.jalonChantier.update({
      where: { id: jalonId },
      data: {
        ...(dto.libelle !== undefined ? { libelle: dto.libelle } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
        ...(dto.poids !== undefined ? { poids: dto.poids } : {}),
        ...this.dateFacultative('dateDebutPrevue', dto.dateDebutPrevue),
        ...this.dateFacultative('dateFinPrevue', dto.dateFinPrevue),
        ...this.dateFacultative('dateDebutReelle', dto.dateDebutReelle),
        ...this.dateFacultative('dateFinReelle', dto.dateFinReelle),
        ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
        ...(termine
          ? {
              avancement: 100,
              ...(existant.dateFinReelle || dto.dateFinReelle
                ? {}
                : { dateFinReelle: new Date() }),
            }
          : dto.avancement !== undefined
            ? { avancement: dto.avancement }
            : {}),
        // Un jalon qui démarre date son démarrage, comme le chantier.
        ...(statut === 'en_cours' &&
        !existant.dateDebutReelle &&
        !dto.dateDebutReelle
          ? { dateDebutReelle: new Date() }
          : {}),
      },
    });
    await this.resynchroniser(projetId);
    return jalon;
  }

  /**
   * Réordonnancement complet après glisser-déposer : on reçoit la liste des
   * identifiants dans leur nouvel ordre, et on la réécrit d'un bloc pour
   * qu'aucun planning ne reste à moitié renuméroté.
   */
  async reordonner(
    projetId: string,
    dto: ReordonnerJalonsDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const existants = await this.prisma.jalonChantier.findMany({
      where: { projetId },
      select: { id: true },
    });
    const connus = new Set(existants.map((jalon) => jalon.id));
    if (
      dto.ordre.length !== existants.length ||
      dto.ordre.some((id) => !connus.has(id))
    ) {
      throw new BadRequestException(
        'La liste fournie doit contenir exactement les jalons de ce chantier',
      );
    }

    await this.prisma.$transaction(
      dto.ordre.map((id, index) =>
        this.prisma.jalonChantier.update({
          where: { id },
          data: { ordre: index },
        }),
      ),
    );
    return this.findAll(projetId, user);
  }

  async remove(
    projetId: string,
    jalonId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    const jalon = await this.prisma.jalonChantier.findFirst({
      where: { id: jalonId, projetId },
      select: { id: true },
    });
    if (!jalon) throw new NotFoundException('Jalon introuvable');
    await this.prisma.jalonChantier.delete({ where: { id: jalonId } });
    await this.resynchroniser(projetId);
  }

  /** Avancement, montants et alertes du chantier, recalculés d'un coup. */
  private async resynchroniser(projetId: string): Promise<void> {
    const reglages = await this.options.getReglages();
    await this.prisma.$transaction((tx) =>
      synchroniserChantier(tx, projetId, {
        seuilPourcent: reglages.seuilAlerteBudget,
        horizonJours: reglages.horizonEcheanceJours,
      }),
    );
  }

  private dateFacultative(champ: string, valeur: string | null | undefined) {
    if (valeur === undefined) return {};
    return { [champ]: valeur ? new Date(valeur) : null };
  }

  private assertPeriode(debut?: string | null, fin?: string | null): void {
    if (!debut || !fin) return;
    if (new Date(fin) < new Date(debut)) {
      throw new BadRequestException(
        'La fin prévue d’un jalon ne peut pas précéder son début',
      );
    }
  }
}
