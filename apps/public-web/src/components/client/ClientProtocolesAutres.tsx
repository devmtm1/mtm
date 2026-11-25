import { useCallback, useEffect, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { fetchMesAutresProtocoles } from '../../api/clientPortal';
import { useAuth } from '../../contexts/auth-context-store';
import type { ClientProtocoleAutre } from '../../types/clientPortal';
import { formatDate } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { AccepterProtocoleModal } from './AccepterProtocoleModal';

const LIBELLE_DOSSIER = {
  bail: 'Bail',
  chantier: 'Chantier',
  vente: 'Vente',
} as const;

/**
 * Les protocoles d'un bail (locataire) ou d'un chantier : l'étape simple, et l'acceptation en ligne si MTM l'a activée.
 * Les protocoles des ventes restent dans la carte de chaque dossier. N'affiche rien s'il n'y en a pas.
 */
export function ClientProtocolesAutres() {
  const { accessToken } = useAuth();
  const [protocoles, setProtocoles] = useState<ClientProtocoleAutre[]>([]);
  const [aAccepter, setAAccepter] = useState<ClientProtocoleAutre | null>(null);

  const charger = useCallback(() => {
    if (!accessToken) return;
    fetchMesAutresProtocoles(accessToken)
      .then(setProtocoles)
      .catch(() => setProtocoles([]));
  }, [accessToken]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (protocoles.length === 0) return null;
  return (
    <section aria-label="Protocoles de mes baux et chantiers">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtm-muted">
        <FileSignature className="h-3.5 w-3.5" aria-hidden="true" />
        Protocoles de mes baux et chantiers
      </h2>
      <ul className="flex flex-col gap-2">
        {protocoles.map((protocole) => (
          <li
            key={protocole.id}
            className={`rounded-xl border px-3 py-2.5 ${protocole.etape === 'a_signer' ? 'border-mtm-warning/40 bg-mtm-warning/5' : 'border-mtm-border'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-mtm-text">
                {protocole.titre ?? 'Protocole'}
              </span>
              <Badge
                tone={
                  protocole.etape === 'a_signer'
                    ? 'warning'
                    : protocole.etape === 'en_preparation'
                      ? 'neutral'
                      : 'success'
                }
                dot
              >
                {protocole.libelle}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-mtm-muted">
              {LIBELLE_DOSSIER[protocole.typeDossier]} {protocole.reference}
              {protocole.bien ? ` · ${protocole.bien}` : ''}
            </p>
            <p className="mt-1 text-[13px] text-mtm-muted">{protocole.aide}</p>
            {protocole.peutAccepterEnLigne && (
              <button
                type="button"
                onClick={() => setAAccepter(protocole)}
                className="mt-2 inline-flex min-h-10 items-center rounded-xl bg-mtm-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-mtm-primary/90"
              >
                Lire et accepter en ligne
              </button>
            )}
            {protocole.accepteLe && (
              <p className="mt-0.5 text-xs text-mtm-muted">
                Accepté en ligne le {formatDate(protocole.accepteLe)}.
              </p>
            )}
          </li>
        ))}
      </ul>
      {aAccepter && (
        <AccepterProtocoleModal
          protocole={aAccepter}
          onClose={() => setAAccepter(null)}
          onAccepte={charger}
        />
      )}
    </section>
  );
}
