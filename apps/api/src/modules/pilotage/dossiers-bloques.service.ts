import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PIPELINE_CLOSED_STAGES } from '../crm/crm-options.service';
import { SettingsService } from '../settings/settings.service';
import { STATUTS_TACHE_OUVERTS } from '../taches/taches.constants';
import {
  CLE_SEUILS_BLOCAGE,
  type SeuilsBlocage,
  type TypeBlocage,
  joursEntre,
  limiteDepuis,
  lireSeuils,
} from './pilotage.calculs';

export interface DossierBloque {
  id: string;
  type: TypeBlocage;
  libelle: string;
  detail: string;
  /** Jours sans mouvement (ou de retard pour une tâche). */
  jours: number;
  responsable: string | null;
  lien: string;
}

export interface GroupeBloque {
  type: TypeBlocage;
  titre: string;
  seuilJours: number;
  total: number;
  /** Les plus anciens d'abord, limités pour rester lisibles. */
  dossiers: DossierBloque[];
}

const LIMITE_PAR_GROUPE = 8;

const nomComplet = (
  p?: {
    firstName?: string | null;
    lastName?: string | null;
    prenom?: string | null;
    nom?: string | null;
  } | null,
): string | null =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

/**
 * « Dossiers bloqués » (maquette du tableau de bord manager) : un dossier
 * encore ouvert dont plus rien ne bouge depuis un délai que MTM règle dans
 * Paramètres (`pilotage.seuilsBlocage`). Un mouvement est une modification du
 * dossier, mais aussi un paiement, une étape, une journée de chantier ou une
 * relance : on ne signale pas comme bloqué ce qui avance par ses pièces jointes.
 */
