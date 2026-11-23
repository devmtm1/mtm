import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
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
  CLE_SIGNATURE_EN_LIGNE,
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
  etapeClient,
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
  prospectId: true,
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

const SELECT_PERSONNE = { id: true, firstName: true, lastName: true } as const;

const SELECT_BAIL = {
  id: true,
  referenceInterne: true,
  statut: true,
  bienLocatif: {
    select: {
      adresse: true,
      referenceInterne: true,
      responsable: { select: SELECT_PERSONNE },
    },
  },
  locataire: {
    select: { firstName: true, lastName: true, phone: true, email: true },
  },
} satisfies Prisma.BailLocatifSelect;

const SELECT_CHANTIER = {
  id: true,
  referenceInterne: true,
  statut: true,
  intitule: true,
  responsable: { select: SELECT_PERSONNE },
  client: {
    select: { nom: true, prenom: true, telephone: true, email: true },
  },
} satisfies Prisma.ProjetConstructionSelect;

const INCLUSIONS = {
  documentPrepare: true,
  documentSigne: true,
  fichierPrepare: true,
  fichierSigne: true,
  dossierVente: { select: SELECT_DOSSIER },
  bailLocatif: { select: SELECT_BAIL },
  projetConstruction: { select: SELECT_CHANTIER },
} satisfies Prisma.ProtocoleDossierInclude;

