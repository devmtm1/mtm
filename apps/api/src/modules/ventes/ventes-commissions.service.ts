import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
    if (
      !commercial.roles.some(({ role }) =>
        ['commercial', 'responsable_commercial', 'manager'].includes(role.name),
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

  async validateCommission(id: string, commissionId: string, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    const commission = await this.prisma.commissionVente.findFirst({
      where: { id: commissionId, dossierVenteId: id },
    });
    if (!commission)
      throw new NotFoundException('Commission de vente introuvable');
    if (commission.statut !== 'estimee') {
      throw new ConflictException('Cette commission a déjà été traitée');
    }
    return this.prisma.commissionVente.update({
      where: { id: commissionId },
      data: { statut: 'validee', montantValide: commission.montantEstime },
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
