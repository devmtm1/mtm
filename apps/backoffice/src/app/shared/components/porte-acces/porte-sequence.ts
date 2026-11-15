/**
 * Séquence visuelle « clé et porte » de l'écran de connexion. C'est une couche de PRÉSENTATION : elle ne connaît ni l'API ni
 * les identifiants, elle suit seulement l'issue qu'on lui annonce. La porte ne s'ouvre que lorsque `reussir()` est appelé,
 * c'est-à-dire après la confirmation du serveur ; aucun délai artificiel n'est ajouté à un refus.
 *
 *   repos → approche (la clé vient vers la serrure) → attente (clé insérée, le serveur répond)
 *         → ouverture (la clé tourne, les battants s'écartent) → ouvert
 *   refus : la scène s'efface aussitôt, le formulaire reste intact.
 */
export type EtatPorte = 'repos' | 'approche' | 'attente' | 'ouverture' | 'ouvert' | 'refus';

const APPROCHE_MS = 700;
const OUVERTURE_MS = 1650;
/** Mouvement réduit ou 3D indisponible : une simple transition, sans rotation ni déplacement. */
const OUVERTURE_REDUITE_MS = 350;
const REFUS_MS = 250;

/** Faut-il se passer des effets 3D ? Réglage « réduire les animations » du système, ou navigateur sans CSS 3D. */
export function mouvementReduit(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    if (typeof CSS === 'undefined' || !CSS.supports) return true;
    return !CSS.supports('transform-style', 'preserve-3d');
  } catch {
    return true;
  }
}

export class SequencePorte {
  private etat: EtatPorte = 'repos';
  private minuteurs: ReturnType<typeof setTimeout>[] = [];
  private generation = 0;
  private cleEnPlace: Promise<void> = Promise.resolve();
  private liberer: (() => void) | null = null;

  constructor(
    private readonly surChangement: (etat: EtatPorte) => void,
    private readonly reduit: () => boolean = mouvementReduit,
  ) {}

  /** La demande part : la clé s'approche de la serrure et s'y insère pendant que le serveur répond. */
  demarrer(): void {
    this.reinitialiser();
    this.changer('approche');
    this.cleEnPlace = new Promise<void>((resolve) => {
      this.liberer = resolve;
      this.planifier(() => {
        if (this.etat === 'approche') this.changer('attente');
        this.liberer = null;
        resolve();
      }, this.reduit() ? 0 : APPROCHE_MS);
    });
  }

  /** Le serveur a confirmé : la clé tourne, les battants s'ouvrent. Résout `true` quand c'est terminé, `false` si interrompu. */
  async reussir(): Promise<boolean> {
    const generation = this.generation;
    await this.cleEnPlace;
    if (generation !== this.generation) return false;
    this.changer('ouverture');
    await new Promise<void>((resolve) => this.planifier(resolve, this.reduit() ? OUVERTURE_REDUITE_MS : OUVERTURE_MS));
    if (generation !== this.generation) return false;
    this.changer('ouvert');
    return true;
  }

  /** Identifiants refusés ou erreur : la scène disparaît tout de suite, sans retarder le message d'erreur. */
  refuser(): void {
    this.reinitialiser();
    this.changer('refus');
    this.planifier(() => this.changer('repos'), REFUS_MS);
  }

  /** Fin de la scène sans verdict (étape 2FA à saisir, composant détruit). */
  annuler(): void {
    this.reinitialiser();
    this.changer('repos');
  }

  private reinitialiser(): void {
    this.generation += 1;
    this.minuteurs.forEach(clearTimeout);
    this.minuteurs = [];
    this.liberer?.();
    this.liberer = null;
  }

  private planifier(action: () => void, delai: number): void {
    this.minuteurs.push(setTimeout(action, delai));
  }

  private changer(etat: EtatPorte): void {
    this.etat = etat;
    this.surChangement(etat);
  }
}
