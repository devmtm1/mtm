import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { TerrainsAccessService } from './terrains-access.service';
import { mediaOrderBy } from './terrain-queries';
import { CreateTerrainDto } from './dto/create-terrain.dto';
import { QueryTerrainDto } from './dto/query-terrain.dto';
import { UpdateTerrainDto } from './dto/update-terrain.dto';
import { SettingsService } from '../settings/settings.service';
import type { CreateTerrainNoteDto } from './dto/create-terrain-note.dto';

const terrainInclude = {
  proprietaire: true,
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  medias: { orderBy: mediaOrderBy },
  documents: { orderBy: { createdAt: 'desc' as const } },
};

/**
 * La liste n'a besoin que de la vignette : charger tous les médias et
 * documents de chaque terrain alourdissait inutilement la réponse.
 */
const terrainListInclude = {
  proprietaire: { select: { id: true, firstName: true, lastName: true, phone: true } },
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  medias: {
    where: { isPublic: true, type: 'photo' },
    orderBy: mediaOrderBy,
    take: 1,
  },
};

export const DEFAULT_TERRAIN_OPTIONS = {
  statutJuridique: [
    'Titre foncier',
    'Bail',
    'Délibération',
    'Morcellement',
    'Régularisation en cours',
    'Notification de bail',
    'Attribution',
    'Bail individuel',
    'Délibération double tampon',
    'Délibération NICAD',
  ],
  niveauVerification: ['Non vérifié', 'En cours', 'Vérifié', 'À compléter'],
  statutCommercial: ['Brouillon', 'Disponible', 'Réservé', 'Vendu', 'Suspendu'],
  /** Modalité de paiement proposée sur le bien (colonne du tableur historique). */
  modalitePaiement: ['Cash', 'Moratoire', 'Autre'],
  /** Suivi des visites, distinct de la disponibilité commerciale. */
  statutVisite: ['À visiter', 'Visité'],
  /**
   * Nature du bien mis en vente. Même vocabulaire que la gestion locative
   * (`locatif.typesBien`) : deux listes divergentes pour désigner les mêmes
   * biens finiraient par se contredire dans les écrans.
   */
  typeBien: [
    'terrain',
    'villa',
    'appartement',
    'studio',
    'commerce',
    'bureau',
    'autre',
  ],
  /** Typologie commerciale d'un bien bâti. */
  nombrePieces: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
  etatBien: ['neuf', 'bon_etat', 'a_rafraichir', 'a_renover'],
  /**
   * Usage prévu du sol. C'était un champ libre : « Residentiel » et
   * « residentiel » coexistaient en base et le filtre public, qui dérive ses
   * options des biens publiés, les proposait comme deux critères distincts.
   */
  // « habitation » a été fusionné dans « residentiel » : les deux désignaient
  // le même usage et scindaient les recherches en deux.
  vocation: [
    'residentiel',
    'commercial',
    'agricole',
    'touristique',
    'industriel',
    'mixte',
    'autre',
  ],
} as const;

/**
 * Types qui désignent un bien bâti : seuls ceux-là portent une surface
 * habitable, des pièces et des chambres. Un terrain nu qui les recevrait
 * décrirait une maison qui n'existe pas.
 */
export const TYPES_BIEN_BATI = [
  'villa',
  'appartement',
  'studio',
  'commerce',
  'bureau',
] as const;

/** Champs qui n'ont de sens que sur un bien bâti. */
export const CHAMPS_BATI = [
  'surfaceHabitable',
  'nombrePieces',
  'nombreChambres',
  'nombreSallesEau',
  'niveaux',
  'anneeConstruction',
  'etatBien',
] as const;

/**
 * Fiche terrain interne (J1.1, section 8 CDC) : recherche dans le périmètre
 * de l'utilisateur, création, mise à jour avec justification des champs
 * sensibles, changement de statut, référentiels. Le catalogue public, les
 * médias/documents et les règles d'accès sont portés par les services voisins.
 */
