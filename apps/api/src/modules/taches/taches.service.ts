import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DossierLienService } from '../dossiers/dossier-lien.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PERMISSION_ADMIN_TACHES,
  STATUTS_TACHE_OUVERTS,
} from './taches.constants';
import {
  CreateTacheDto,
  QueryTachesDto,
  UpdateTacheDto,
} from './dto/tache.dto';

export type TacheUser = {
  id: string;
  roles: string[];
  permissions: string[];
  firstName?: string;
  lastName?: string;
};

const personne = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const UN_JOUR = 24 * 3600 * 1000;

/** Bornes UTC de la journée de `date`. */
export function bornesDuJour(date: Date): { debut: Date; fin: Date } {
  const debut = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  return { debut, fin: new Date(debut.getTime() + UN_JOUR) };
}

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

/**
 * Tâches assignables (section 21 du cahier des charges) : responsable,
 * priorité, date limite, statut et historique, rattachables à n'importe quel
 * dossier. Chacun voit ses tâches et celles qu'il a confiées ; l'encadrement
 * (`taches:administrer`) voit et réassigne celles de toute l'équipe.
 */
@Injectable()
export class TachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossierLienService,
    private readonly notifications: NotificationsService,
  ) {}

  private estAdmin(user: TacheUser): boolean {
    return user.permissions.includes(PERMISSION_ADMIN_TACHES);
  }

  /** Collaborateurs auxquels on peut confier une tâche ou une invitation : comptes actifs hors espace client. */
  async collaborateurs() {
    const utilisateurs = await this.prisma.user.findMany({
      where: {
        isActive: true,
        clientProspectId: null,
        clientLocataireId: null,
        clientProprietaireId: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return utilisateurs
      .filter((u) => u.roles.every((r) => r.role.name !== 'client'))
      .map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        roles: u.roles.map((r) => r.role.name),
      }));
  }

  private async assertCollaborateur(id: string): Promise<void> {
    const trouves = await this.collaborateurs();
    if (!trouves.some((c) => c.id === id)) {
      throw new BadRequestException(
        'Cette personne ne peut pas recevoir de tâche',
      );
    }
  }

  async lister(query: QueryTachesDto, user: TacheUser) {
    const maintenant = new Date();
    const filtres: Prisma.TacheWhereInput[] = [];

    if (query.entityType && query.entityId) {
      // Les tâches d'un dossier se lisent avec le droit d'ouvrir ce dossier.
      await this.dossiers.verifier(query.entityType, query.entityId, user);
      filtres.push({ entityType: query.entityType, entityId: query.entityId });
    } else {
      const scope = query.scope ?? 'mes';
      if (scope === 'equipe') {
        if (!this.estAdmin(user)) {
          throw new ForbiddenException(
            'La vue d’équipe est réservée à l’encadrement',
          );
        }
      } else if (scope === 'creees') {
        filtres.push({ creeParId: user.id });
      } else {
        filtres.push({ responsableId: user.id });
      }
    }

    if (query.responsableId) {
      if (!this.estAdmin(user) && query.responsableId !== user.id) {
        throw new ForbiddenException(
          'Seul l’encadrement consulte les tâches des autres',
        );
      }
      filtres.push({ responsableId: query.responsableId });
    }
    if (query.statut) {
      filtres.push({ statut: { in: query.statut.split(',').filter(Boolean) } });
    }
    if (query.priorite) filtres.push({ priorite: query.priorite });
    if (query.search) {
      filtres.push({
        OR: [
          { titre: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { entityLabel: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.echeance) {
      const { debut, fin } = bornesDuJour(maintenant);
      const ouvert = { statut: { in: [...STATUTS_TACHE_OUVERTS] } };
      if (query.echeance === 'retard') {
        filtres.push({ ...ouvert, dateLimite: { lt: maintenant } });
      } else if (query.echeance === 'aujourdhui') {
        filtres.push({ ...ouvert, dateLimite: { gte: debut, lt: fin } });
      } else if (query.echeance === 'semaine') {
        filtres.push({
          ...ouvert,
          dateLimite: {
            gte: debut,
            lt: new Date(debut.getTime() + 7 * UN_JOUR),
          },
        });
      } else {
        filtres.push({ ...ouvert, dateLimite: null });
      }
    }

    const where: Prisma.TacheWhereInput = { AND: filtres };
    const [total, taches] = await Promise.all([
      this.prisma.tache.count({ where }),
      this.prisma.tache.findMany({
        where,
        include: { responsable: personne, creePar: personne },
        orderBy: [
          { termineeLe: { sort: 'asc', nulls: 'first' } },
          { dateLimite: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: taches.map((tache) => this.presenter(tache, user, maintenant)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Compteurs de la personne connectée, pour le tableau de bord et la barre latérale. */
  async resume(user: TacheUser) {
    const maintenant = new Date();
    const { debut, fin } = bornesDuJour(maintenant);
    const ouvert = {
      responsableId: user.id,
      statut: { in: [...STATUTS_TACHE_OUVERTS] },
    };
    const [enRetard, aujourdhui, aFaire] = await Promise.all([
      this.prisma.tache.count({
        where: { ...ouvert, dateLimite: { lt: maintenant } },
      }),
      this.prisma.tache.count({
        where: { ...ouvert, dateLimite: { gte: debut, lt: fin } },
      }),
      this.prisma.tache.count({ where: ouvert }),
    ]);
    return { enRetard, aujourdhui, aFaire };
  }

  async detail(id: string, user: TacheUser) {
    const tache = await this.prisma.tache.findUnique({
      where: { id },
      include: {
        responsable: personne,
        creePar: personne,
        historique: {
          orderBy: { createdAt: 'asc' },
          include: { user: personne },
        },
      },
    });
    if (!tache) throw new NotFoundException('Tâche introuvable');
    await this.assertPeutVoir(tache, user);
    const { historique, ...reste } = tache;
    return {
      ...this.presenter(reste, user, new Date()),
      historique: historique.map((ligne) => ({
        id: ligne.id,
        action: ligne.action,
        detail: ligne.detail,
        createdAt: ligne.createdAt,
        auteur: ligne.user,
      })),
    };
  }

  async creer(dto: CreateTacheDto, user: TacheUser) {
    const responsableId = dto.responsableId ?? user.id;
    if (responsableId !== user.id)
      await this.assertCollaborateur(responsableId);
    const lien = await this.lienDossier(dto.entityType, dto.entityId, user);

    const tache = await this.prisma.tache.create({
      data: {
        titre: dto.titre.trim(),
        description: dto.description?.trim() || null,
        priorite: dto.priorite ?? 'moyenne',
        dateLimite: dto.dateLimite ? new Date(dto.dateLimite) : null,
        responsableId,
        creeParId: user.id,
        ...lien,
        historique: {
          create: {
            userId: user.id,
            action: 'creee',
            detail:
              responsableId === user.id
                ? null
                : 'Confiée à un collègue à la création',
          },
        },
      },
      include: { responsable: personne, creePar: personne },
    });

    if (responsableId !== user.id) {
      await this.prevenirAssignation(tache, nomComplet(user));
    }
    return this.presenter(tache, user, new Date());
  }

  async modifier(id: string, dto: UpdateTacheDto, user: TacheUser) {
    const actuelle = await this.prisma.tache.findUnique({ where: { id } });
    if (!actuelle) throw new NotFoundException('Tâche introuvable');
    await this.assertPeutModifier(actuelle, user);

    const data: Prisma.TacheUncheckedUpdateInput = {};
    const historique: Array<{ action: string; detail: string }> = [];

    if (dto.titre !== undefined && dto.titre.trim() !== actuelle.titre) {
      data.titre = dto.titre.trim();
      historique.push({ action: 'titre', detail: dto.titre.trim() });
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    if (dto.priorite && dto.priorite !== actuelle.priorite) {
      data.priorite = dto.priorite;
      historique.push({
        action: 'priorite',
        detail: `${actuelle.priorite} → ${dto.priorite}`,
      });
    }
    if (dto.dateLimite !== undefined) {
      const nouvelle = dto.dateLimite ? new Date(dto.dateLimite) : null;
      if (nouvelle?.getTime() !== actuelle.dateLimite?.getTime()) {
        data.dateLimite = nouvelle;
        historique.push({
          action: 'echeance',
          detail: nouvelle ? nouvelle.toISOString().slice(0, 10) : 'retirée',
        });
      }
    }
    let nouveauResponsable: string | null = null;
    if (dto.responsableId && dto.responsableId !== actuelle.responsableId) {
      // Réassigner à un autre : réservé à qui a confié la tâche, ou à l'encadrement ;
      // le responsable peut en revanche se la réattribuer ou la passer à un collègue.
      await this.assertCollaborateur(dto.responsableId);
      data.responsableId = dto.responsableId;
      nouveauResponsable = dto.responsableId;
      historique.push({ action: 'assignee', detail: dto.responsableId });
    }
    if (dto.statut && dto.statut !== actuelle.statut) {
      data.statut = dto.statut;
      const ferme = dto.statut === 'terminee' || dto.statut === 'annulee';
      data.termineeLe = ferme ? new Date() : null;
      historique.push({
        action: 'statut',
        detail: `${actuelle.statut} → ${dto.statut}`,
      });
    }

    if (Object.keys(data).length === 0) {
      return this.detail(id, user);
    }

    const tache = await this.prisma.tache.update({
      where: { id },
      data: {
        ...data,
        historique: {
          create: historique.map((ligne) => ({ ...ligne, userId: user.id })),
        },
      },
      include: { responsable: personne, creePar: personne },
    });

    if (nouveauResponsable && nouveauResponsable !== user.id) {
      await this.prevenirAssignation(tache, nomComplet(user));
    }
    return this.detail(id, user);
  }

  async commenter(id: string, texte: string, user: TacheUser) {
    const tache = await this.prisma.tache.findUnique({ where: { id } });
    if (!tache) throw new NotFoundException('Tâche introuvable');
    await this.assertPeutVoir(tache, user);
    await this.prisma.tacheHistorique.create({
      data: {
        tacheId: id,
        userId: user.id,
        action: 'commentaire',
        detail: texte.trim(),
      },
    });
    return this.detail(id, user);
  }

  async supprimer(id: string): Promise<void> {
    const existe = await this.prisma.tache.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Tâche introuvable');
    await this.prisma.tache.delete({ where: { id } });
  }

  // --- règles d'accès ---

  private async assertPeutVoir(
    tache: {
      responsableId: string;
      creeParId: string;
      entityType: string | null;
      entityId: string | null;
    },
    user: TacheUser,
  ): Promise<void> {
    if (
      this.estAdmin(user) ||
      tache.responsableId === user.id ||
      tache.creeParId === user.id
    ) {
      return;
    }
    // Un collègue qui peut ouvrir le dossier voit aussi ses tâches.
    if (tache.entityType && tache.entityId) {
      try {
        await this.dossiers.verifier(tache.entityType, tache.entityId, user);
        return;
      } catch {
        /* hors périmètre : on retombe sur « introuvable » */
      }
    }
    throw new NotFoundException('Tâche introuvable');
  }

  private async assertPeutModifier(
    tache: {
      responsableId: string;
      creeParId: string;
      entityType: string | null;
      entityId: string | null;
    },
    user: TacheUser,
  ): Promise<void> {
    if (
      this.estAdmin(user) ||
      tache.responsableId === user.id ||
      tache.creeParId === user.id
    ) {
      return;
    }
    await this.assertPeutVoir(tache, user);
    throw new ForbiddenException(
      'Seuls le responsable, celui qui l’a confiée ou l’encadrement modifient cette tâche',
    );
  }

  private async lienDossier(
    entityType: string | undefined,
    entityId: string | undefined,
    user: TacheUser,
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

  private async prevenirAssignation(
    tache: {
      id: string;
      titre: string;
      responsableId: string;
      dateLimite: Date | null;
    },
    parQui: string,
  ): Promise<void> {
    await this.notifications.notifier([tache.responsableId], {
      type: 'tache_assignee',
      titre: `${parQui} vous confie une tâche : ${tache.titre}`,
      message: tache.dateLimite
        ? `À rendre pour le ${tache.dateLimite.toLocaleDateString('fr-FR')}`
        : undefined,
      lien: `/taches?tache=${tache.id}`,
      entityType: 'Tache',
      entityId: tache.id,
    });
  }

  private presenter<
    T extends {
      statut: string;
      dateLimite: Date | null;
      responsableId: string;
      creeParId: string;
    },
  >(tache: T, user: TacheUser, maintenant: Date) {
    const ouverte = STATUTS_TACHE_OUVERTS.includes(tache.statut);
    return {
      ...tache,
      enRetard: ouverte && !!tache.dateLimite && tache.dateLimite < maintenant,
      peutModifier:
        this.estAdmin(user) ||
        tache.responsableId === user.id ||
        tache.creeParId === user.id,
    };
  }
}
