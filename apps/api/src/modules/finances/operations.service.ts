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
  CreateOperationDto,
  QueryOperationsDto,
  UpdateOperationDto,
} from './dto/finances.dto';
import { PeriodesFinancieresService } from './periodes.service';

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

type OperationAvecAuteurs = Prisma.OperationFinanciereGetPayload<{
  include: { createdBy: typeof personne; validatedBy: typeof personne };
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
    };
    const [total, items] = await Promise.all([
      this.prisma.operationFinanciere.count({ where }),
      this.prisma.operationFinanciere.findMany({
        where,
        include: { createdBy: personne, validatedBy: personne },
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

  async creer(dto: CreateOperationDto, user: FinanceUser) {
    const date = await this.verifierDate(dto.date);
    await this.verifierCategorie(dto.sens, dto.categorie);
    const operation = await this.prisma.operationFinanciere.create({
      data: {
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
      include: { createdBy: personne, validatedBy: personne },
    });
    // Les valideurs sont prévenus : une saisie sans valideur attentif ne compte jamais.
    await this.notifications.alerter(
      'finances:valider',
      {
        type: 'operation_a_valider',
        titre: `Opération à valider : ${operation.libelle}`,
        message: `${operation.sens === 'recette' ? 'Recette' : 'Dépense'} de ${Number(operation.montant).toLocaleString('fr-FR')} FCFA`,
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
    const date = dto.date ? await this.verifierDate(dto.date) : undefined;
    const operation = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
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
      include: { createdBy: personne, validatedBy: personne },
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
    await this.periodes.assertOuverte(operation.date);
    const validee = await this.prisma.operationFinanciere.update({
      where: { id },
      data: {
        statut: 'validee',
        validatedById: user.id,
        validatedAt: new Date(),
      },
      include: { createdBy: personne, validatedBy: personne },
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
      include: { createdBy: personne, validatedBy: personne },
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
      include: { createdBy: personne, validatedBy: personne },
    });
    await this.detruire(ancien, operation.justificatifType);
    return this.presenter(misAJour);
  }

  // --- règles ---

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
      include: { createdBy: personne, validatedBy: personne },
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
      montant: Number(operation.montant),
      justificatifUrl: justificatifKey
        ? this.cloudinary.url(justificatifKey, justificatifType ?? 'raw', false)
        : null,
    };
  }
}
