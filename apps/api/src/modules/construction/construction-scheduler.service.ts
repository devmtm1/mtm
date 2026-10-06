import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConstructionOptionsService } from './construction-options.service';
import {
  STATUTS_CHANTIER_TERMINES,
  synchroniserChantier,
} from './chantier.helper';

/**
 * Entretien quotidien des chantiers (J2.3).
 *
 * Les alertes de la section 16 portent sur le temps qui passe : un jalon
 * dont l'échéance tombe cette nuit devient un retard demain matin sans que
 * personne n'ait rien saisi. Aucune action utilisateur ne peut donc les
 * produire — il faut un passage quotidien qui recale, pour chaque chantier
 * actif, son avancement, sa consommation de budget et sa situation d'alerte.
 *
 * Le calcul étant idempotent, un jour manqué se rattrape de lui-même.
 */
/** Ce qui dérape sur un chantier, en quelques mots. */
function libelleSituation(situation: string): string {
  if (situation === 'retard_et_depassement') return 'en retard et hors budget';
  if (situation === 'depassement_budget') return 'budget dépassé';
  return 'en retard';
}

@Injectable()
export class ConstructionSchedulerService {
  private readonly logger = new Logger(ConstructionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly options: ConstructionOptionsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleEntretienQuotidien(): Promise<void> {
    this.logger.log('Entretien quotidien des chantiers...');
    const bilan = await this.executer();
    this.logger.log(
      `Chantiers : ${bilan.chantiersExamines} examinés, ${bilan.enRetard} en retard, ${bilan.budgetDepasse} en dépassement budgétaire.`,
    );
    if (bilan.nouvellesAlertes > 0) {
      await this.audit.record({
        action: 'construction.entretien_quotidien',
        entityType: 'ProjetConstruction',
        newValue: bilan,
      });
    }
    for (const alerte of bilan.alertesNouvelles) {
      await this.notifications.notifierPermission('construction:administrer', {
        type: 'chantier_alerte',
        niveau: 'alerte',
        titre: `Chantier ${alerte.referenceInterne} — ${libelleSituation(alerte.situation)}`,
        lien: `/construction/chantiers/${alerte.id}`,
        entityType: 'ProjetConstruction',
        entityId: alerte.id,
        // Une notification par chantier et par changement de situation.
        dedupeKey: `chantier-alerte:${alerte.id}:${alerte.situation}`,
        email: true,
      });
    }
  }

  /** Exposé pour être déclenchable à la main et testable. */
  async executer(maintenant: Date = new Date()) {
    const reglages = await this.options.getReglages();

    const chantiers = await this.prisma.projetConstruction.findMany({
      where: { statut: { notIn: [...STATUTS_CHANTIER_TERMINES] } },
      select: { id: true, referenceInterne: true, situationAlerte: true },
    });

    let enRetard = 0;
    let budgetDepasse = 0;
    let nouvellesAlertes = 0;
    const retardsCritiques: string[] = [];
    const alertesNouvelles: {
      id: string;
      referenceInterne: string;
      situation: string;
    }[] = [];

    for (const chantier of chantiers) {
      const synthese = await this.prisma.$transaction((tx) =>
        synchroniserChantier(tx, chantier.id, {
          seuilPourcent: reglages.seuilAlerteBudget,
          horizonJours: reglages.horizonEcheanceJours,
          maintenant,
        }),
      );

      if (synthese.alertes.retard) enRetard += 1;
      if (synthese.alertes.depassementBudget) budgetDepasse += 1;
      // Ce qui vient de basculer : c'est cela qu'il faut tracer, pas l'état
      // d'un chantier qui traîne depuis trois semaines.
      if (
        synthese.alertes.situation !== 'aucune' &&
        synthese.alertes.situation !== chantier.situationAlerte
      ) {
        nouvellesAlertes += 1;
        alertesNouvelles.push({
          id: chantier.id,
          referenceInterne: chantier.referenceInterne,
          situation: synthese.alertes.situation,
        });
      }
      if (synthese.alertes.joursRetardProjet >= reglages.retardCritiqueJours) {
        retardsCritiques.push(chantier.referenceInterne);
      }
    }

    return {
      chantiersExamines: chantiers.length,
      enRetard,
      budgetDepasse,
      nouvellesAlertes,
      retardsCritiques,
      alertesNouvelles,
    };
  }
}