export type TypeDossierProtocole = 'vente' | 'bail' | 'chantier';

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
      email: dossier.prospect.email,
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
      type?: string;
      role?: string;
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
      type: document.type ?? document.role ?? 'protocole',
      version: document.version,
      ajouteLe: document.createdAt,
      url: this.cloudinary.url(
        document.storageKey,
        document.resourceType,
        false,
      ),
    };
  }

  /** Le dossier suivi par un protocole, quel que soit son type, sous une même forme. */
  private resumeCible(
    protocole: Prisma.ProtocoleDossierGetPayload<{
      include: typeof INCLUSIONS;
    }>,
  ) {
    if (protocole.dossierVente) {
      return {
        typeDossier: 'vente' as TypeDossierProtocole,
        ...this.resumeDossier(protocole.dossierVente),
      };
    }
    const sansMontant = {
      montantConvenu: null,
      montantEncaisse: null,
      soldeRestant: null,
      paiementsEnregistres: 0,
    };
    if (protocole.bailLocatif) {
      const bail = protocole.bailLocatif;
      return {
        typeDossier: 'bail' as TypeDossierProtocole,
        id: bail.id,
        reference: bail.referenceInterne,
        statut: bail.statut,
        client: nomComplet(bail.locataire),
        telephone: bail.locataire.phone,
        email: bail.locataire.email,
        bien: bail.bienLocatif.adresse ?? bail.bienLocatif.referenceInterne,
        responsable: nomComplet(bail.bienLocatif.responsable),
        ...sansMontant,
      };
    }
    const chantier = protocole.projetConstruction;
    if (!chantier) throw new ConflictException('Protocole sans dossier.');
    return {
      typeDossier: 'chantier' as TypeDossierProtocole,
      id: chantier.id,
      reference: chantier.referenceInterne,
      statut: chantier.statut,
      client: nomComplet(chantier.client),
      telephone: chantier.client.telephone,
      email: chantier.client.email,
      bien: chantier.intitule,
      responsable: nomComplet(chantier.responsable),
      ...sansMontant,
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
      documentPrepare: this.documentVers(
        protocole.documentPrepare ?? protocole.fichierPrepare,
      ),
      documentSigne: this.documentVers(
        protocole.documentSigne ?? protocole.fichierSigne,
      ),
      dossier: this.resumeCible(protocole),
      acceptationEnLigne: protocole.acceptationLe
        ? {
            le: protocole.acceptationLe,
            nom: protocole.acceptationNom,
            adresse: protocole.acceptationIp,
            appareil: protocole.acceptationAgent,
            empreinte: protocole.acceptationEmpreinte,
          }
        : null,
    };
  }

  private plage(filtres: { depuis?: Date; jusqua?: Date }) {
    return filtres.depuis || filtres.jusqua
      ? {
          createdAt: {
            ...(filtres.depuis ? { gte: filtres.depuis } : {}),
            ...(filtres.jusqua ? { lte: filtres.jusqua } : {}),
          },
        }
      : {};
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
      ...this.plage(filtres),
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

  private filtreBail(filtres: {
    q?: string;
    responsableId?: string;
    depuis?: Date;
    jusqua?: Date;
  }): Prisma.BailLocatifWhereInput {
    const q = filtres.q?.trim();
    return {
      ...(filtres.responsableId
        ? { bienLocatif: { responsableId: filtres.responsableId } }
        : {}),
      ...this.plage(filtres),
      ...(q
        ? {
            OR: [
              { referenceInterne: { contains: q, mode: 'insensitive' } },
              { locataire: { lastName: { contains: q, mode: 'insensitive' } } },
              {
                locataire: { firstName: { contains: q, mode: 'insensitive' } },
              },
              {
                bienLocatif: { adresse: { contains: q, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
    };
  }

  private filtreChantier(filtres: {
    q?: string;
    responsableId?: string;
    depuis?: Date;
    jusqua?: Date;
  }): Prisma.ProjetConstructionWhereInput {
    const q = filtres.q?.trim();
    return {
      ...(filtres.responsableId
        ? { responsableId: filtres.responsableId }
        : {}),
      ...this.plage(filtres),
      ...(q
        ? {
            OR: [
              { referenceInterne: { contains: q, mode: 'insensitive' } },
              { intitule: { contains: q, mode: 'insensitive' } },
              { client: { nom: { contains: q, mode: 'insensitive' } } },
              { client: { prenom: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  /** Les protocoles dont le dossier (vente, bail ou chantier) répond aux filtres ; sans filtre, tous les protocoles. */
  private filtreProtocole(filtres: {
    q?: string;
    responsableId?: string;
    depuis?: Date;
    jusqua?: Date;
    typeDossier?: TypeDossierProtocole;
  }): Prisma.ProtocoleDossierWhereInput {
    const filtre = !!(
      filtres.q?.trim() ||
      filtres.responsableId ||
      filtres.depuis ||
      filtres.jusqua
    );
    const choix: Prisma.ProtocoleDossierWhereInput[] = [];
    if (!filtres.typeDossier || filtres.typeDossier === 'vente')
      choix.push(
        filtre
          ? { dossierVente: { is: this.filtreDossier(filtres) } }
          : { dossierVenteId: { not: null } },
      );
    if (!filtres.typeDossier || filtres.typeDossier === 'bail')
      choix.push(
        filtre
          ? { bailLocatif: { is: this.filtreBail(filtres) } }
          : { bailLocatifId: { not: null } },
      );
    if (!filtres.typeDossier || filtres.typeDossier === 'chantier')
      choix.push(
        filtre
          ? { projetConstruction: { is: this.filtreChantier(filtres) } }
          : { projetConstructionId: { not: null } },
      );
    return { OR: choix };
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
      AND: [this.filtreProtocole(query)],
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.dossierVenteId ? { dossierVenteId: query.dossierVenteId } : {}),
      ...(query.bailLocatifId ? { bailLocatifId: query.bailLocatifId } : {}),
      ...(query.projetConstructionId
        ? { projetConstructionId: query.projetConstructionId }
        : {}),
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

  /** Les protocoles qui concernent le client connecté : ses ventes, ses baux (locataire) et ses chantiers. */
  private async duClient(
    userId: string,
  ): Promise<Prisma.ProtocoleDossierWhereInput> {
    const compte = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspectId: true, clientLocataireId: true },
    });
    const choix: Prisma.ProtocoleDossierWhereInput[] = [];
    if (compte?.clientProspectId) {
      choix.push({ dossierVente: { prospectId: compte.clientProspectId } });
      choix.push({
        projetConstruction: { clientId: compte.clientProspectId },
      });
    }
    if (compte?.clientLocataireId)
      choix.push({ bailLocatif: { locataireId: compte.clientLocataireId } });
    if (!choix.length)
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    return { OR: choix };
  }

  /**
   * Espace client : les protocoles de ses baux et de ses chantiers (ceux de ses ventes sont dans son espace « dossiers »).
   * Une étape simple, jamais les statuts internes ni les motifs.
   */
  async mesProtocolesAutres(userId: string) {
    const signatureEnLigne = await this.settings.getBoolean(
      CLE_SIGNATURE_EN_LIGNE,
      false,
    );
    const protocoles = await this.prisma.protocoleDossier.findMany({
      where: {
        AND: [
          await this.duClient(userId),
          { dossierVenteId: null },
          { statut: { not: 'annule' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: INCLUSIONS,
    });
    return protocoles.flatMap((protocole) => {
      const etape = etapeClient(protocole.statut, signatureEnLigne);
      if (!etape) return [];
      const cible = this.resumeCible(protocole);
      const fichier = protocole.fichierPrepare;
      const aSigner = etape.etape === 'a_signer';
      return [
        {
          id: protocole.id,
          titre: protocole.titre,
          type: protocole.type,
          typeDossier: cible.typeDossier,
          reference: cible.reference,
          bien: cible.bien,
          ...etape,
          dateEnvoi: protocole.dateEnvoi,
          dateReceptionSignee: protocole.dateReceptionSignee,
          documentUrl:
            fichier && etape.etape !== 'en_preparation'
              ? this.cloudinary.url(
                  fichier.storageKey,
                  fichier.resourceType,
                  false,
                )
              : null,
          peutAccepterEnLigne:
            signatureEnLigne &&
            aSigner &&
            !!fichier &&
            !!protocole.empreinteDocument &&
            !protocole.acceptationLe,
          accepteLe: protocole.acceptationLe,
          accepteParNom: protocole.acceptationNom,
        },
      ];
    });
  }

  /**
   * Acceptation en ligne par le client connecté : signature électronique simple. On garde ce qui permet de la prouver
   * (nom saisi, date, adresse, appareil, empreinte du document accepté) et le protocole passe « signé par le client ».
   * Ne vaut que si MTM a activé le réglage et que le document déposé a son empreinte.
   */
  async accepterEnLigne(
    userId: string,
    protocoleId: string,
    nomSaisi: string,
    contexte: { ip?: string; agent?: string },
  ) {
    if (!(await this.settings.getBoolean(CLE_SIGNATURE_EN_LIGNE, false)))
      throw new ForbiddenException(
        'La signature en ligne n’est pas activée : rendez votre copie signée à votre conseiller.',
      );
    const protocole = await this.prisma.protocoleDossier.findFirst({
      where: {
        id: protocoleId,
        ...(await this.duClient(userId)),
      },
      select: {
        id: true,
        titre: true,
        statut: true,
        documentPrepareId: true,
        fichierPrepareId: true,
        empreinteDocument: true,
        acceptationLe: true,
        dossierVente: { select: { referenceInterne: true } },
        bailLocatif: { select: { referenceInterne: true } },
        projetConstruction: { select: { referenceInterne: true } },
      },
    });
    if (!protocole) throw new NotFoundException('Protocole introuvable');
    if (protocole.acceptationLe)
      throw new ConflictException('Ce protocole est déjà accepté.');
    if (!['envoye', 'en_attente_signature'].includes(protocole.statut))
      throw new ConflictException(
        'Ce protocole n’est pas prêt à être accepté.',
      );
    if (
      !(protocole.documentPrepareId ?? protocole.fichierPrepareId) ||
      !protocole.empreinteDocument
    )
      throw new ConflictException(
        'Le document à accepter n’est pas disponible : contactez votre conseiller.',
      );
    const nom = nomSaisi.trim().replace(/\s+/g, ' ');
    if (nom.length < 3)
      throw new BadRequestException('Saisissez votre nom complet.');

    const maintenant = new Date();
    const miseAJour = await this.prisma.protocoleDossier.updateMany({
      // Un seul « accepter » gagne, même en cas de double clic.
      where: {
        id: protocole.id,
        statut: protocole.statut,
        acceptationLe: null,
      },
      data: {
        statut: 'signe_client',
        dateReceptionSignee: maintenant,
        acceptationLe: maintenant,
        acceptationNom: nom.slice(0, 200),
        acceptationIp: contexte.ip?.slice(0, 64) ?? null,
        acceptationAgent: contexte.agent?.slice(0, 300) ?? null,
        acceptationEmpreinte: protocole.empreinteDocument,
      },
    });
    if (miseAJour.count === 0)
      throw new ConflictException('Ce protocole vient d’être modifié.');
    await this.prisma.protocoleHistorique.create({
      data: {
        protocoleId: protocole.id,
        deStatut: protocole.statut,
        versStatut: 'signe_client',
        note: `Accepté en ligne par le client (« ${nom} »)`,
        userId,
      },
    });
    await this.audit.record({
      userId,
      action: 'protocole.accepted_online',
      entityType: 'ProtocoleDossier',
      entityId: protocole.id,
      newValue: { nom, empreinte: protocole.empreinteDocument },
    });
    await this.notifications.notifierPermission(
      'protocoles:modifier',
      {
        type: 'protocole_statut',
        titre: `Protocole accepté en ligne — ${protocole.dossierVente?.referenceInterne ?? protocole.bailLocatif?.referenceInterne ?? protocole.projetConstruction?.referenceInterne ?? protocole.id}`,
        message: `${nom} a accepté « ${protocole.titre ?? 'le protocole'} » depuis son espace client.`,
        lien: '/protocoles',
        entityType: 'ProtocoleDossier',
        entityId: protocole.id,
        dedupeKey: `protocole-accepte:${protocole.id}`,
      },
      userId,
    );
    return { id: protocole.id, acceptationLe: maintenant };
  }

  /** Les baux en cours et les chantiers non annulés, filtrés par la recherche : 30 résultats au plus. */
  async dossiersPossibles(type: 'bail' | 'chantier', q?: string) {
    if (type === 'bail') {
      const baux = await this.prisma.bailLocatif.findMany({
        where: {
          statut: { notIn: ['termine', 'resilie_sans_preavis'] },
          ...this.filtreBail({ q }),
        },
        select: SELECT_BAIL,
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return baux.map((bail) => ({
        id: bail.id,
        libelle: `${bail.referenceInterne} — ${nomComplet(bail.locataire) ?? 'Locataire'} · ${bail.bienLocatif.adresse}`,
      }));
    }
    const chantiers = await this.prisma.projetConstruction.findMany({
      where: { statut: { not: 'annule' }, ...this.filtreChantier({ q }) },
      select: SELECT_CHANTIER,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return chantiers.map((chantier) => ({
      id: chantier.id,
      libelle: `${chantier.referenceInterne} — ${nomComplet(chantier.client) ?? 'Client'} · ${chantier.intitule}`,
    }));
  }

  async creer(dto: CreateProtocoleDto, user: ProtocoleUser) {
    const cibles = [
      dto.dossierVenteId,
      dto.bailLocatifId,
      dto.projetConstructionId,
    ].filter(Boolean);
    if (cibles.length !== 1)
      throw new BadRequestException(
        'Indiquez un seul dossier : une vente, un bail ou un chantier.',
      );

    let cible: Pick<
      Prisma.ProtocoleDossierUncheckedCreateInput,
      'dossierVenteId' | 'bailLocatifId' | 'projetConstructionId'
    >;
    if (dto.dossierVenteId) {
      const dossier = await this.prisma.dossierVente.findUnique({
        where: { id: dto.dossierVenteId },
        select: { id: true, statut: true },
      });
      if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
      if (dossier.statut === 'annule')
        throw new ConflictException(
          'Un dossier annulé ne peut plus recevoir de protocole.',
        );
      cible = { dossierVenteId: dossier.id };
    } else if (dto.bailLocatifId) {
      const bail = await this.prisma.bailLocatif.findUnique({
        where: { id: dto.bailLocatifId },
        select: { id: true, statut: true },
      });
      if (!bail) throw new NotFoundException('Bail introuvable');
      if (['termine', 'resilie_sans_preavis'].includes(bail.statut))
        throw new ConflictException(
          'Un bail terminé ne peut plus recevoir de protocole.',
        );
      cible = { bailLocatifId: bail.id };
    } else {
      const chantier = await this.prisma.projetConstruction.findUnique({
        where: { id: dto.projetConstructionId },
        select: { id: true, statut: true },
      });
      if (!chantier) throw new NotFoundException('Chantier introuvable');
      if (chantier.statut === 'annule')
        throw new ConflictException(
          'Un chantier annulé ne peut plus recevoir de protocole.',
        );
      cible = { projetConstructionId: chantier.id };
    }

    const cree = await this.prisma.$transaction(async (tx) => {
      const protocole = await tx.protocoleDossier.create({
        data: {
          ...cible,
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
      newValue: cible,
    });
    return this.detail(cree.id);
  }

  /** Dépose la version préparée ou la copie signée (dans le dossier de vente, ou dans les pièces du protocole). */
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
    let documentId: string;
    if (protocole.dossierVenteId) {
      const document = await this.documents.addDocument(
        protocole.dossierVenteId,
        { type, title: dto.title },
        file,
        user,
        false,
      );
      documentId = document.id;
      await this.prisma.protocoleDossier.update({
        where: { id },
        data:
          dto.role === 'signe'
            ? { documentSigneId: document.id }
            : {
                documentPrepareId: document.id,
                empreinteDocument: this.empreinte(file),
              },
      });
    } else {
      documentId = (await this.deposerFichier(id, dto, file, user)).id;
    }
    await this.audit.record({
      userId: user.id,
      action:
        dto.role === 'signe'
          ? 'protocole.signed_copy_uploaded'
          : 'protocole.document_uploaded',
      entityType: 'ProtocoleDossier',
      entityId: id,
      newValue: { documentId, type },
    });
    return this.detail(id);
  }

  /** Empreinte SHA-256 du fichier : preuve de ce que le client a lu et accepté. */
  private empreinte(file: Express.Multer.File): string {
    return createHash('sha256').update(file.buffer).digest('hex');
  }

  /** Pièce d'un protocole de bail ou de chantier : validée comme un document, stockée en privé, versionnée. */
  private async deposerFichier(
    id: string,
    dto: DeposerDocumentProtocoleDto,
    file: Express.Multer.File,
    user: ProtocoleUser,
  ) {
    validateUploadedAsset(file, 'document');
    const televerse = await this.cloudinary.upload(
      file,
      `protocoles/${id}`,
      false,
    );
    const derniere = await this.prisma.protocoleFichier.findFirst({
      where: { protocoleId: id, role: dto.role },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const fichier = await this.prisma.protocoleFichier.create({
      data: {
        protocoleId: id,
        role: dto.role,
        title: dto.title ?? file.originalname,
        storageKey: televerse.publicId,
        resourceType: televerse.resourceType,
        version: (derniere?.version ?? 0) + 1,
        createdById: user.id,
      },
    });
    await this.prisma.protocoleDossier.update({
      where: { id },
      data:
        dto.role === 'signe'
          ? { fichierSigneId: fichier.id }
          : {
              fichierPrepareId: fichier.id,
              empreinteDocument: this.empreinte(file),
            },
    });
    return fichier;
  }

  async changerStatut(
    id: string,
    dto: ChangerStatutProtocoleDto,
    user: ProtocoleUser,
  ) {
    const protocole = await this.prisma.protocoleDossier.findUnique({
      where: { id },
      include: {
        dossierVente: {
          select: { id: true, referenceInterne: true, prospectId: true },
        },
        bailLocatif: { select: { id: true, referenceInterne: true } },
        projetConstruction: {
          select: { id: true, referenceInterne: true, clientId: true },
        },
      },
    });
    if (!protocole) throw new NotFoundException('Protocole introuvable');
    if (!estStatut(protocole.statut))
      throw new ConflictException('Statut actuel inconnu.');

    const refus = verifierChangement(
      {
        statut: protocole.statut,
        documentPrepareId:
          protocole.documentPrepareId ?? protocole.fichierPrepareId,
        documentSigneId: protocole.documentSigneId ?? protocole.fichierSigneId,
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
        protocole.dossierVente?.referenceInterne ??
        protocole.bailLocatif?.referenceInterne ??
        protocole.projetConstruction?.referenceInterne ??
        id;
      await this.notifications.notifierPermission(
        'protocoles:valider',
        {
          type: 'protocole_statut',
          titre: `Protocole ${LIBELLES_STATUT[dto.statut].toLowerCase()} — ${reference}`,
          message: protocole.titre ?? undefined,
          lien: `/protocoles`,
          entityType: 'ProtocoleDossier',
          entityId: id,
          dedupeKey: `protocole-statut:${id}:${dto.statut}`,
        },
        user.id,
      );
    }
    // Le client est prévenu dès que son protocole lui est envoyé : dans son espace, par e-mail, et par SMS ou
    // WhatsApp s'il les a demandés et qu'un fournisseur de messagerie est configuré (même circuit que ses paiements).
    const prospectId =
      protocole.dossierVente?.prospectId ??
      protocole.projetConstruction?.clientId ??
      null;
    if (dto.statut === 'envoye' && prospectId) {
      await this.notifications.notifierClient(
        { prospectId },
        {
          type: 'protocole_a_signer',
          titre: 'Votre protocole est prêt à signer',
          message: protocole.titre ?? 'Protocole de votre dossier',
          lien: '/espace-client/dossiers',
          entityType: 'ProtocoleDossier',
          entityId: id,
          dedupeKey: `protocole-a-signer:${id}:${(dto.dateEnvoi ?? new Date()).toISOString().slice(0, 10)}`,
        },
      );
    }
    return this.detail(id);
  }

  /** Les collaborateurs responsables d'au moins un dossier suivi (vente, bail ou chantier) : le choix du filtre « collaborateur ». */
  async responsables() {
    const [ventes, biens, chantiers] = await Promise.all([
      this.prisma.dossierVente.findMany({
        where: {
          protocoles: { some: {} },
          commercialResponsableId: { not: null },
        },
        select: { commercialResponsable: { select: SELECT_PERSONNE } },
        distinct: ['commercialResponsableId'],
      }),
      this.prisma.bienLocatif.findMany({
        where: {
          responsableId: { not: null },
          baux: { some: { protocoles: { some: {} } } },
        },
        select: { responsable: { select: SELECT_PERSONNE } },
        distinct: ['responsableId'],
      }),
      this.prisma.projetConstruction.findMany({
        where: { responsableId: { not: null }, protocoles: { some: {} } },
        select: { responsable: { select: SELECT_PERSONNE } },
        distinct: ['responsableId'],
      }),
    ]);
    const parId = new Map<string, { id: string; nom: string }>();
    for (const personne of [
      ...ventes.map((v) => v.commercialResponsable),
      ...biens.map((b) => b.responsable),
      ...chantiers.map((c) => c.responsable),
    ]) {
      if (personne)
        parId.set(personne.id, {
          id: personne.id,
          nom: nomComplet(personne) ?? 'Sans nom',
        });
    }
    return [...parId.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
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
      AND: [this.filtreProtocole(filtres)],
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
