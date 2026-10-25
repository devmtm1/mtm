import { useEffect } from 'react';

const SITE_NAME = 'MTM Immobilier';

/** Adresse officielle du site : sert aux liens canoniques et aux aperçus de partage. */
export const SITE_URL = 'https://www.mtm-immobilier.com';

/** Image d'aperçu par défaut (WhatsApp, Facebook…) quand la page n'a pas sa propre photo. */
const IMAGE_PAR_DEFAUT = `${SITE_URL}/hero-poster.jpg`;

/**
 * Événement émis dès qu'une page a posé son titre. Il permet à l'annonceur de
 * route (RouteAnnouncer) de réagir au bon moment, y compris pour les pages
 * chargées à la demande dont le titre n'existe pas encore lors du changement
 * d'URL.
 */
export const PAGE_METADATA_EVENT = 'mtm:page-metadata';

interface PageMetadata {
  /** Titre de la page, sans le nom du site (ajouté automatiquement). */
  title?: string;
  /** Méta-description pour les moteurs de recherche et les aperçus de partage. */
  description?: string;
  /** Photo de l'aperçu de partage (adresse absolue) ; à défaut, la photo du site. */
  image?: string | null;
  /** Page à ne pas faire apparaître dans Google (favoris, connexion…). */
  noindex?: boolean;
  /** Données structurées (schema.org) décrivant la page : bien à vendre, annonce, fil d'Ariane… */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function meta(attribut: 'name' | 'property', cle: string, contenu: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribut}="${cle}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribut, cle);
    document.head.appendChild(tag);
  }
  tag.content = contenu;
}

function lienCanonique(url: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = url;
}

/** Adresse canonique : sans paramètres de recherche ni ancre, sans barre finale. */
export function urlCanonique(chemin: string): string {
  const propre = chemin.split(/[?#]/)[0].replace(/\/+$/, '');
  return `${SITE_URL}${propre === '' ? '/' : propre}`;
}

/**
 * Renseigne le titre, la description, l'adresse canonique, l'aperçu de partage
 * et les données structurées de la page courante.
 *
 * Sans cela, toutes les routes partagent le titre défini dans `index.html` :
 * onglets, historique et favoris deviennent indistinguables, et les moteurs
 * de recherche indexent chaque page sous le même intitulé — pénalisant pour
 * un site vitrine (section 5 du cahier des charges).
 */
export function usePageMetadata({ title, description, image, noindex = false, jsonLd }: PageMetadata): void {
  const jsonLdTexte = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const complet = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    document.title = complet;
    if (description) meta('name', 'description', description);

    const url = urlCanonique(window.location.pathname);
    lienCanonique(url);
    meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', SITE_NAME);
    meta('property', 'og:locale', 'fr_FR');
    meta('property', 'og:title', complet);
    meta('property', 'og:url', url);
    meta('property', 'og:image', image || IMAGE_PAR_DEFAUT);
    if (description) meta('property', 'og:description', description);
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', complet);
    if (description) meta('name', 'twitter:description', description);
    meta('name', 'twitter:image', image || IMAGE_PAR_DEFAUT);

    window.dispatchEvent(new CustomEvent(PAGE_METADATA_EVENT));
  }, [title, description, image, noindex]);

  // Les données structurées sont propres à la page : retirées en la quittant.
  useEffect(() => {
    if (!jsonLdTexte) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.pageJsonld = 'true';
    script.textContent = jsonLdTexte;
    document.head.appendChild(script);
    return () => script.remove();
  }, [jsonLdTexte]);
}
