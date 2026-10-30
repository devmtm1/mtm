import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConstructionAccessService } from '../construction/construction-access.service';
import { CrmAccessService } from '../crm/crm-access.service';
import { DossierLienService } from '../dossiers/dossier-lien.service';
import { LocatifAccessService } from '../locatif/locatif-access.service';
import { MandatsAccessService } from '../mandats/mandats-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { STATUTS_TACHE_OUVERTS } from '../taches/taches.constants';
import { TachesService } from '../taches/taches.service';
import { VentesAccessService } from '../ventes/ventes-access.service';
import { FENETRE_MAX_JOURS, PERMISSION_ADMIN_AGENDA } from './agenda.constants';
import {
  CreateEvenementDto,
  QueryAgendaDto,
  UpdateEvenementDto,
} from './dto/agenda.dto';

export type AgendaUser = {
  id: string;
  roles: string[];
  permissions: string[];
  firstName?: string;
  lastName?: string;
};

/** Ce que l'agenda affiche : un événement saisi, ou une échéance tirée d'un autre module (lecture seule). */
export interface ItemAgenda {
  id: string;
  source:
    | 'evenement'
    | 'tache'
    | 'visite'
    | 'mandat'
    | 'jalon'
    | 'sejour'
    | 'loyer'
    | 'echeance_vente'
    | 'reservation';
  type: string;
  titre: string;
  debut: Date;
  fin: Date | null;
  journeeEntiere: boolean;
  lieu?: string | null;
  statut?: string;
  /** Route du back-office où traiter l'élément. */
  lien?: string;
  entityLabel?: string | null;
  /** Vrai pour un événement que la personne peut modifier ici. */
  modifiable: boolean;
  participants?: Array<{ id: string; firstName: string; lastName: string }>;
  createur?: { id: string; firstName: string; lastName: string };
  /** Détail d'un événement saisi (absent des échéances tirées d'autres modules). */
  description?: string | null;
  visibilite?: string;
  rappelMinutes?: number | null;
  entityType?: string | null;
  entityId?: string | null;
}

const personne = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const include = {
  createur: personne,
  participants: { include: { user: personne } },
} as const;

type EvenementComplet = Prisma.EvenementAgendaGetPayload<{
  include: typeof include;
}>;

