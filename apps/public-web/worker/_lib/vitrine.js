import { SITE_URL, lireApi, pageAvecBalises, resume } from './seo.js';

// Fiche d'une réalisation ou d'un projet à venir. `liste` : '/realisations' ou '/projets-a-venir'.
export async function ficheVitrine({ request, env, params }, liste, nomListe, categorie) {
  const id = String(params.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return pageAvecBalises({ request, env, fiche: null });

  const { statut, donnees: item } = await lireApi(env, `/showcase/${id}`);
  if (statut === 404) {
    return pageAvecBalises({ request, env, statut: 404, fiche: { titre: 'Page introuvable', description: 'Cette fiche n’est plus disponible.', url: `${SITE_URL}${liste}`, noindex: true } });
  }
  // Une fiche ouverte sous la mauvaise rubrique n'est pas indexée deux fois.
  if (!item || (item.category === 'projet_a_venir') !== (categorie === 'projet_a_venir')) {
    return pageAvecBalises({ request, env, fiche: null });
  }

  const titre = `${item.title} – ${nomListe}`;
  const description = resume(item.description, `${nomListe} de MTM Immobilier${item.location ? ` – ${item.location}` : ''}`);
  const url = `${SITE_URL}${liste}/${item.id}`;

  return pageAvecBalises({
    request,
    env,
    fiche: {
      titre,
      description,
      url,
      image: item.imageUrl,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: nomListe, item: `${SITE_URL}${liste}` },
            { '@type': 'ListItem', position: 3, name: item.title, item: url },
          ],
        },
      ],
    },
  });
}