@Injectable()
export class DossiersBloquesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async seuils(): Promise<SeuilsBlocage> {
    return lireSeuils(await this.settings.getRawValue(CLE_SEUILS_BLOCAGE));
  }

  async lister(maintenant = new Date()): Promise<{
    seuils: SeuilsBlocage;
    total: number;
    groupes: GroupeBloque[];
  }> {
    const seuils = await this.seuils();
    const groupes = await Promise.all([
      this.ventes(seuils.vente, maintenant),
      this.missions(seuils.mission, maintenant),
      this.chantiers(seuils.chantier, maintenant),
      this.prospects(seuils.prospect, maintenant),
      this.taches(seuils.tache, maintenant),
    ]);
    return {
      seuils,
      total: groupes.reduce((somme, g) => somme + g.total, 0),
      groupes,
    };
  }

  /** Nombre total, sans le détail : pour l'alerte du tableau de bord direction. */
  async compter(maintenant = new Date()): Promise<number> {
    return (await this.lister(maintenant)).total;
  }

  private async ventes(jours: number, maintenant: Date): Promise<GroupeBloque> {
    const limite = limiteDepuis(jours, maintenant);
    const where = {
      statut: { notIn: ['solde', 'annule'] },
      updatedAt: { lt: limite },
      paiements: { none: { createdAt: { gte: limite } } },
      reservations: { none: { updatedAt: { gte: limite } } },
      documents: { none: { createdAt: { gte: limite } } },
    };
    const [total, lignes] = await Promise.all([
      this.prisma.dossierVente.count({ where }),
      this.prisma.dossierVente.findMany({
        where,
        select: {
          id: true,
          referenceInterne: true,
          statut: true,
          updatedAt: true,
          prospect: { select: { nom: true, prenom: true } },
          commercialResponsable: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: LIMITE_PAR_GROUPE,
      }),
    ]);
    return {
      type: 'vente',
      titre: 'Ventes sans mouvement',
      seuilJours: jours,
      total,
      dossiers: lignes.map((d) => ({
        id: d.id,
        type: 'vente',
        libelle: `Dossier ${d.referenceInterne ?? ''}`.trim(),
        detail: `${nomComplet(d.prospect) ?? 'Client'} · ${d.statut.replace(/_/g, ' ')}`,
        jours: joursEntre(d.updatedAt, maintenant),
        responsable: nomComplet(d.commercialResponsable),
        lien: `/ventes/${d.id}`,
      })),
    };
  }

  private async missions(
    jours: number,
    maintenant: Date,
  ): Promise<GroupeBloque> {
    const limite = limiteDepuis(jours, maintenant);
    const where = {
      statut: { notIn: ['cloturee', 'abandonnee'] },
      updatedAt: { lt: limite },
      etapes: { none: { updatedAt: { gte: limite } } },
      paiements: { none: { createdAt: { gte: limite } } },
    };
    const [total, lignes] = await Promise.all([
      this.prisma.missionVerification.count({ where }),
      this.prisma.missionVerification.findMany({
        where,
        select: {
          id: true,
          referenceInterne: true,
          statut: true,
          updatedAt: true,
          prospect: { select: { nom: true, prenom: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: LIMITE_PAR_GROUPE,
      }),
    ]);
    return {
      type: 'mission',
      titre: 'Missions à l’arrêt',
      seuilJours: jours,
      total,
      dossiers: lignes.map((m) => ({
        id: m.id,
        type: 'mission',
        libelle: `Mission ${m.referenceInterne ?? ''}`.trim(),
        detail: `${nomComplet(m.prospect) ?? 'Client'} · ${m.statut.replace(/_/g, ' ')}`,
        jours: joursEntre(m.updatedAt, maintenant),
        responsable: null,
        lien: `/demarches/missions/${m.id}`,
      })),
    };
  }

  private async chantiers(
    jours: number,
    maintenant: Date,
  ): Promise<GroupeBloque> {
    const limite = limiteDepuis(jours, maintenant);
    const where = {
      statut: 'en_cours',
      updatedAt: { lt: limite },
      journal: { none: { date: { gte: limite } } },
    };
    const [total, lignes] = await Promise.all([
      this.prisma.projetConstruction.count({ where }),
      this.prisma.projetConstruction.findMany({
        where,
        select: {
          id: true,
          referenceInterne: true,
          intitule: true,
          updatedAt: true,
          responsable: { select: { firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: LIMITE_PAR_GROUPE,
      }),
    ]);
    return {
      type: 'chantier',
      titre: 'Chantiers sans journal',
      seuilJours: jours,
      total,
      dossiers: lignes.map((c) => ({
        id: c.id,
        type: 'chantier',
        libelle: `Chantier ${c.referenceInterne}`,
        detail: `${c.intitule} · aucune journée saisie`,
        jours: joursEntre(c.updatedAt, maintenant),
        responsable: nomComplet(c.responsable),
        lien: `/construction/chantiers/${c.id}`,
      })),
    };
  }

  private async prospects(
    jours: number,
    maintenant: Date,
  ): Promise<GroupeBloque> {
    const limite = limiteDepuis(jours, maintenant);
    const where = {
      statutPipeline: { notIn: [...PIPELINE_CLOSED_STAGES] },
      updatedAt: { lt: limite },
      activites: { none: { updatedAt: { gte: limite } } },
      visites: { none: { updatedAt: { gte: limite } } },
    };
    const [total, lignes] = await Promise.all([
      this.prisma.prospect.count({ where }),
      this.prisma.prospect.findMany({
        where,
        select: {
          id: true,
          nom: true,
          prenom: true,
          statutPipeline: true,
          updatedAt: true,
          commercialResponsable: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: LIMITE_PAR_GROUPE,
      }),
    ]);
    return {
      type: 'prospect',
      titre: 'Prospects oubliés',
      seuilJours: jours,
      total,
      dossiers: lignes.map((p) => ({
        id: p.id,
        type: 'prospect',
        libelle: nomComplet(p) ?? 'Prospect',
        detail: `Étape « ${p.statutPipeline.replace(/_/g, ' ')} » · sans relance`,
        jours: joursEntre(p.updatedAt, maintenant),
        responsable: nomComplet(p.commercialResponsable),
        lien: `/crm/prospects/${p.id}`,
      })),
    };
  }

  private async taches(jours: number, maintenant: Date): Promise<GroupeBloque> {
    const limite = limiteDepuis(jours, maintenant);
    const where = {
      statut: { in: [...STATUTS_TACHE_OUVERTS] },
      dateLimite: { lt: limite },
    };
    const [total, lignes] = await Promise.all([
      this.prisma.tache.count({ where }),
      this.prisma.tache.findMany({
        where,
        select: {
          id: true,
          titre: true,
          dateLimite: true,
          entityLabel: true,
          responsable: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dateLimite: 'asc' },
        take: LIMITE_PAR_GROUPE,
      }),
    ]);
    return {
      type: 'tache',
      titre: 'Tâches très en retard',
      seuilJours: jours,
      total,
      dossiers: lignes.map((t) => ({
        id: t.id,
        type: 'tache',
        libelle: t.titre,
        detail: t.entityLabel ?? 'Sans dossier',
        jours: t.dateLimite ? joursEntre(t.dateLimite, maintenant) : 0,
        responsable: nomComplet(t.responsable),
        lien: `/taches?tache=${t.id}`,
      })),
    };
  }
}
