import { useCallback, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MediaImage } from './MediaImage';

export interface LightboxPhoto {
  src: string;
  alt: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  label: string;
}

/**
 * Photos en plein écran : se feuillettent au doigt (glisser à gauche ou à
 * droite), aux flèches, ou au clavier ; Échap ou la croix referment. Rendu dans
 * <body> pour ne dépendre d'aucun ancêtre transformé, et verrouille le
 * défilement de la page derrière.
 */
export function PhotoLightbox({ photos, index, onIndexChange, onClose, label }: PhotoLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const count = photos.length;

  const go = useCallback(
    (delta: number) => {
      if (count > 0) onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      opener?.focus?.();
    };
  }, []);

  const swipe = {
    onTouchStart: (event: TouchEvent) => {
      startX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (startX.current === null) return;
      const delta = event.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (count > 1 && Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    },
  };

  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 motion-safe:animate-fade-in"
      {...swipe}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="text-sm font-semibold">
          {index + 1} / {count}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer les photos"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={onClose}>
        <div onClick={(event) => event.stopPropagation()} className="flex max-h-full max-w-full items-center justify-center">
          <MediaImage
            src={photo.src}
            alt={photo.alt}
            loading="eager"
            sizes="100vw"
            fallbackLabel="Photo indisponible"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:flex"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:flex"
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
