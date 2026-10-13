import type { ConfigService } from '@nestjs/config';
import type { CanalExterne, FournisseurMessagerie } from './fournisseur';
import { FournisseurBrevo } from './fournisseur-brevo';
import { FournisseurPasserelle } from './fournisseur-passerelle';

/**
 * Les fournisseurs que l'application sait utiliser. **Ajouter un prestataire,
 * c'est ajouter une ligne ici** (et la classe qui l'implémente) : le reste du
 * code n'a pas à changer. L'ordre sert au choix automatique.
 */
export function creerFournisseurs(
  config: ConfigService,
): FournisseurMessagerie[] {
  return [new FournisseurBrevo(config), new FournisseurPasserelle(config)];
}

/** Variable qui désigne le fournisseur de chaque canal. */
export const VARIABLE_FOURNISSEUR: Record<CanalExterne, string> = {
  sms: 'SMS_PROVIDER',
  whatsapp: 'WHATSAPP_PROVIDER',
};

/** Valeurs qui éteignent un canal même si un fournisseur est configuré. */
const AUCUN = new Set(['none', 'aucun', 'off']);

export type ChoixFournisseur =
  | { fournisseur: FournisseurMessagerie; raison: 'choisi' | 'automatique' }
  | {
      fournisseur: null;
      raison: 'aucun' | 'desactive' | 'inconnu' | 'non_configure';
    };

/**
 * Quel fournisseur porte ce canal ?
 *
 * - `SMS_PROVIDER` / `WHATSAPP_PROVIDER` renseigné : celui-là, et lui seul. S'il
 *   est inconnu ou incomplet, le canal reste **inactif** plutôt que de partir
 *   chez un autre prestataire sans qu'on l'ait voulu ;
 * - `none` : canal éteint ;
 * - variable absente : le premier fournisseur complètement configuré (pratique
 *   quand un seul est branché).
 */
export function choisirFournisseur(
  canal: CanalExterne,
  config: ConfigService,
  fournisseurs: readonly FournisseurMessagerie[],
): ChoixFournisseur {
  const voulu = config
    .get<string>(VARIABLE_FOURNISSEUR[canal])
    ?.trim()
    .toLowerCase();
  if (voulu) {
    if (AUCUN.has(voulu)) return { fournisseur: null, raison: 'desactive' };
    const trouve = fournisseurs.find((f) => f.nom === voulu);
    if (!trouve) return { fournisseur: null, raison: 'inconnu' };
    return trouve.estConfigure(canal)
      ? { fournisseur: trouve, raison: 'choisi' }
      : { fournisseur: null, raison: 'non_configure' };
  }
  const automatique = fournisseurs.find((f) => f.estConfigure(canal));
  return automatique
    ? { fournisseur: automatique, raison: 'automatique' }
    : { fournisseur: null, raison: 'aucun' };
}
