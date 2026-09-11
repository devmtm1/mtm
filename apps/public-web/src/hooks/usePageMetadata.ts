import { useEffect } from 'react';

const SITE_NAME = 'MTM Immobilier';

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
}

function setMetaDescription(content: string): void {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'description';
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Renseigne le titre et la description de la page courante.
 *
 * Sans cela, toutes les routes partagent le titre défini dans `index.html` :
 * onglets, historique et favoris deviennent indistinguables, et les moteurs
 * de recherche indexent chaque page sous le même intitulé — pénalisant pour
 * un site vitrine (section 5 du cahier des charges).
 */
export function usePageMetadata({ title, description }: PageMetadata): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    if (description) setMetaDescription(description);
    window.dispatchEvent(new CustomEvent(PAGE_METADATA_EVENT));
  }, [title, description]);
}
