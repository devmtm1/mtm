import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { VentesDocumentsService } from '../ventes/ventes-documents.service';
import {
  ChangerStatutProtocoleDto,
  CreateProtocoleDto,
  DeposerDocumentProtocoleDto,
  ListerProtocolesDto,
} from './dto/protocoles.dto';
import {
  CLE_DEBUT_SUIVI,
  CLE_DELAI_RAPPEL,
  DELAI_RAPPEL_DEFAUT_JOURS,
  LIBELLES_STATUT,
  STATUTS_CLOS,
  STATUTS_EN_ATTENTE_RETOUR,
  STATUTS_PROTOCOLE,
  STATUTS_SIGNES,
  TYPE_DOCUMENT_PREPARE,
  TYPE_DOCUMENT_SIGNE,
  estEnRetard,
  estStatut,
  lireDebutSuivi,
  verifierChangement,
} from './protocoles.regles';

export type ProtocoleUser = {
  id: string;
  roles: string[];
  permissions: string[];
};

const STATUTS_PAIEMENT_COMPTES = ['valide', 'en_attente'];

const SELECT_DOSSIER = {
  id: true,
  referenceInterne: true,
  statut: true,
  prixVente: true,
  createdAt: true,
  commercialResponsable: {
    select: { id: true, firstName: true, lastName: true },
  },
  prospect: {
    select: { nom: true, prenom: true, telephone: true, email: true },
  },
  terrain: { select: { nom: true, referenceInterne: true } },
  paiements: { select: { montant: true, statut: true, datePaiement: true } },
} satisfies Prisma.DossierVenteSelect;

const INCLUSIONS = {
  documentPrepare: true,
  documentSigne: true,
  dossierVente: { select: SELECT_DOSSIER },
} satisfies Prisma.ProtocoleDossierInclude;

type DossierResume = Prisma.DossierVenteGetPayload<{
  select: typeof SELECT_DOSSIER;
}>;

