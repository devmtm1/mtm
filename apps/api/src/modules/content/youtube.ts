const IDENTIFIANT = /^[A-Za-z0-9_-]{11}$/;
const HOTES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Identifiant d'une vidéo YouTube à partir de n'importe quel lien usuel : `watch?v=`, `youtu.be/`,
 * `/shorts/`, `/embed/`, `/live/`. Renvoie `null` pour tout ce qui n'est pas un lien YouTube : on ne
 * garde que l'identifiant de 11 caractères, jamais le lien tel que saisi.
 */
export function extraireIdYoutube(lien: string): string | null {
  const texte = lien.trim();
  if (!texte) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texte) ? texte : `https://${texte}`);
  } catch {
    return null;
  }
  const hote = url.hostname.toLowerCase();
  let candidat: string | null = null;
  if (hote === 'youtu.be' || hote === 'www.youtu.be') {
    candidat = url.pathname.split('/')[1] ?? null;
  } else if (HOTES.has(hote)) {
    const segments = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') candidat = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(segments[0] ?? ''))
      candidat = segments[1] ?? null;
  }
  return candidat && IDENTIFIANT.test(candidat) ? candidat : null;
}
