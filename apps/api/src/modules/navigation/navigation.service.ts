import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasSupervisionScope } from '../rbac/role-groups';
import { STATUTS_TACHE_OUVERTS } from '../taches/taches.constants';

export interface CompteursNavigation {
  /** Messages du site public pas encore lus. */
  demandesWeb: number;
  /** Paiements de vente en attente de validation. */
  paiementsAValider: number;
  /** Relances de loyers prêtes à partir. */
  relancesLocatives: number;
  /** Demandes de résiliation de bail à traiter. */
  resiliations: number;
  /** Saisies financières en attente d'un valideur (hors les siennes). */
  saisiesFinancieres: number;
  /** Mes tâches dont l'échéance est dépassée. */
  tachesEnRetard: number;
}

interface Utilisateur {
  id: string;
  roles: string[];
  permissions: string[];
}

/**
 * Les pastilles du menu : ce qui attend la personne, en un seul appel léger.
 * Chaque compteur n'est calculé que si ses droits le permettent ; sinon 0, et
 * le menu n'affiche rien.
 */
@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async compteurs(user: Utilisateur): Promise<CompteursNavigation> {
    const peut = (permission: string) => user.permissions.includes(permission);
    const zero = Promise.resolve(0);
    const maintenant = new Date();
    const tout = hasSupervisionScope(user, 'ventes', ['comptable']);
    // Même périmètre que les écrans : un collaborateur ne voit que ses biens.
    const biensVisibles = hasSupervisionScope(user, 'locatif', [
      'responsable_gestion_locative',
      'comptable',
    ])
      ? {}
      : { bienLocatif: { responsableId: user.id } };

    const [
      demandesWeb,
      paiementsAValider,
      relancesLocatives,
      resiliations,
      saisiesFinancieres,
      tachesEnRetard,
    ] = await Promise.all([
      peut('contact:consulter')
        ? this.prisma.contact.count({ where: { lu: false } })
        : zero,
      peut('ventes:valider')
        ? this.prisma.paiement.count({
            where: {
              statut: 'en_attente',
              // Un valideur de périmètre limité ne voit que ses dossiers.
              ...(tout
                ? {}
                : { dossierVente: { commercialResponsableId: user.id } }),
            },
          })
        : zero,
      peut('locatif:consulter')
        ? this.prisma.relanceLoyer.count({
            where: { statut: 'a_envoyer', bailLocatif: biensVisibles },
          })
        : zero,
      peut('locatif:consulter')
        ? this.prisma.demandeResiliation.count({
            where: { statut: 'en_attente', bailLocatif: biensVisibles },
          })
        : zero,
      peut('finances:valider')
        ? this.prisma.operationFinanciere.count({
            where: {
              statut: 'en_attente',
              // On ne valide pas ses propres saisies : elles n'attendent pas « nous ».
              createdById: { not: user.id },
            },
          })
        : zero,
      peut('taches:consulter')
        ? this.prisma.tache.count({
            where: {
              responsableId: user.id,
              statut: { in: [...STATUTS_TACHE_OUVERTS] },
              dateLimite: { lt: maintenant },
            },
          })
        : zero,
    ]);

    return {
      demandesWeb,
      paiementsAValider,
      relancesLocatives,
      resiliations,
      saisiesFinancieres,
      tachesEnRetard,
    };
  }
}
