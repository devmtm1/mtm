import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocatifOptionsService } from './locatif-options.service';
import { RelancesLoyerService } from './relances.service';
import {
  completerEcheances,
  rafraichirStatutsEcheances,
} from './echeance-loyer.helper';
import { synchroniserSituationPaiement } from './locatif-finance.helper';

/**
 * Entretien quotidien de la gestion locative (J2.1).
 *
 * Trois choses qu'aucune action utilisateur ne peut porter :
 *  - prolonger les échéances des baux en cours — le lot initial de douze mois
 *    s'épuise, et un bail de deux ans doit continuer d'être facturé ;
 *  - recaler « en retard »/« impayée » et la situation de paiement du bail,
 *    pour que listes, statistiques et relances disent vrai sans qu'on ait
 *    ouvert chaque fiche ;
 *  - alimenter la file de relances selon le calendrier paramétré (section 15).
 */
@Injectable()
export class LocatifSchedulerService {
  private readonly logger = new Logger(LocatifSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly options: LocatifOptionsService,
    private readonly relances: RelancesLoyerService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleEntretienQuotidien(): Promise<void> {
    this.logger.log('Entretien quotidien de la gestion locative...');
    const bilan = await this.executer();
    this.logger.log(
      `Gestion locative : ${bilan.echeancesGenerees} échéances générées, ${bilan.statutsRecales} statuts recalés, ${bilan.relancesCreees} relances en file.`,
    );
    if (bilan.echeancesGenerees > 0 || bilan.relancesCreees > 0) {
      await this.audit.record({
        action: 'locatif.entretien_quotidien',
        entityType: 'BailLocatif',
        newValue: bilan,
      });
    }
  }

  /** Exposé pour être déclenchable à la main et testable. */
  async executer(maintenant: Date = new Date()) {
    const [horizonMois, impayeProlongeJours] = await Promise.all([
      this.options.getHorizonEcheancesMois(),
      this.options.getImpayeProlongeJours(),
    ]);

    const bauxEnCours = await this.prisma.bailLocatif.findMany({
      where: { statut: { in: ['actif', 'preavis'] } },
      select: {
        id: true,
        loyerMensuel: true,
        jourEcheance: true,
        dateDebut: true,
        dateFin: true,
      },
    });

    let echeancesGenerees = 0;
    for (const bail of bauxEnCours) {
      echeancesGenerees += await completerEcheances(
        this.prisma,
        {
          bailLocatifId: bail.id,
          loyerMensuel: Number(bail.loyerMensuel),
          jourEcheance: bail.jourEcheance,
          dateDebut: bail.dateDebut,
          dateFin: bail.dateFin,
        },
        horizonMois,
        maintenant,
      );
    }

    // Tous les baux, pas seulement les actifs : un bail clôturé peut garder
    // des impayés, et le comptable doit les voir justes.
    const tousLesBaux = await this.prisma.bailLocatif.findMany({
      select: { id: true },
    });
    const statutsRecales = await rafraichirStatutsEcheances(
      this.prisma,
      tousLesBaux.map((bail) => bail.id),
      maintenant,
    );
    for (const bail of tousLesBaux) {
      await synchroniserSituationPaiement(
        this.prisma,
        bail.id,
        impayeProlongeJours,
        maintenant,
      );
    }

    const relancesAnnulees = await this.relances.annulerRelancesObsoletes();
    const relancesCreees = await this.relances.genererFile(maintenant);

    return {
      bauxEnCours: bauxEnCours.length,
      echeancesGenerees,
      statutsRecales,
      relancesCreees,
      relancesAnnulees,
    };
  }
}
