import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { BauxService } from './baux.service';
import {
  DemandeResiliationDto,
  DemandeResiliationStaffDto,
  QueryResiliationDto,
  TraiterResiliationDto,
} from './dto/resiliation.dto';
import { formatJour, jourUtc } from './sejour.helper';

const JOUR_MS = 24 * 60 * 60 * 1000;

const demandeInclude = {
  bailLocatif: {
    select: {
      id: true,
      referenceInterne: true,
      statut: true,
      preavisDonneLe: true,
      preavisDepartPrevu: true,
      bienLocatif: {
        select: {
          id: true,
          referenceInterne: true,
          titre: true,
          type: true,
          adresse: true,
          commune: true,
        },
      },
      locataire: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
  },
} satisfies Prisma.DemandeResiliationInclude;

/**
 * Demandes de résiliation de bail. Le locataire demande depuis son espace (ou
 * MTM enregistre une demande reçue par téléphone, WhatsApp ou courrier) ; MTM
 * l'accepte — ce qui ouvre le préavis du bail à la date de départ retenue — ou la
 * refuse en expliquant pourquoi. Dans les deux cas le locataire est prévenu.
 */
@Injectable()
export class ResiliationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
    private readonly baux: BauxService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Espace locataire ---

  async creerPourLocataire(
    userId: string,
    bailLocatifId: string,
    dto: DemandeResiliationDto,
  ) {
    const locataireId = await this.locataireDuCompte(userId);
    const bail = await this.prisma.bailLocatif.findFirst({
      where: { id: bailLocatifId, locataireId },
      select: { id: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    return this.creer(bailLocatifId, dto, { canal: 'portail', userId });
  }

  /** Demandes du locataire, avec le préavis qui s'applique, pour l'écran « Ma location ». */
  async pourLocataire(userId: string) {
    const locataireId = await this.locataireDuCompte(userId);
    const [demandes, preavisJours] = await Promise.all([
      this.prisma.demandeResiliation.findMany({
        where: { bailLocatif: { locataireId } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bailLocatifId: true,
          dateDemande: true,
          dateDepartSouhaitee: true,
          motif: true,
          message: true,
          statut: true,
          dateDepartRetenue: true,
          reponse: true,
          traiteeLe: true,
        },
      }),
      this.options.getPreavisJours(),
    ]);
    return { demandes, preavisJours };
  }

  /** Le locataire retire sa demande tant que MTM ne l'a pas traitée. */
  async annulerParLocataire(userId: string, id: string) {
    const locataireId = await this.locataireDuCompte(userId);
    const demande = await this.prisma.demandeResiliation.findFirst({
      where: { id, bailLocatif: { locataireId } },
      select: { id: true, statut: true },
    });
    if (!demande) throw new NotFoundException('Demande introuvable');
    if (demande.statut !== 'en_attente') {
      throw new BadRequestException(
        'Cette demande a déjà été traitée : contactez MTM pour la modifier.',
      );
    }
    return this.prisma.demandeResiliation.update({
      where: { id },
      data: { statut: 'annulee' },
    });
  }

  // --- Back-office ---

  async creerParStaff(
    bailLocatifId: string,
    dto: DemandeResiliationStaffDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.options.assertCanalResiliation(dto.canal);
    return this.creer(bailLocatifId, dto, {
      canal: dto.canal ?? 'agence',
      dateDemande: dto.dateDemande ? new Date(dto.dateDemande) : undefined,
    });
  }

  async findAll(query: QueryResiliationDto, user: LocatifUser) {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize > 0 ? query.pageSize : 25, 200);
    const where: Prisma.DemandeResiliationWhereInput = {
      bailLocatif: { bienLocatif: this.access.ownershipFilter(user) },
      ...(query.statut ? { statut: query.statut } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.demandeResiliation.findMany({
        where,
        include: demandeInclude,
        // Les demandes à traiter d'abord, les plus anciennes en tête : ce sont
        // celles qui attendent depuis le plus longtemps une réponse.
        orderBy: [{ statut: 'asc' }, { dateDemande: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.demandeResiliation.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async stats(user: LocatifUser) {
    const enAttente = await this.prisma.demandeResiliation.count({
      where: {
        statut: 'en_attente',
        bailLocatif: { bienLocatif: this.access.ownershipFilter(user) },
      },
    });
    return { enAttente, preavisJours: await this.options.getPreavisJours() };
  }

  async traiter(id: string, dto: TraiterResiliationDto, user: LocatifUser) {
    const demande = await this.prisma.demandeResiliation.findUnique({
      where: { id },
      include: demandeInclude,
    });
    if (!demande) throw new NotFoundException('Demande introuvable');
    await this.access.ensureBailAccessible(demande.bailLocatifId, user);
    if (demande.statut !== 'en_attente') {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }
    const reponse = dto.reponse?.trim() || null;

    let dateDepartRetenue: Date | null = null;
    if (dto.decision === 'refusee') {
      if (!reponse || reponse.length < 5) {
        throw new BadRequestException(
          'Expliquez au locataire pourquoi la demande est refusée.',
        );
      }
    } else {
      const preavisJours = await this.options.getPreavisJours();
      const apresPreavis = new Date(
        jourUtc(demande.dateDemande).getTime() + preavisJours * JOUR_MS,
      );
      const souhaitee = jourUtc(demande.dateDepartSouhaitee);
      dateDepartRetenue = dto.dateDepartRetenue
        ? jourUtc(dto.dateDepartRetenue)
        : souhaitee.getTime() > apresPreavis.getTime()
          ? souhaitee
          : apresPreavis;
      if (
        dateDepartRetenue.getTime() < jourUtc(demande.dateDemande).getTime()
      ) {
        throw new BadRequestException(
          'La date de départ ne peut pas précéder la demande.',
        );
      }
      if (
        demande.bailLocatif.statut === 'preavis' &&
        demande.bailLocatif.preavisDepartPrevu
      ) {
        throw new ConflictException(
          'Un préavis est déjà enregistré pour ce bail : modifiez-le depuis la fiche du bien.',
        );
      }
      // Accepter ouvre le préavis du bail : c'est la même étape que celle de la
      // fiche du bien, avec la même vérification des dates.
      await this.baux.donnerPreavis(
        demande.bailLocatifId,
        {
          preavisDonneLe: demande.dateDemande.toISOString(),
          preavisDepartPrevu: dateDepartRetenue.toISOString(),
        },
        user,
      );
    }

    const traitee = await this.prisma.demandeResiliation.update({
      where: { id },
      data: {
        statut: dto.decision,
        dateDepartRetenue,
        reponse,
        traiteeLe: new Date(),
        traiteeParId: user.id,
      },
      include: demandeInclude,
    });

    await this.notifications.notifierClient(
      { locataireId: demande.bailLocatif.locataire.id },
      {
        type: 'resiliation_traitee',
        titre:
          dto.decision === 'acceptee'
            ? 'Votre demande de résiliation est acceptée'
            : 'Votre demande de résiliation est refusée',
        message:
          dto.decision === 'acceptee' && dateDepartRetenue
            ? `Votre préavis est enregistré : départ le ${formatJour(dateDepartRetenue)}.`
            : (reponse ?? undefined),
        lien: '/espace-client/ma-location',
        entityType: 'DemandeResiliation',
        entityId: id,
        dedupeKey: `resiliation-traitee:${id}`,
      },
    );
    return traitee;
  }

  // --- internes ---

  private async creer(
    bailLocatifId: string,
    dto: DemandeResiliationDto,
    origine: {
      canal: string;
      userId?: string;
      dateDemande?: Date;
    },
  ) {
    await this.options.assertMotifResiliation(dto.motif);
    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: {
        id: true,
        statut: true,
        referenceInterne: true,
        bienLocatif: { select: { titre: true, type: true, commune: true } },
        locataire: { select: { firstName: true, lastName: true } },
      },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    if (bail.statut === 'preavis') {
      throw new BadRequestException(
        'Un préavis est déjà enregistré pour ce bail.',
      );
    }
    if (bail.statut !== 'actif') {
      throw new BadRequestException('Ce bail est déjà terminé.');
    }
    const enAttente = await this.prisma.demandeResiliation.findFirst({
      where: { bailLocatifId, statut: 'en_attente' },
      select: { id: true },
    });
    if (enAttente) {
      throw new ConflictException(
        'Une demande de résiliation est déjà en cours de traitement pour ce bail.',
      );
    }
    const depart = jourUtc(dto.dateDepartSouhaitee);
    if (
      depart.getTime() < jourUtc(origine.dateDemande ?? new Date()).getTime()
    ) {
      throw new BadRequestException(
        'La date de départ souhaitée ne peut pas être passée.',
      );
    }

    const demande = await this.prisma.demandeResiliation.create({
      data: {
        bailLocatifId,
        canal: origine.canal,
        ...(origine.dateDemande ? { dateDemande: origine.dateDemande } : {}),
        dateDepartSouhaitee: depart,
        motif: dto.motif || null,
        message: dto.message?.trim() || null,
        demandeParId: origine.userId ?? null,
      },
      include: demandeInclude,
    });

    const qui = `${bail.locataire.firstName} ${bail.locataire.lastName}`.trim();
    await this.notifications.notifierPermission('locatif:modifier', {
      type: 'resiliation_demande',
      niveau: 'alerte',
      titre: 'Demande de résiliation de bail',
      message: `${qui} — ${bail.bienLocatif.titre ?? bail.bienLocatif.type}${bail.bienLocatif.commune ? `, ${bail.bienLocatif.commune}` : ''} : départ souhaité le ${formatJour(depart)}.`,
      lien: '/locatif/resiliations',
      entityType: 'DemandeResiliation',
      entityId: demande.id,
      dedupeKey: `resiliation-demande:${demande.id}`,
    });
    return demande;
  }

  private async locataireDuCompte(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientLocataireId: true },
    });
    if (!user?.clientLocataireId) {
      throw new ForbiddenException(
        'Ce compte n’est pas rattaché à un locataire',
      );
    }
    return user.clientLocataireId;
  }
}
