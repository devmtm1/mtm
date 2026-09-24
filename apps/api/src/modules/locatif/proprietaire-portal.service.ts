import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { calculerSoldeBail } from './locatif-finance.helper';

/**
 * Espace propriétaire (section 15 : « loyers encaissés, dépenses, solde,
 * rapports et documents »).
 *
 * Les loyers, le solde et les relevés de gestion sont servis ici. Les dépenses
 * engagées pour le compte du propriétaire appartiennent au module comptabilité
 * (J3.1) : elles rejoindront le solde net dès qu'il existera, sans changer
 * cette interface.
 */
@Injectable()
export class ProprietairePortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getBiens(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const biens = await this.prisma.bienLocatif.findMany({
      where: { proprietaireId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        type: true,
        adresse: true,
        commune: true,
        region: true,
        statut: true,
        baux: {
          where: { statut: { in: ['actif', 'preavis'] } },
          take: 1,
          orderBy: { dateDebut: 'desc' },
          select: {
            id: true,
            referenceInterne: true,
            loyerMensuel: true,
            charges: true,
            dateDebut: true,
            statut: true,
            situationPaiement: true,
            preavisDepartPrevu: true,
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return Promise.all(
      biens.map(async (bien) => {
        const bail = bien.baux[0] ?? null;
        const solde = bail
          ? await calculerSoldeBail(this.prisma, bail.id)
          : null;
        return {
          id: bien.id,
          referenceInterne: bien.referenceInterne,
          type: bien.type,
          adresse: bien.adresse,
          commune: bien.commune,
          region: bien.region,
          statut: bien.statut,
          bail: bail
            ? {
                id: bail.id,
                referenceInterne: bail.referenceInterne,
                loyerMensuel: Number(bail.loyerMensuel),
                charges: bail.charges === null ? null : Number(bail.charges),
                dateDebut: bail.dateDebut,
                statut: bail.statut,
                situationPaiement: bail.situationPaiement,
                preavisDepartPrevu: bail.preavisDepartPrevu,
                locataire:
                  [bail.locataire.firstName, bail.locataire.lastName]
                    .filter(Boolean)
                    .join(' ') || null,
                /** Loyers appelés depuis le début du bail. */
                loyersDus: solde?.loyersDus ?? 0,
                /** Encaissements validés, donc réellement acquis. */
                loyersEncaisses: solde?.loyersEncaisses ?? 0,
                /** Ce qu'il reste à recouvrer auprès du locataire. */
                solde: solde?.solde ?? 0,
                echeancesImpayees: solde?.echeancesImpayees ?? 0,
              }
            : null,
        };
      }),
    );
  }

  /**
   * Synthèse du portefeuille, telle que l'attend l'espace propriétaire :
   * loyers appelés, encaissés et solde restant, tous biens confondus.
   */
  async getSynthese(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const baux = await this.prisma.bailLocatif.findMany({
      where: { bienLocatif: { proprietaireId } },
      select: { id: true },
    });
    const soldes = await Promise.all(
      baux.map((bail) => calculerSoldeBail(this.prisma, bail.id)),
    );
    const [biens, loues] = await Promise.all([
      this.prisma.bienLocatif.count({ where: { proprietaireId } }),
      this.prisma.bienLocatif.count({
        where: { proprietaireId, statut: 'loue' },
      }),
    ]);

    return soldes.reduce(
      (cumul, solde) => ({
        ...cumul,
        loyersDus: cumul.loyersDus + solde.loyersDus,
        loyersEncaisses: cumul.loyersEncaisses + solde.loyersEncaisses,
        solde: cumul.solde + solde.solde,
        echeancesImpayees: cumul.echeancesImpayees + solde.echeancesImpayees,
      }),
      {
        biens,
        loues,
        loyersDus: 0,
        loyersEncaisses: 0,
        solde: 0,
        echeancesImpayees: 0,
      },
    );
  }

  /** Relevés de gestion et pièces publiées au propriétaire, jamais celles du locataire. */
  async getDocuments(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const documents = await this.prisma.documentLocatif.findMany({
      where: {
        visibleProprietaire: true,
        bailLocatif: { bienLocatif: { proprietaireId } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        storageKey: true,
        resourceType: true,
        bailLocatif: {
          select: {
            bienLocatif: { select: { referenceInterne: true, adresse: true } },
          },
        },
      },
    });
    return documents.map(({ storageKey, resourceType, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, resourceType, false),
    }));
  }

  private async proprietaireDuCompte(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProprietaireId: true },
    });
    if (!user?.clientProprietaireId) {
      throw new ForbiddenException(
        'Ce compte n’est pas rattaché à un propriétaire',
      );
    }
    return user.clientProprietaireId;
  }
}
