import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { moisDe } from './finances.calculs';

/**
 * Mois clôturés. Une fois un mois clôturé, plus rien ne doit en modifier les
 * totaux : valider ou contre-passer un paiement daté de ce mois, saisir ou
 * supprimer une opération, tout est refusé avec le même message. Une
 * correction se passe alors à la date du jour.
 */
@Injectable()
export class PeriodesFinancieresService {
  constructor(private readonly prisma: PrismaService) {}

  async estCloturee(date: Date): Promise<boolean> {
    const cloture = await this.prisma.clotureFinanciere.findUnique({
      where: { periode: moisDe(date) },
      select: { id: true },
    });
    return cloture !== null;
  }

  /** Lève une 409 si le mois de `date` est clôturé. */
  async assertOuverte(date: Date | null | undefined): Promise<void> {
    if (!date) return;
    if (await this.estCloturee(date)) {
      throw new ConflictException(
        `Le mois ${moisDe(date)} est clôturé : cette opération n’est plus possible à cette date. Enregistrez la correction à la date du jour.`,
      );
    }
  }
}
