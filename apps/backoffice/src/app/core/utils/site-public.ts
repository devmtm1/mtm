import { environment } from '../../../environments/environment';

/**
 * Adresse complète d'une ressource du site public. Les photos fournies avec le site (par exemple celles des pôles) sont
 * enregistrées en chemin relatif (« /poles/gestion.jpg ») : seul le site public les sert, pas le back-office. Une adresse déjà
 * complète (photo envoyée vers le stockage) reste telle quelle.
 */
export function urlSitePublic(adresse: string | null | undefined, base: string = environment.publicWebUrl): string | null {
  if (!adresse) return null;
  if (/^(https?:)?\/\//i.test(adresse) || adresse.startsWith('data:') || adresse.startsWith('blob:')) return adresse;
  return `${base.replace(/\/+$/, '')}/${adresse.replace(/^\/+/, '')}`;
}
