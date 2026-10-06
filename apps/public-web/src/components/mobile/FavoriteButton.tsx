import { Heart } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import type { FavoriteKind } from '../../utils/favorites';

interface FavoriteButtonProps {
  kind: FavoriteKind;
  id: string;
  /** Nom du bien, pour l'étiquette lue par les lecteurs d'écran. */
  label: string;
  className?: string;
}

/**
 * Cœur des cartes : ajoute ou retire le bien des favoris. Posé dans une carte
 * cliquable, il ne doit jamais déclencher l'ouverture de la fiche.
 */
export function FavoriteButton({ kind, id, label, className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(kind, id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(kind, id);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-card backdrop-blur transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${active ? 'fill-mtm-accent text-mtm-accent' : 'text-mtm-muted'}`}
        aria-hidden="true"
      />
    </button>
  );
}