const nomComplet = (
  p?: {
    prenom?: string | null;
    nom?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null,
) =>
  [p?.prenom ?? p?.firstName, p?.nom ?? p?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

/**
 * Suivi des protocoles et des signatures des dossiers de vente : la secrétaire dépose et fait avancer les protocoles, la
 * Direction contrôle et valide. Aucune pièce n'est effacée (les corrections restent historisées) et un protocole n'est
 * « signé » que si la copie signée est déposée (voir protocoles.regles.ts).
 */
@Injectable()
export class ProtocolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: VentesDocumentsService,
    private readonly cloudinary: CloudinaryService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  private delaiRappel(): Promise<number> {
    return this.settings.getPositiveNumber(
      CLE_DELAI_RAPPEL,
      DELAI_RAPPEL_DEFAUT_JOURS,
    );
  }

  /** Début du suivi des signatures (réglage `protocoles.suiviDepuis`) : les dossiers plus anciens ne déclenchent pas d'alerte. */
  private async debutSuivi(): Promise<Date | null> {
    return lireDebutSuivi(await this.settings.getRawValue(CLE_DEBUT_SUIVI));
  }

  /** Restreint un filtre de dossiers à ceux ouverts depuis le début du suivi. */
  private depuisLeSuivi(
    base: Prisma.DossierVenteWhereInput,
    debut: Date | null,
  ): Prisma.DossierVenteWhereInput {
    return debut ? { AND: [base, { createdAt: { gte: debut } }] } : base;
  }

  private resumeDossier(dossier: DossierResume) {
    const encaisse = dossier.paiements
      .filter((paiement) => paiement.statut === 'valide')
      .reduce((somme, paiement) => somme + Number(paiement.montant), 0);
    const convenu =
      dossier.prixVente === null ? null : Number(dossier.prixVente);
    return {
      id: dossier.id,
      reference: dossier.referenceInterne,
      statut: dossier.statut,
      client: nomComplet(dossier.prospect),
      telephone: dossier.prospect.telephone,
      bien: dossier.terrain?.nom ?? dossier.terrain?.referenceInterne ?? null,
      responsable: nomComplet(dossier.commercialResponsable),
      montantConvenu: convenu,
      montantEncaisse: encaisse,
      soldeRestant: convenu === null ? null : Math.max(convenu - encaisse, 0),
      paiementsEnregistres: dossier.paiements.filter((p) =>
        STATUTS_PAIEMENT_COMPTES.includes(p.statut),
      ).length,
    };
  }

  private documentVers(
    document: {
      id: string;
      title: string | null;
      type: string;
      version: number;
      createdAt: Date;
      storageKey: string;
      resourceType: string;
    } | null,
  ) {
    if (!document) return null;
    return {
      id: document.id,
      titre: document.title,
      type: document.type,
      version: document.version,
      ajouteLe: document.createdAt,
      url: this.cloudinary.url(
        document.storageKey,
        document.resourceType,
        false,
      ),
    };
  }

  private vers(
    protocole: Prisma.ProtocoleDossierGetPayload<{
      include: typeof INCLUSIONS;
    }>,
    delai: number,
  ) {
    return {
      id: protocole.id,
      type: protocole.type,
      titre: protocole.titre,
      statut: protocole.statut,
      libelleStatut:
        LIBELLES_STATUT[protocole.statut as keyof typeof LIBELLES_STATUT] ??
        protocole.statut,
      dateEnvoi: protocole.dateEnvoi,
      moyenEnvoi: protocole.moyenEnvoi,
      dateReceptionSignee: protocole.dateReceptionSignee,
      dateSignatureMtm: protocole.dateSignatureMtm,
      motif: protocole.motif,
      enRetard: estEnRetard(protocole, delai),
      creeLe: protocole.createdAt,
      modifieLe: protocole.updatedAt,
      documentPrepare: this.documentVers(protocole.documentPrepare),
      documentSigne: this.documentVers(protocole.documentSigne),
      dossier: this.resumeDossier(protocole.dossierVente),
    };
  }

  private filtreDossier(filtres: {
    q?: string;
    responsableId?: string;
    depuis?: Date;
    jusqua?: Date;
  }): Prisma.DossierVenteWhereInput {
    const q = filtres.q?.trim();
    return {
      ...(filtres.responsableId
        ? { commercialResponsableId: filtres.responsableId }
        : {}),
      ...(filtres.depuis || filtres.jusqua
        ? {
            createdAt: {
              ...(filtres.depuis ? { gte: filtres.depuis } : {}),
              ...(filtres.jusqua ? { lte: filtres.jusqua } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { referenceInterne: { contains: q, mode: 'insensitive' } },
              { prospect: { nom: { contains: q, mode: 'insensitive' } } },
              { prospect: { prenom: { contains: q, mode: 'insensitive' } } },
              { terrain: { nom: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  /** Dossiers où un paiement est enregistré alors qu'aucun protocole n'est signé. */
  private whereSansSignature(
    base: Prisma.DossierVenteWhereInput = {},
    debut: Date | null = null,
  ): Prisma.DossierVenteWhereInput {
    return this.depuisLeSuivi(
      {
        ...base,
        statut: { not: 'annule' },
        paiements: { some: { statut: { in: STATUTS_PAIEMENT_COMPTES } } },
        protocoles: { none: { statut: { in: [...STATUTS_SIGNES] } } },
      },
      debut,
    );
  }

  async lister(query: ListerProtocolesDto) {
    const delai = await this.delaiRappel();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const limiteRetard = new Date(Date.now() - delai * 86_400_000);
    const dossier = this.filtreDossier(query);

    let where: Prisma.ProtocoleDossierWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.dossierVenteId ? { dossierVenteId: query.dossierVenteId } : {}),
      dossierVente: { is: dossier },
    };
    switch (query.filtre) {
      case 'en_retard':
        where = {
          ...where,
          statut: { in: [...STATUTS_EN_ATTENTE_RETOUR] },
          dateEnvoi: { lt: limiteRetard },
        };
        break;
      case 'en_attente':
        where = { ...where, statut: { in: [...STATUTS_EN_ATTENTE_RETOUR] } };
        break;
      case 'a_valider':
        where = { ...where, statut: 'a_valider_direction' };
        break;
      case 'sans_signature':
        where = {
          ...where,
          dossierVente: {
            is: this.whereSansSignature(dossier, await this.debutSuivi()),
          },
        };
        break;
      case 'incomplets':
        where = { ...where, statut: { notIn: [...STATUTS_CLOS] } };
        break;
      default:
        break;
    }

    const [total, items] = await Promise.all([
      this.prisma.protocoleDossier.count({ where }),
      this.prisma.protocoleDossier.findMany({
        where,
        include: INCLUSIONS,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: items.map((item) => this.vers(item, delai)),
    };
  }

  async detail(id: string) {
    const protocole = await this.prisma.protocoleDossier.findUnique({
      where: { id },
      include: INCLUSIONS,
    });
    if (!protocole) throw new NotFoundException('Protocole introuvable');
    const historique = await this.prisma.protocoleHistorique.findMany({
      where: { protocoleId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return {
      ...this.vers(protocole, await this.delaiRappel()),
      historique: historique.map((ligne) => ({
        id: ligne.id,
        de: ligne.deStatut,
        vers: ligne.versStatut,
        libelle:
          LIBELLES_STATUT[ligne.versStatut as keyof typeof LIBELLES_STATUT] ??
          ligne.versStatut,
        note: ligne.note,
        par: nomComplet(ligne.user),
        le: ligne.createdAt,
      })),
    };
  }

  async creer(dto: CreateProtocoleDto, user: ProtocoleUser) {
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id: dto.dossierVenteId },
      select: { id: true, statut: true, referenceInterne: true },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
    if (dossier.statut === 'annule')
      throw new ConflictException(
        'Un dossier annulé ne peut plus recevoir de protocole.',
      );
    const cree = await this.prisma.$transaction(async (tx) => {
      const protocole = await tx.protocoleDossier.create({
        data: {
          dossierVenteId: dossier.id,
          type: dto.type ?? 'protocole_accord',
          titre: dto.titre,
          createdById: user.id,
        },
      });
      await tx.protocoleHistorique.create({
        data: {
          protocoleId: protocole.id,
          versStatut: 'a_preparer',
          note: 'Protocole créé',
          userId: user.id,
        },
      });
      return protocole;
    });
    await this.audit.record({
      userId: user.id,
      action: 'protocole.created',
      entityType: 'ProtocoleDossier',
      entityId: cree.id,
      newValue: { dossierVenteId: dossier.id },
    });
    return this.detail(cree.id);
  }

  /** Dépose la version préparée ou la copie signée dans le dossier de vente et la rattache au protocole. */
  async deposerDocument(
    id: string,
    dto: DeposerDocumentProtocoleDto,
    file: Express.Multer.File,
    user: ProtocoleUser,
  ) {
    const protocole = await this.prisma.protocoleDossier.findUnique({
      where: { id },
      select: { id: true, dossierVenteId: true, statut: true },
    });
    if (!protocole) throw new NotFoundException('Protocole introuvable');
    if ((STATUTS_CLOS as readonly string[]).includes(protocole.statut)) {
      throw new ConflictException(
        'Ce protocole est clos : aucun document ne peut y être ajouté.',
      );
    }
    const type =
      dto.role === 'signe' ? TYPE_DOCUMENT_SIGNE : TYPE_DOCUMENT_PREPARE;
    const document = await this.documents.addDocument(
      protocole.dossierVenteId,
      { type, title: dto.title },
      file,
      user,
      false,
    );
    await this.prisma.protocoleDossier.update({
      where: { id },
      data:
        dto.role === 'signe'
          ? { documentSigneId: document.id }
          : { documentPrepareId: document.id },
    });
    await this.audit.record({
      userId: user.id,
      action:
        dto.role === 'signe'
          ? 'protocole.signed_copy_uploaded'
          : 'protocole.document_uploaded',
      entityType: 'ProtocoleDossier',
      entityId: id,
      newValue: { documentId: document.id, type },
    });
    return this.detail(id);
  }

  async changerStatut(
    id: string,
    dto: ChangerStatutProtocoleDto,
    user: ProtocoleUser,
  ) {
    const protocole = await this.prisma.protocoleDossier.findUnique({
      where: { id },
      include: {
        dossierVente: { select: { id: true, referenceInterne: true } },
      },
    });
    if (!protocole) throw new NotFoundException('Protocole introuvable');
    if (!estStatut(protocole.statut))
      throw new ConflictException('Statut actuel inconnu.');

    const refus = verifierChangement(
      {
        statut: protocole.statut,
        documentPrepareId: protocole.documentPrepareId,
        documentSigneId: protocole.documentSigneId,
        dateEnvoi: protocole.dateEnvoi,
        moyenEnvoi: protocole.moyenEnvoi,
        dateReceptionSignee: protocole.dateReceptionSignee,
      },
      {
        vers: dto.statut,
        motif: dto.motif,
        dateEnvoi: dto.dateEnvoi ?? null,
        moyenEnvoi: dto.moyenEnvoi ?? null,
        dateReceptionSignee: dto.dateReceptionSignee ?? null,
      },
      user.permissions.includes('protocoles:valider'),
    );
    if (refus) throw new BadRequestException(refus);

    const miseAJour = await this.prisma.protocoleDossier.updateMany({
      // Le statut lu doit être encore le bon : deux personnes ne font pas avancer le même protocole en même temps.
      where: { id, statut: protocole.statut },
      data: {
        statut: dto.statut,
        ...(dto.dateEnvoi ? { dateEnvoi: dto.dateEnvoi } : {}),
        ...(dto.moyenEnvoi ? { moyenEnvoi: dto.moyenEnvoi } : {}),
        ...(dto.dateReceptionSignee
          ? { dateReceptionSignee: dto.dateReceptionSignee }
          : {}),
        ...(dto.dateSignatureMtm
          ? { dateSignatureMtm: dto.dateSignatureMtm }
          : {}),
        ...(dto.statut === 'signe_mtm' && !dto.dateSignatureMtm
          ? { dateSignatureMtm: new Date() }
          : {}),
        ...(dto.motif !== undefined ? { motif: dto.motif } : {}),
      },
    });
    if (miseAJour.count === 0)
      throw new ConflictException(
        'Ce protocole vient d’être modifié par une autre personne. Rechargez la page.',
      );

    await this.prisma.protocoleHistorique.create({
      data: {
        protocoleId: id,
        deStatut: protocole.statut,
        versStatut: dto.statut,
        note: dto.note ?? dto.motif ?? null,
        userId: user.id,
      },
    });
    await this.audit.record({
      userId: user.id,
      action: 'protocole.status_changed',
      entityType: 'ProtocoleDossier',
      entityId: id,
      oldValue: { statut: protocole.statut },
      newValue: { statut: dto.statut, motif: dto.motif ?? null },
    });

    // La Direction suit le parcours : préparé, envoyé, signé, à valider.
    if (
      [
        'prepare_a_verifier',
        'envoye',
        'signe_client',
        'a_valider_direction',
      ].includes(dto.statut)
    ) {
      const reference =
        protocole.dossierVente.referenceInterne ?? protocole.dossierVente.id;
      await this.notifications.notifierPermission(
        'protocoles:valider',
        {
          type: 'protocole_statut',
          titre: `Protocole ${LIBELLES_STATUT[dto.statut].toLowerCase()} — dossier ${reference}`,
          message: protocole.titre ?? undefined,
          lien: `/protocoles`,
          entityType: 'ProtocoleDossier',
          entityId: id,
          dedupeKey: `protocole-statut:${id}:${dto.statut}`,
        },
        user.id,
      );
    }
    return this.detail(id);
  }

  /** Les collaborateurs responsables d'au moins un dossier suivi : le choix du filtre « collaborateur ». */
  async responsables() {
    const dossiers = await this.prisma.dossierVente.findMany({
      where: {
        protocoles: { some: {} },
        commercialResponsableId: { not: null },
      },
      select: {
        commercialResponsable: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      distinct: ['commercialResponsableId'],
    });
    return dossiers
      .map((dossier) => dossier.commercialResponsable)
      .filter(
        (personne): personne is NonNullable<typeof personne> =>
          personne !== null,
      )
      .map((personne) => ({
        id: personne.id,
        nom: nomComplet(personne) ?? 'Sans nom',
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  /** « PAIEMENT REÇU – SIGNATURE MANQUANTE » : un paiement est enregistré alors qu'aucun protocole du dossier n'est signé. */
  async alertes(
    filtres: {
      q?: string;
      responsableId?: string;
      depuis?: Date;
      jusqua?: Date;
    } = {},
  ) {
    const dossiers = await this.prisma.dossierVente.findMany({
      where: this.whereSansSignature(
        this.filtreDossier(filtres),
        await this.debutSuivi(),
      ),
      select: {
        ...SELECT_DOSSIER,
        protocoles: {
          select: { statut: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return dossiers.map((dossier) => ({
      ...this.resumeDossier(dossier),
      protocoleActuel: dossier.protocoles[0]
        ? (LIBELLES_STATUT[
            dossier.protocoles[0].statut as keyof typeof LIBELLES_STATUT
          ] ?? dossier.protocoles[0].statut)
        : 'Aucun protocole',
      dernierPaiement:
        dossier.paiements
          .filter((paiement) =>
            STATUTS_PAIEMENT_COMPTES.includes(paiement.statut),
          )
          .map((paiement) => paiement.datePaiement)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    }));
  }

  /** Les indicateurs du tableau de bord de la Direction ; chacun correspond à un filtre de la liste. */
  async tableau(
    filtres: {
      q?: string;
      responsableId?: string;
      depuis?: Date;
      jusqua?: Date;
    } = {},
  ) {
    const delai = await this.delaiRappel();
    const dossier = this.filtreDossier(filtres);
    const debut = await this.debutSuivi();
    const limiteRetard = new Date(Date.now() - delai * 86_400_000);
    const pour = (
      extra: Prisma.ProtocoleDossierWhereInput = {},
    ): Prisma.ProtocoleDossierWhereInput => ({
      dossierVente: { is: dossier },
      ...extra,
    });

    const [
      dossiersCrees,
      dossiersEnCours,
      parStatut,
      enRetard,
      paiementsSansSignature,
      paiementsAvecSignature,
      incomplets,
    ] = await Promise.all([
      this.prisma.dossierVente.count({ where: dossier }),
      this.prisma.dossierVente.count({
        where: { ...dossier, statut: { notIn: ['solde', 'annule'] } },
      }),
      this.prisma.protocoleDossier.groupBy({
        by: ['statut'],
        where: pour(),
        _count: { _all: true },
      }),
      this.prisma.protocoleDossier.count({
        where: pour({
          statut: { in: [...STATUTS_EN_ATTENTE_RETOUR] },
          dateEnvoi: { lt: limiteRetard },
        }),
      }),
      this.prisma.dossierVente.count({
        where: this.whereSansSignature(dossier, debut),
      }),
      this.prisma.dossierVente.count({
        where: this.depuisLeSuivi(
          {
            ...dossier,
            statut: { not: 'annule' },
            paiements: { some: { statut: { in: STATUTS_PAIEMENT_COMPTES } } },
            protocoles: { some: { statut: { in: [...STATUTS_SIGNES] } } },
          },
          debut,
        ),
      }),
      this.prisma.dossierVente.count({
        where: this.depuisLeSuivi(
          {
            ...dossier,
            statut: { not: 'annule' },
            protocoles: { none: { statut: 'valide' } },
          },
          debut,
        ),
      }),
    ]);

    const comptes = Object.fromEntries(
      STATUTS_PROTOCOLE.map((statut) => [statut, 0]),
    ) as Record<string, number>;
    for (const ligne of parStatut) comptes[ligne.statut] = ligne._count._all;
    return {
      delaiRappelJours: delai,
      suiviDepuis: debut ? debut.toISOString().slice(0, 10) : null,
      dossiers: { crees: dossiersCrees, enCours: dossiersEnCours, incomplets },
      protocoles: {
        parStatut: comptes,
        aPreparer: comptes.a_preparer,
        prepares: comptes.prepare_a_verifier,
        envoyes: comptes.envoye,
        enAttenteSignature: comptes.envoye + comptes.en_attente_signature,
        signesClient:
          comptes.signe_client +
          comptes.signe_mtm +
          comptes.a_valider_direction +
          comptes.valide,
        aValider: comptes.a_valider_direction,
        enRetard,
      },
      paiements: {
        avecSignature: paiementsAvecSignature,
        sansSignature: paiementsSansSignature,
      },
    };
  }
}
