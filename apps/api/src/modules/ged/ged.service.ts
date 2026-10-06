import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { TerrainsAccessService } from '../terrains/terrains-access.service';
import { MandatsAccessService } from '../mandats/mandats-access.service';
import { VentesAccessService } from '../ventes/ventes-access.service';
import { CrmAccessService } from '../crm/crm-access.service';
import { DemarchesAccessService } from '../demarches/demarches-access.service';
import { LocatifAccessService } from '../locatif/locatif-access.service';
import { ConstructionAccessService } from '../construction/construction-access.service';

export const GED_ORIGINES = [
  'terrain',
  'mandat',
  'vente',
  'crm',
  'demarche',
  'locatif',
  'chantier',
] as const;
export type GedOrigine = (typeof GED_ORIGINES)[number];

export type GedUser = { id: string; roles: string[]; permissions: string[] };

export interface GedQuery {
  q?: string;
  origines?: GedOrigine[];
  type?: string;
  depuis?: Date;
  jusqua?: Date;
  page: number;
  pageSize: number;
}

/** Une ligne de la GED : un document, quel que soit le module qui le porte. */
export interface GedDocument {
  origine: GedOrigine;
  id: string;
  titre: string;
  type: string;
  version: number;
  genere: boolean;
  /** Diffusé hors de MTM (site public, espace client, propriétaire, locataire). */
  diffuse: boolean;
  createdAt: Date;
  entiteId: string;
  entiteLibelle: string;
  /** Route du back-office de l'objet qui porte le document. */
  lien: string;
  url: string;
}

/** Permission qui ouvre chaque origine : la GED n'ouvre rien de plus que les modules. */
const PERMISSION_PAR_ORIGINE: Record<GedOrigine, string> = {
  terrain: 'terrains:consulter',
  mandat: 'mandats:consulter',
  vente: 'ventes:consulter',
  crm: 'crm:consulter',
  demarche: 'demarches:consulter',
  locatif: 'locatif:consulter',
  chantier: 'construction:consulter',
};

interface Ligne {
  id: string;
  type: string;
  title: string | null;
  version: number;
  storageKey: string;
  resourceType: string;
  createdAt: Date;
}

/**
 * Gestion électronique des documents (section 17 CDC) : recherche unique sur
 * les documents de tous les modules, avec filtres, sans recopier les
 * documents. Chaque origine garde son périmètre : un commercial ne trouve que
 * les documents des dossiers qui lui sont confiés, et il faut la permission
 * « consulter » du module d'origine.
 *
 * La recherche porte sur les métadonnées (titre, type, référence et libellé
 * de l'objet qui porte le document) : elle ne lit pas le contenu des fichiers.
 */
