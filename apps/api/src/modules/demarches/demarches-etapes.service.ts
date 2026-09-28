import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DemarchesAccessService,
  type DemarchesUser,
} from './demarches-access.service';
import { DemarchesOptionsService } from './demarches-options.service';
import {
  CreateEtapeMissionDto,
  UpdateEtapeMissionDto,
} from './dto/etape-mission.dto';

/**
 * Étapes du parcours qui peuvent recevoir un constat. Les trois familles de
 * prestation y figurent : un dépôt se raconte par ses passages en
 * administration comme une vérification se raconte par ses visites.
 * `assertType()` vérifie ensuite que le constat appartient bien au parcours
 * de la mission concernée.
 */
const TYPES_ETAPE = [
  // Vérification
  'faisabilite',
  'verification_physique',
  'verification_administrative',
  'rapport',
  // Démarche administrative
  'constitution_dossier',
  'depot',
  'suivi_administration',
  'retrait',
  // Prestation technique
  'devis',
  'production',
  'livraison',
] as const;

const etapeInclude = {
  realiseePar: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Constats d'une mission : visite sur site et administrations consultées.
 *
 * C'est la traçabilité exigée par la section 14 du cahier des charges — qui
 * a vérifié, quand, ce qui a été observé — et la matière première du rapport
 * remis au client.
 */
@Injectable()
export class DemarchesEtapesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DemarchesAccessService,
    private readonly options: DemarchesOptionsService,
  ) {}

  async findAll(missionId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    return this.prisma.etapeMission.findMany({
      where: { missionId },
      include: etapeInclude,
      orderBy: { realiseeLe: 'asc' },
    });
  }

  async create(
    missionId: string,
    dto: CreateEtapeMissionDto,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    this.assertType(dto.type);
    await this.assertTypeDansParcours(missionId, dto.type);
    await this.assertReferentiels(dto);

    const etape = await this.prisma.etapeMission.create({
      data: {
        missionId,
        type: dto.type,
        titre: dto.titre,
        ...this.champs(dto),
        realiseeParId: user.id,
        realiseeLe: dto.realiseeLe ? new Date(dto.realiseeLe) : new Date(),
      },
      include: etapeInclude,
    });

    // La mission suit l'avancement réel : dès qu'un constat est saisi, elle
    // se place sur l'étape correspondante plutôt que d'attendre une action
    // séparée. On ne rétrograde jamais une mission déjà au rapport.
    await this.avancerMission(missionId, dto.type);
    return etape;
  }

  async update(
    missionId: string,
    etapeId: string,
    dto: UpdateEtapeMissionDto,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    const existante = await this.prisma.etapeMission.findFirst({
      where: { id: etapeId, missionId },
      select: { id: true },
    });
    if (!existante) throw new NotFoundException('Constat introuvable');
    await this.assertReferentiels(dto);

    return this.prisma.etapeMission.update({
      where: { id: etapeId },
      data: {
        ...(dto.titre !== undefined ? { titre: dto.titre } : {}),
        ...this.champs(dto),
        ...(dto.realiseeLe !== undefined
          ? { realiseeLe: new Date(dto.realiseeLe) }
          : {}),
      },
      include: etapeInclude,
    });
  }

  async remove(missionId: string, etapeId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    const existante = await this.prisma.etapeMission.findFirst({
      where: { id: etapeId, missionId },
      select: { id: true },
    });
    if (!existante) throw new NotFoundException('Constat introuvable');
    await this.prisma.etapeMission.delete({ where: { id: etapeId } });
  }

  private assertType(type: string): void {
    if (!TYPES_ETAPE.includes(type as (typeof TYPES_ETAPE)[number])) {
      throw new BadRequestException('Type de constat invalide');
    }
  }

  /**
   * Un constat « visite sur site » n'a aucun sens sur un dépôt de bail, et un
   * constat « dépôt » n'en a aucun sur une vérification foncière. Sans ce
   * contrôle, l'avancement automatique placerait la mission sur une étape
   * étrangère à son parcours, dont elle ne pourrait plus sortir.
   */
  private async assertTypeDansParcours(
    missionId: string,
    type: string,
  ): Promise<void> {
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id: missionId },
      select: { typeVerification: true },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
    const parcours = await this.options.parcoursDuType(
      mission.typeVerification,
    );
    if (!parcours.includes(type)) {
      throw new BadRequestException(
        `Le constat « ${type} » n’appartient pas au parcours de ce type de prestation`,
      );
    }
  }

  private async assertReferentiels(
    dto: CreateEtapeMissionDto | UpdateEtapeMissionDto,
  ): Promise<void> {
    await Promise.all([
      this.options.assertConformite(dto.conformiteApparente),
      this.options.assertAdministration(dto.administration),
      this.options.assertResultatAdministration(dto.resultat),
    ]);
  }

  /** Champs communs aux deux natures de constat, quand ils sont fournis. */
  private champs(dto: CreateEtapeMissionDto | UpdateEtapeMissionDto) {
    return {
      ...(dto.observations !== undefined
        ? { observations: dto.observations }
        : {}),
      ...(dto.dateVisite !== undefined
        ? { dateVisite: dto.dateVisite ? new Date(dto.dateVisite) : null }
        : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.accesDescription !== undefined
        ? { accesDescription: dto.accesDescription }
        : {}),
      ...(dto.environnement !== undefined
        ? { environnement: dto.environnement }
        : {}),
      ...(dto.conformiteApparente !== undefined
        ? { conformiteApparente: dto.conformiteApparente }
        : {}),
      ...(dto.administration !== undefined
        ? { administration: dto.administration }
        : {}),
      ...(dto.interlocuteur !== undefined
        ? { interlocuteur: dto.interlocuteur }
        : {}),
      ...(dto.resultat !== undefined ? { resultat: dto.resultat } : {}),
    };
  }

  private async avancerMission(
    missionId: string,
    typeEtape: string,
  ): Promise<void> {
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id: missionId },
      select: { statut: true, typeVerification: true },
    });
    if (!mission) return;
    // L'ordre dépend de la famille : « dépôt » avance un dossier administratif
    // là où « vérification physique » avance une vérification.
    const ordre = await this.options.parcoursDuType(mission.typeVerification);
    const rangActuel = ordre.indexOf(mission.statut);
    const rangCible = ordre.indexOf(typeEtape);
    if (rangActuel === -1 || rangCible <= rangActuel) return;
    await this.prisma.missionVerification.update({
      where: { id: missionId },
      data: { statut: typeEtape },
    });
  }
}
