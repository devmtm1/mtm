import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import {
  AutorisationDto,
  CorrectionDto,
  CreateOperationDto,
  QueryOperationsDto,
  UpdateOperationDto,
} from './dto/finances.dto';
import { PeriodesFinancieresService } from './periodes.service';
import {
  LIBELLES_NIVEAU,
  type NiveauValidation,
  type Seuils,
  lireSeuils,
  niveauValidation,
  numeroOperation,
  peutAutoriser,
} from './tresorerie.calculs';

export const CATEGORIES_DEPENSES_DEFAUT = [
  'salaires',
  'loyer_bureaux',
  'electricite_internet',
  'transport',
  'fournitures',
  'communication',
  'honoraires_externes',
  'impots_taxes',
  'autre_depense',
];
export const CATEGORIES_RECETTES_DEFAUT = [
  'recette_chantier',
  'honoraires_divers',
  'subvention',
  'autre_recette',
];

export type FinanceUser = {
  id: string;
  roles: string[];
  permissions: string[];
  firstName?: string;
  lastName?: string;
};

const personne = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const INCLUDE = {
  createdBy: personne,
  validatedBy: personne,
  autorisePar: personne,
  compte: { select: { id: true, code: true, nom: true } },
  corrige: {
    select: { id: true, numeroSeq: true, libelle: true, createdAt: true },
  },
} as const;

type OperationAvecAuteurs = Prisma.OperationFinanciereGetPayload<{
  include: typeof INCLUDE;
}>;

/**
 * Recettes et dépenses saisies à la main (loyer des bureaux, salaires, recette
 * d'un chantier…). Une opération n'entre dans les totaux qu'une fois validée
 * par une autre personne que celle qui l'a saisie ; une opération validée ne
 * se modifie ni ne se supprime — on la corrige par une opération inverse.
 */