@Injectable()
export class GedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly terrains: TerrainsAccessService,
    private readonly mandats: MandatsAccessService,
    private readonly ventes: VentesAccessService,
    private readonly crm: CrmAccessService,
    private readonly demarches: DemarchesAccessService,
    private readonly locatif: LocatifAccessService,
    private readonly construction: ConstructionAccessService,
  ) {}

  /** Origines que l'utilisateur a le droit de consulter. */
  originesAccessibles(user: GedUser): GedOrigine[] {
    return GED_ORIGINES.filter((origine) =>
      user.permissions.includes(PERMISSION_PAR_ORIGINE[origine]),
    );
  }

  async rechercher(query: GedQuery, user: GedUser) {
    const accessibles = this.originesAccessibles(user);
    const demandees = query.origines?.length
      ? accessibles.filter((origine) => query.origines!.includes(origine))
      : accessibles;

    // Chaque origine fournit au plus `page × pageSize` lignes, déjà triées :
    // c'est le minimum pour que la fusion donne la bonne page.
    const limite = query.page * query.pageSize;
    const resultats = await Promise.all(
      demandees.map((origine) => this.charger(origine, query, user, limite)),
    );

    const tous = resultats.flatMap((resultat) => resultat.lignes);
    tous.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const debut = (query.page - 1) * query.pageSize;

    return {
      items: tous.slice(debut, debut + query.pageSize),
      total: resultats.reduce((somme, resultat) => somme + resultat.total, 0),
      page: query.page,
      pageSize: query.pageSize,
      origines: accessibles,
    };
  }

  private champsCommuns(query: GedQuery) {
    return {
      ...(query.type ? { type: query.type } : {}),
      ...(query.depuis || query.jusqua
        ? {
            createdAt: {
              ...(query.depuis ? { gte: query.depuis } : {}),
              ...(query.jusqua ? { lte: query.jusqua } : {}),
            },
          }
        : {}),
    };
  }

  /** Titre ou type du document contient le texte cherché. */
  private texteDocument(q: string | undefined) {
    const texte = q?.trim();
    if (!texte) return [];
    return [
      { title: { contains: texte, mode: 'insensitive' as const } },
      { type: { contains: texte, mode: 'insensitive' as const } },
    ];
  }

  private ligne(
    origine: GedOrigine,
    doc: Ligne,
    extra: Omit<
      GedDocument,
      'origine' | keyof Ligne | 'titre' | 'url' | 'genere' | 'diffuse'
    > & {
      genere?: boolean;
      diffuse: boolean;
      isPublic?: boolean;
    },
  ): GedDocument {
    return {
      origine,
      id: doc.id,
      titre: doc.title?.trim() || doc.type,
      type: doc.type,
      version: doc.version,
      genere: extra.genere ?? false,
      diffuse: extra.diffuse,
      createdAt: doc.createdAt,
      entiteId: extra.entiteId,
      entiteLibelle: extra.entiteLibelle,
      lien: extra.lien,
      url: this.cloudinary.url(
        doc.storageKey,
        doc.resourceType,
        extra.isPublic ?? false,
      ),
    };
  }

  private async charger(
    origine: GedOrigine,
    query: GedQuery,
    user: GedUser,
    limite: number,
  ): Promise<{ lignes: GedDocument[]; total: number }> {
    const commun = this.champsCommuns(query);
    const texte = query.q?.trim();
    const docs = this.texteDocument(query.q);
    const ordre = { createdAt: 'desc' as const };

    switch (origine) {
      case 'terrain': {
        const parent = this.terrains.ownershipFilter(user);
        const where = {
          ...commun,
          terrain: parent,
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    terrain: {
                      nom: { contains: texte, mode: 'insensitive' as const },
                    },
                  },
                  {
                    terrain: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.terrainDocument.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              terrain: {
                select: { id: true, nom: true, referenceInterne: true },
              },
            },
          }),
          this.prisma.terrainDocument.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('terrain', doc, {
              entiteId: doc.terrainId,
              entiteLibelle: [doc.terrain.referenceInterne, doc.terrain.nom]
                .filter(Boolean)
                .join(' · '),
              lien: `/terrains/${doc.terrainId}`,
              diffuse: doc.isPublic,
              isPublic: doc.isPublic,
            }),
          ),
        };
      }
      case 'mandat': {
        const where = {
          ...commun,
          mandat: this.mandats.ownershipFilter(user),
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    mandat: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.mandatDocument.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              mandat: { select: { id: true, referenceInterne: true } },
            },
          }),
          this.prisma.mandatDocument.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('mandat', doc, {
              entiteId: doc.mandatId,
              entiteLibelle: doc.mandat.referenceInterne,
              lien: `/mandats/${doc.mandatId}`,
              diffuse: doc.isPublic,
              isPublic: doc.isPublic,
            }),
          ),
        };
      }
      case 'vente': {
        const where = {
          ...commun,
          dossierVente: this.ventes.ownershipFilter(user),
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    dossierVente: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.documentVente.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              dossierVente: { select: { id: true, referenceInterne: true } },
            },
          }),
          this.prisma.documentVente.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('vente', doc, {
              entiteId: doc.dossierVenteId,
              entiteLibelle:
                doc.dossierVente.referenceInterne ?? 'Dossier de vente',
              lien: `/ventes/${doc.dossierVenteId}`,
              genere: doc.isGenerated,
              diffuse: doc.isPublic,
              isPublic: doc.isPublic,
            }),
          ),
        };
      }
      case 'crm': {
        // Les documents du CRM suivent la propriété du prospect.
        const parent = this.crm.isManager(user)
          ? {}
          : { commercialResponsableId: user.id };
        const where = {
          ...commun,
          prospect: parent,
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    prospect: {
                      nom: { contains: texte, mode: 'insensitive' as const },
                    },
                  },
                  {
                    prospect: {
                      prenom: { contains: texte, mode: 'insensitive' as const },
                    },
                  },
                  {
                    prospect: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.documentCrm.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              prospect: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  referenceInterne: true,
                },
              },
            },
          }),
          this.prisma.documentCrm.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('crm', doc, {
              entiteId: doc.prospectId,
              entiteLibelle: [doc.prospect.prenom, doc.prospect.nom]
                .filter(Boolean)
                .join(' '),
              lien: `/crm/prospects/${doc.prospectId}`,
              diffuse: doc.isPublic,
              isPublic: doc.isPublic,
            }),
          ),
        };
      }
      case 'demarche': {
        const where = {
          ...commun,
          mission: this.demarches.ownershipFilter(user),
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    mission: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.documentMission.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              mission: { select: { id: true, referenceInterne: true } },
            },
          }),
          this.prisma.documentMission.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('demarche', doc, {
              entiteId: doc.missionId,
              entiteLibelle:
                doc.mission.referenceInterne ?? 'Mission de vérification',
              lien: `/demarches/missions/${doc.missionId}`,
              genere: doc.isGenerated,
              diffuse: doc.isPublic,
              isPublic: doc.isPublic,
            }),
          ),
        };
      }
      case 'locatif': {
        const where = {
          ...commun,
          bailLocatif: { bienLocatif: this.locatif.ownershipFilter(user) },
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    bailLocatif: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    bailLocatif: {
                      bienLocatif: {
                        adresse: {
                          contains: texte,
                          mode: 'insensitive' as const,
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.documentLocatif.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              bailLocatif: {
                select: {
                  id: true,
                  referenceInterne: true,
                  bienLocatifId: true,
                  bienLocatif: { select: { adresse: true } },
                },
              },
            },
          }),
          this.prisma.documentLocatif.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('locatif', doc, {
              entiteId: doc.bailLocatif.bienLocatifId,
              entiteLibelle: `${doc.bailLocatif.referenceInterne} · ${doc.bailLocatif.bienLocatif.adresse}`,
              lien: `/locatif/biens/${doc.bailLocatif.bienLocatifId}`,
              genere: doc.isGenerated,
              diffuse: doc.visibleLocataire || doc.visibleProprietaire,
            }),
          ),
        };
      }
      case 'chantier': {
        const where = {
          ...commun,
          projet: this.construction.ownershipFilter(user),
          ...(texte
            ? {
                OR: [
                  ...docs,
                  {
                    projet: {
                      referenceInterne: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    projet: {
                      intitule: {
                        contains: texte,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        };
        const [lignes, total] = await Promise.all([
          this.prisma.documentChantier.findMany({
            where,
            orderBy: ordre,
            take: limite,
            include: {
              projet: {
                select: { id: true, referenceInterne: true, intitule: true },
              },
            },
          }),
          this.prisma.documentChantier.count({ where }),
        ]);
        return {
          total,
          lignes: lignes.map((doc) =>
            this.ligne('chantier', doc, {
              entiteId: doc.projetId,
              entiteLibelle: `${doc.projet.referenceInterne} · ${doc.projet.intitule}`,
              lien: `/construction/chantiers/${doc.projetId}`,
              genere: doc.isGenerated,
              diffuse: doc.visibleClient,
            }),
          ),
        };
      }
    }
  }
}
