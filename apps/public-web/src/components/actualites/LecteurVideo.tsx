import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Bookmark, BookmarkCheck, ChevronDown, ChevronRight, Maximize, Play, Share2, Youtube } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';
import { useVideosEnregistrees } from '../../hooks/useVideosEnregistrees';
import type { Publication } from '../../types/publication';
import { ROUTES } from '../../routes';
import { formatDate } from '../../utils/format';
import { etiquetteRubrique, formaterDureeLecteur, lienDeLaVideo } from '../../utils/publications';

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary';

/** Bouton rond d'une action (Partager, Enregistrer…) avec son libellé dessous. */
function ActionRonde({ libelle, onClick, actif = false, children }: { libelle: string; onClick: () => void; actif?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif || undefined} className={`flex w-16 flex-col items-center gap-1.5 text-xs font-medium text-mtm-muted active:scale-95 ${FOCUS}`}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${actif ? 'border-mtm-primary bg-mtm-primary-subtle text-mtm-primary' : 'border-mtm-border bg-mtm-surface text-mtm-text'}`}>
        {children}
      </span>
      {libelle}
    </button>
  );
}

/** Résumé replié sur trois lignes, avec « Voir plus ». */
function Resume({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);
  const long = texte.length > 150;
  return (
    <div className="mt-4">
      <p className={`whitespace-pre-line text-[15px] leading-relaxed text-mtm-muted ${ouvert ? '' : 'line-clamp-3'}`}>{texte}</p>
      {long && (
        <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((valeur) => !valeur)} className={`mt-1 inline-flex items-center gap-1 text-[15px] font-semibold text-mtm-primary ${FOCUS}`}>
          {ouvert ? 'Voir moins' : 'Voir plus'}
          <ChevronDown className={`h-4 w-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Ligne de la liste « Autres vidéos » : miniature, titre, rubrique et date. */
function AutreVideo({ publication, onChoisir }: { publication: Publication; onChoisir: () => void }) {
  const duree = formaterDureeLecteur(publication.dureeSecondes);
  return (
    <li>
      <button type="button" onClick={onChoisir} aria-label={`Lire la vidéo : ${publication.titre}`} className={`group flex w-full items-start gap-3 rounded-xl text-left active:opacity-80 ${FOCUS}`}>
        <span className="relative block aspect-video w-[9.5rem] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-mtm-primary-dark to-mtm-primary-medium">
          {publication.posterUrl && (
            <img
              src={publication.posterUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                const image = event.currentTarget;
                if (image.src.includes('maxresdefault')) image.src = image.src.replace('maxresdefault', 'hqdefault');
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {duree && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">{duree}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-3 block text-[15px] font-semibold leading-snug text-mtm-text">{publication.titre}</span>
          <span className="mt-1 flex items-center gap-1 text-sm text-mtm-muted">
            MTM Immobilier <BadgeCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
          </span>
          <span className="block text-sm text-mtm-muted">
            {etiquetteRubrique(publication.categorie)} · {formatDate(publication.datePublication)}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Fiche de lecture d'une vidéo (fichier de MTM ou vidéo YouTube lue sans quitter le site) : le lecteur,
 * le titre, la chaîne, le résumé repliable, les actions (voir sur YouTube, partager, enregistrer, copier
 * le lien) puis les autres vidéos, qui se lisent d'un toucher sans fermer la fiche.
 */
export function LecteurVideo({
  publication,
  autres = [],
  onChoisir,
  onClose,
}: {
  publication: Publication;
  autres?: Publication[];
  onChoisir?: (publication: Publication) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { estEnregistree, basculer } = useVideosEnregistrees();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lien = lienDeLaVideo(publication.id);
  const enregistree = estEnregistree(publication.id);

  async function copier(): Promise<void> {
    try {
      await navigator.clipboard.writeText(lien);
      toast.show('Lien copié');
    } catch {
      toast.show('Impossible de copier le lien', 'error');
    }
  }

  async function partager(): Promise<void> {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: publication.titre, text: publication.resume ?? undefined, url: lien });
      } catch {
        // La personne a refermé le choix de partage : rien à faire.
      }
      return;
    }
    await copier();
  }

  function enregistrer(): void {
    basculer(publication.id);
    toast.show(enregistree ? 'Retirée de vos vidéos enregistrées' : 'Vidéo enregistrée');
  }

  function choisir(autre: Publication): void {
    onChoisir?.(autre);
    // On revient en haut de la fiche : la nouvelle vidéo démarre sous les yeux.
    document.querySelector<HTMLElement>('[role="dialog"]')?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  return (
    <Modal title={publication.titre} lecteur onClose={onClose}>
      <div className="overflow-hidden rounded-2xl bg-black">
        {publication.youtubeId ? (
          <iframe
            key={publication.id}
            title={publication.titre}
            src={`https://www.youtube-nocookie.com/embed/${publication.youtubeId}?autoplay=1&rel=0&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full border-0"
          />
        ) : (
          <video
            key={publication.id}
            ref={videoRef}
            src={publication.videoUrl ?? undefined}
            poster={publication.posterUrl ?? undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="aspect-video w-full bg-black object-contain"
          />
        )}
      </div>

      <p className="mt-4 font-display text-[1.45rem] font-bold leading-tight text-mtm-text">{publication.titre}</p>

      <div className="mt-3 flex items-center gap-3">
        <img src="/logomtm.jpeg" alt="" className="h-12 w-12 shrink-0 rounded-full border border-mtm-border object-cover" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-mtm-text">
            MTM Immobilier
            <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-sky-600" aria-label="Chaîne officielle" />
          </p>
          <p className="text-sm text-mtm-muted">
            <time dateTime={publication.datePublication}>{formatDate(publication.datePublication)}</time>
            {formaterDureeLecteur(publication.dureeSecondes) && <> · {formaterDureeLecteur(publication.dureeSecondes)}</>}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Badge tone="primary">{etiquetteRubrique(publication.categorie)}</Badge>
      </div>

      {publication.resume && <Resume texte={publication.resume} />}

      <div className="mt-5 flex items-start gap-2">
        {publication.youtubeId ? (
          <a
            href={`https://www.youtube.com/watch?v=${publication.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-mtm-primary px-5 text-[15px] font-semibold text-white transition-colors hover:bg-mtm-primary-dark active:scale-[0.98] ${FOCUS}`}
          >
            <Youtube className="h-5 w-5" aria-hidden="true" />
            Voir sur YouTube
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void videoRef.current?.requestFullscreen?.()}
            className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-mtm-primary px-5 text-[15px] font-semibold text-white transition-colors hover:bg-mtm-primary-dark active:scale-[0.98] ${FOCUS}`}
          >
            <Maximize className="h-5 w-5" aria-hidden="true" />
            Plein écran
          </button>
        )}
        <ActionRonde libelle="Partager" onClick={() => void partager()}>
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </ActionRonde>
        <ActionRonde libelle={enregistree ? 'Enregistrée' : 'Enregistrer'} onClick={enregistrer} actif={enregistree}>
          {enregistree ? <BookmarkCheck className="h-5 w-5" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}
        </ActionRonde>
      </div>

      {autres.length > 0 && (
        <section className="mt-6 border-t border-mtm-border pt-5" aria-labelledby="lecteur-autres">
          <div className="flex items-center justify-between">
            <h3 id="lecteur-autres" className="flex items-center gap-2.5 font-display text-lg font-bold text-mtm-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mtm-text text-white">
                <Play className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
              </span>
              Autres vidéos
            </h3>
            <Link to={ROUTES.actualites} onClick={onClose} className={`inline-flex items-center gap-0.5 text-sm font-semibold text-mtm-primary ${FOCUS}`}>
              Voir toutes
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-4">
            {autres.slice(0, 6).map((autre) => (
              <AutreVideo key={autre.id} publication={autre} onChoisir={() => choisir(autre)} />
            ))}
          </ul>
        </section>
      )}
    </Modal>
  );
}