@Injectable()
export class OperationsFinancieresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly periodes: PeriodesFinancieresService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async categories() {
    const [depenses, recettes] = await Promise.all([
      this.settings.getStringList(
        'finances.categoriesDepenses',
        CATEGORIES_DEPENSES_DEFAUT,
      ),
      this.settings.getStringList(
        'finances.categoriesRecettes',
        CATEGORIES_RECETTES_DEFAUT,
      ),
    ]);
    return { depenses, recettes };
  }

  async lister(query: QueryOperationsDto) {
    const where: Prisma.OperationFinanciereWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.activite ? { activite: query.activite } : {}),
      ...(query.sens ? { sens: query.sens } : {}),
      ...(query.nature ? { nature: query.nature } : {}),
      // Une dépense sans pièce : le contrôle que réclame le cahier des charges.
      ...(query.sansJustificatif
        ? { sens: 'depense', justificatifKey: null }
        : {}),
      ...(query.aAutoriser
        ? {
            statut: 'en_attente',
            niveauValidation: { gte: 1 },
            autoriseParId: null,
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.operationFinanciere.count({ where }),
      this.prisma.operationFinanciere.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((operation) => this.presenter(operation)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async seuils(): Promise<Seuils> {
    return lireSeuils(
      await this.settings.getRawValue('finances.seuilsValidation'),
    );
  }

  /** Une dépense est soumise aux seuils ; une recette ne demande que le regard d'une autre personne. */
  private async niveauPour(
    sens: string,
    montant: number,
  ): Promise<NiveauValidation> {
    return sens === 'depense'
      ? niveauValidation(montant, await this.seuils())
      : 0;
  }

  private async verifierCompte(compteId: string | undefined) {
    if (!compteId) return;
    const compte = await this.prisma.compteTresorerie.findUnique({
      where: { id: compteId },
      select: { actif: true },
    });
    if (!compte?.actif) {
      throw new BadRequestException('Compte de trésorerie inconnu ou inactif');
    }
  }

  async creer(dto: CreateOperationDto, user: FinanceUser) {
    const date = await this.verifierDate(dto.date);
    await this.verifierCategorie(dto.sens, dto.categorie);
    await this.verifierCompte(dto.compteId);
    const niveau = await this.niveauPour(dto.sens, dto.montant);
    const operation = await this.prisma.operationFinanciere.create({
      data: {
        nature: dto.nature ?? 'definitive',
        compteId: dto.compteId ?? null,
        niveauValidation: niveau,
        sens: dto.sens,
        activite: dto.activite,
        categorie: dto.categorie,
        libelle: dto.libelle.trim(),
        montant: dto.montant,
        date,
        modePaiement: dto.modePaiement?.trim() || null,
        reference: dto.reference?.trim() || null,
        tiers: dto.tiers?.trim() || null,
        createdById: user.id,
      },
      include: INCLUDE,
    });
    // Les valideurs sont prévenus : une saisie sans valideur attentif ne compte jamais.
    await this.notifications.alerter(
      'finances:valider',
      {
        type: 'operation_a_valider',
        titre: `Opération à valider : ${operation.libelle}`,
        message: `${operation.sens === 'recette' ? 'Recette' : 'Dépense'} de ${Number(operation.montant).toLocaleString('fr-FR')} FCFA${niveau >= 1 ? ` — autorisation de la Direction requise (${LIBELLES_NIVEAU[niveau]})` : ''}`,
        lien: '/finances/operations',
        entityType: 'OperationFinanciere',
        entityId: operation.id,
        dedupeKey: `operation-a-valider:${operation.id}`,
      },
      user.id,
    );
    return this.presenter(operation);
  }

  async modifier(id: string, dto: UpdateOperationDto, user: FinanceUser) {
    const actuelle = await this.charger(id);
    this.assertModifiable(actuelle, user);
    const sens = dto.sens ?? actuelle.sens;
    if (dto.categorie || dto.sens) {
      await this.verifierCategorie(sens, dto.categorie ?? actuelle.categorie);
    }
    await this.verifierCompte(dto.compteId);
    const date = dto.date ? await this.verifierDate(dto.date) : undefined;
    // Le montant ou le sens change : le niveau d'autorisation aussi, et l'ancienne autorisation ne vaut plus.
    const montantFinal = dto.montant ?? Number(actuelle.montant);
    const niveau = await this.niveauPour(sens, montantFinal);
    const changeLEnjeu =
      (dto.montant !== undefined && dto.montant !== Number(actuelle.montant)) ||
      (dto.sens !== undefined && dto.sens !== actuelle.sens);
    const operation = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        niveauValidation: niveau,
        ...(changeLEnjeu
          ? {
              autoriseParId: null,
              autoriseLe: null,
              motifAutorisation: null,
              autorisationDistance: false,
            }
          : {}),
        ...(dto.nature ? { nature: dto.nature } : {}),
        ...(dto.compteId ? { compteId: dto.compteId } : {}),
        ...(dto.sens ? { sens: dto.sens } : {}),
        ...(dto.activite ? { activite: dto.activite } : {}),
        ...(dto.categorie ? { categorie: dto.categorie } : {}),
        ...(dto.libelle ? { libelle: dto.libelle.trim() } : {}),
        ...(dto.montant !== undefined ? { montant: dto.montant } : {}),
        ...(date ? { date } : {}),
        ...(dto.modePaiement !== undefined
          ? { modePaiement: dto.modePaiement.trim() || null }
          : {}),
        ...(dto.reference !== undefined
          ? { reference: dto.reference.trim() || null }
          : {}),
        ...(dto.tiers !== undefined ? { tiers: dto.tiers.trim() || null } : {}),
        // Une opération rejetée puis corrigée repart en validation.
        statut: 'en_attente',
        motifRejet: null,
      },
      include: INCLUDE,
    });
    return this.presenter(operation);
  }

  async valider(id: string, user: FinanceUser) {
    const operation = await this.charger(id);
    if (operation.statut !== 'en_attente') {
      throw new ConflictException('Cette opération n’est plus en attente');
    }
    const doubleValidation = await this.settings.getBoolean(
      'finances.doubleValidation',
      true,
    );
    if (doubleValidation && operation.createdById === user.id) {
      throw new ForbiddenException(
        'Une opération doit être validée par une autre personne que celle qui l’a saisie',
      );
    }
    await this.verifierAvantValidation(operation, user);
    await this.periodes.assertOuverte(operation.date);
    const validee = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        statut: 'validee',
        validatedById: user.id,
        validatedAt: new Date(),
      },
      include: INCLUDE,
    });
    return this.presenter(validee);
  }

  async rejeter(id: string, motif: string, user: FinanceUser) {
    const operation = await this.charger(id);
    if (operation.statut !== 'en_attente') {
      throw new ConflictException('Cette opération n’est plus en attente');
    }
    const rejetee = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        statut: 'rejetee',
        motifRejet: motif.trim(),
        validatedById: user.id,
        validatedAt: new Date(),
      },
      include: INCLUDE,
    });
    await this.notifications.notifier([operation.createdById], {
      type: 'operation_rejetee',
      niveau: 'alerte',
      titre: `Opération rejetée : ${operation.libelle}`,
      message: motif.trim(),
      lien: '/finances/operations',
      entityType: 'OperationFinanciere',
      entityId: id,
    });
    return this.presenter(rejetee);
  }

  async supprimer(id: string, user: FinanceUser): Promise<void> {
    const operation = await this.charger(id);
    this.assertModifiable(operation, user);
    await this.detruire(operation.justificatifKey, operation.justificatifType);
    await this.prisma.operationFinanciere.delete({ where: { id } });
  }

  async joindreJustificatif(
    id: string,
    file: Express.Multer.File | undefined,
    user: FinanceUser,
  ) {
    if (!file) throw new BadRequestException('Un fichier est obligatoire');
    const operation = await this.charger(id);
    this.assertModifiable(operation, user);
    validateUploadedAsset(file, 'document');
    const envoye = await this.cloudinary.upload(
      file,
      'finances/justificatifs',
      false,
    );
    const ancien = operation.justificatifKey;
    const misAJour = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        justificatifKey: envoye.publicId,
        justificatifType: envoye.resourceType,
      },
      include: INCLUDE,
    });
    await this.detruire(ancien, operation.justificatifType);
    return this.presenter(misAJour);
  }

  /**
   * Autorisation de la Direction : donnée par le droit « autoriser » ou par une
   * délégation plafonnée, jamais par l'auteur de la saisie. Elle précède la
   * validation de la comptable.
   */
  async autoriser(id: string, dto: AutorisationDto, user: FinanceUser) {
    const operation = await this.charger(id);
    if (operation.statut !== 'en_attente') {
      throw new ConflictException('Cette opération n’est plus en attente');
    }
    if (operation.niveauValidation < 1) {
      throw new ConflictException(
        'Cette opération est sous le premier seuil : la comptable la valide sans autorisation',
      );
    }
    if (operation.createdById === user.id) {
      throw new ForbiddenException(
        'On n’autorise pas sa propre saisie : une autre personne doit le faire',
      );
    }
    const delegations = await this.settings.getRawValue('finances.delegations');
    if (
      !peutAutoriser(
        user.permissions,
        delegations,
        user.id,
        Number(operation.montant),
      )
    ) {
      throw new ForbiddenException(
        'Votre pouvoir ne couvre pas ce montant : seule la Direction (ou un délégué habilité) autorise',
      );
    }
    const motif = dto.motif?.trim() || null;
    if ((operation.niveauValidation >= 2 || dto.distance) && !motif) {
      throw new BadRequestException(
        dto.distance
          ? 'Un paiement autorisé à distance doit être motivé'
          : 'Une autorisation expresse doit être motivée',
      );
    }
    await this.periodes.assertOuverte(operation.date);
    const autorisee = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        autoriseParId: user.id,
        autoriseLe: new Date(),
        motifAutorisation: motif,
        autorisationDistance: dto.distance === true,
      },
      include: INCLUDE,
    });
    // La comptable peut maintenant valider.
    await this.notifications.alerter(
      'finances:valider',
      {
        type: 'operation_autorisee',
        titre: `Opération autorisée : ${operation.libelle}`,
        message: 'Autorisée par la Direction — prête à être validée',
        lien: '/finances/operations',
        entityType: 'OperationFinanciere',
        entityId: id,
        dedupeKey: `operation-autorisee:${id}`,
      },
      user.id,
    );
    return this.presenter(autorisee);
  }

  /**
   * Corrige une écriture validée sans l'effacer : une nouvelle écriture la
   * référence (annulation ou ajustement), à la date du jour, avec son motif.
   * Un impact financier exige l'autorisation de la Direction, même sous le
   * premier seuil.
   */
  async corriger(id: string, dto: CorrectionDto, user: FinanceUser) {
    const origine = await this.charger(id);
    if (origine.statut !== 'validee') {
      throw new ConflictException(
        'Seule une écriture validée se corrige par une écriture liée : avant cela, modifiez-la ou supprimez-la',
      );
    }
    if (origine.corrigeId) {
      throw new ConflictException(
        'Une correction ne se corrige pas : corrigez l’écriture d’origine',
      );
    }
    const enCours = await this.prisma.operationFinanciere.count({
      where: { corrigeId: id, statut: { in: ['en_attente', 'validee'] } },
    });
    if (enCours > 0) {
      throw new ConflictException(
        'Cette écriture a déjà une correction en cours ou validée',
      );
    }
    const annulation = dto.type === 'annulation';
    const sens = annulation
      ? origine.sens === 'recette'
        ? 'depense'
        : 'recette'
      : dto.sens;
    const montant = annulation ? Number(origine.montant) : dto.montant;
    if (!sens || !montant) {
      throw new BadRequestException(
        'Un ajustement précise le sens et le montant de la nouvelle écriture',
      );
    }
    const aujourdhui = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    await this.periodes.assertOuverte(aujourdhui);
    const niveau = Math.max(
      1,
      await this.niveauPour(sens, montant),
    ) as NiveauValidation;
    const correction = await this.prisma.operationFinanciere.create({
      data: {
        sens,
        activite: origine.activite,
        categorie: origine.categorie,
        libelle:
          `${annulation ? 'Annulation' : 'Ajustement'} — ${origine.libelle}`.slice(
            0,
            200,
          ),
        montant,
        date: aujourdhui,
        modePaiement: origine.modePaiement,
        reference: origine.reference,
        tiers: origine.tiers,
        nature: origine.nature,
        compteId: origine.compteId,
        niveauValidation: niveau,
        corrigeId: id,
        motifCorrection: dto.motif.trim(),
        createdById: user.id,
      },
      include: INCLUDE,
    });
    await this.notifications.alerter(
      'finances:autoriser',
      {
        type: 'correction_a_autoriser',
        titre: `Correction à autoriser : ${origine.libelle}`,
        message: `${dto.motif.trim()} — ${Number(montant).toLocaleString('fr-FR')} FCFA`,
        lien: '/finances/operations',
        entityType: 'OperationFinanciere',
        entityId: correction.id,
        dedupeKey: `correction-a-autoriser:${correction.id}`,
      },
      user.id,
    );
    return this.presenter(correction);
  }

  // --- règles ---

  /** Les contrôles qui précèdent la validation : pièce, autorisation, séparation des rôles. */
  private async verifierAvantValidation(
    operation: OperationAvecAuteurs,
    user: FinanceUser,
  ): Promise<void> {
    if (operation.sens === 'depense') {
      const exige = await this.settings.getBoolean(
        'finances.justificatifObligatoire',
        true,
      );
      if (exige && !operation.justificatifKey) {
        throw new BadRequestException(
          'Une dépense se valide avec sa pièce justificative (facture, reçu ou bon de dépense) : joignez-la d’abord',
        );
      }
    }
    if (operation.niveauValidation >= 1 && !operation.autoriseParId) {
      throw new ConflictException(
        `Cette opération demande l’autorisation de la Direction (${LIBELLES_NIVEAU[operation.niveauValidation as NiveauValidation]}) avant d’être validée`,
      );
    }
    // Contrôle renforcé : celui qui autorise n'est pas celui qui valide.
    if (
      operation.niveauValidation >= 3 &&
      operation.autoriseParId === user.id
    ) {
      throw new ForbiddenException(
        'Au-delà du dernier seuil, l’autorisation et la validation viennent de deux personnes différentes',
      );
    }
  }

  /** Modifiable : tant qu'elle n'est pas validée, par son auteur ou par l'administration des finances. */
  private assertModifiable(
    operation:
      OperationAvecAuteurs | Prisma.OperationFinanciereGetPayload<object>,
    user: FinanceUser,
  ): void {
    if (operation.statut === 'validee') {
      throw new ConflictException(
        'Une opération validée ne se modifie plus : enregistrez une opération inverse pour la corriger',
      );
    }
    if (
      operation.createdById !== user.id &&
      !user.permissions.includes('finances:administrer')
    ) {
      throw new ForbiddenException(
        'Seul l’auteur de la saisie ou l’administration des finances la modifie',
      );
    }
  }

  /** Retire un justificatif du stockage ; un échec ne bloque jamais l'opération métier. */
  private async detruire(
    cle: string | null,
    type: string | null,
  ): Promise<void> {
    if (!cle) return;
    try {
      await this.cloudinary.destroy(cle, type ?? 'raw', false);
    } catch {
      /* le fichier orphelin sera nettoyé à la main : ce n'est pas une raison de refuser la suppression */
    }
  }

  private async charger(id: string) {
    const operation = await this.prisma.operationFinanciere.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!operation) throw new NotFoundException('Opération introuvable');
    return operation;
  }

  private async verifierDate(valeur: string): Promise<Date> {
    const date = new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`);
    if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException(
        'La date d’une opération ne peut pas être dans le futur',
      );
    }
    await this.periodes.assertOuverte(date);
    return date;
  }

  private async verifierCategorie(sens: string, categorie: string) {
    const { depenses, recettes } = await this.categories();
    const permises = sens === 'recette' ? recettes : depenses;
    if (!permises.includes(categorie)) {
      throw new BadRequestException(
        `Catégorie « ${categorie} » inconnue pour une ${sens === 'recette' ? 'recette' : 'dépense'}`,
      );
    }
  }

  presenter(operation: OperationAvecAuteurs) {
    const { justificatifKey, justificatifType, ...reste } = operation;
    return {
      ...reste,
      numero: numeroOperation('OP', operation.createdAt, operation.numeroSeq),
      niveauLibelle:
        LIBELLES_NIVEAU[operation.niveauValidation as NiveauValidation],
      aAutoriser:
        operation.statut === 'en_attente' &&
        operation.niveauValidation >= 1 &&
        !operation.autoriseParId,
      justificatifManquant: operation.sens === 'depense' && !justificatifKey,
      montant: Number(operation.montant),
      justificatifUrl: justificatifKey
        ? this.cloudinary.url(justificatifKey, justificatifType ?? 'raw', false)
        : null,
    };
  }
}
