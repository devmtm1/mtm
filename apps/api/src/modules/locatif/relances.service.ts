import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { EnvoyerRelanceDto, QueryRelanceDto } from './dto/relance.dto';

const relanceInclude = {
  echeance: {
    select: {
      id: true,
      periode: true,
      dateEcheance: true,
      montantPrevu: true,
      montantPaye: true,
      statut: true,
    },
  },
  bailLocatif: {
    select: {
      id: true,
      referenceInterne: true,
      situationPaiement: true,
      locataire: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      bienLocatif: {
        select: { id: true, referenceInterne: true, adresse: true },
      },
    },
  },
  envoyeeBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.RelanceLoyerInclude;

const JOUR_MS = 24 * 3600 * 1000;

/**
 * Relances de loyer (section 15 : « modèles configurables et calendrier de
 * relance. Les délais doivent être paramétrables par MTM »).
 *
 * Le calendrier vit dans le paramètre `locatif.relanceModeles` : chaque palier
 * déclenche une relance dès que le retard atteint son délai, une seule fois par
 * échéance et par palier. L'envoi multicanal appartient à J2.4 ; ici, l'e-mail
 * part du back-office et tout envoi laisse une trace.
 */
@Injectable()
export class RelancesLoyerService {
  private readonly logger = new Logger(RelancesLoyerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
    private readonly mail: MailService,
  ) {}

  /** File des relances, limitée au périmètre du collaborateur. */
  async findAll(query: QueryRelanceDto, user: LocatifUser) {
    const perimetre = this.access.ownershipFilter(user);
    return this.prisma.relanceLoyer.findMany({
      where: {
        statut: query.statut ?? 'a_envoyer',
        bailLocatif: {
          bienLocatif: {
            ...perimetre,
            ...(query.bienLocatifId ? { id: query.bienLocatifId } : {}),
          },
        },
      },
      include: relanceInclude,
      orderBy: [{ joursRetard: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  /** Compteur pour le tableau de bord et la vignette « à relancer ». */
  async countAEnvoyer(user: LocatifUser): Promise<number> {
    return this.prisma.relanceLoyer.count({
      where: {
        statut: 'a_envoyer',
        bailLocatif: { bienLocatif: this.access.ownershipFilter(user) },
      },
    });
  }

  async envoyer(relanceId: string, dto: EnvoyerRelanceDto, user: LocatifUser) {
    const relance = await this.prisma.relanceLoyer.findUnique({
      where: { id: relanceId },
      include: relanceInclude,
    });
    if (!relance) throw new NotFoundException('Relance introuvable');
    await this.access.ensureBienAccessible(
      relance.bailLocatif.bienLocatif.id,
      user,
    );
    if (relance.statut !== 'a_envoyer') {
      throw new ConflictException('Cette relance a déjà été traitée');
    }

    const canal = dto.canal ?? relance.canal;
    if (canal === 'email') {
      const destinataire =
        relance.destinataire ?? relance.bailLocatif.locataire.email;
      if (!destinataire) {
        throw new BadRequestException(
          'Ce locataire n’a pas d’adresse e-mail : relancez-le par un autre canal puis marquez la relance comme envoyée',
        );
      }
      const envoye = await this.mail.send({
        to: destinataire,
        subject: relance.objet,
        text: relance.message,
      });
      if (!envoye) {
        throw new BadRequestException(
          'L’envoi de l’e-mail a échoué : réessayez ou relancez par un autre canal',
        );
      }
    }

    return this.prisma.relanceLoyer.update({
      where: { id: relanceId },
      data: {
        statut: 'envoyee',
        canal,
        envoyeeLe: new Date(),
        envoyeeById: user.id,
        message: dto.note
          ? `${relance.message}\n\n[Note interne] ${dto.note}`
          : relance.message,
      },
      include: relanceInclude,
    });
  }

  /** Abandon d'une relance devenue sans objet (échéancier convenu, erreur…). */
  async annuler(relanceId: string, user: LocatifUser) {
    const relance = await this.prisma.relanceLoyer.findUnique({
      where: { id: relanceId },
      include: { bailLocatif: { select: { bienLocatifId: true } } },
    });
    if (!relance) throw new NotFoundException('Relance introuvable');
    await this.access.ensureBienAccessible(
      relance.bailLocatif.bienLocatifId,
      user,
    );
    if (relance.statut === 'envoyee') {
      throw new ConflictException(
        'Cette relance est déjà partie : elle ne peut plus être annulée',
      );
    }
    return this.prisma.relanceLoyer.update({
      where: { id: relanceId },
      data: { statut: 'annulee' },
      include: relanceInclude,
    });
  }

  /**
   * Alimente la file de relances d'après le calendrier paramétré. Appelée par
   * la tâche quotidienne ; idempotente grâce à l'unicité (échéance, modèle).
   */
  async genererFile(maintenant: Date = new Date()): Promise<number> {
    const modeles = await this.options.getRelanceModeles();
    if (modeles.length === 0) return 0;

    const echeances = await this.prisma.echeanceLoyer.findMany({
      where: {
        statut: { in: ['en_retard', 'impayee'] },
        dateEcheance: { lt: maintenant },
        bailLocatif: { statut: { in: ['actif', 'preavis'] } },
      },
      include: {
        relances: { select: { modeleCode: true } },
        bailLocatif: {
          select: {
            id: true,
            referenceInterne: true,
            locataire: {
              select: { firstName: true, lastName: true, email: true },
            },
            bienLocatif: { select: { adresse: true, referenceInterne: true } },
          },
        },
      },
    });

    let creees = 0;
    for (const echeance of echeances) {
      const joursRetard = Math.floor(
        (maintenant.getTime() - echeance.dateEcheance.getTime()) / JOUR_MS,
      );
      const dejaEmises = new Set(
        echeance.relances.map((relance) => relance.modeleCode),
      );
      const montantDu =
        Number(echeance.montantPrevu) - Number(echeance.montantPaye);

      for (const modele of modeles) {
        if (joursRetard < modele.joursRetard) continue;
        if (dejaEmises.has(modele.code)) continue;
        const locataire =
          [
            echeance.bailLocatif.locataire.firstName,
            echeance.bailLocatif.locataire.lastName,
          ]
            .filter(Boolean)
            .join(' ') || 'Madame, Monsieur';
        const jetons = {
          locataire,
          bien: `${echeance.bailLocatif.bienLocatif.adresse} (${echeance.bailLocatif.bienLocatif.referenceInterne})`,
          periode: echeance.periode.toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }),
          montantDu: `${montantDu.toLocaleString('fr-FR')} FCFA`,
          joursRetard: String(joursRetard),
          reference: echeance.bailLocatif.referenceInterne,
        };
        try {
          await this.prisma.relanceLoyer.create({
            data: {
              bailLocatifId: echeance.bailLocatif.id,
              echeanceId: echeance.id,
              modeleCode: modele.code,
              joursRetard,
              canal: modele.canal,
              destinataire: echeance.bailLocatif.locataire.email,
              objet: appliquerJetons(modele.objet, jetons),
              message: appliquerJetons(modele.message, jetons),
            },
          });
          creees += 1;
        } catch (error) {
          // Unicité (échéance, modèle) : la relance existe déjà, rien à faire.
          if (!(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          )) {
            throw error;
          }
        }
      }
    }
    if (creees > 0) {
      this.logger.log(`Relances de loyer générées : ${creees}`);
    }
    return creees;
  }

  /**
   * Retire de la file les relances devenues sans objet : l'échéance a été
   * réglée ou neutralisée depuis leur création.
   */
  async annulerRelancesObsoletes(): Promise<number> {
    const resultat = await this.prisma.relanceLoyer.updateMany({
      where: {
        statut: 'a_envoyer',
        echeance: { statut: { in: ['payee', 'annulee'] } },
      },
      data: { statut: 'annulee' },
    });
    return resultat.count;
  }

  /** Relances d'un bail, pour la fiche et l'historique. */
  async findForBail(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    return this.prisma.relanceLoyer.findMany({
      where: { bailLocatifId },
      include: {
        echeance: { select: { id: true, periode: true } },
        envoyeeBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

/** Remplace les jetons {{clé}} d'un modèle de relance. */
export function appliquerJetons(
  modele: string,
  jetons: Record<string, string>,
): string {
  return modele.replace(
    /\{\{(\w+)\}\}/g,
    (_, cle: string) => jetons[cle] ?? '',
  );
}
