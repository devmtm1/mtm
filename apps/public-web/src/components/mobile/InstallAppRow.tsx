import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

/**
 * Propose d'installer MTM sur l'écran d'accueil. Rien n'est affiché si
 * l'application est déjà installée ou si le navigateur ne sait pas l'installer.
 */
export function InstallAppRow() {
  const { state, install } = usePwaInstall();
  const [help, setHelp] = useState(false);

  if (state === 'installed' || state === 'unavailable') return null;

  return (
    <div className="mt-4 rounded-2xl border border-mtm-border bg-mtm-surface">
      <button
        type="button"
        onClick={() => (state === 'available' ? void install() : setHelp((open) => !open))}
        aria-expanded={state === 'ios' ? help : undefined}
        className="flex w-full items-center gap-3 px-3 py-3 text-left text-[15px] font-semibold text-mtm-text active:scale-[0.98] active:bg-mtm-bg"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
          <Download className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex-1">
          Installer l’application
          <span className="block text-xs font-normal text-mtm-muted">Accès direct depuis votre écran d’accueil</span>
        </span>
      </button>
      {state === 'ios' && help && (
        <p className="flex items-start gap-2 border-t border-mtm-border px-3 py-3 text-sm text-mtm-muted">
          <Share className="mt-0.5 h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
          <span>
            Dans Safari, touchez <strong className="text-mtm-text">Partager</strong>, puis{' '}
            <strong className="text-mtm-text">Sur l’écran d’accueil</strong>.
          </span>
        </p>
      )}
    </div>
  );
}
