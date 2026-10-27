import { FolderOpen, Globe2, Layers, ShieldCheck } from 'lucide-react';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from '../layout/BandeauPage';

const FAITS = [
  { icon: Layers, titre: '4 métiers', texte: 'Vente, location, construction, démarches' },
  { icon: ShieldCheck, titre: 'Biens vérifiés', texte: 'Contrôlés avant publication' },
  { icon: FolderOpen, titre: 'Suivi en ligne', texte: 'Dossiers et documents à portée de main' },
  { icon: Globe2, titre: 'Sénégal et diaspora', texte: 'Un service pensé pour la distance' },
];

/**
 * Ouverture de la page À propos : bandeau aux couleurs de MTM avec l'accroche
 * seule, puis quatre faits qui rassurent, posés à cheval sur le bandeau. Pas de
 * paragraphe ni de boutons ici : le texte de présentation suit juste dessous
 * et les appels à l'action sont en fin de page. Même composition sur téléphone et ordinateur ; seules les
 * proportions changent.
 */
export function AboutHero({ accroche, image = IMAGE_BANDEAU_PAGE, chargement = false }: { accroche: string; image?: string; chargement?: boolean }) {
  return (
    <header>
      <BandeauPage vague="ample" eyebrow="À propos" title="MTM Immobilier" description={accroche} image={image} chargement={chargement} />

      <div className="relative z-10 mx-auto -mt-12 max-w-5xl px-4 sm:px-6 lg:-mt-14">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-border shadow-card-hover lg:grid-cols-4 lg:rounded-lg">
          {FAITS.map(({ icon: Icon, titre, texte }) => (
            <li key={titre} className="flex items-center gap-3 bg-mtm-surface p-3.5 sm:items-start lg:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary lg:rounded-md">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold text-mtm-text">{titre}</span>
                <span className="mt-0.5 hidden text-xs leading-snug text-mtm-muted sm:block">{texte}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
