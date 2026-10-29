import type { PrismaService } from '../../database/prisma.service';

/**
 * Ce que le client attend de MTM. Seul « acheteur » suit le pipeline de vente (visites, négociation, réservation) ;
 * un client de vérification ou de chantier suit sa mission ou son chantier, et n'entre pas dans les chiffres commerciaux.
 */
export const PARCOURS = [
  'acheteur',
  'verification',
  'chantier',
  'autre',
] as const;
export type Parcours = (typeof PARCOURS)[number];

/**
 * À l'ouverture d'une mission ou d'un chantier, oriente la fiche vers ce parcours si elle n'a encore rien d'un
 * acheteur : ni dossier de vente, ni visite. Une fiche déjà engagée dans une vente reste acheteur, et un parcours
 * choisi à la main (autre que « acheteur ») n'est jamais écrasé.
 */
export async function orienterParcours(
  prisma: Pick<PrismaService, 'prospect'>,
  prospectId: string,
  parcours: Exclude<Parcours, 'acheteur'>,
): Promise<void> {
  await prisma.prospect.updateMany({
    where: {
      id: prospectId,
      parcours: 'acheteur',
      dossiers: { none: {} },
      visites: { none: {} },
    },
    data: { parcours },
  });
}
