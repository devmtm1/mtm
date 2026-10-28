import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CompanyProfileService } from '../company/company-profile.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { CreateChargeImmeubleDto } from './dto/immeuble-releve.dto';
import { GenererReleveDto } from './dto/releve.dto';
import {
  calculerReleveImmeuble,
  type ChargeReleve,
  type RepartitionCharge,
} from './releve-immeuble.helper';
import { renderReleveImmeuble } from './releve-immeuble-renderer';
import { LIBELLES_TYPE_IMMEUBLE } from './immeuble-libelles';

const nombre = (valeur: { toString(): string } | null | undefined): number =>
  valeur === null || valeur === undefined ? 0 : Number(valeur);

/** Dernier jour du mois de la date donnée : une charge du 28 appartient au mois de la période de fin. */
function finDeMois(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59),
  );
}

/**
 * Charges communes d'une propriété et relevé de gestion unique de la villa : un document pour le propriétaire, avec le
 * détail par logement, les charges de la période et le net qui lui revient.
 */
@Injectable()
export class ImmeubleRelevesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: LocatifAccessService,
    private readonly notifications: NotificationsService,
    private readonly company: CompanyProfileService,
  ) {}

  async listerCharges(immeubleId: string, user: LocatifUser) {
    await this.access.ensureImmeubleAccessible(immeubleId, user);
    const charges = await this.prisma.chargeImmeuble.findMany({
      where: { immeubleId },
      orderBy: { dateCharge: 'desc' },
    });
    return charges.map((charge) => ({
      ...charge,
      montant: nombre(charge.montant),
    }));
  }

  async ajouterCharge(
    immeubleId: string,
    dto: CreateChargeImmeubleDto,
    user: LocatifUser,
  ) {
    await this.access.ensureImmeubleAccessible(immeubleId, user);
    const charge = await this.prisma.chargeImmeuble.create({
      data: {
        immeubleId,
        libelle: dto.libelle.trim(),
        montant: dto.montant,
        dateCharge: new Date(dto.dateCharge),
        repartition: dto.repartition ?? 'egale',
        notes: dto.notes?.trim() || null,
        createdById: user.id,
      },
    });
    return { ...charge, montant: nombre(charge.montant) };
  }

  async supprimerCharge(
    immeubleId: string,
    chargeId: string,
    user: LocatifUser,
  ) {
    await this.access.ensureImmeubleAccessible(immeubleId, user);
    const charge = await this.prisma.chargeImmeuble.findFirst({
      where: { id: chargeId, immeubleId },
      select: { id: true },
    });
    if (!charge) throw new NotFoundException('Charge introuvable');
    await this.prisma.chargeImmeuble.delete({ where: { id: chargeId } });
  }

  async listerReleves(immeubleId: string, user: LocatifUser) {
    await this.access.ensureImmeubleAccessible(immeubleId, user);
    const releves = await this.prisma.releveImmeuble.findMany({
      where: { immeubleId },
      orderBy: { createdAt: 'desc' },
    });
    return releves.map(({ storageKey, ...releve }) => ({
      ...releve,
      totalDu: nombre(releve.totalDu),
      totalEncaisse: nombre(releve.totalEncaisse),
      totalCharges: nombre(releve.totalCharges),
      net: nombre(releve.net),
      secureUrl: this.cloudinary.url(storageKey, releve.resourceType, false),
    }));
  }

  /** Génère le relevé de la propriété sur la période (par défaut les douze derniers mois) et le publie au propriétaire. */
  async genererReleve(
    immeubleId: string,
    dto: GenererReleveDto,
    user: LocatifUser,
  ) {
    await this.access.ensureImmeubleAccessible(immeubleId, user);
    const immeuble = await this.prisma.immeubleLocatif.findUnique({
      where: { id: immeubleId },
      include: {
        proprietaire: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        logements: {
          orderBy: [{ numeroLot: 'asc' }, { referenceInterne: 'asc' }],
          select: {
            id: true,
            numeroLot: true,
            referenceInterne: true,
            superficie: true,
            loyerMensuel: true,
            baux: {
              orderBy: { dateDebut: 'desc' },
              take: 1,
              select: {
                loyerMensuel: true,
                locataire: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!immeuble) throw new NotFoundException('Propriété introuvable');
    if (immeuble.logements.length === 0) {
      throw new BadRequestException(
        'Cette propriété n’a aucun logement : il n’y a rien à relever',
      );
    }

    const maintenant = new Date();
    const periodeFin = dto.periodeFin
      ? new Date(dto.periodeFin)
      : new Date(
          Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
        );
    const periodeDebut = dto.periodeDebut
      ? new Date(dto.periodeDebut)
      : new Date(
          Date.UTC(
            periodeFin.getUTCFullYear(),
            periodeFin.getUTCMonth() - 11,
            1,
          ),
        );
    if (periodeDebut.getTime() > periodeFin.getTime()) {
      throw new BadRequestException(
        'La période de début doit précéder la période de fin',
      );
    }

    const [echeances, chargesBase] = await Promise.all([
      this.prisma.echeanceLoyer.findMany({
        where: {
          bailLocatif: { bienLocatif: { immeubleId } },
          statut: { not: 'annulee' },
          periode: { gte: periodeDebut, lte: periodeFin },
        },
        select: {
          montantPrevu: true,
          montantPaye: true,
          bailLocatif: { select: { bienLocatifId: true } },
        },
      }),
      this.prisma.chargeImmeuble.findMany({
        where: {
          immeubleId,
          dateCharge: { gte: periodeDebut, lte: finDeMois(periodeFin) },
        },
        orderBy: { dateCharge: 'asc' },
      }),
    ]);

    const parLogement = new Map<string, { du: number; encaisse: number }>();
    for (const echeance of echeances) {
      const id = echeance.bailLocatif.bienLocatifId;
      const cumul = parLogement.get(id) ?? { du: 0, encaisse: 0 };
      cumul.du += nombre(echeance.montantPrevu);
      cumul.encaisse += nombre(echeance.montantPaye);
      parLogement.set(id, cumul);
    }
    const charges: ChargeReleve[] = chargesBase.map((charge) => ({
      id: charge.id,
      libelle: charge.libelle,
      montant: nombre(charge.montant),
      dateCharge: charge.dateCharge,
      repartition: charge.repartition as RepartitionCharge,
    }));
    const calcul = calculerReleveImmeuble(
      immeuble.logements.map((logement) => {
        const bail = logement.baux[0];
        const cumul = parLogement.get(logement.id) ?? { du: 0, encaisse: 0 };
        return {
          id: logement.id,
          libelle: logement.numeroLot
            ? `Logement ${logement.numeroLot}`
            : logement.referenceInterne,
          locataire: bail
            ? [bail.locataire.firstName, bail.locataire.lastName]
                .filter(Boolean)
                .join(' ') || null
            : null,
          loyerMensuel: nombre(bail?.loyerMensuel ?? logement.loyerMensuel),
          superficie: nombre(logement.superficie),
          du: cumul.du,
          encaisse: cumul.encaisse,
        };
      }),
      charges,
    );

    const base = `R-${immeuble.referenceInterne}-${periodeFin.getUTCFullYear()}${String(periodeFin.getUTCMonth() + 1).padStart(2, '0')}`;
    const existants = await this.prisma.releveImmeuble.count({
      where: { reference: { startsWith: base } },
    });
    const reference = `${base}-${existants + 1}`;

    const buffer = renderReleveImmeuble({
      ...calcul,
      reference,
      issuedAt: new Date(),
      company: await this.company.getSociete(),
      proprietaire: {
        nom:
          [immeuble.proprietaire.firstName, immeuble.proprietaire.lastName]
            .filter(Boolean)
            .join(' ') || 'Propriétaire',
        email: immeuble.proprietaire.email,
      },
      immeuble: {
        nom: immeuble.nom,
        typeLibelle: LIBELLES_TYPE_IMMEUBLE[immeuble.type] ?? 'Propriété',
        adresse: immeuble.adresse,
        commune: immeuble.commune,
        referenceInterne: immeuble.referenceInterne,
      },
      periodeDebut,
      periodeFin,
    });
    const uploaded = await this.cloudinary.upload(
      {
        buffer,
        mimetype: 'application/pdf',
        originalname: 'releve-propriete.pdf',
        size: buffer.length,
      } as Express.Multer.File,
      `locatif/immeubles/${immeubleId}/releves`,
      false,
    );
    const releve = await this.prisma.releveImmeuble.create({
      data: {
        immeubleId,
        reference,
        periodeDebut,
        periodeFin,
        totalDu: calcul.totalDu,
        totalEncaisse: calcul.totalEncaisse,
        totalCharges: calcul.totalCharges,
        net: calcul.net,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
    });

    await this.notifications.notifierClient(
      { proprietaireId: immeuble.proprietaire.id },
      {
        type: 'document_disponible',
        titre: 'Un relevé de gestion est disponible',
        message: `${immeuble.nom} — ${reference}`,
        lien: '/espace-client/mon-bien',
        entityType: 'ReleveImmeuble',
        entityId: releve.id,
        dedupeKey: `releve-immeuble:${releve.id}`,
      },
    );

    const { storageKey, ...reste } = releve;
    return {
      ...reste,
      totalDu: calcul.totalDu,
      totalEncaisse: calcul.totalEncaisse,
      totalCharges: calcul.totalCharges,
      net: calcul.net,
      secureUrl: this.cloudinary.url(storageKey, releve.resourceType, false),
    };
  }
}
