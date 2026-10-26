import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import type { Location } from '../../types/location';
import { ROUTES } from '../../routes';
import { typeBienLabel } from '../../utils/bienLabels';
import { chambresLabel, prixAffiche } from '../../utils/locationFormat';

interface AutresLogementsProps {
  immeuble: NonNullable<Location['immeuble']>;
}

/** Les autres logements encore libres de la même résidence : un locataire qui hésite en trouve un voisin. */
export function AutresLogements({ immeuble }: AutresLogementsProps) {
  if (immeuble.autresLogements.length === 0) return null;
  return (
    <section
      aria-labelledby="autres-logements-titre"
      className="rounded-xl border border-mtm-border bg-mtm-surface p-5 shadow-card"
    >
      <h2
        id="autres-logements-titre"
        className="flex items-center gap-2 font-display text-lg font-bold text-mtm-text"
      >
        <Building2 className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
        Autres logements disponibles — {immeuble.nom}
      </h2>
      <ul className="mt-3 divide-y divide-mtm-border">
        {immeuble.autresLogements.map((logement) => {
          const prix = prixAffiche(logement);
          const chambres = chambresLabel(logement.nombreChambres);
          const intitule = [
            logement.numeroLot,
            typeBienLabel(logement.type),
            chambres,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={logement.id}>
              <Link
                to={ROUTES.locationDetail(logement.id)}
                className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-mtm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary"
              >
                <span className="font-semibold text-mtm-text">{intitule}</span>
                <span className="whitespace-nowrap font-semibold text-mtm-primary">
                  {prix.montant}
                  <span className="ml-1 text-xs font-normal text-mtm-muted">
                    {prix.suffixe}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
