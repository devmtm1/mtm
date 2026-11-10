import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import {
  formaterMontant,
  NotificationsService,
} from '../notifications/notifications.service';

const JOUR = 24 * 60 * 60 * 1000;

/** Écarts (en jours, par rapport à l'échéance) où le client est prévenu : 3 jours avant, le jour même, puis en retard. */
const RAPPELS_ECHEANCE: Array<{ ecart: number; code: string }> = [
  { ecart: -3, code: 'j-3' },
  { ecart: 0, code: 'j' },
  { ecart: 3, code: 'j+3' },
  { ecart: 10, code: 'j+10' },
];

/** Jours avant l'expiration d'une réservation où le client est prévenu. */
const RAPPELS_RESERVATION = [3, 1];

function debutDeJournee(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function ecartEnJours(echeance: Date, maintenant: Date): number {
  return Math.round(
    (debutDeJournee(maintenant) - debutDeJournee(echeance)) / JOUR,
  );
}

function moisDe(periode: Date): string {
  return periode.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

export interface BilanRappels {
  loyers: number;
  echeancesVente: number;
  reservations: number;
}

/**
 * Rappels automatiques aux clients, dans leur espace (et par e-mail, SMS ou WhatsApp selon leurs préférences) :
 * un loyer ou une échéance de vente à venir ou en retard, une réservation qui arrive à son terme.
 * Chaque rappel est dédoublonné par une clé : une relance ne part jamais deux fois, même si la tâche est rejouée.
 */
@Injectable()
export class RappelsClientService {
  private readonly logger = new Logger(RappelsClientService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Dakar' })
  async rappelsQuotidiens(): Promise<void> {
    try {
      const bilan = await this.envoyerRappels();
      this.logger.log(
        `Rappels clients : ${bilan.loyers} loyer(s), ${bilan.echeancesVente} échéance(s) de vente, ${bilan.reservations} réservation(s).`,
      );
    } catch (error) {
      this.logger.error(
        `Rappels clients en échec : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async envoyerRappels(maintenant = new Date()): Promise<BilanRappels> {
    const [loyers, echeancesVente, reservations] = await Promise.all([
      this.rappelsLoyers(maintenant),
      this.rappelsEcheancesVente(maintenant),
      this.rappelsReservations(maintenant),
    ]);
    return { loyers, echeancesVente, reservations };
  }

  private async rappelsLoyers(maintenant: Date): Promise<number> {
    const echeances = await this.prisma.echeanceLoyer.findMany({
      where: {
        statut: { notIn: ['payee', 'annulee'] },
        bailLocatif: { statut: { in: ['actif', 'preavis'] } },
        dateEcheance: {
          gte: new Date(maintenant.getTime() - 11 * JOUR),
          lte: new Date(maintenant.getTime() + 4 * JOUR),
        },
      },
      select: {
        id: true,
        periode: true,
        dateEcheance: true,
        montantPrevu: true,
        montantPaye: true,
        bailLocatif: { select: { locataireId: true } },
      },
    });
    let envoyes = 0;
    for (const echeance of echeances) {
      const reste =
        Number(echeance.montantPrevu) - Number(echeance.montantPaye);
      const rappel = RAPPELS_ECHEANCE.find(
        (r) => r.ecart === ecartEnJours(echeance.dateEcheance, maintenant),
      );
      if (reste <= 0 || !rappel) continue;
      envoyes += await this.notifications.notifierClient(
        { locataireId: echeance.bailLocatif.locataireId },
        {
          ...this.texteEcheance(
            `Loyer de ${moisDe(echeance.periode)}`,
            reste,
            rappel.ecart,
          ),
          type: 'rappel_loyer',
          lien: '/espace-client/ma-location',
          entityType: 'EcheanceLoyer',
          entityId: echeance.id,
          dedupeKey: `rappel-loyer:${echeance.id}:${rappel.code}`,
          email: true,
        },
      );
    }
    return envoyes;
  }

  private async rappelsEcheancesVente(maintenant: Date): Promise<number> {
    const echeances = await this.prisma.echeancePaiement.findMany({
      where: {
        statut: { not: 'payee' },
        dossierVente: {
          statut: { notIn: ['solde', 'annule'] },
        },
        dateEcheance: {
          gte: new Date(maintenant.getTime() - 11 * JOUR),
          lte: new Date(maintenant.getTime() + 4 * JOUR),
        },
      },
      select: {
        id: true,
        numero: true,
        dateEcheance: true,
        montantPrevu: true,
        montantPaye: true,
        dossierVente: {
          select: {
            prospectId: true,
            terrain: { select: { nom: true } },
          },
        },
      },
    });
    let envoyes = 0;
    for (const echeance of echeances) {
      const reste =
        Number(echeance.montantPrevu) - Number(echeance.montantPaye);
      const rappel = RAPPELS_ECHEANCE.find(
        (r) => r.ecart === ecartEnJours(echeance.dateEcheance, maintenant),
      );
      if (reste <= 0 || !rappel) continue;
      const objet = echeance.dossierVente.terrain?.nom
        ? `Échéance n° ${echeance.numero} · ${echeance.dossierVente.terrain.nom}`
        : `Échéance n° ${echeance.numero} de votre dossier`;
      envoyes += await this.notifications.notifierClient(
        { prospectId: echeance.dossierVente.prospectId },
        {
          ...this.texteEcheance(objet, reste, rappel.ecart),
          type: 'rappel_echeance_vente',
          lien: '/espace-client/dossiers',
          entityType: 'EcheancePaiement',
          entityId: echeance.id,
          dedupeKey: `rappel-echeance:${echeance.id}:${rappel.code}`,
          email: true,
        },
      );
    }
    return envoyes;
  }

  private async rappelsReservations(maintenant: Date): Promise<number> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        statut: { in: ['active', 'prolongee'] },
        dateExpiration: {
          gt: maintenant,
          lte: new Date(maintenant.getTime() + 4 * JOUR),
        },
      },
      select: {
        id: true,
        dateExpiration: true,
        dossierVente: {
          select: { prospectId: true, terrain: { select: { nom: true } } },
        },
      },
    });
    let envoyes = 0;
    for (const reservation of reservations) {
      const restants = -ecartEnJours(reservation.dateExpiration, maintenant);
      if (!RAPPELS_RESERVATION.includes(restants)) continue;
      const terrain = reservation.dossierVente.terrain?.nom ?? 'votre bien';
      envoyes += await this.notifications.notifierClient(
        { prospectId: reservation.dossierVente.prospectId },
        {
          type: 'rappel_reservation',
          niveau: 'alerte',
          titre:
            restants === 1
              ? 'Votre réservation expire demain'
              : `Votre réservation expire dans ${restants} jours`,
          message: `${terrain} : sans règlement avant le ${reservation.dateExpiration.toLocaleDateString('fr-FR')}, le bien est remis en vente. Contactez votre conseiller pour la confirmer ou la prolonger.`,
          lien: '/espace-client/dossiers',
          entityType: 'Reservation',
          entityId: reservation.id,
          dedupeKey: `rappel-reservation:${reservation.id}:j-${restants}`,
          email: true,
        },
      );
    }
    return envoyes;
  }

  /** Titre et message d'un rappel d'échéance selon l'écart : à venir, le jour même, en retard. */
  private texteEcheance(
    objet: string,
    reste: number,
    ecart: number,
  ): { titre: string; message: string; niveau: 'info' | 'alerte' } {
    const montant = formaterMontant(reste);
    if (ecart < 0) {
      return {
        niveau: 'info',
        titre: `Échéance dans ${-ecart} jours`,
        message: `${objet} : ${montant} à régler dans ${-ecart} jours.`,
      };
    }
    if (ecart === 0) {
      return {
        niveau: 'info',
        titre: 'Échéance aujourd’hui',
        message: `${objet} : ${montant} à régler aujourd’hui.`,
      };
    }
    return {
      niveau: 'alerte',
      titre: `Paiement en retard de ${ecart} jours`,
      message: `${objet} : ${montant} restent dus. Si vous avez déjà payé, ignorez ce message : il sera mis à jour à la validation.`,
    };
  }
}
