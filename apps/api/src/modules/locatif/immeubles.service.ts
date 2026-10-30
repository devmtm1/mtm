import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { referenceSuivante } from '../../common/utils/reference';
import { BiensService } from './biens.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import {
  type CreateImmeubleDto,
  type LogementInitialDto,
  type QueryImmeubleDto,
  type UpdateImmeubleDto,
} from './dto/immeuble.dto';
import { syntheseImmeuble, type LogementSynthese } from './immeubles.helper';

/** Un bail en cours, avec les échéances échues non soldées : de quoi dire « en retard » et de combien. */
const logementSelect = (maintenant: Date) =>
  ({
    id: true,
    referenceInterne: true,
    numeroLot: true,
    titre: true,
    type: true,
    statut: true,
    superficie: true,
    nombrePieces: true,
    nombreChambres: true,
    loyerMensuel: true,
    modeLocation: true,
    prixNuit: true,
    publie: true,
    responsable: { select: { id: true, firstName: true, lastName: true } },
    baux: {
      where: { statut: { in: ['actif', 'preavis'] } },
      take: 1,
      orderBy: { dateDebut: 'desc' as const },
      select: {
        id: true,
        loyerMensuel: true,
        statut: true,
        locataire: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        echeances: {
          where: {
            dateEcheance: { lt: maintenant },
            statut: { notIn: ['payee', 'annulee'] },
          },
          select: { montantPrevu: true, montantPaye: true },
        },
      },
    },
  }) satisfies Prisma.BienLocatifSelect;

