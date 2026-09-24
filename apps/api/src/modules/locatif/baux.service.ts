import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../database/prisma.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import {
  BAIL_STATUTS_TERMINES,
  LocatifOptionsService,
} from './locatif-options.service';
import {
  deriveEcheanceStatut,
  genererEcheances,
  rafraichirStatutsEcheances,
  LOT_ECHEANCES,
} from './echeance-loyer.helper';
import {
  calculerRegularisation,
  synchroniserSituationPaiement,
  type Regularisation,
} from './locatif-finance.helper';
import { synchroniserCautionDuBail } from './caution.service';
import {
  ChangerLocataireDto,
  CreateBailDto,
  PreavisBailDto,
  ResiliationSansPreavisDto,
  SortieBailDto,
  UpdateBailDto,
} from './dto/bail.dto';

const bailInclude = {
  locataire: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  echeances: { orderBy: { periode: 'asc' as const } },
  incidents: { orderBy: { createdAt: 'desc' as const } },
  mouvementsCaution: { orderBy: { date: 'desc' as const } },
} satisfies Prisma.BailLocatifInclude;

/**
 * Baux d'un bien locatif (J2.1, section 15 du cahier des charges).
 *
 * Un bail avance en un cycle simple : actif → (préavis) → terminé, ou
 * directement résilié sans préavis (cas particulier explicitement prévu par
 * la section 15). Un changement de locataire clôt ce bail et en ouvre un
 * nouveau sur le même bien, sans jamais réécrire l'historique.
 */
