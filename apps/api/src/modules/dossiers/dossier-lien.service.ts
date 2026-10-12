import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CrmAccessService } from '../crm/crm-access.service';
import { ConstructionAccessService } from '../construction/construction-access.service';
import { DemarchesAccessService } from '../demarches/demarches-access.service';
import { LocatifAccessService } from '../locatif/locatif-access.service';
import { MandatsAccessService } from '../mandats/mandats-access.service';
import { TerrainsAccessService } from '../terrains/terrains-access.service';
import { VentesAccessService } from '../ventes/ventes-access.service';

/** Dossiers auxquels une tâche, un événement ou un message peut être rattaché. */
export const TYPES_DOSSIER = [
  'prospect',
  'vente',
  'mandat',
  'mission',
  'bail',
  'chantier',
  'terrain',
] as const;
export type TypeDossier = (typeof TYPES_DOSSIER)[number];

/** Permission qu'il faut détenir pour ouvrir un dossier de ce type. */
export const PERMISSION_DOSSIER: Record<TypeDossier, string> = {
  prospect: 'crm:consulter',
  vente: 'ventes:consulter',
  mandat: 'mandats:consulter',
  mission: 'demarches:consulter',
  bail: 'locatif:consulter',
  chantier: 'construction:consulter',
  terrain: 'terrains:consulter',
};

export interface DossierRef {
  entityType: TypeDossier;
  entityId: string;
  /** Référence ou nom affiché dans les listes. */
  entityLabel: string;
  /** Route du back-office où ouvrir le dossier. */
  lien: string;
}

type Interne = { id: string; roles: string[]; permissions: string[] };

export function estTypeDossier(valeur: unknown): valeur is TypeDossier {
  return (
    typeof valeur === 'string' &&
    (TYPES_DOSSIER as readonly string[]).includes(valeur)
  );
}

/**
 * Point unique pour rattacher quelque chose à un dossier : vérifie que le
 * dossier existe et que la personne a le droit de l'ouvrir (même périmètre que
 * l'écran du dossier), puis donne son libellé et sa route. Les tâches,
 * l'agenda et les fils de discussion passent tous par ici : aucun ne peut
 * révéler l'existence d'un dossier hors de portée.
 */