@Injectable()
export class TerrainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly settings: SettingsService,
    private readonly access: TerrainsAccessService,
  ) {}

  async findAll(
    query: QueryTerrainDto,
    user?: { roles: string[]; permissions: string[] },
  ) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const search = query.search?.trim();
    const ownership = this.access.ownershipFilter(user);
    const where = {
      ...ownership,
      ...(search
        ? {
            OR: [
              {
                referenceInterne: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { nom: { contains: search, mode: 'insensitive' as const } },
              {
                parcelleMatricule: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { commune: { contains: search, mode: 'insensitive' as const } },
              { region: { contains: search, mode: 'insensitive' as const } },
              {
                localisationDetail: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              // Retrouver un bien par la personne qui le propose : c'est la
              // première question posée au téléphone.
              {
                contactVendeurNom: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                contactVendeurTelephone: {
                  contains: search.replace(/\s+/g, ''),
                },
              },
              {
                proprietaire: {
                  OR: [
                    {
                      firstName: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      lastName: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    { phone: { contains: search.replace(/\s+/g, '') } },
                  ],
                },
              },
            ],
          }
        : {}),
      ...(query.archivage === 'archives'
        ? { archiveLe: { not: null } }
        : query.archivage === 'tous'
          ? {}
          : { archiveLe: null }),
      ...(query.modalitePaiement
        ? { modalitePaiement: query.modalitePaiement }
        : {}),
      ...(query.statutVisite ? { statutVisite: query.statutVisite } : {}),
      ...(query.produitDirect !== undefined
        ? { produitDirect: query.produitDirect }
        : {}),
      ...(query.protocoleAccord !== undefined
        ? { protocoleAccord: query.protocoleAccord }
        : {}),
      ...(query.dateEntreeMin || query.dateEntreeMax
        ? {
            dateEntree: {
              ...(query.dateEntreeMin
                ? { gte: new Date(query.dateEntreeMin) }
                : {}),
              ...(query.dateEntreeMax
                ? { lte: new Date(query.dateEntreeMax) }
                : {}),
            },
          }
        : {}),
      ...(query.statutJuridique
        ? { statutJuridique: query.statutJuridique }
        : {}),
      ...(query.niveauVerification
        ? { niveauVerification: query.niveauVerification }
        : {}),
      ...(query.statutCommercial
        ? { statutCommercial: query.statutCommercial }
        : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.commune ? { commune: query.commune } : {}),
      ...(query.vocation ? { vocation: query.vocation } : {}),
      ...(query.typeBien ? { typeBien: query.typeBien } : {}),
      ...(query.nombrePieces ? { nombrePieces: query.nombrePieces } : {}),
      ...(query.proprietaireId ? { proprietaireId: query.proprietaireId } : {}),
      ...(query.superficieMin !== undefined || query.superficieMax !== undefined
        ? {
            superficie: {
              ...(query.superficieMin !== undefined
                ? { gte: query.superficieMin }
                : {}),
              ...(query.superficieMax !== undefined
                ? { lte: query.superficieMax }
                : {}),
            },
          }
        : {}),
      ...(query.prixPublicMin !== undefined || query.prixPublicMax !== undefined
        ? {
            prixPublic: {
              ...(query.prixPublicMin !== undefined
                ? { gte: query.prixPublicMin }
                : {}),
              ...(query.prixPublicMax !== undefined
                ? { lte: query.prixPublicMax }
                : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.terrain.findMany({
        where,
        include: terrainListInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.terrain.count({ where }),
    ]);
    return {
      items: items.map((item) => this.toInternal(item, user)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Catalogue de proposition : la liste des terrains qu'un commercial peut
   * montrer à un prospect. Contrairement à la liste de gestion, elle ignore
   * le responsable du terrain — proposer un terrain n'est pas le gérer — et
   * n'expose que les informations dites au client (jamais le prix
   * d'acquisition ni la marge).
   */
  async catalogueProposition(search?: string) {
    const terme = search?.trim();
    const items = await this.prisma.terrain.findMany({
      where: {
        statutCommercial: { not: 'Vendu' },
        archiveLe: null,
        ...(terme
          ? {
              OR: [
                {
                  referenceInterne: {
                    contains: terme,
                    mode: 'insensitive' as const,
                  },
                },
                { nom: { contains: terme, mode: 'insensitive' as const } },
                { commune: { contains: terme, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
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
      orderBy: [{ statutCommercial: 'asc' }, { referenceInterne: 'asc' }],
      take: 300,
    });
    return items.map((item) => ({
      ...item,
      superficie: item.superficie ? Number(item.superficie) : null,
      prixPublic: item.prixPublic ? Number(item.prixPublic) : null,
    }));
  }

  /**
   * Fiche d'un terrain. La consultation n'est pas filtrée par responsable :
   * un commercial doit pouvoir ouvrir le terrain qu'il propose à son
   * prospect — photos et documents compris (section 15 du cahier CRM). Les
   * données sensibles restent masquées par `toInternal`, et toute
   * modification passe toujours par `ensureAccessible`.
   */
  async findOne(id: string, user?: { roles: string[]; permissions: string[] }) {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      include: terrainInclude,
    });
    if (!terrain) throw new NotFoundException('Bien introuvable');
    return this.toInternal(terrain, user);
  }

  async create(
    dto: CreateTerrainDto,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    const existing = await this.prisma.terrain.findUnique({
      where: { referenceInterne: dto.referenceInterne },
    });
    if (existing)
      throw new ConflictException('Une référence de bien existe déjà');
    await this.validateStatuses(dto);
    await this.assertChampsBatiCoherents(
      dto as unknown as Record<string, unknown>,
    );

    const data = {
      ...dto,
      ...this.convertirDates(dto),
    } as unknown as Prisma.TerrainUncheckedCreateInput;
    // Sans rattachement, un commercial ne verrait plus le terrain qu'il
    // vient de créer (périmètre = ses terrains). Même règle que les
    // mandats, prospects et dossiers de vente.
    data.commercialResponsableId = await this.access.resolveResponsable(
      dto.commercialResponsableId,
      user,
    );
    if (
      dto.prixPublic !== undefined &&
      dto.prixAcquisition !== undefined &&
      (dto.marge === undefined || dto.marge === null)
    ) {
      data.marge = Number(dto.prixPublic) - Number(dto.prixAcquisition);
    }

    const terrain = await this.prisma.terrain.create({
      data,
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  async update(
    id: string,
    dto: UpdateTerrainDto,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    await this.assertNonArchive(id);
    if (dto.commercialResponsableId !== undefined) {
      dto.commercialResponsableId = await this.access.resolveResponsable(
        dto.commercialResponsableId ?? undefined,
        user,
      );
    }
    await this.validateStatuses(dto);
    await this.assertChampsBatiCoherents(
      dto as unknown as Record<string, unknown>,
      id,
    );
    const terrainData = {
      ...dto,
      ...this.convertirDates(dto),
    } as Record<string, unknown>;
    delete terrainData['justification'];
    if (
      dto.statutCommercial !== undefined &&
      dto.statutCommercial !== 'Vendu'
    ) {
      terrainData['referenceVendue'] = false;
    }

    // Les montants internes sont masqués en lecture pour qui n'y a pas droit :
    // la fiche les lui renvoie à `null`, et son formulaire les réexpédierait
    // tels quels. Sans ce filtre, un commercial sans accès financier effacerait
    // le prix d'acquisition en enregistrant n'importe quelle autre correction.
    // Écarté avant le contrôle de justification : ces `null` ressembleraient
    // sinon à une baisse de prix, et réclameraient une justification pour une
    // modification que l'auteur n'a jamais demandée.
    if (!this.hasFinancialAccess(user)) {
      for (const champ of [
        'prixAcquisition',
        'prixCession',
        'marge',
        'commission',
      ] as const) {
        delete terrainData[champ];
      }
    }

    await this.assertJustificationForSensitiveFields(
      id,
      terrainData,
      dto.justification,
    );

    // Marge déduite quand elle n'est pas saisie. Calculée sur `terrainData`,
    // c'est-à-dire après le filtre ci-dessus : sur le DTO brut, un prix
    // d'acquisition masqué (`null`) aurait réintroduit une marge égale au
    // prix public pour un auteur sans accès financier. Les deux montants
    // doivent être des nombres, pas des « pas de valeur ».
    const nombre = (valeur: unknown): number | null =>
      typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null;
    const prixPublic = nombre(terrainData['prixPublic']);
    const prixAcquisition = nombre(terrainData['prixAcquisition']);
    if (
      prixPublic !== null &&
      prixAcquisition !== null &&
      (terrainData['marge'] === undefined || terrainData['marge'] === null)
    ) {
      terrainData['marge'] = prixPublic - prixAcquisition;
    }

    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: terrainData,
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  /**
   * Affiche un bien vendu sur le site public comme référence (badge « Vendu »),
   * ou le retire. Seul un bien « Vendu » peut l'être : un bien encore à vendre
   * est déjà visible, et un bien retiré du marché n'a rien à prouver.
   */
  async setReferenceVendue(
    id: string,
    afficher: boolean,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    await this.assertNonArchive(id);
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      select: { statutCommercial: true },
    });
    if (!terrain) throw new NotFoundException('Bien introuvable');
    if (afficher && terrain.statutCommercial !== 'Vendu') {
      throw new BadRequestException(
        'Seul un bien vendu peut être affiché comme référence vendue',
      );
    }
    const mis = await this.prisma.terrain.update({
      where: { id },
      data: { referenceVendue: afficher },
      include: terrainInclude,
    });
    return this.toInternal(mis, user);
  }

  async updateStatus(
    id: string,
    field: 'statutJuridique' | 'niveauVerification' | 'statutCommercial',
    value: string,
    justification: string | undefined,
    user: { roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    await this.assertNonArchive(id);
    await this.validateStatuses({ [field]: value });
    if (field === 'statutJuridique' && !justification?.trim()) {
      throw new BadRequestException(
        'Une justification est obligatoire pour modifier le statut juridique d’un bien',
      );
    }
    const terrain = await this.prisma.terrain.update({
      where: { id },
      data: {
        [field]: value,
        // Un bien qui n'est plus « Vendu » n'est plus une référence vendue.
        ...(field === 'statutCommercial' && value !== 'Vendu'
          ? { referenceVendue: false }
          : {}),
      },
      include: terrainInclude,
    });
    return this.toInternal(terrain, user);
  }

  /**
   * Un bien archivé n'est plus modifiable : il faut d'abord le restaurer, pour
   * qu'aucune correction ne se glisse dans un dossier que MTM a clos.
   */
  private async assertNonArchive(id: string): Promise<void> {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      select: { archiveLe: true },
    });
    if (terrain?.archiveLe) {
      throw new ConflictException(
        'Ce bien est archivé : restaurez-le avant de le modifier',
      );
    }
  }

  /** Les dates arrivent en texte AAAA-MM-JJ ; Prisma attend des `Date`. */
  private convertirDates(
    dto: Partial<Pick<CreateTerrainDto, 'dateEntree' | 'dateDocumentFoncier'>>,
  ): Record<string, Date> {
    const out: Record<string, Date> = {};
    if (dto.dateEntree) out['dateEntree'] = new Date(dto.dateEntree);
    if (dto.dateDocumentFoncier) {
      out['dateDocumentFoncier'] = new Date(dto.dateDocumentFoncier);
    }
    return out;
  }

  /**
   * Retire un bien du portefeuille actif sans rien détruire : fiche, photos,
   * documents, historique et dossiers restent intacts et consultables. Refusé
   * tant qu'une vente est en cours sur le bien — l'archiver la ferait
   * disparaître des écrans de l'équipe.
   */
  async archive(
    id: string,
    motif: string,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      select: { archiveLe: true },
    });
    if (!terrain) throw new NotFoundException('Bien introuvable');
    if (terrain.archiveLe) {
      throw new ConflictException('Ce bien est déjà archivé');
    }
    const venteEnCours = await this.prisma.dossierVente.count({
      where: { terrainId: id, statut: { notIn: ['solde', 'annule'] } },
    });
    if (venteEnCours > 0) {
      throw new ConflictException(
        'Une vente est en cours sur ce bien : concluez-la ou annulez-la avant de l’archiver',
      );
    }
    const mis = await this.prisma.terrain.update({
      where: { id },
      data: {
        archiveLe: new Date(),
        archiveParId: user.id,
        motifArchivage: motif.trim(),
        // Un bien archivé ne se met plus en avant ni ne s'affiche en référence.
        misEnAvant: false,
        referenceVendue: false,
      },
      include: terrainInclude,
    });
    return this.toInternal(mis, user);
  }

  async restore(
    id: string,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    const terrain = await this.prisma.terrain.findUnique({
      where: { id },
      select: { archiveLe: true },
    });
    if (!terrain) throw new NotFoundException('Bien introuvable');
    if (!terrain.archiveLe) {
      throw new ConflictException('Ce bien n’est pas archivé');
    }
    const mis = await this.prisma.terrain.update({
      where: { id },
      data: { archiveLe: null, archiveParId: null, motifArchivage: null },
      include: terrainInclude,
    });
    return this.toInternal(mis, user);
  }

  async listNotes(id: string) {
    return this.prisma.terrainNote.findMany({
      where: { terrainId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        auteur: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addNote(
    id: string,
    dto: CreateTerrainNoteDto,
    user: { id: string; roles: string[]; permissions: string[] },
  ) {
    await this.access.ensureAccessible(id, user);
    return this.prisma.terrainNote.create({
      data: { terrainId: id, auteurId: user.id, texte: dto.texte.trim() },
      include: {
        auteur: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Synthèse du portefeuille pour l'écran liste : répartition par statut
   * commercial et points de vigilance (fiches sans GPS, sans photo publique,
   * non vérifiées), dans le périmètre de l'utilisateur.
   */
  async getStats(user: { id: string; roles: string[]; permissions: string[] }) {
    const where = { ...this.access.ownershipFilter(user), archiveLe: null };
    const archives = await this.prisma.terrain.count({
      where: {
        ...this.access.ownershipFilter(user),
        archiveLe: { not: null },
      },
    });
    const [
      total,
      parStatut,
      misEnAvant,
      sansGps,
      nonVerifies,
      avecPhotoPublique,
    ] = await Promise.all([
      this.prisma.terrain.count({ where }),
      this.prisma.terrain.groupBy({
        by: ['statutCommercial'],
        where,
        _count: { statutCommercial: true },
      }),
      this.prisma.terrain.count({ where: { ...where, misEnAvant: true } }),
      this.prisma.terrain.count({
        where: { ...where, OR: [{ latitude: null }, { longitude: null }] },
      }),
      this.prisma.terrain.count({
        where: { ...where, niveauVerification: { not: 'Vérifié' } },
      }),
      this.prisma.terrain.count({
        where: {
          ...where,
          medias: { some: { isPublic: true, type: 'photo' } },
        },
      }),
    ]);
    return {
      total,
      archives,
      parStatut: parStatut.reduce<Record<string, number>>((acc, item) => {
        acc[item.statutCommercial] = item._count.statutCommercial;
        return acc;
      }, {}),
      misEnAvant,
      sansGps,
      nonVerifies,
      sansPhotoPublique: total - avecPhotoPublique,
    };
  }

  async getOptions() {
    const [
      legal,
      verification,
      commercial,
      types,
      pieces,
      etats,
      vocations,
      modalites,
      visites,
    ] = await Promise.all([
      this.settings.getRawValue('terrains.statutJuridique'),
      this.settings.getRawValue('terrains.niveauVerification'),
      this.settings.getRawValue('terrains.statutCommercial'),
      this.settings.getRawValue('terrains.typeBien'),
      this.settings.getRawValue('terrains.nombrePieces'),
      this.settings.getRawValue('terrains.etatBien'),
      this.settings.getRawValue('terrains.vocation'),
      this.settings.getRawValue('terrains.modalitePaiement'),
      this.settings.getRawValue('terrains.statutVisite'),
    ]);
    return {
      statutJuridique: SettingsService.asStringList(
        legal,
        DEFAULT_TERRAIN_OPTIONS.statutJuridique,
      ),
      niveauVerification: SettingsService.asStringList(
        verification,
        DEFAULT_TERRAIN_OPTIONS.niveauVerification,
      ),
      statutCommercial: SettingsService.asStringList(
        commercial,
        DEFAULT_TERRAIN_OPTIONS.statutCommercial,
      ),
      typeBien: SettingsService.asStringList(
        types,
        DEFAULT_TERRAIN_OPTIONS.typeBien,
      ),
      nombrePieces: SettingsService.asStringList(
        pieces,
        DEFAULT_TERRAIN_OPTIONS.nombrePieces,
      ),
      etatBien: SettingsService.asStringList(
        etats,
        DEFAULT_TERRAIN_OPTIONS.etatBien,
      ),
      vocation: SettingsService.asStringList(
        vocations,
        DEFAULT_TERRAIN_OPTIONS.vocation,
      ),
      modalitePaiement: SettingsService.asStringList(
        modalites,
        DEFAULT_TERRAIN_OPTIONS.modalitePaiement,
      ),
      statutVisite: SettingsService.asStringList(
        visites,
        DEFAULT_TERRAIN_OPTIONS.statutVisite,
      ),
      /** Les écrans y lisent quels types ouvrent la section « bâti ». */
      typesBati: [...TYPES_BIEN_BATI],
    };
  }

  private async validateStatuses(
    data: Partial<
      Pick<
        CreateTerrainDto,
        | 'statutJuridique'
        | 'niveauVerification'
        | 'statutCommercial'
        | 'typeBien'
        | 'nombrePieces'
        | 'etatBien'
        | 'vocation'
        | 'modalitePaiement'
        | 'statutVisite'
      >
    >,
  ): Promise<void> {
    const fields = [
      'statutJuridique',
      'niveauVerification',
      'statutCommercial',
      'typeBien',
      'nombrePieces',
      'etatBien',
      'vocation',
      'modalitePaiement',
      'statutVisite',
    ] as const;

    for (const field of fields) {
      await this.settings.assertInList(
        `terrains.${field}`,
        DEFAULT_TERRAIN_OPTIONS[field],
        data[field],
        `Valeur de référentiel invalide : ${field}`,
      );
    }
  }

  /**
   * Un terrain nu n'a ni pièces, ni chambres, ni surface habitable. Accepter
   * ces champs sur un terrain produirait des fiches qui décrivent une maison
   * inexistante, et un catalogue où « F3 » s'affiche sur une parcelle vide.
   *
   * Le type effectif se lit sur la fiche quand la requête ne le change pas :
   * une mise à jour qui n'envoie qu'une surface habitable doit être
   * confrontée au type déjà enregistré.
   */
  private async assertChampsBatiCoherents(
    dto: Record<string, unknown>,
    terrainId?: string,
  ): Promise<void> {
    const renseignes = CHAMPS_BATI.filter(
      (champ) => dto[champ] !== undefined && dto[champ] !== null,
    );
    if (renseignes.length === 0) return;

    let type = dto['typeBien'] as string | undefined;
    if (type === undefined && terrainId) {
      const fiche = await this.prisma.terrain.findUnique({
        where: { id: terrainId },
        select: { typeBien: true },
      });
      type = fiche?.typeBien;
    }
    type ??= 'terrain';

    if (!(TYPES_BIEN_BATI as readonly string[]).includes(type)) {
      throw new BadRequestException(
        `Les caractéristiques du bâti (${renseignes.join(', ')}) ne s’appliquent pas à un bien de type « ${type} »`,
      );
    }
  }

  private static readonly SENSITIVE_FIELDS = [
    'prixAcquisition',
    'marge',
    'commission',
    'prixCession',
    'proprietaireId',
  ] as const;

  /**
   * Justification exigée quand une donnée sensible **change** réellement.
   *
   * La règle portait sur la simple présence du champ dans la requête. Un
   * écran qui renvoie tout son formulaire — c'est le cas de la fiche
   * terrain — réexpédie le prix d'acquisition même sans y toucher : chaque
   * enregistrement était donc refusé, alors que le formulaire, lui, compare
   * à la valeur d'origine et n'affichait pas le champ de justification.
   * Comparer à ce qui est enregistré remet les deux d'accord.
   */
  private async assertJustificationForSensitiveFields(
    id: string,
    dto: Record<string, unknown>,
    justification: string | undefined,
  ): Promise<void> {
    const concerne = TerrainsService.SENSITIVE_FIELDS.filter(
      (field) => dto[field] !== undefined,
    );
    if (concerne.length === 0) return;

    const actuel = await this.prisma.terrain.findUnique({
      where: { id },
      select: {
        prixAcquisition: true,
        marge: true,
        commission: true,
        prixCession: true,
        proprietaireId: true,
      },
    });
    if (!actuel) throw new NotFoundException('Bien introuvable');

    // `null` et `undefined` désignent tous deux « pas de valeur » ; les
    // montants arrivent en nombre et sortent en Decimal, d'où la comparaison
    // sur leur forme numérique.
    const comparable = (valeur: unknown): number | string | null =>
      valeur === null || valeur === undefined
        ? null
        : typeof valeur === 'string'
          ? valeur
          : Number(valeur);

    const change = concerne.some(
      (field) => comparable(dto[field]) !== comparable(actuel[field]),
    );
    if (!change) return;

    // La justification est reçue à part : `dto` n'en contient plus (elle est
    // retirée avant l'écriture en base, ce n'est pas une colonne du terrain).
    if (!justification?.trim()) {
      throw new BadRequestException(
        'Une justification est obligatoire pour modifier un champ sensible (prix d’acquisition, prix de cession, marge, commission, propriétaire)',
      );
    }
  }

  /**
   * Qui a le droit de voir — et donc de modifier — les montants internes.
   * Partagé entre la lecture (qui les masque) et l'écriture (qui les ignore),
   * pour que les deux ne puissent pas diverger.
   */
  private hasFinancialAccess(user?: {
    roles?: string[];
    permissions?: string[];
  }): boolean {
    return (
      !user ||
      Boolean(user.roles?.includes('administrateur')) ||
      Boolean(user.roles?.includes('direction')) ||
      Boolean(user.permissions?.includes('terrains:consulter_financier'))
    );
  }

  private toInternal<T extends Record<string, unknown>>(
    terrain: T,
    user?: { roles?: string[]; permissions?: string[] },
  ): T {
    const value: T & {
      medias?: Array<Record<string, unknown>>;
      documents?: Array<Record<string, unknown>>;
    } = terrain;

    const hasFinancialAccess = this.hasFinancialAccess(user);

    const result = {
      ...terrain,
      ...(!hasFinancialAccess && {
        prixAcquisition: null,
        prixCession: null,
        marge: null,
        commission: null,
        notesInternes: null,
      }),
      medias: value.medias?.map((asset) => ({
        ...asset,
        secureUrl: this.cloudinary.url(
          String(asset.storageKey),
          typeof asset.resourceType === 'string' ? asset.resourceType : 'image',
          Boolean(asset.isPublic),
        ),
      })),
      documents: value.documents?.map((asset) => ({
        ...asset,
        secureUrl: this.cloudinary.url(
          String(asset.storageKey),
          typeof asset.resourceType === 'string' ? asset.resourceType : 'raw',
          Boolean(asset.isPublic),
        ),
      })),
    };
    return result;
  }
}
