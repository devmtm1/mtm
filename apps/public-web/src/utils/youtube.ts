const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

/**
 * L'identifiant d'une vidéo YouTube, à partir de ce qu'on colle dans le back-office : l'adresse de la page
 * (youtube.com/watch?v=…), l'adresse courte (youtu.be/…), un lien « embed » ou « shorts », ou l'identifiant seul.
 * Renvoie `null` pour tout le reste (autre site, adresse vide ou mal copiée) : rien ne s'affiche plutôt qu'un lecteur cassé.
 */
export function extraireIdYoutube(valeur: string | null | undefined): string | null {
  const texte = (valeur ?? '').trim();
  if (!texte) return null;
  if (ID_YOUTUBE.test(texte)) return texte;

  let adresse: URL;
  try {
    adresse = new URL(/^https?:\/\//i.test(texte) ? texte : `https://${texte}`);
  } catch {
    return null;
  }
  const hote = adresse.hostname.replace(/^(www|m)\./, '');
  let candidat: string | null = null;
  if (hote === 'youtu.be') {
    candidat = adresse.pathname.split('/')[1] ?? null;
  } else if (hote === 'youtube.com' || hote === 'youtube-nocookie.com') {
    const [, type, identifiant] = adresse.pathname.split('/');
    candidat = type === 'embed' || type === 'shorts' || type === 'live' ? (identifiant ?? null) : adresse.searchParams.get('v');
  }
  return candidat && ID_YOUTUBE.test(candidat) ? candidat : null;
}