@Injectable()
export class DossierLienService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmAccessService,
    private readonly ventes: VentesAccessService,
    private readonly mandats: MandatsAccessService,
    private readonly demarches: DemarchesAccessService,
    private readonly locatif: LocatifAccessService,
    private readonly construction: ConstructionAccessService,
    private readonly terrains: TerrainsAccessService,
  ) {}

  /** Dossier ouvrable par un collaborateur, ou exception (403 sans permission, 404 hors périmètre). */
  async verifier(
    entityType: string,
    entityId: string,
    user: Interne,
  ): Promise<DossierRef> {
    if (!estTypeDossier(entityType)) {
      throw new BadRequestException('Type de dossier inconnu');
    }
    if (!user.permissions.includes(PERMISSION_DOSSIER[entityType])) {
      throw new ForbiddenException(
        'Vous n’avez pas accès à ce type de dossier',
      );
    }
    switch (entityType) {
      case 'prospect':
        await this.crm.assertOwnership(entityId, user);
        break;
      case 'vente':
        await this.ventes.ensureAccessible(entityId, user);
        break;
      case 'mandat':
        await this.mandats.ensureAccessible(entityId, user);
        break;
      case 'mission':
        await this.demarches.ensureAccessible(entityId, user);
        break;
      case 'bail':
        await this.locatif.ensureBailAccessible(entityId, user);
        break;
      case 'chantier':
        await this.construction.ensureAccessible(entityId, user);
        break;
      case 'terrain':
        await this.terrains.ensureAccessible(entityId, user);
        break;
    }
    return this.decrire(entityType, entityId);
  }

  /**
   * Dossier d'un client : seulement les siens, et seulement les types ouverts
   * dans l'espace client (vente, mission, chantier, bail).
   */
  async verifierPourClient(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<DossierRef> {
    if (!estTypeDossier(entityType)) {
      throw new BadRequestException('Type de dossier inconnu');
    }
    const compte = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspectId: true, clientLocataireId: true },
    });
    const prospectId = compte?.clientProspectId ?? null;
    const locataireId = compte?.clientLocataireId ?? null;

    let ok = false;
    if (entityType === 'vente' && prospectId) {
      ok = !!(await this.prisma.dossierVente.findFirst({
        where: { id: entityId, prospectId },
        select: { id: true },
      }));
    } else if (entityType === 'mission' && prospectId) {
      ok = !!(await this.prisma.missionVerification.findFirst({
        where: { id: entityId, prospectId, visibleClient: true },
        select: { id: true },
      }));
    } else if (entityType === 'chantier' && prospectId) {
      ok = !!(await this.prisma.projetConstruction.findFirst({
        where: { id: entityId, clientId: prospectId, visibleClient: true },
        select: { id: true },
      }));
    } else if (entityType === 'bail' && locataireId) {
      ok = !!(await this.prisma.bailLocatif.findFirst({
        where: { id: entityId, locataireId },
        select: { id: true },
      }));
    }
    if (!ok) throw new NotFoundException('Dossier introuvable');
    return this.decrire(entityType, entityId);
  }

  /** Libellé et route d'un dossier déjà autorisé. */
  async decrire(
    entityType: TypeDossier,
    entityId: string,
  ): Promise<DossierRef> {
    let label: string | null | undefined;
    let lien = '';
    switch (entityType) {
      case 'prospect': {
        const p = await this.prisma.prospect.findUnique({
          where: { id: entityId },
          select: { nom: true, prenom: true },
        });
        label = p && [p.prenom, p.nom].filter(Boolean).join(' ');
        lien = `/crm/prospects/${entityId}`;
        break;
      }
      case 'vente': {
        const v = await this.prisma.dossierVente.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true },
        });
        label = v ? (v.referenceInterne ?? 'Dossier de vente') : null;
        lien = `/ventes/${entityId}`;
        break;
      }
      case 'mandat': {
        const m = await this.prisma.mandat.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true },
        });
        label = m?.referenceInterne;
        lien = `/mandats/${entityId}`;
        break;
      }
      case 'mission': {
        const m = await this.prisma.missionVerification.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true },
        });
        label = m ? (m.referenceInterne ?? 'Mission') : null;
        lien = `/demarches/missions/${entityId}`;
        break;
      }
      case 'bail': {
        const b = await this.prisma.bailLocatif.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true, bienLocatifId: true },
        });
        label = b?.referenceInterne;
        lien = b ? `/locatif/biens/${b.bienLocatifId}` : '';
        break;
      }
      case 'chantier': {
        const c = await this.prisma.projetConstruction.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true },
        });
        label = c?.referenceInterne;
        lien = `/construction/chantiers/${entityId}`;
        break;
      }
      case 'terrain': {
        const t = await this.prisma.terrain.findUnique({
          where: { id: entityId },
          select: { referenceInterne: true },
        });
        label = t?.referenceInterne;
        lien = `/terrains/${entityId}`;
        break;
      }
    }
    if (!label) throw new NotFoundException('Dossier introuvable');
    return { entityType, entityId, entityLabel: label, lien };
  }

  /** Route de l'espace client pour un dossier (type de dossier → page). */
  lienClient(entityType: TypeDossier): string {
    switch (entityType) {
      case 'vente':
        return '/espace-client/dossiers';
      case 'mission':
        return '/espace-client/verifications';
      case 'chantier':
        return '/espace-client/mon-chantier';
      case 'bail':
        return '/espace-client/ma-location';
      default:
        return '/espace-client';
    }
  }

  /** Utilisateur qui porte le dossier côté MTM (pour le notifier d'un message du client). */
  async responsable(
    entityType: TypeDossier,
    entityId: string,
  ): Promise<string | null> {
    switch (entityType) {
      case 'vente':
        return (
          (
            await this.prisma.dossierVente.findUnique({
              where: { id: entityId },
              select: { commercialResponsableId: true },
            })
          )?.commercialResponsableId ?? null
        );
      case 'prospect':
        return (
          (
            await this.prisma.prospect.findUnique({
              where: { id: entityId },
              select: { commercialResponsableId: true },
            })
          )?.commercialResponsableId ?? null
        );
      default:
        return null;
    }
  }
}