const immeubleBaseInclude = {
  proprietaire: {
    select: { id: true, firstName: true, lastName: true, matricule: true },
  },
  responsable: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ImmeubleLocatifInclude;

type LogementCharge = Prisma.BienLocatifGetPayload<{
  select: ReturnType<typeof logementSelect>;
}>;

const nombre = (valeur: Prisma.Decimal | null): number | null =>
  valeur === null ? null : Number(valeur);

/** Du logement lu en base à ce que la synthèse sait calculer. */
function versSynthese(logement: LogementCharge): LogementSynthese {
  const bail = logement.baux[0];
  return {
    statut: logement.statut,
    modeLocation: logement.modeLocation,
    loyerMensuel: nombre(logement.loyerMensuel),
    bail: bail
      ? {
          loyerMensuel: Number(bail.loyerMensuel),
          impaye: bail.echeances.reduce(
            (somme, echeance) =>
              somme +
              (Number(echeance.montantPrevu) - Number(echeance.montantPaye)),
            0,
          ),
        }
      : null,
  };
}

/**
 * Propriétés (villa divisée en appartements, immeuble, résidence) : un propriétaire, une adresse, plusieurs
 * logements louables. Chaque logement reste un `BienLocatif` à part entière — son bail, son loyer, ses photos, son
 * annonce — ; la propriété apporte le regroupement et la vue d'ensemble.
 */
@Injectable()
export class ImmeublesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
    private readonly biens: BiensService,
  ) {}

  async findAll(query: QueryImmeubleDto, user: LocatifUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const contains = (valeur: string) => ({
      contains: valeur,
      mode: 'insensitive' as const,
    });
    const maintenant = new Date();

    const where: Prisma.ImmeubleLocatifWhereInput = {
      ...this.access.immeubleOwnershipFilter(user),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { nom: contains(search) },
                  { referenceInterne: contains(search) },
                  { adresse: contains(search) },
                  { commune: contains(search) },
                  { proprietaire: { lastName: contains(search) } },
                  { proprietaire: { firstName: contains(search) } },
                ],
              },
            ],
          }
        : {}),
    };

    const [lignes, total] = await Promise.all([
      this.prisma.immeubleLocatif.findMany({
        where,
        include: {
          ...immeubleBaseInclude,
          logements: { select: logementSelect(maintenant) },
        },
        // L'identifiant départage deux propriétés de même nom : sans lui, une propriété peut passer d'une page à l'autre.
        orderBy: [{ nom: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.immeubleLocatif.count({ where }),
    ]);

    return {
      items: lignes.map(({ logements, ...immeuble }) => ({
        ...immeuble,
        synthese: syntheseImmeuble(logements.map(versSynthese)),
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, user: LocatifUser) {
    await this.access.ensureImmeubleAccessible(id, user);
    const immeuble = await this.prisma.immeubleLocatif.findUnique({
      where: { id },
      include: {
        ...immeubleBaseInclude,
        logements: {
          select: logementSelect(new Date()),
          orderBy: [{ numeroLot: 'asc' }, { referenceInterne: 'asc' }],
        },
      },
    });
    if (!immeuble) throw new NotFoundException('Propriété introuvable');
    const { logements, ...reste } = immeuble;
    return {
      ...reste,
      logements: logements.map(({ baux, ...logement }) => {
        const bail = baux[0];
        return {
          ...logement,
          bail: bail
            ? {
                id: bail.id,
                statut: bail.statut,
                loyerMensuel: Number(bail.loyerMensuel),
                locataire: bail.locataire,
                impaye: bail.echeances.reduce(
                  (somme, echeance) =>
                    somme +
                    (Number(echeance.montantPrevu) -
                      Number(echeance.montantPaye)),
                  0,
                ),
              }
            : null,
        };
      }),
      synthese: syntheseImmeuble(logements.map(versSynthese)),
    };
  }

  async create(dto: CreateImmeubleDto, user: LocatifUser) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id: dto.proprietaireId },
      select: { id: true },
    });
    if (!proprietaire)
      throw new BadRequestException('Propriétaire introuvable');
    const responsableId = await this.access.resolveResponsable(
      dto.responsableId,
      user,
    );
    await this.verifierLogements(dto.logements ?? []);
    const logements = dto.logements ?? [];
    this.verifierRepereUniques(logements);

    const reference = await this.prochaineReference();
    const references = await this.biens.referencesSuivantes(logements.length);

    return this.prisma.$transaction(async (tx) => {
      const immeuble = await tx.immeubleLocatif.create({
        data: {
          referenceInterne: reference,
          nom: dto.nom.trim(),
          type: dto.type ?? 'immeuble',
          proprietaireId: dto.proprietaireId,
          responsableId,
          adresse: dto.adresse,
          commune: dto.commune,
          region: dto.region,
          latitude: dto.latitude,
          longitude: dto.longitude,
          tauxGestion: dto.tauxGestion,
          notes: dto.notes,
          createdById: user.id,
        },
      });
      for (const [index, logement] of logements.entries()) {
        await tx.bienLocatif.create({
          data: this.donneesLogement(
            immeuble,
            logement,
            references[index],
            user,
          ),
        });
      }
      return immeuble;
    });
  }

  async update(id: string, dto: UpdateImmeubleDto, user: LocatifUser) {
    await this.access.ensureImmeubleAccessible(id, user);
    const actuel = await this.prisma.immeubleLocatif.findUniqueOrThrow({
      where: { id },
      select: { proprietaireId: true, tauxGestion: true },
    });

    let proprietaireChange = false;
    if (dto.proprietaireId && dto.proprietaireId !== actuel.proprietaireId) {
      const proprietaire = await this.prisma.proprietaire.findUnique({
        where: { id: dto.proprietaireId },
        select: { id: true },
      });
      if (!proprietaire)
        throw new BadRequestException('Propriétaire introuvable');
      // Changer de propriétaire déplace tous les logements : seulement tant qu'aucun n'a eu de bail, sinon les loyers
      // déjà encaissés et les reversements ne se rattacheraient plus au bon propriétaire.
      const avecBail = await this.prisma.bailLocatif.count({
        where: { bienLocatif: { immeubleId: id } },
      });
      if (avecBail > 0) {
        throw new ConflictException(
          'Des baux existent déjà dans cette propriété : le propriétaire ne peut plus être changé ici',
        );
      }
      proprietaireChange = true;
    }
    const responsableId =
      dto.responsableId === undefined
        ? undefined
        : await this.access.resolveResponsable(dto.responsableId, user);

    return this.prisma.$transaction(async (tx) => {
      const immeuble = await tx.immeubleLocatif.update({
        where: { id },
        data: {
          ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.proprietaireId !== undefined
            ? { proprietaireId: dto.proprietaireId }
            : {}),
          ...(responsableId !== undefined ? { responsableId } : {}),
          ...(dto.adresse !== undefined ? { adresse: dto.adresse } : {}),
          ...(dto.commune !== undefined ? { commune: dto.commune } : {}),
          ...(dto.region !== undefined ? { region: dto.region } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.tauxGestion !== undefined
            ? { tauxGestion: dto.tauxGestion }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
      // Les reversements lisent le taux de chaque logement : la propriété le leur transmet, sauf à ceux qui ont reçu un
      // taux propre (différent de l'ancien taux de la propriété).
      const ancienTaux =
        actuel.tauxGestion === null || actuel.tauxGestion === undefined
          ? null
          : Number(actuel.tauxGestion);
      if (dto.tauxGestion !== undefined && dto.tauxGestion !== ancienTaux) {
        await tx.bienLocatif.updateMany({
          where: {
            immeubleId: id,
            OR: [
              { tauxGestion: null },
              ...(ancienTaux === null ? [] : [{ tauxGestion: ancienTaux }]),
            ],
          },
          data: { tauxGestion: dto.tauxGestion },
        });
      }
      if (proprietaireChange) {
        await tx.bienLocatif.updateMany({
          where: { immeubleId: id },
          data: { proprietaireId: dto.proprietaireId },
        });
      }
      return immeuble;
    });
  }

  /** Ajoute un ou plusieurs logements à une propriété existante. */
  async ajouterLogements(
    id: string,
    logements: LogementInitialDto[],
    user: LocatifUser,
  ) {
    await this.access.ensureImmeubleAccessible(id, user);
    const immeuble = await this.prisma.immeubleLocatif.findUnique({
      where: { id },
    });
    if (!immeuble) throw new NotFoundException('Propriété introuvable');
    await this.verifierLogements(logements);
    this.verifierRepereUniques(logements);

    // Un repère déjà pris dans la propriété ferait deux « A1 » : on le refuse avant d'écrire.
    const pris = await this.prisma.bienLocatif.findMany({
      where: {
        immeubleId: id,
        numeroLot: {
          in: logements.flatMap((l) => (l.numeroLot ? [l.numeroLot] : [])),
        },
      },
      select: { numeroLot: true },
    });
    if (pris.length > 0) {
      throw new ConflictException(
        `Repère déjà utilisé dans cette propriété : ${pris.map((l) => l.numeroLot).join(', ')}`,
      );
    }

    const references = await this.biens.referencesSuivantes(logements.length);
    return this.prisma.$transaction(async (tx) => {
      const crees = [];
      for (const [index, logement] of logements.entries()) {
        crees.push(
          await tx.bienLocatif.create({
            data: this.donneesLogement(
              immeuble,
              logement,
              references[index],
              user,
            ),
            select: { id: true, referenceInterne: true, numeroLot: true },
          }),
        );
      }
      return crees;
    });
  }

  // ------------------------------------------------------------------ outils

  /** Un logement reprend le propriétaire, l'adresse, la position, le taux et le responsable de sa propriété. */
  private donneesLogement(
    immeuble: {
      id: string;
      proprietaireId: string;
      responsableId: string | null;
      adresse: string;
      commune: string | null;
      region: string | null;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
      tauxGestion: Prisma.Decimal | null;
    },
    logement: LogementInitialDto,
    reference: string,
    user: LocatifUser,
  ): Prisma.BienLocatifUncheckedCreateInput {
    return {
      referenceInterne: reference,
      immeubleId: immeuble.id,
      numeroLot: logement.numeroLot,
      proprietaireId: immeuble.proprietaireId,
      responsableId: immeuble.responsableId,
      type: logement.type,
      adresse: immeuble.adresse,
      commune: immeuble.commune,
      region: immeuble.region,
      latitude: immeuble.latitude,
      longitude: immeuble.longitude,
      tauxGestion: immeuble.tauxGestion,
      superficie: logement.superficie,
      titre: logement.titre,
      nombrePieces: logement.nombrePieces,
      nombreChambres: logement.nombreChambres,
      nombreSallesEau: logement.nombreSallesEau,
      loyerMensuel: logement.loyerMensuel,
      charges: logement.charges,
      meuble: logement.meuble ?? false,
      createdById: user.id,
    };
  }

  private async verifierLogements(
    logements: LogementInitialDto[],
  ): Promise<void> {
    for (const type of new Set(logements.map((l) => l.type))) {
      await this.options.assertTypeBien(type);
    }
  }

  /** Deux logements d'une même propriété ne portent pas le même repère (« A1 » deux fois). */
  private verifierRepereUniques(logements: LogementInitialDto[]): void {
    const reperes = logements.flatMap((l) =>
      l.numeroLot ? [l.numeroLot.trim().toLowerCase()] : [],
    );
    if (new Set(reperes).size !== reperes.length) {
      throw new BadRequestException('Deux logements ont le même repère');
    }
  }

  /** `IM-2026-0003` : même principe que les autres références (rang annuel, jamais réutilisé). */
  private async prochaineReference(): Promise<string> {
    const prefixe = `IM-${new Date().getFullYear()}-`;
    const lignes = await this.prisma.immeubleLocatif.findMany({
      where: { referenceInterne: { startsWith: prefixe } },
      select: { referenceInterne: true },
    });
    return referenceSuivante(
      prefixe,
      lignes.map((ligne) => ligne.referenceInterne),
    );
  }
}