function nomComplet(utilisateur?: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return (
    [utilisateur?.firstName, utilisateur?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Un collègue'
  );
}

/** Une date « jour » (sans heure) posée à midi UTC reste le même jour dans tous les fuseaux. */
function jourComplet(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Agenda partagé et individuel (section 21) : visites, rendez-vous, appels,
 * vérifications, réunions saisis dans l'agenda, auxquels s'ajoutent — en
 * lecture seule — les échéances qui vivent ailleurs (tâches, visites du CRM,
 * mandats, jalons de chantier, séjours, loyers, échéances de vente). Chaque
 * source n'apparaît que si la personne a le droit de consulter son module, et
 * dans son périmètre.
 */
@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossierLienService,
    private readonly taches: TachesService,
    private readonly notifications: NotificationsService,
    private readonly crm: CrmAccessService,
    private readonly mandats: MandatsAccessService,
    private readonly construction: ConstructionAccessService,
    private readonly locatif: LocatifAccessService,
    private readonly ventes: VentesAccessService,
  ) {}

  private estAdmin(user: AgendaUser): boolean {
    return user.permissions.includes(PERMISSION_ADMIN_AGENDA);
  }

  collaborateurs() {
    return this.taches.collaborateurs();
  }

  // ------------------------------------------------------------------
  // Lecture du flux
  // ------------------------------------------------------------------

  async flux(query: QueryAgendaDto, user: AgendaUser): Promise<ItemAgenda[]> {
    const du = new Date(query.du);
    const au = new Date(query.au);
    if (!(au > du)) {
      throw new BadRequestException('La fin de la période précède son début');
    }
    if ((au.getTime() - du.getTime()) / 86_400_000 > FENETRE_MAX_JOURS) {
      throw new BadRequestException(
        `La période ne peut pas dépasser ${FENETRE_MAX_JOURS} jours`,
      );
    }
    const equipe = query.scope === 'equipe';
    const periode = { gte: du, lt: au };
    const a = (permission: string) => user.permissions.includes(permission);
    const items: ItemAgenda[] = [];

    // 1. Événements saisis
    const evenements = await this.prisma.evenementAgenda.findMany({
      where: {
        debut: periode,
        OR: [
          { createurId: user.id },
          { participants: { some: { userId: user.id } } },
          ...(equipe ? [{ visibilite: 'equipe' }] : []),
        ],
      },
      include,
      orderBy: { debut: 'asc' },
    });
    for (const evenement of evenements) {
      items.push(this.versItem(evenement, user));
    }

    // 2. Tâches à rendre (les miennes ; toute l'équipe pour l'encadrement en vue d'équipe)
    if (a('taches:consulter')) {
      const taches = await this.prisma.tache.findMany({
        where: {
          dateLimite: periode,
          statut: { in: [...STATUTS_TACHE_OUVERTS] },
          ...(equipe && user.permissions.includes('taches:administrer')
            ? {}
            : { responsableId: user.id }),
        },
        include: { responsable: personne },
        take: 300,
      });
      for (const tache of taches) {
        items.push({
          id: tache.id,
          source: 'tache',
          type: 'tache',
          titre: `Tâche : ${tache.titre}`,
          debut: tache.dateLimite as Date,
          fin: null,
          journeeEntiere: false,
          statut: tache.statut,
          lien: `/taches?tache=${tache.id}`,
          entityLabel: tache.entityLabel,
          modifiable: false,
          participants:
            tache.responsableId === user.id ? undefined : [tache.responsable],
        });
      }
    }

    // 3. Visites de biens suivies par le CRM
    if (a('crm:consulter')) {
      const visites = await this.prisma.visiteProspect.findMany({
        where: {
          statut: { not: 'annulee' },
          OR: [
            { dateConfirmee: periode },
            { dateConfirmee: null, dateProposee: periode },
          ],
          ...(equipe && this.crm.isManager(user)
            ? {}
            : {
                OR: [
                  { accompagnateurId: user.id },
                  { prospect: { commercialResponsableId: user.id } },
                ],
              }),
        },
        include: {
          prospect: { select: { id: true, nom: true, prenom: true } },
          terrain: { select: { referenceInterne: true } },
        },
        take: 300,
      });
      for (const visite of visites) {
        const date = (visite.dateConfirmee ?? visite.dateProposee) as Date;
        items.push({
          id: visite.id,
          source: 'visite',
          type: 'visite',
          titre: `Visite ${visite.terrain.referenceInterne} — ${nomComplet({
            firstName: visite.prospect.prenom,
            lastName: visite.prospect.nom,
          })}`,
          debut: this.avecHeure(date, visite.heure),
          fin: null,
          journeeEntiere: !visite.heure,
          lieu: visite.lieuRendezVous,
          statut: visite.statut,
          lien: `/crm/prospects/${visite.prospect.id}`,
          modifiable: false,
        });
      }
    }

    // 4. Échéances des mandats
    if (a('mandats:consulter')) {
      const mandats = await this.prisma.mandat.findMany({
        where: { dateFin: periode, ...this.mandats.ownershipFilter(user) },
        select: {
          id: true,
          referenceInterne: true,
          dateFin: true,
          statut: true,
        },
        take: 200,
      });
      for (const mandat of mandats) {
        items.push({
          id: mandat.id,
          source: 'mandat',
          type: 'echeance',
          titre: `Fin du mandat ${mandat.referenceInterne}`,
          debut: jourComplet(mandat.dateFin),
          fin: null,
          journeeEntiere: true,
          statut: mandat.statut,
          lien: `/mandats/${mandat.id}`,
          modifiable: false,
        });
      }
    }

    // 5. Jalons de chantier
    if (a('construction:consulter')) {
      const jalons = await this.prisma.jalonChantier.findMany({
        where: {
          dateFinPrevue: periode,
          statut: { notIn: ['termine', 'annule'] },
          projet: this.construction.ownershipFilter(user),
        },
        select: {
          id: true,
          libelle: true,
          dateFinPrevue: true,
          statut: true,
          projet: { select: { id: true, referenceInterne: true } },
        },
        take: 200,
      });
      for (const jalon of jalons) {
        items.push({
          id: jalon.id,
          source: 'jalon',
          type: 'echeance',
          titre: `Jalon « ${jalon.libelle} » — ${jalon.projet.referenceInterne}`,
          debut: jourComplet(jalon.dateFinPrevue as Date),
          fin: null,
          journeeEntiere: true,
          statut: jalon.statut,
          lien: `/construction/chantiers/${jalon.projet.id}`,
          modifiable: false,
        });
      }
    }

    // 6. Locatif : séjours (arrivées et départs) et loyers à échéance
    if (a('locatif:consulter')) {
      const bien = this.locatif.ownershipFilter(user);
      const sejours = await this.prisma.sejourLocatif.findMany({
        where: {
          statut: { notIn: ['annule', 'refuse'] },
          OR: [{ dateArrivee: periode }, { dateDepart: periode }],
          bienLocatif: bien,
        },
        select: {
          id: true,
          referenceInterne: true,
          dateArrivee: true,
          dateDepart: true,
          statut: true,
          bienLocatif: { select: { referenceInterne: true } },
        },
        take: 200,
      });
      for (const sejour of sejours) {
        for (const [date, libelle] of [
          [sejour.dateArrivee, 'Arrivée'],
          [sejour.dateDepart, 'Départ'],
        ] as const) {
          if (date < du || date >= au) continue;
          items.push({
            id: `${sejour.id}:${libelle}`,
            source: 'sejour',
            type: 'echeance',
            titre: `${libelle} — ${sejour.bienLocatif.referenceInterne} (${sejour.referenceInterne})`,
            debut: jourComplet(date),
            fin: null,
            journeeEntiere: true,
            statut: sejour.statut,
            lien: `/locatif/sejours/${sejour.id}`,
            modifiable: false,
          });
        }
      }
      const loyers = await this.prisma.echeanceLoyer.findMany({
        where: {
          dateEcheance: periode,
          statut: { in: ['a_venir', 'partielle', 'en_retard', 'impayee'] },
          bailLocatif: { bienLocatif: bien },
        },
        select: {
          id: true,
          dateEcheance: true,
          statut: true,
          bailLocatif: {
            select: {
              referenceInterne: true,
              bienLocatifId: true,
              locataire: { select: { firstName: true, lastName: true } },
              bienLocatif: { select: { adresse: true } },
            },
          },
        },
        take: 300,
      });
      for (const loyer of loyers) {
        items.push({
          id: loyer.id,
          source: 'loyer',
          type: 'echeance',
          // Qui paie, et pour quel bien : « Loyer B-2026-0003 » ne dit rien à qui lit son agenda.
          titre: [
            'Loyer',
            [loyer.bailLocatif.locataire?.firstName, loyer.bailLocatif.locataire?.lastName].filter(Boolean).join(' ') || loyer.bailLocatif.referenceInterne,
            loyer.bailLocatif.bienLocatif?.adresse,
          ]
            .filter(Boolean)
            .join(' · '),
          debut: jourComplet(loyer.dateEcheance),
          fin: null,
          journeeEntiere: true,
          statut: loyer.statut,
          lien: `/locatif/biens/${loyer.bailLocatif.bienLocatifId}`,
          modifiable: false,
        });
      }
    }

    // 7. Ventes : échéances de paiement et fin de blocage d'une réservation
    if (a('ventes:consulter')) {
      const dossier = this.ventes.ownershipFilter(user);
      const echeances = await this.prisma.echeancePaiement.findMany({
        where: {
          dateEcheance: periode,
          statut: { in: ['en_attente', 'planifiee', 'partielle'] },
          dossierVente: dossier,
        },
        select: {
          id: true,
          numero: true,
          dateEcheance: true,
          statut: true,
          dossierVente: { select: { id: true, referenceInterne: true, prospect: { select: { prenom: true, nom: true } } } },
        },
        take: 300,
      });
      for (const echeance of echeances) {
        items.push({
          id: echeance.id,
          source: 'echeance_vente',
          type: 'echeance',
          // Le client d'abord : c'est lui que l'on cherche dans son agenda, pas la référence du dossier.
          titre: `Paiement n°${echeance.numero} — ${
            [echeance.dossierVente.prospect?.prenom, echeance.dossierVente.prospect?.nom].filter(Boolean).join(' ') ||
            echeance.dossierVente.referenceInterne ||
            'dossier de vente'
          }`,
          debut: jourComplet(echeance.dateEcheance),
          fin: null,
          journeeEntiere: true,
          statut: echeance.statut,
          lien: `/ventes/${echeance.dossierVente.id}`,
          modifiable: false,
        });
      }
      const reservations = await this.prisma.reservation.findMany({
        where: {
          dateExpiration: periode,
          statut: 'active',
          dossierVente: dossier,
        },
        select: {
          id: true,
          dateExpiration: true,
          dossierVente: { select: { id: true, referenceInterne: true } },
        },
        take: 200,
      });
      for (const reservation of reservations) {
        items.push({
          id: reservation.id,
          source: 'reservation',
          type: 'echeance',
          titre: `Fin de réservation — ${reservation.dossierVente.referenceInterne ?? 'dossier de vente'}`,
          debut: reservation.dateExpiration,
          fin: null,
          journeeEntiere: false,
          lien: `/ventes/${reservation.dossierVente.id}`,
          modifiable: false,
        });
      }
    }

    return items.sort((x, y) => x.debut.getTime() - y.debut.getTime());
  }

  /** Date + « 14:30 » (heure saisie sur une visite) → instant. */
  private avecHeure(date: Date, heure: string | null): Date {
    const resultat = jourComplet(date);
    const m = heure?.match(/^(\d{1,2})[:h](\d{2})?/);
    if (m) {
      resultat.setUTCHours(Number(m[1]), m[2] ? Number(m[2]) : 0, 0, 0);
    }
    return resultat;
  }

  // ------------------------------------------------------------------
  // Événements
  // ------------------------------------------------------------------

  async detail(id: string, user: AgendaUser): Promise<ItemAgenda> {
    const evenement = await this.charger(id);
    this.assertPeutVoir(evenement, user);
    return this.versItem(evenement, user);
  }

  async creer(dto: CreateEvenementDto, user: AgendaUser): Promise<ItemAgenda> {
    const debut = new Date(dto.debut);
    const fin = dto.fin ? new Date(dto.fin) : null;
    if (fin && fin < debut) {
      throw new BadRequestException('La fin précède le début');
    }
    const participants = await this.participantsValides(
      dto.participantIds ?? [],
    );
    const lien = await this.lienDossier(dto.entityType, dto.entityId, user);

    const evenement = await this.prisma.evenementAgenda.create({
      data: {
        type: dto.type,
        titre: dto.titre.trim(),
        description: dto.description?.trim() || null,
        lieu: dto.lieu?.trim() || null,
        debut,
        fin,
        journeeEntiere: dto.journeeEntiere ?? false,
        visibilite: dto.visibilite ?? 'equipe',
        createurId: user.id,
        rappelMinutes: dto.rappelMinutes ?? null,
        ...lien,
        participants: {
          create: participants.map((userId) => ({ userId })),
        },
      },
      include,
    });
    await this.inviter(
      evenement,
      participants.filter((id) => id !== user.id),
      user,
    );
    return this.versItem(evenement, user);
  }

  async modifier(
    id: string,
    dto: UpdateEvenementDto,
    user: AgendaUser,
  ): Promise<ItemAgenda> {
    const actuel = await this.charger(id);
    this.assertPeutModifier(actuel, user);

    const debut = dto.debut ? new Date(dto.debut) : actuel.debut;
    const fin =
      dto.fin === undefined
        ? actuel.fin
        : dto.fin === null
          ? null
          : new Date(dto.fin);
    if (fin && fin < debut) {
      throw new BadRequestException('La fin précède le début');
    }

    let nouveaux: string[] = [];
    let participants: string[] | undefined;
    if (dto.participantIds) {
      participants = await this.participantsValides(dto.participantIds);
      const avant = actuel.participants.map((p) => p.userId);
      nouveaux = participants.filter(
        (participant) =>
          !avant.includes(participant) && participant !== user.id,
      );
    }

    const decale = dto.debut && debut.getTime() !== actuel.debut.getTime();
    const evenement = await this.prisma.evenementAgenda.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.titre ? { titre: dto.titre.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.lieu !== undefined ? { lieu: dto.lieu.trim() || null } : {}),
        debut,
        fin,
        ...(dto.journeeEntiere !== undefined
          ? { journeeEntiere: dto.journeeEntiere }
          : {}),
        ...(dto.statut ? { statut: dto.statut } : {}),
        ...(dto.visibilite ? { visibilite: dto.visibilite } : {}),
        ...(dto.rappelMinutes !== undefined
          ? { rappelMinutes: dto.rappelMinutes }
          : {}),
        // Un événement déplacé doit rappeler de nouveau.
        ...(decale || dto.rappelMinutes !== undefined
          ? { rappelEnvoyeLe: null }
          : {}),
        ...(participants
          ? {
              participants: {
                deleteMany: {},
                create: participants.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
      include,
    });
    await this.inviter(evenement, nouveaux, user);
    return this.versItem(evenement, user);
  }

  async supprimer(id: string, user: AgendaUser): Promise<void> {
    const evenement = await this.charger(id);
    this.assertPeutModifier(evenement, user);
    await this.prisma.evenementAgenda.delete({ where: { id } });
  }

  // ------------------------------------------------------------------
  // Règles et outils
  // ------------------------------------------------------------------

  private async charger(id: string): Promise<EvenementComplet> {
    const evenement = await this.prisma.evenementAgenda.findUnique({
      where: { id },
      include,
    });
    if (!evenement) throw new NotFoundException('Événement introuvable');
    return evenement;
  }

  private assertPeutVoir(evenement: EvenementComplet, user: AgendaUser): void {
    const concerne =
      evenement.createurId === user.id ||
      evenement.participants.some((p) => p.userId === user.id);
    if (evenement.visibilite === 'prive' && !concerne) {
      // Un événement privé n'existe pas pour les autres.
      throw new NotFoundException('Événement introuvable');
    }
  }

  private assertPeutModifier(
    evenement: EvenementComplet,
    user: AgendaUser,
  ): void {
    this.assertPeutVoir(evenement, user);
    if (evenement.createurId !== user.id && !this.estAdmin(user)) {
      throw new ForbiddenException(
        'Seul l’organisateur ou l’encadrement modifie cet événement',
      );
    }
  }

  private async participantsValides(ids: string[]): Promise<string[]> {
    const distincts = [...new Set(ids)];
    if (distincts.length === 0) return [];
    const valides = (await this.taches.collaborateurs()).map((c) => c.id);
    const inconnu = distincts.find((id) => !valides.includes(id));
    if (inconnu) {
      throw new BadRequestException(
        'Un participant n’est pas un collaborateur actif',
      );
    }
    return distincts;
  }

  private async lienDossier(
    entityType: string | undefined,
    entityId: string | undefined,
    user: AgendaUser,
  ) {
    if (!entityType && !entityId) return {};
    if (!entityType || !entityId) {
      throw new BadRequestException(
        'Indiquez le type et l’identifiant du dossier',
      );
    }
    const ref = await this.dossiers.verifier(entityType, entityId, user);
    return {
      entityType: ref.entityType,
      entityId: ref.entityId,
      entityLabel: ref.entityLabel,
    };
  }

  private async inviter(
    evenement: EvenementComplet,
    invites: string[],
    user: AgendaUser,
  ): Promise<void> {
    if (invites.length === 0) return;
    await this.notifications.notifier(invites, {
      type: 'evenement_invitation',
      titre: `${nomComplet(user)} vous invite : ${evenement.titre}`,
      message: evenement.debut.toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: evenement.journeeEntiere ? undefined : 'short',
      }),
      lien: `/agenda?evenement=${evenement.id}`,
      entityType: 'EvenementAgenda',
      entityId: evenement.id,
    });
  }

  private versItem(evenement: EvenementComplet, user: AgendaUser): ItemAgenda {
    return {
      id: evenement.id,
      source: 'evenement',
      type: evenement.type,
      titre: evenement.titre,
      debut: evenement.debut,
      fin: evenement.fin,
      journeeEntiere: evenement.journeeEntiere,
      lieu: evenement.lieu,
      statut: evenement.statut,
      lien:
        evenement.entityType && evenement.entityId
          ? this.lienDossierEvenement(evenement.entityType, evenement.entityId)
          : undefined,
      entityLabel: evenement.entityLabel,
      modifiable:
        evenement.createurId === user.id ||
        user.permissions.includes(PERMISSION_ADMIN_AGENDA),
      participants: evenement.participants.map((p) => p.user),
      createur: evenement.createur,
      description: evenement.description,
      visibilite: evenement.visibilite,
      rappelMinutes: evenement.rappelMinutes,
      entityType: evenement.entityType,
      entityId: evenement.entityId,
    };
  }

  private lienDossierEvenement(entityType: string, entityId: string): string {
    switch (entityType) {
      case 'prospect':
        return `/crm/prospects/${entityId}`;
      case 'vente':
        return `/ventes/${entityId}`;
      case 'mandat':
        return `/mandats/${entityId}`;
      case 'mission':
        return `/demarches/missions/${entityId}`;
      case 'chantier':
        return `/construction/chantiers/${entityId}`;
      case 'bail':
        return '/locatif/biens';
      case 'terrain':
        return `/terrains/${entityId}`;
      default:
        return '/agenda';
    }
  }
}
