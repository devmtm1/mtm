import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  COMMERCIAL_ROLES,
  COMMISSION_APPROVER_ROLES,
  hasAnyRole,
} from '../rbac/role-groups';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import { VentesWorkflowService } from './ventes-workflow.service';

/**
 * Commissions des commerciaux (section 12 CDC) : calcul selon la règle
 * paramétrée (pourcentage, forfait, palier, bonus) puis workflow
 * estimée → validée → payée.
 */
@Injectable()
export class VentesCommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: VentesAccessService,
    private readonly workflow: VentesWorkflowService,
  ) {}

  /**
   * Les commissions de la personne connectée, tous dossiers confondus : où en
   * est chacune (estimée, validée, payée) et sur quelle vente. Un commercial ne
   * voyait jusqu'ici que trois totaux sur son tableau de bord.
   */
  async listerMesCommissions(user: MandatUser) {
    const lignes = await this.prisma.commissionVente.findMany({
      where: { commercialId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            statut: true,
            prixVente: true,
            prospect: { select: { nom: true, prenom: true } },
            terrain: { select: { referenceInterne: true, nom: true } },
          },
        },
      },
    });
    const nombre = (valeur: unknown) =>
      valeur === null ? null : Number(valeur);
    const items = lignes.map((ligne) => ({
      id: ligne.id,
      statut: ligne.statut,
      montantEstime: Number(ligne.montantEstime),
      montantValide: nombre(ligne.montantValide),
      montantPaye: nombre(ligne.montantPaye),
      creeeLe: ligne.createdAt.toISOString(),
      dossier: {
        id: ligne.dossierVente.id,
        reference: ligne.dossierVente.referenceInterne,
        statut: ligne.dossierVente.statut,
        prixVente: nombre(ligne.dossierVente.prixVente),
        client: [
          ligne.dossierVente.prospect?.prenom,
          ligne.dossierVente.prospect?.nom,
        ]
          .filter(Boolean)
          .join(' '),
        bien: ligne.dossierVente.terrain
          ? `${ligne.dossierVente.terrain.referenceInterne} — ${ligne.dossierVente.terrain.nom}`
          : null,
      },
    }));
    const somme = (
      statut: string,
      champ: 'montantEstime' | 'montantValide' | 'montantPaye',
    ) =>
      items
        .filter((item) => item.statut === statut)
        .reduce(
          (total, item) => total + (item[champ] ?? item.montantEstime),
          0,
        );
    return {
      items,
      totaux: {
        estimees: somme('estimee', 'montantEstime'),
        valideesAPayer: somme('validee', 'montantValide'),
        payees: somme('payee', 'montantPaye'),
      },
    };
  }

  async createCommission(
    id: string,
    dto: CreateCommissionDto,
    user: MandatUser,
  ) {
    await this.access.ensureAccessible(id, user);
    const [dossier, commercial, rule] = await Promise.all([
      this.prisma.dossierVente.findUnique({
        where: { id },
        select: { id: true, prixVente: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.commercialId },
        select: {
          id: true,
          isActive: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      }),
      this.workflow.getCommissionRule(dto.regleId),
    ]);
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');
    if (!commercial || !commercial.isActive)
      throw new NotFoundException('Commercial actif introuvable');
    // Même liste que les bénéficiaires proposés par le back-office
    // (porteurs possibles d'un dossier : CRM « commerciaux »).
    if (
      !hasAnyRole(
        commercial.roles.map(({ role }) => role.name),
        COMMERCIAL_ROLES,
      )
    ) {
      throw new BadRequestException(
        'Le bénéficiaire doit avoir un rôle commercial',
      );
    }
    if (rule.taux !== undefined && rule.montantFixe !== undefined) {
      throw new BadRequestException(
        'Choisissez un taux ou un montant fixe, pas les deux',
      );
    }
    if (rule.taux === undefined && rule.montantFixe === undefined) {
      throw new BadRequestException(
        'Un taux ou un montant fixe est obligatoire',
      );
    }
    if (rule.taux !== undefined && rule.taux > 100) {
      throw new BadRequestException(
        'Le taux de commission ne peut pas dépasser 100 %',
      );
    }

    const prixVente = Number(dossier.prixVente ?? 0);
    const baseCommission =
      rule.montantFixe ?? (prixVente * (rule.taux ?? 0)) / 100;
    const montantEstime =
      rule.palier !== undefined && prixVente >= Number(rule.palier)
        ? baseCommission + Number(rule.bonus ?? 0)
        : baseCommission;

    const commission = await this.prisma.commissionVente.create({
      data: {
        dossierVenteId: id,
        commercialId: dto.commercialId,
        typeRegle: rule.typeRegle,
        taux: rule.taux,
        montantFixe: rule.montantFixe,
        montantEstime,
        bonus: rule.bonus,
        palier: rule.palier,
        createdById: user.id,
      },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    await this.prisma.dossierVente.update({
      where: { id },
      data: { commissionEstimee: { increment: montantEstime } },
    });
    return commission;
  }

  /**
   * Validation = second niveau d'encadrement (manager, direction), et jamais
   * la personne qui a créé l'estimation : quatre yeux sur un montant dû.
   */
  async validateCommission(id: string, commissionId: string, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    if (!hasAnyRole(user.roles, COMMISSION_APPROVER_ROLES)) {
      throw new ForbiddenException(
        'La validation d’une commission est réservée au manager ou à la direction',
      );
    }
    const commission = await this.prisma.commissionVente.findFirst({
      where: { id: commissionId, dossierVenteId: id },
    });
    if (!commission)
      throw new NotFoundException('Commission de vente introuvable');
    if (commission.statut !== 'estimee') {
      throw new ConflictException('Cette commission a déjà été traitée');
    }
    if (commission.createdById === user.id) {
      throw new ForbiddenException(
        'Une commission doit être validée par une autre personne que celle qui l’a créée',
      );
    }
    return this.prisma.commissionVente.update({
      where: { id: commissionId },
      data: {
        statut: 'validee',
        montantValide: commission.montantEstime,
        validatedById: user.id,
      },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async payCommission(id: string, commissionId: string, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: { statut: true },
    });
    if (!dossier || dossier.statut !== 'solde') {
      throw new ConflictException(
        'Une commission ne peut être payée que pour une vente soldée.',
      );
    }
    const commission = await this.prisma.commissionVente.findFirst({
      where: { id: commissionId, dossierVenteId: id },
    });
    if (!commission)
      throw new NotFoundException('Commission de vente introuvable');
    if (commission.statut !== 'validee' || commission.montantValide === null) {
      throw new ConflictException(
        'La commission doit être validée avant paiement',
      );
    }
    return this.prisma.commissionVente.update({
      where: { id: commissionId },
      data: { statut: 'payee', montantPaye: commission.montantValide },
      include: {
        commercial: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
