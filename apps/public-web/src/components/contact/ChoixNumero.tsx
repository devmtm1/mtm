import { Phone } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useSiteContact } from '../../hooks/useSiteContact';
import { afficherNumero, lienAppel } from '../../utils/numeros';
import { fermerChoixNumero, useChoixNumeroOuvert } from './choix-numero-store';

/**
 * « Quel numéro appeler ? » : la liste des numéros de MTM, dans l'ordre. Un clic sur l'un d'eux lance l'appel. Montée une seule
 * fois dans la mise en page ; tous les boutons « Appeler » du site l'ouvrent.
 */
export function ChoixNumero() {
  const ouvert = useChoixNumeroOuvert();
  const { telephones } = useSiteContact();
  if (!ouvert) return null;

  return (
    <Modal title="Quel numéro appeler ?" onClose={fermerChoixNumero}>
      <p className="-mt-1 mb-4 text-sm text-mtm-muted">Choisissez le numéro que vous souhaitez appeler.</p>
      <ul className="flex flex-col gap-2.5">
        {telephones.map((numero, index) => (
          <li key={numero}>
            <a
              href={lienAppel(numero)}
              onClick={fermerChoixNumero}
              className="group flex min-h-14 items-center gap-3 rounded-2xl border border-mtm-border bg-mtm-surface px-4 py-3 transition-colors hover:border-mtm-primary hover:bg-mtm-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mtm-success/10 text-mtm-success">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 font-display text-lg font-bold text-mtm-primary-dark">{afficherNumero(numero)}</span>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-mtm-muted group-hover:text-mtm-primary">
                {index === 0 ? 'Principal' : 'Appeler'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
