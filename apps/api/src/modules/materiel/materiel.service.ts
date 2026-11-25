import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import {
  AffecterMaterielDto,
  CreateEntretienDto,
  CreateMaterielDto,
  DeposerFichierMaterielDto,
  ListerMaterielDto,
  RetourMaterielDto,
  SortieMaterielDto,
  TerminerEntretienDto,
  UpdateMaterielDto,
} from './dto/materiel.dto';
import {
  CATEGORIES_DEFAUT,
  CLE_CATEGORIES,
  CLE_LIEUX,
  DELAI_AVERTISSEMENT_GARANTIE_JOURS,
  ETATS_MATERIEL,
  LIBELLES_ETAT,
  LIBELLES_SORTIE,
  LIBELLES_STATUT,
  LIEUX_DEFAUT,
  STATUTS_MATERIEL,
  TYPES_ENTRETIEN,
  TYPES_SORTIE,
  aujourdhui,
  estSorti,
  formaterNumero,
  garantieActive,
  lireNumero,
} from './materiel.regles';

/** Le client transactionnel de Prisma, tel que le fournit `$transaction`. */
type Db = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

export type MaterielUser = { id: string; permissions: string[] };

const PERSONNE = { id: true, firstName: true, lastName: true } as const;

const INCLUSIONS = {
  affecteA: { select: PERSONNE },
  projet: { select: { id: true, referenceInterne: true, intitule: true } },
} satisfies Prisma.MaterielInclude;

type MaterielComplet = Prisma.MaterielGetPayload<{
  include: typeof INCLUSIONS;
}>;

