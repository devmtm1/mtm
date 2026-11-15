import { useEffect, useState } from 'react';
import { SequencePorte, type EtatPorte } from './porte-sequence';

/**
 * Pilote la séquence de la porte depuis un formulaire. L'état est une simple donnée d'affichage : la porte ne s'ouvre que
 * lorsque le formulaire appelle `porte.reussir()` après la confirmation du serveur.
 */
export function usePorte() {
  const [etat, setEtat] = useState<EtatPorte>('repos');
  const [porte] = useState(() => new SequencePorte(setEtat));
  useEffect(() => () => porte.annuler(), [porte]);
  /** La séquence est en cours : la page ne doit pas encore rediriger. */
  const enCours = etat === 'approche' || etat === 'attente' || etat === 'ouverture';
  return { etat, porte, enCours };
}