@Injectable()
export class BauxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
  ) {}

  async findAll(bienLocatifId: string, user: LocatifUser) {
    await this.access.ensureBienAccessible(bienLocatifId, user);
    const baux = await this.prisma.bailLocatif.findMany({
      where: { bienLocatifId },
      select: { id: true },
    });
    await this.rafraichir(baux.map((bail) => bail.id));
    return this.prisma.bailLocatif.findMany({
      where: { bienLocatifId },
      include: {
        locataire: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: { echeances: true, paiements: true, incidents: true },
        },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async findOne(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.rafraichir([bailLocatifId]);
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      include: bailInclude,
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    return bail;
  }

  async create(bienLocatifId: string, dto: CreateBailDto, user: LocatifUser) {
    await this.access.ensureBienAccessible(bienLocatifId, user);
    return this.enTransaction((transaction) =>
      this.creerBail(transaction, bienLocatifId, dto, user),
    );
  }

  /**
   * Création d'un bail, dans la transaction de l'appelant : le changement de
   * locataire clôt l'ancien bail et ouvre le nouveau d'un seul bloc, pour ne
   * jamais laisser un bien marqué loué sans bail actif.
   */
  private async creerBail(
    transaction: PrismaTransaction,
    bienLocatifId: string,
    dto: CreateBailDto,
    user: LocatifUser,
  ) {
    const bien = await transaction.bienLocatif.findUnique({
      where: { id: bienLocatifId },
      select: { id: true },
    });
    if (!bien) throw new NotFoundException('Bien locatif introuvable');
    const bailActif = await transaction.bailLocatif.findFirst({
      where: { bienLocatifId, statut: { in: ['actif', 'preavis'] } },
      select: { id: true },
    });
    if (bailActif) {
      throw new ConflictException(
        'Ce bien a déjà un bail actif : clôturez-le ou passez par « changement de locataire »',
      );
    }
    const locataire = await transaction.locataire.findUnique({
      where: { id: dto.locataireId },
      select: { id: true },
    });
    if (!locataire) throw new BadRequestException('Locataire introuvable');

    const dateDebut = new Date(dto.dateDebut);
    const dateFin = dto.dateFin ? new Date(dto.dateFin) : null;
    if (dateFin && dateFin.getTime() <= dateDebut.getTime()) {
      throw new BadRequestException(
        'La date de fin du bail doit suivre sa date de début',
      );
    }
    const jourEcheance = dto.jourEcheance ?? 5;

    const bail = await transaction.bailLocatif.create({
      data: {
        referenceInterne: await this.nextReference(transaction),
        bienLocatifId,
        locataireId: dto.locataireId,
        loyerMensuel: dto.loyerMensuel,
        charges: dto.charges,
        jourEcheance,
        dateDebut,
        dateFin,
        cautionMontant: dto.cautionMontant,
        etatLieuxEntree: dto.etatLieuxEntree,
        createdById: user.id,
      },
    });
    await genererEcheances(
      transaction,
      {
        bailLocatifId: bail.id,
        loyerMensuel: dto.loyerMensuel,
        jourEcheance,
        dateDebut,
        dateFin,
      },
      LOT_ECHEANCES,
    );

    // Caution annoncée comme déjà encaissée : première ligne d'historique,
    // sans quoi le statut resterait « non versée » alors que l'argent est là.
    if (dto.cautionMontant && dto.cautionMontant > 0 && dto.cautionDate) {
      await transaction.mouvementCaution.create({
        data: {
          bailLocatifId: bail.id,
          type: 'versement',
          montant: dto.cautionMontant,
          date: new Date(dto.cautionDate),
          justification: 'Caution encaissée à la signature du bail',
          recordedById: user.id,
        },
      });
      await synchroniserCautionDuBail(transaction, bail.id);
    }

    await transaction.bienLocatif.update({
      where: { id: bienLocatifId },
      data: { statut: 'loue' },
    });
    return transaction.bailLocatif.findUniqueOrThrow({
      where: { id: bail.id },
      include: bailInclude,
    });
  }

  /**
   * Correction d'un bail en cours. Une révision de loyer se répercute sur les
   * échéances futures encore dues : sans cela, le nouveau loyer ne serait
   * jamais réclamé.
   */
  async update(bailLocatifId: string, dto: UpdateBailDto, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);

    return this.enTransaction(async (transaction) => {
      const bail = await transaction.bailLocatif.findUnique({
        where: { id: bailLocatifId },
        select: {
          id: true,
          statut: true,
          loyerMensuel: true,
          jourEcheance: true,
          dateDebut: true,
          dateFin: true,
        },
      });
      if (!bail) throw new NotFoundException('Bail introuvable');
      this.assertBailModifiable(bail.statut);

      const dateFin =
        dto.dateFin === undefined
          ? undefined
          : dto.dateFin
            ? new Date(dto.dateFin)
            : null;
      if (dateFin && dateFin.getTime() <= bail.dateDebut.getTime()) {
        throw new BadRequestException(
          'La date de fin du bail doit suivre sa date de début',
        );
      }

      await transaction.bailLocatif.update({
        where: { id: bailLocatifId },
        data: {
          ...(dto.loyerMensuel !== undefined
            ? { loyerMensuel: dto.loyerMensuel }
            : {}),
          ...(dto.charges !== undefined ? { charges: dto.charges } : {}),
          ...(dateFin !== undefined ? { dateFin } : {}),
          ...(dto.etatLieuxEntree !== undefined
            ? { etatLieuxEntree: dto.etatLieuxEntree }
            : {}),
          ...(dto.cautionMontant !== undefined
            ? { cautionMontant: dto.cautionMontant }
            : {}),
        },
      });

      if (
        dto.loyerMensuel !== undefined &&
        dto.loyerMensuel !== Number(bail.loyerMensuel)
      ) {
        await this.appliquerNouveauLoyer(
          transaction,
          bailLocatifId,
          dto.loyerMensuel,
          dto.loyerApplicableLe ? new Date(dto.loyerApplicableLe) : new Date(),
        );
      }

      if (dateFin !== undefined) {
        await this.ajusterHorizonSurDateFin(transaction, {
          bailLocatifId,
          loyerMensuel: dto.loyerMensuel ?? Number(bail.loyerMensuel),
          jourEcheance: bail.jourEcheance,
          dateDebut: bail.dateDebut,
          dateFin,
        });
      }

      await synchroniserCautionDuBail(transaction, bailLocatifId);
      await synchroniserSituationPaiement(
        transaction,
        bailLocatifId,
        await this.options.getImpayeProlongeJours(),
      );
      return transaction.bailLocatif.findUniqueOrThrow({
        where: { id: bailLocatifId },
        include: bailInclude,
      });
    });
  }

  /** Étape « préavis » (section 15) : le locataire a annoncé son départ. */
  async donnerPreavis(
    bailLocatifId: string,
    dto: PreavisBailDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const bail = await this.getBailActif(bailLocatifId);
    const donneLe = new Date(dto.preavisDonneLe);
    const departPrevu = new Date(dto.preavisDepartPrevu);
    if (departPrevu.getTime() < donneLe.getTime()) {
      throw new BadRequestException(
        'Le départ prévu ne peut pas précéder la date du préavis',
      );
    }
    return this.prisma.bailLocatif.update({
      where: { id: bail.id },
      data: {
        statut: 'preavis',
        preavisDonneLe: donneLe,
        preavisDepartPrevu: departPrevu,
      },
      include: bailInclude,
    });
  }

  /**
   * Calcul de régularisation de sortie (section 15), sans rien écrire : ce que
   * l'écran de clôture propose à l'opérateur avant qu'il ne confirme.
   */
  async previsualiserRegularisation(
    bailLocatifId: string,
    dateSortie: string | undefined,
    user: LocatifUser,
  ): Promise<Regularisation> {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.rafraichir([bailLocatifId]);
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: {
        id: true,
        cautionMontant: true,
        dateSortieReelle: true,
        preavisDepartPrevu: true,
      },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    const reference = dateSortie
      ? new Date(dateSortie)
      : (bail.dateSortieReelle ?? bail.preavisDepartPrevu ?? new Date());
    return calculerRegularisation(this.prisma, bail, reference);
  }

  /** Sortie normale : état des lieux, régularisation, clôture du bail. */
  async cloturer(bailLocatifId: string, dto: SortieBailDto, user: LocatifUser) {
    const { bienLocatifId } = await this.access.ensureBailAccessible(
      bailLocatifId,
      user,
    );
    await this.rafraichir([bailLocatifId]);
    const impayeProlongeJours = await this.options.getImpayeProlongeJours();

    return this.enTransaction(async (transaction) => {
      const bail = await transaction.bailLocatif.findUnique({
        where: { id: bailLocatifId },
        select: { id: true, statut: true, cautionMontant: true },
      });
      if (!bail) throw new NotFoundException('Bail introuvable');
      this.assertBailModifiable(bail.statut);

      const dateSortie = new Date(dto.dateSortieReelle);
      const calcul = await calculerRegularisation(
        transaction,
        { ...bail, dateSortieReelle: null },
        dateSortie,
      );

      const retenue = dto.cautionRetenue ?? calcul.retenueCautionProposee;
      const remboursement =
        dto.cautionRembourseeMontant ?? calcul.cautionARembourserProposee;
      this.assertSortieCautionCoherente(
        retenue,
        remboursement,
        calcul,
        dto,
        user,
      );

      await this.neutraliserEcheancesApresSortie(
        transaction,
        bailLocatifId,
        dateSortie,
      );

      if (retenue > 0) {
        await transaction.mouvementCaution.create({
          data: {
            bailLocatifId,
            type: 'retenue',
            montant: retenue,
            date: dateSortie,
            justification:
              dto.cautionJustification ??
              'Retenue sur caution à la sortie du locataire',
            recordedById: user.id,
          },
        });
      }
      if (remboursement > 0) {
        await transaction.mouvementCaution.create({
          data: {
            bailLocatifId,
            type: 'remboursement',
            montant: remboursement,
            date: dateSortie,
            justification: 'Restitution de caution à la sortie',
            recordedById: user.id,
          },
        });
      }

      await transaction.bailLocatif.update({
        where: { id: bailLocatifId },
        data: {
          statut: 'termine',
          dateSortieReelle: dateSortie,
          dateFin: dateSortie,
          etatLieuxSortie: dto.etatLieuxSortie,
          regularisationMontant:
            dto.regularisationMontant ?? calcul.montantPropose,
          regularisationNotes: dto.regularisationNotes,
          motifCloture: dto.motifCloture ?? 'Sortie du locataire',
        },
      });
      await synchroniserCautionDuBail(transaction, bailLocatifId);
      await synchroniserSituationPaiement(
        transaction,
        bailLocatifId,
        impayeProlongeJours,
      );
      await transaction.bienLocatif.update({
        where: { id: bienLocatifId },
        data: { statut: 'disponible' },
      });
      return transaction.bailLocatif.findUniqueOrThrow({
        where: { id: bailLocatifId },
        include: bailInclude,
      });
    });
  }

  /** Cas particulier (section 15) : départ sans préavis. */
  async resilierSansPreavis(
    bailLocatifId: string,
    dto: ResiliationSansPreavisDto,
    user: LocatifUser,
  ) {
    const { bienLocatifId } = await this.access.ensureBailAccessible(
      bailLocatifId,
      user,
    );
    const impayeProlongeJours = await this.options.getImpayeProlongeJours();

    return this.enTransaction(async (transaction) => {
      const bail = await transaction.bailLocatif.findUnique({
        where: { id: bailLocatifId },
        select: { id: true, statut: true },
      });
      if (!bail) throw new NotFoundException('Bail introuvable');
      this.assertBailModifiable(bail.statut);

      const dateSortie = dto.dateSortieReelle
        ? new Date(dto.dateSortieReelle)
        : new Date();
      // Les mois postérieurs au départ constaté ne sont plus dus : sans cette
      // neutralisation, le bail continuerait d'accumuler des impayés au nom
      // d'un locataire parti.
      await this.neutraliserEcheancesApresSortie(
        transaction,
        bailLocatifId,
        dateSortie,
      );
      const resilie = await transaction.bailLocatif.update({
        where: { id: bailLocatifId },
        data: {
          statut: 'resilie_sans_preavis',
          dateSortieReelle: dateSortie,
          dateFin: dateSortie,
          motifCloture: dto.motifCloture,
        },
        include: bailInclude,
      });
      await synchroniserSituationPaiement(
        transaction,
        bailLocatifId,
        impayeProlongeJours,
      );
      await transaction.bienLocatif.update({
        where: { id: bienLocatifId },
        data: { statut: 'disponible' },
      });
      return resilie;
    });
  }

  /**
   * Changement de locataire (section 15) : clôt le bail en cours et ouvre
   * le suivant sur le même bien, dans une seule transaction — si l'ouverture
   * échoue, l'ancien bail n'est pas clôturé pour rien.
   */
  async changerLocataire(
    bienLocatifId: string,
    dto: ChangerLocataireDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBienAccessible(bienLocatifId, user);
    const impayeProlongeJours = await this.options.getImpayeProlongeJours();

    return this.enTransaction(async (transaction) => {
      const bailActuel = await transaction.bailLocatif.findFirst({
        where: { bienLocatifId, statut: { in: ['actif', 'preavis'] } },
        select: { id: true },
      });
      if (!bailActuel) {
        throw new BadRequestException(
          'Aucun bail actif sur ce bien à remplacer : créez simplement un nouveau bail',
        );
      }
      const dateSortie = new Date(dto.dateSortieReelle);
      await this.neutraliserEcheancesApresSortie(
        transaction,
        bailActuel.id,
        dateSortie,
      );
      await transaction.bailLocatif.update({
        where: { id: bailActuel.id },
        data: {
          statut: 'termine',
          dateSortieReelle: dateSortie,
          dateFin: dateSortie,
          motifCloture: dto.motifCloture ?? 'Changement de locataire',
          etatLieuxSortie: dto.etatLieuxSortie,
        },
      });
      await synchroniserSituationPaiement(
        transaction,
        bailActuel.id,
        impayeProlongeJours,
      );
      return this.creerBail(transaction, bienLocatifId, dto.nouveauBail, user);
    });
  }

  /** Rafraîchit les statuts d'échéance d'une liste de baux. */
  rafraichir(bailLocatifIds: string[]): Promise<number> {
    return rafraichirStatutsEcheances(this.prisma, bailLocatifIds);
  }

  private async getBailActif(bailLocatifId: string) {
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: { id: true, statut: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    this.assertBailModifiable(bail.statut);
    return bail;
  }

  private assertBailModifiable(statut: string): void {
    if (
      BAIL_STATUTS_TERMINES.includes(
        statut as (typeof BAIL_STATUTS_TERMINES)[number],
      )
    ) {
      throw new ConflictException('Ce bail est déjà clôturé');
    }
  }

  /**
   * La restitution de caution est une sortie de trésorerie : la section 24
   * lui réserve la permission « payer », distincte de « modifier ».
   */
  private assertSortieCautionCoherente(
    retenue: number,
    remboursement: number,
    calcul: Regularisation,
    dto: SortieBailDto,
    user: LocatifUser,
  ): void {
    if (retenue < 0 || remboursement < 0) {
      throw new BadRequestException(
        'Les montants de caution ne peuvent pas être négatifs',
      );
    }
    if (retenue + remboursement > calcul.caution.disponible) {
      throw new BadRequestException(
        `Retenue et remboursement (${(retenue + remboursement).toLocaleString('fr-FR')} FCFA) dépassent la caution détenue (${calcul.caution.disponible.toLocaleString('fr-FR')} FCFA)`,
      );
    }
    if (retenue > 0 && !dto.cautionJustification?.trim()) {
      throw new BadRequestException(
        'Une retenue sur caution doit être justifiée (section 15)',
      );
    }
    if (
      remboursement > 0 &&
      !(user.permissions ?? []).includes('locatif:payer')
    ) {
      throw new ForbiddenException(
        'La restitution de caution demande la permission « payer » de la gestion locative',
      );
    }
  }

  /**
   * Neutralise les mois postérieurs à la sortie. Ce qui y avait été versé
   * d'avance n'est pas effacé : il est déjà compté comme crédit du locataire
   * par le calcul de régularisation, qui tourne avant cette opération.
   */
  private async neutraliserEcheancesApresSortie(
    transaction: PrismaTransaction,
    bailLocatifId: string,
    dateSortie: Date,
  ): Promise<void> {
    await transaction.echeanceLoyer.updateMany({
      where: { bailLocatifId, periode: { gt: dateSortie } },
      data: { statut: 'annulee', montantPrevu: 0, montantPaye: 0 },
    });
  }

  /**
   * Applique un nouveau loyer aux échéances à partir d'une date : seules
   * celles qui ne sont pas encore réglées bougent, pour ne pas réécrire un
   * mois déjà quittancé.
   */
  private async appliquerNouveauLoyer(
    transaction: PrismaTransaction,
    bailLocatifId: string,
    loyerMensuel: number,
    applicableLe: Date,
  ): Promise<void> {
    const echeances = await transaction.echeanceLoyer.findMany({
      where: {
        bailLocatifId,
        statut: { notIn: ['payee', 'annulee'] },
        periode: {
          gte: new Date(
            Date.UTC(
              applicableLe.getUTCFullYear(),
              applicableLe.getUTCMonth(),
              1,
            ),
          ),
        },
      },
    });
    for (const echeance of echeances) {
      await transaction.echeanceLoyer.update({
        where: { id: echeance.id },
        data: {
          montantPrevu: loyerMensuel,
          statut: deriveEcheanceStatut(
            loyerMensuel,
            Number(echeance.montantPaye),
            echeance.dateEcheance,
          ),
        },
      });
    }
  }

  /**
   * Aligne les échéances sur une date de fin qui vient d'être posée ou
   * repoussée : on ne réclame pas des mois hors bail, et on n'en laisse pas
   * manquer si le bail est prolongé.
   */
  private async ajusterHorizonSurDateFin(
    transaction: PrismaTransaction,
    params: {
      bailLocatifId: string;
      loyerMensuel: number;
      jourEcheance: number;
      dateDebut: Date;
      dateFin: Date | null;
    },
  ): Promise<void> {
    if (params.dateFin) {
      await transaction.echeanceLoyer.deleteMany({
        where: {
          bailLocatifId: params.bailLocatifId,
          periode: { gt: params.dateFin },
          montantPaye: 0,
        },
      });
      return;
    }
    await genererEcheances(transaction, params, LOT_ECHEANCES);
  }

  private async nextReference(transaction: PrismaTransaction): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `B-${annee}-`;
    const emises = await transaction.bailLocatif.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await transaction.bailLocatif.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      'Impossible d’attribuer une référence de bail, réessayez',
    );
  }

  /**
   * Sérialisable : c'est ce qui garantit vraiment « un seul bail actif par
   * bien » quand deux collaborateurs enregistrent en même temps, sans index
   * partiel hors schéma Prisma.
   */
  private enTransaction<T>(
    operation: (transaction: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma
      .$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          throw new ConflictException(
            'Cette opération est en conflit avec une autre en cours, réessayez',
          );
        }
        throw error;
      });
  }
}