const nomComplet = (
  p?: { firstName: string | null; lastName: string | null } | null,
) => [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim() || null;

const JOUR_MS = 86_400_000;

/**
 * Patrimoine matériel de MTM : une fiche par objet (numéro de l'autocollant « MTM 0003 »), son affectation, ses entretiens,
 * ses photos et pièces, et l'inventaire physique par lieu. Rien n'est supprimé : un objet qui quitte le parc garde sa fiche
 * et son historique (sortie avec motif obligatoire).
 */
@Injectable()
export class MaterielService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  // ---------------------------------------------------------------- référentiels

  private categories(): Promise<string[]> {
    return this.settings.getStringList(CLE_CATEGORIES, CATEGORIES_DEFAUT);
  }

  private lieux(): Promise<string[]> {
    return this.settings.getStringList(CLE_LIEUX, LIEUX_DEFAUT);
  }

  private async verifierCategorie(categorie: string): Promise<string> {
    const valides = await this.categories();
    const trouvee = valides.find(
      (c) => c.toLowerCase() === categorie.trim().toLowerCase(),
    );
    if (!trouvee)
      throw new BadRequestException(
        `Catégorie inconnue. Choisissez parmi : ${valides.join(', ')}.`,
      );
    return trouvee;
  }

  private async verifierLieu(lieu: string): Promise<string> {
    const valides = await this.lieux();
    const trouve = valides.find(
      (l) => l.toLowerCase() === lieu.trim().toLowerCase(),
    );
    if (!trouve)
      throw new BadRequestException(
        `Lieu inconnu. Choisissez parmi : ${valides.join(', ')}.`,
      );
    return trouve;
  }

  async options() {
    return {
      categories: await this.categories(),
      lieux: await this.lieux(),
      etats: ETATS_MATERIEL.map((valeur) => ({
        valeur,
        libelle: LIBELLES_ETAT[valeur],
      })),
      statuts: STATUTS_MATERIEL.map((valeur) => ({
        valeur,
        libelle: LIBELLES_STATUT[valeur],
      })),
      typesSortie: TYPES_SORTIE.map((valeur) => ({
        valeur,
        libelle: LIBELLES_SORTIE[valeur],
      })),
      typesEntretien: TYPES_ENTRETIEN,
      prochainNumero: await this.prochainNumero(),
    };
  }

  /** Le numéro à écrire sur le prochain autocollant : le plus grand déjà attribué, plus un. */
  async prochainNumero(): Promise<number> {
    const max = await this.prisma.materiel.aggregate({
      _max: { numero: true },
    });
    return (max._max.numero ?? 0) + 1;
  }

  /** À qui confier un objet : les collaborateurs actifs et les chantiers en cours (30 résultats au plus par liste). */
  async destinataires(q?: string) {
    const terme = q?.trim();
    const [personnes, chantiers] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActive: true,
          clientProspectId: null,
          clientLocataireId: null,
          clientProprietaireId: null,
          ...(terme
            ? {
                OR: [
                  { firstName: { contains: terme, mode: 'insensitive' } },
                  { lastName: { contains: terme, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: PERSONNE,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 30,
      }),
      this.prisma.projetConstruction.findMany({
        where: {
          statut: { not: 'annule' },
          ...(terme
            ? {
                OR: [
                  {
                    referenceInterne: { contains: terme, mode: 'insensitive' },
                  },
                  { intitule: { contains: terme, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: { id: true, referenceInterne: true, intitule: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);
    return {
      collaborateurs: personnes.map((p) => ({
        id: p.id,
        nom: nomComplet(p) ?? 'Sans nom',
      })),
      chantiers: chantiers.map((c) => ({
        id: c.id,
        libelle: `${c.referenceInterne} — ${c.intitule}`,
      })),
    };
  }

  // ---------------------------------------------------------------- présentation

  private affectation(m: MaterielComplet) {
    if (m.statut === 'sorti') return null;
    if (m.affecteA)
      return {
        type: 'collaborateur' as const,
        id: m.affecteA.id,
        libelle: nomComplet(m.affecteA) ?? 'Collaborateur',
      };
    if (m.projet)
      return {
        type: 'chantier' as const,
        id: m.projet.id,
        libelle: `${m.projet.referenceInterne} — ${m.projet.intitule}`,
      };
    if (m.affecteANom)
      return { type: 'libre' as const, id: null, libelle: m.affecteANom };
    return null;
  }

  private vers(m: MaterielComplet, voitPrix: boolean) {
    const aujourd = aujourdhui();
    return {
      id: m.id,
      numero: m.numero,
      reference: formaterNumero(m.numero),
      designation: m.designation,
      categorie: m.categorie,
      marque: m.marque,
      modele: m.modele,
      numeroSerie: m.numeroSerie,
      dateAchat: m.dateAchat,
      prixAchat: voitPrix && m.prixAchat !== null ? Number(m.prixAchat) : null,
      fournisseur: voitPrix ? m.fournisseur : null,
      garantieJusqua: m.garantieJusqua,
      garantieActive: garantieActive(m.garantieJusqua),
      etat: m.etat,
      libelleEtat:
        LIBELLES_ETAT[m.etat as keyof typeof LIBELLES_ETAT] ?? m.etat,
      statut: m.statut,
      libelleStatut:
        LIBELLES_STATUT[m.statut as keyof typeof LIBELLES_STATUT] ?? m.statut,
      lieu: m.lieu,
      affectation: this.affectation(m),
      affecteLe: m.affecteLe,
      prochainEntretien: m.prochainEntretien,
      entretienEnRetard:
        !!m.prochainEntretien &&
        !estSorti(m.statut) &&
        m.prochainEntretien.getTime() < aujourd.getTime(),
      notes: m.notes,
      sortie: m.sortieLe
        ? {
            type: m.sortieType,
            libelle:
              LIBELLES_SORTIE[m.sortieType as keyof typeof LIBELLES_SORTIE] ??
              m.sortieType,
            motif: m.sortieMotif,
            le: m.sortieLe,
          }
        : null,
      creeLe: m.createdAt,
      modifieLe: m.updatedAt,
    };
  }

  private voitPrix(user: MaterielUser): boolean {
    return user.permissions.includes('materiel:modifier');
  }

  // ---------------------------------------------------------------- lecture

  private filtre(query: ListerMaterielDto): Prisma.MaterielWhereInput {
    const q = query.q?.trim();
    const numero = lireNumero(q);
    const aujourd = aujourdhui();
    const bientotGarantie = new Date(
      aujourd.getTime() + DELAI_AVERTISSEMENT_GARANTIE_JOURS * JOUR_MS,
    );
    return {
      // Les objets sortis du parc ne s'affichent que si on les demande.
      ...(query.statut
        ? { statut: query.statut }
        : { statut: { not: 'sorti' } }),
      ...(query.categorie ? { categorie: query.categorie } : {}),
      ...(query.etat ? { etat: query.etat } : {}),
      ...(query.lieu ? { lieu: query.lieu } : {}),
      ...(query.affecteAId ? { affecteAId: query.affecteAId } : {}),
      ...(query.projetId ? { projetId: query.projetId } : {}),
      ...(query.filtre === 'entretien_a_prevoir'
        ? { prochainEntretien: { lt: aujourd } }
        : {}),
      ...(query.filtre === 'garantie_proche'
        ? { garantieJusqua: { gte: aujourd, lte: bientotGarantie } }
        : {}),
      ...(query.filtre === 'sans_lieu' ? { lieu: null } : {}),
      ...(q
        ? {
            OR: [
              ...(numero !== null ? [{ numero }] : []),
              { designation: { contains: q, mode: 'insensitive' as const } },
              { marque: { contains: q, mode: 'insensitive' as const } },
              { modele: { contains: q, mode: 'insensitive' as const } },
              { numeroSerie: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  async lister(query: ListerMaterielDto, user: MaterielUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.filtre(query);
    const [total, items] = await Promise.all([
      this.prisma.materiel.count({ where }),
      this.prisma.materiel.findMany({
        where,
        include: INCLUSIONS,
        orderBy: [{ numero: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const voitPrix = this.voitPrix(user);
    return {
      total,
      page,
      pageSize,
      items: items.map((m) => this.vers(m, voitPrix)),
    };
  }

  async detail(id: string, user: MaterielUser) {
    const m = await this.prisma.materiel.findUnique({
      where: { id },
      include: {
        ...INCLUSIONS,
        mouvements: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: PERSONNE } },
        },
        entretiens: { orderBy: [{ statut: 'asc' }, { date: 'desc' }] },
        fichiers: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!m) throw new NotFoundException('Matériel introuvable');
    const voitPrix = this.voitPrix(user);
    return {
      ...this.vers(m, voitPrix),
      historique: m.mouvements.map((x) => ({
        id: x.id,
        type: x.type,
        resume: x.resume,
        note: x.note,
        par: nomComplet(x.user),
        le: x.createdAt,
      })),
      entretiens: m.entretiens.map((e) => ({
        id: e.id,
        type: e.type,
        statut: e.statut,
        date: e.date,
        description: e.description,
        cout: voitPrix && e.cout !== null ? Number(e.cout) : null,
        prestataire: e.prestataire,
        enRetard:
          e.statut === 'prevu' && e.date.getTime() < aujourdhui().getTime(),
      })),
      fichiers: m.fichiers.map((f) => ({
        id: f.id,
        role: f.role,
        titre: f.title,
        ajouteLe: f.createdAt,
        url: this.cloudinary.url(f.storageKey, f.resourceType, false),
      })),
    };
  }

  /** Les indicateurs du tableau de bord ; chacun correspond à un filtre de la liste. */
  async tableau(user: MaterielUser) {
    const aujourd = aujourdhui();
    const bientotGarantie = new Date(
      aujourd.getTime() + DELAI_AVERTISSEMENT_GARANTIE_JOURS * JOUR_MS,
    );
    const actifs: Prisma.MaterielWhereInput = { statut: { not: 'sorti' } };
    const [
      parStatut,
      parCategorie,
      parEtat,
      entretiens,
      garanties,
      sansLieu,
      valeur,
    ] = await Promise.all([
      this.prisma.materiel.groupBy({ by: ['statut'], _count: { _all: true } }),
      this.prisma.materiel.groupBy({
        by: ['categorie'],
        where: actifs,
        _count: { _all: true },
      }),
      this.prisma.materiel.groupBy({
        by: ['etat'],
        where: actifs,
        _count: { _all: true },
      }),
      this.prisma.materiel.count({
        where: { ...actifs, prochainEntretien: { lt: aujourd } },
      }),
      this.prisma.materiel.count({
        where: {
          ...actifs,
          garantieJusqua: { gte: aujourd, lte: bientotGarantie },
        },
      }),
      this.prisma.materiel.count({ where: { ...actifs, lieu: null } }),
      this.voitPrix(user)
        ? this.prisma.materiel.aggregate({
            where: actifs,
            _sum: { prixAchat: true },
          })
        : Promise.resolve(null),
    ]);
    const statuts = Object.fromEntries(
      STATUTS_MATERIEL.map((s) => [s, 0]),
    ) as Record<string, number>;
    for (const ligne of parStatut) statuts[ligne.statut] = ligne._count._all;
    const etats = Object.fromEntries(
      ETATS_MATERIEL.map((s) => [s, 0]),
    ) as Record<string, number>;
    for (const ligne of parEtat) etats[ligne.etat] = ligne._count._all;
    return {
      total: statuts.disponible + statuts.affecte + statuts.en_maintenance,
      parStatut: statuts,
      parEtat: etats,
      parCategorie: parCategorie
        .map((l) => ({ categorie: l.categorie, nombre: l._count._all }))
        .sort((a, b) => b.nombre - a.nombre),
      enPanne: etats.en_panne,
      entretiensEnRetard: entretiens,
      garantiesProches: garanties,
      sansLieu,
      valeurAchat: valeur === null ? null : Number(valeur._sum.prixAchat ?? 0),
    };
  }

  // ---------------------------------------------------------------- écriture

  private async trace(
    materielId: string,
    type: string,
    resume: string,
    userId: string,
    note: string | null | undefined,
    tx: Db,
  ) {
    await tx.materielMouvement.create({
      data: { materielId, type, resume, note: note ?? null, userId },
    });
  }

  private async charger(id: string) {
    const m = await this.prisma.materiel.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Matériel introuvable');
    return m;
  }

  private refuserSiSorti(statut: string) {
    if (estSorti(statut))
      throw new ConflictException(
        'Ce matériel est sorti du parc : sa fiche ne se modifie plus.',
      );
  }

  async creer(dto: CreateMaterielDto, user: MaterielUser) {
    const categorie = await this.verifierCategorie(dto.categorie);
    const lieu = dto.lieu ? await this.verifierLieu(dto.lieu) : null;
    const numeroDemande = dto.numero;
    for (let essai = 0; essai < 3; essai++) {
      const numero = numeroDemande ?? (await this.prochainNumero());
      try {
        const cree = await this.prisma.$transaction(async (tx) => {
          const m = await tx.materiel.create({
            data: {
              numero,
              designation: dto.designation.trim(),
              categorie,
              marque: dto.marque?.trim() || null,
              modele: dto.modele?.trim() || null,
              numeroSerie: dto.numeroSerie?.trim() || null,
              dateAchat: dto.dateAchat,
              prixAchat: dto.prixAchat,
              fournisseur: dto.fournisseur?.trim() || null,
              garantieJusqua: dto.garantieJusqua,
              etat: dto.etat ?? 'bon',
              lieu,
              notes: dto.notes?.trim() || null,
              createdById: user.id,
            },
          });
          await this.trace(
            m.id,
            'creation',
            `Ajouté au parc sous le numéro ${formaterNumero(numero)}`,
            user.id,
            null,
            tx,
          );
          return m;
        });
        await this.audit.record({
          userId: user.id,
          action: 'materiel.created',
          entityType: 'Materiel',
          entityId: cree.id,
          newValue: { numero, designation: cree.designation },
        });
        return this.detail(cree.id, user);
      } catch (error) {
        const doublon =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';
        if (!doublon) throw error;
        // Un numéro choisi à la main est déjà pris : on le dit. Un numéro automatique pris entre-temps : on réessaie.
        if (numeroDemande !== undefined)
          throw new ConflictException(
            `Le numéro ${formaterNumero(numeroDemande)} est déjà attribué à un autre matériel.`,
          );
      }
    }
    throw new ConflictException(
      'Le numéro suivant vient d’être pris : réessayez.',
    );
  }

  async modifier(id: string, dto: UpdateMaterielDto, user: MaterielUser) {
    const actuel = await this.charger(id);
    this.refuserSiSorti(actuel.statut);
    const data: Prisma.MaterielUpdateInput = {};
    if (dto.designation !== undefined)
      data.designation = dto.designation.trim();
    // Une catégorie retirée de la liste réglable reste valable pour les objets qui l'ont déjà : on ne contrôle que si elle change.
    if (dto.categorie !== undefined && dto.categorie !== actuel.categorie)
      data.categorie = await this.verifierCategorie(dto.categorie);
    if (dto.marque !== undefined) data.marque = dto.marque.trim() || null;
    if (dto.modele !== undefined) data.modele = dto.modele.trim() || null;
    if (dto.numeroSerie !== undefined)
      data.numeroSerie = dto.numeroSerie.trim() || null;
    if (dto.dateAchat !== undefined) data.dateAchat = dto.dateAchat;
    if (dto.prixAchat !== undefined) data.prixAchat = dto.prixAchat;
    if (dto.fournisseur !== undefined)
      data.fournisseur = dto.fournisseur.trim() || null;
    if (dto.garantieJusqua !== undefined)
      data.garantieJusqua = dto.garantieJusqua;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    let nouveauLieu: string | undefined;
    if (dto.lieu !== undefined && dto.lieu !== actuel.lieu) {
      nouveauLieu = dto.lieu ? await this.verifierLieu(dto.lieu) : undefined;
      data.lieu = nouveauLieu ?? null;
    }
    const etatChange = dto.etat !== undefined && dto.etat !== actuel.etat;
    if (etatChange) data.etat = dto.etat;

    await this.prisma.$transaction(async (tx) => {
      await tx.materiel.update({ where: { id }, data });
      if (etatChange)
        await this.trace(
          id,
          'etat',
          `État : ${LIBELLES_ETAT[actuel.etat as keyof typeof LIBELLES_ETAT] ?? actuel.etat} → ${LIBELLES_ETAT[dto.etat as keyof typeof LIBELLES_ETAT]}`,
          user.id,
          null,
          tx,
        );
      if (dto.lieu !== undefined && dto.lieu !== actuel.lieu)
        await this.trace(
          id,
          'lieu',
          nouveauLieu ? `Rangé : ${nouveauLieu}` : 'Lieu de rangement retiré',
          user.id,
          null,
          tx,
        );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.updated',
      entityType: 'Materiel',
      entityId: id,
      oldValue: { etat: actuel.etat, lieu: actuel.lieu },
      newValue: {
        etat: dto.etat ?? actuel.etat,
        lieu: dto.lieu ?? actuel.lieu,
      },
    });
    return this.detail(id, user);
  }

  async affecter(id: string, dto: AffecterMaterielDto, user: MaterielUser) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    if (m.statut === 'en_maintenance')
      throw new ConflictException(
        'Ce matériel est en maintenance : terminez l’intervention avant de le confier.',
      );
    const nom = dto.nom?.trim();
    if ([dto.userId, dto.projetId, nom].filter(Boolean).length !== 1)
      throw new BadRequestException(
        'Indiquez à qui le confier : un collaborateur, un chantier ou un nom.',
      );
    let libelle: string;
    if (dto.userId) {
      const personne = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { ...PERSONNE, isActive: true },
      });
      if (!personne || !personne.isActive)
        throw new NotFoundException('Collaborateur introuvable');
      libelle = nomComplet(personne) ?? 'un collaborateur';
    } else if (dto.projetId) {
      const projet = await this.prisma.projetConstruction.findUnique({
        where: { id: dto.projetId },
        select: { referenceInterne: true, intitule: true },
      });
      if (!projet) throw new NotFoundException('Chantier introuvable');
      libelle = `le chantier ${projet.referenceInterne}`;
    } else {
      libelle = nom as string;
    }
    const transfert = m.statut === 'affecte';
    await this.prisma.$transaction(async (tx) => {
      await tx.materiel.update({
        where: { id },
        data: {
          statut: 'affecte',
          affecteAId: dto.userId ?? null,
          projetId: dto.projetId ?? null,
          affecteANom: nom ?? null,
          affecteLe: new Date(),
        },
      });
      await this.trace(
        id,
        'affectation',
        `${transfert ? 'Transféré à' : 'Confié à'} ${libelle}`,
        user.id,
        dto.note,
        tx,
      );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.assigned',
      entityType: 'Materiel',
      entityId: id,
      newValue: { vers: libelle },
    });
    return this.detail(id, user);
  }

  async retourner(id: string, dto: RetourMaterielDto, user: MaterielUser) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    if (m.statut !== 'affecte')
      throw new ConflictException('Ce matériel n’est pas confié à quelqu’un.');
    const lieu = dto.lieu ? await this.verifierLieu(dto.lieu) : undefined;
    const etat = dto.etat ?? (m.etat as (typeof ETATS_MATERIEL)[number]);
    await this.prisma.$transaction(async (tx) => {
      await tx.materiel.update({
        where: { id },
        data: {
          statut: 'disponible',
          affecteAId: null,
          projetId: null,
          affecteANom: null,
          affecteLe: null,
          etat,
          ...(lieu ? { lieu } : {}),
        },
      });
      await this.trace(
        id,
        'retour',
        `Retour — ${LIBELLES_ETAT[etat]}${lieu ? `, rangé : ${lieu}` : ''}`,
        user.id,
        dto.note,
        tx,
      );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.returned',
      entityType: 'Materiel',
      entityId: id,
      newValue: { etat, lieu: lieu ?? m.lieu },
    });
    return this.detail(id, user);
  }

  async sortir(id: string, dto: SortieMaterielDto, user: MaterielUser) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    const motif = dto.motif.trim();
    if (motif.length < 3) throw new BadRequestException('Indiquez le motif.');
    await this.prisma.$transaction(async (tx) => {
      await tx.materiel.update({
        where: { id },
        data: {
          statut: 'sorti',
          sortieType: dto.type,
          sortieMotif: motif,
          sortieLe: new Date(),
          affecteAId: null,
          projetId: null,
          affecteANom: null,
          affecteLe: null,
          prochainEntretien: null,
        },
      });
      await this.trace(
        id,
        'sortie',
        `Sorti du parc : ${LIBELLES_SORTIE[dto.type]}`,
        user.id,
        motif,
        tx,
      );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.removed',
      entityType: 'Materiel',
      entityId: id,
      newValue: { type: dto.type, motif },
    });
    return this.detail(id, user);
  }

  // ---------------------------------------------------------------- entretiens

  /** Recopie sur la fiche la date du prochain entretien prévu. */
  private async recalculerProchainEntretien(id: string, tx: Db) {
    const prochain = await tx.materielEntretien.findFirst({
      where: { materielId: id, statut: 'prevu' },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    await tx.materiel.update({
      where: { id },
      data: { prochainEntretien: prochain?.date ?? null },
    });
  }

  async ajouterEntretien(
    id: string,
    dto: CreateEntretienDto,
    user: MaterielUser,
  ) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    const fait = dto.fait === true;
    if (fait && dto.date.getTime() > Date.now() + JOUR_MS)
      throw new BadRequestException(
        'Un entretien réalisé ne peut pas avoir une date à venir.',
      );
    const immobilise = !fait && dto.immobilise === true;
    if (immobilise && m.statut === 'affecte')
      throw new ConflictException(
        'Ce matériel est confié : faites-le d’abord revenir avant de l’immobiliser.',
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.materielEntretien.create({
        data: {
          materielId: id,
          type: dto.type,
          statut: fait ? 'fait' : 'prevu',
          date: dto.date,
          description: dto.description.trim(),
          cout: dto.cout,
          prestataire: dto.prestataire?.trim() || null,
          createdById: user.id,
        },
      });
      if (immobilise)
        await tx.materiel.update({
          where: { id },
          data: { statut: 'en_maintenance' },
        });
      await this.recalculerProchainEntretien(id, tx);
      await this.trace(
        id,
        'entretien',
        `${fait ? 'Entretien réalisé' : 'Entretien prévu'} : ${dto.description.trim()}`,
        user.id,
        null,
        tx,
      );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.maintenance_added',
      entityType: 'Materiel',
      entityId: id,
      newValue: { type: dto.type, fait, immobilise },
    });
    return this.detail(id, user);
  }

  async terminerEntretien(
    id: string,
    entretienId: string,
    dto: TerminerEntretienDto,
    user: MaterielUser,
  ) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    const entretien = await this.prisma.materielEntretien.findFirst({
      where: { id: entretienId, materielId: id },
    });
    if (!entretien) throw new NotFoundException('Entretien introuvable');
    if (entretien.statut === 'fait')
      throw new ConflictException('Cet entretien est déjà enregistré.');
    await this.prisma.$transaction(async (tx) => {
      await tx.materielEntretien.update({
        where: { id: entretienId },
        data: {
          statut: 'fait',
          date: dto.date ?? aujourdhui(),
          ...(dto.cout !== undefined ? { cout: dto.cout } : {}),
          ...(dto.prestataire !== undefined
            ? { prestataire: dto.prestataire.trim() || null }
            : {}),
        },
      });
      // L'intervention finie, l'objet redevient utilisable : de nouveau confié s'il l'était, sinon disponible.
      if (m.statut === 'en_maintenance') {
        const confie = !!(m.affecteAId || m.projetId || m.affecteANom);
        await tx.materiel.update({
          where: { id },
          data: { statut: confie ? 'affecte' : 'disponible' },
        });
      }
      if (dto.etat)
        await tx.materiel.update({
          where: { id },
          data: { etat: dto.etat },
        });
      await this.recalculerProchainEntretien(id, tx);
      await this.trace(
        id,
        'entretien',
        `Entretien terminé : ${entretien.description}${dto.etat ? ` — ${LIBELLES_ETAT[dto.etat]}` : ''}`,
        user.id,
        null,
        tx,
      );
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.maintenance_done',
      entityType: 'Materiel',
      entityId: id,
      newValue: { entretienId, etat: dto.etat ?? null },
    });
    return this.detail(id, user);
  }

  // ---------------------------------------------------------------- fichiers

  async deposerFichier(
    id: string,
    dto: DeposerFichierMaterielDto,
    file: Express.Multer.File,
    user: MaterielUser,
  ) {
    const m = await this.charger(id);
    this.refuserSiSorti(m.statut);
    validateUploadedAsset(file, 'document');
    const televerse = await this.cloudinary.upload(
      file,
      `materiel/${id}`,
      false,
    );
    const fichier = await this.prisma.materielFichier.create({
      data: {
        materielId: id,
        role: dto.role,
        title: dto.title ?? file.originalname,
        storageKey: televerse.publicId,
        resourceType: televerse.resourceType,
        createdById: user.id,
      },
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.file_uploaded',
      entityType: 'Materiel',
      entityId: id,
      newValue: { fichierId: fichier.id, role: dto.role },
    });
    return this.detail(id, user);
  }

  // ---------------------------------------------------------------- inventaire

  async creerInventaire(lieu: string, user: MaterielUser) {
    const lieuValide = await this.verifierLieu(lieu);
    const enCours = await this.prisma.materielInventaire.findFirst({
      where: { lieu: lieuValide, statut: 'en_cours' },
      select: { id: true },
    });
    if (enCours)
      throw new ConflictException(
        `Un inventaire de « ${lieuValide} » est déjà en cours : reprenez-le ou terminez-le.`,
      );
    const cree = await this.prisma.materielInventaire.create({
      data: { lieu: lieuValide, createdById: user.id },
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.inventory_started',
      entityType: 'MaterielInventaire',
      entityId: cree.id,
      newValue: { lieu: lieuValide },
    });
    return this.rapportInventaire(cree.id);
  }

  async listerInventaires() {
    const inventaires = await this.prisma.materielInventaire.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: { select: PERSONNE },
        _count: { select: { lignes: true } },
      },
    });
    return inventaires.map((i) => ({
      id: i.id,
      lieu: i.lieu,
      statut: i.statut,
      commenceLe: i.createdAt,
      termineLe: i.termineLe,
      par: nomComplet(i.createdBy),
      numerosSaisis: i._count.lignes,
    }));
  }

  /**
   * Le rapport d'un inventaire : ce qui a été vu à sa place, vu ailleurs que dans sa fiche, ce qui manque dans le lieu,
   * les numéros inconnus et les objets sortis du parc qu'on retrouve pourtant.
   */
  async rapportInventaire(id: string) {
    const inventaire = await this.prisma.materielInventaire.findUnique({
      where: { id },
      include: {
        lignes: {
          orderBy: { createdAt: 'asc' },
          include: {
            materiel: {
              select: {
                id: true,
                numero: true,
                designation: true,
                lieu: true,
                statut: true,
              },
            },
          },
        },
      },
    });
    if (!inventaire) throw new NotFoundException('Inventaire introuvable');
    const vus = new Set(
      inventaire.lignes.flatMap((l) => (l.materielId ? [l.materielId] : [])),
    );
    const attendus = await this.prisma.materiel.findMany({
      where: { lieu: inventaire.lieu, statut: { not: 'sorti' } },
      orderBy: { numero: 'asc' },
      select: { id: true, numero: true, designation: true, statut: true },
    });
    const ligne = (m: { id: string; numero: number; designation: string }) => ({
      id: m.id,
      numero: m.numero,
      reference: formaterNumero(m.numero),
      designation: m.designation,
    });
    const trouves = inventaire.lignes.flatMap((l) =>
      l.materiel ? [l.materiel] : [],
    );
    return {
      id: inventaire.id,
      lieu: inventaire.lieu,
      statut: inventaire.statut,
      commenceLe: inventaire.createdAt,
      termineLe: inventaire.termineLe,
      aSaisir: attendus.length,
      conformes: trouves
        .filter((m) => m.lieu === inventaire.lieu && m.statut !== 'sorti')
        .map(ligne),
      deplaces: trouves
        .filter((m) => m.lieu !== inventaire.lieu && m.statut !== 'sorti')
        .map((m) => ({ ...ligne(m), lieuFiche: m.lieu })),
      manquants: attendus
        .filter((m) => !vus.has(m.id))
        .map((m) => ({
          ...ligne(m),
          statut: m.statut,
          // Un objet confié ou en maintenance n'est pas forcément dans son lieu : on le distingue d'un objet vraiment absent.
          explique: m.statut !== 'disponible',
        })),
      inconnus: inventaire.lignes
        .filter((l) => !l.materielId)
        .map((l) => ({
          numero: l.numero,
          reference: formaterNumero(l.numero),
        })),
      sortisRetrouves: trouves.filter((m) => m.statut === 'sorti').map(ligne),
    };
  }

  async ajouterNumeroInventaire(id: string, texte: string, user: MaterielUser) {
    const inventaire = await this.prisma.materielInventaire.findUnique({
      where: { id },
      select: { id: true, statut: true },
    });
    if (!inventaire) throw new NotFoundException('Inventaire introuvable');
    if (inventaire.statut !== 'en_cours')
      throw new ConflictException('Cet inventaire est terminé.');
    const numero = lireNumero(texte);
    if (numero === null)
      throw new BadRequestException(
        'Numéro illisible : saisissez le nombre de l’autocollant, par exemple 3 ou MTM 0003.',
      );
    const materiel = await this.prisma.materiel.findUnique({
      where: { numero },
      select: { id: true, designation: true },
    });
    try {
      await this.prisma.materielInventaireLigne.create({
        data: { inventaireId: id, numero, materielId: materiel?.id ?? null },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          `${formaterNumero(numero)} est déjà saisi dans cet inventaire.`,
        );
      throw error;
    }
    void user;
    return {
      numero,
      reference: formaterNumero(numero),
      connu: !!materiel,
      designation: materiel?.designation ?? null,
    };
  }

  async terminerInventaire(
    id: string,
    mettreAJourLieux: boolean,
    user: MaterielUser,
  ) {
    const inventaire = await this.prisma.materielInventaire.findUnique({
      where: { id },
      select: { id: true, statut: true, lieu: true },
    });
    if (!inventaire) throw new NotFoundException('Inventaire introuvable');
    if (inventaire.statut !== 'en_cours')
      throw new ConflictException('Cet inventaire est déjà terminé.');
    const rapport = await this.rapportInventaire(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.materielInventaire.update({
        where: { id },
        data: { statut: 'termine', termineLe: new Date() },
      });
      if (mettreAJourLieux) {
        for (const deplace of rapport.deplaces) {
          await tx.materiel.update({
            where: { id: deplace.id },
            data: { lieu: inventaire.lieu },
          });
          await this.trace(
            deplace.id,
            'lieu',
            `Rangé : ${inventaire.lieu} (constaté à l'inventaire)`,
            user.id,
            null,
            tx,
          );
        }
      }
    });
    await this.audit.record({
      userId: user.id,
      action: 'materiel.inventory_closed',
      entityType: 'MaterielInventaire',
      entityId: id,
      newValue: {
        manquants: rapport.manquants.length,
        deplaces: rapport.deplaces.length,
        inconnus: rapport.inconnus.length,
        lieuxMisAJour: mettreAJourLieux,
      },
    });
    return this.rapportInventaire(id);
  }
}
