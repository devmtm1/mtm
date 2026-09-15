import { Children, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  children: ReactNode;
  /** Nom lisible de la rangée (lecteurs d'écran). */
  ariaLabel: string;
  /** Largeur d'un élément selon l'écran (ex. `w-[72%] sm:w-[46%] lg:w-auto`). */
  itemClassName: string;
  /**
   * À partir de `lg`, la rangée redevient une grille classique : classes de
   * la grille (ex. `lg:grid lg:grid-cols-3 lg:gap-6`). Sans cette prop, le
   * carrousel reste actif sur tous les écrans.
   */
  lgClassName?: string;
  /** Défilement automatique (ms) ; 0 = désactivé. Suspendu au toucher et hors écran. */
  autoplayMs?: number;
  /** Classe du conteneur défilant (marges négatives, etc.). */
  className?: string;
  /** Teinte des commandes sur fond sombre. */
  inverted?: boolean;
}

/**
 * Carrousel natif : défilement au doigt avec accroche sur chaque élément,
 * flèches précédent / suivant, points de position, défilement automatique
 * facultatif. Sans bibliothèque : le navigateur gère l'inertie et l'accroche
 * (`scroll-snap`), le composant ne fait que suivre et piloter la position.
 */
export function Carousel({ children, ariaLabel, itemClassName, lgClassName = '', autoplayMs = 0, className = '', inverted = false }: CarouselProps) {
  const items = Children.toArray(children);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  // Position courante = élément dont le bord gauche est le plus proche du
  // bord gauche visible.
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const slides = [...scroller.children] as HTMLElement[];
    const origin = slides[0]?.offsetLeft ?? 0;
    let best = 0;
    let bestDistance = Infinity;
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - origin - scroller.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActive(best);
  }, []);

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const slides = [...scroller.children] as HTMLElement[];
    const target = slides[((index % slides.length) + slides.length) % slides.length];
    if (!target) return;
    scroller.scrollTo({ left: target.offsetLeft - (slides[0]?.offsetLeft ?? 0), behavior: 'smooth' });
  }, []);

  // Défilement automatique : uniquement si l'utilisateur ne préfère pas
  // réduire les animations, si la rangée est visible et non manipulée.
  useEffect(() => {
    if (!autoplayMs || paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(scroller);
    const timer = window.setInterval(() => {
      // Sur grand écran en mode grille, rien ne défile : on ne fait rien.
      if (!visible || scroller.scrollWidth <= scroller.clientWidth + 1) return;
      goTo(active + 1);
    }, autoplayMs);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [autoplayMs, paused, count, active, goTo]);

  const controlClass = inverted
    ? 'border-white/30 text-white hover:bg-white/10 disabled:opacity-30'
    : 'border-mtm-border bg-mtm-surface text-mtm-text hover:border-mtm-primary hover:text-mtm-primary disabled:opacity-30';
  const dotActive = inverted ? 'bg-white' : 'bg-mtm-primary';
  const dotIdle = inverted ? 'bg-white/30' : 'bg-mtm-border';

  return (
    <div
      className="relative"
      onPointerDown={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        role="region"
        aria-roledescription="carrousel"
        aria-label={ariaLabel}
        className={`snap-row -mx-4 px-4 lg:mx-0 lg:px-0 ${lgClassName} ${className}`}
      >
        {items.map((child, index) => (
          <div
            key={index}
            className={itemClassName}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${index + 1} sur ${count}`}
          >
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className={`mt-4 flex items-center justify-between gap-3 ${lgClassName ? 'lg:hidden' : ''}`}>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Précédent"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${controlClass}`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {items.map((_, index) => (
              <button
                key={index}
                type="button"
                tabIndex={-1}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${index === active ? `w-5 ${dotActive}` : `w-2 ${dotIdle}`}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active >= count - 1}
            aria-label="Suivant"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${controlClass}`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
