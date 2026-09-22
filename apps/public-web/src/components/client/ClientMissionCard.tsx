import { CalendarClock, FileText, MapPin, ShieldCheck } from 'lucide-react';
import type { ClientMission } from '../../types/mission';
import { formatDate, formatMoney } from '../../utils/format';
import { missionDecision, missionDocumentType, missionStatus, missionType } from '../../utils/labels';
import { Badge } from '../ui/Badge';

/** Ordre d'avancement affiché au client : les cinq étapes, sans le jargon. */
const ETAPES = [
  'demande',
  'faisabilite',
  'verification_physique',
  'verification_administrative',
  'rapport',
];

/**
 * Une mission de vérification vue par le client : où elle en est, ce que MTM
 * a conclu, et le rapport à télécharger. Le client n'a pas accès aux constats
 * internes — seulement à ce qui lui est destiné.
 */
export function ClientMissionCard({ mission }: { mission: ClientMission }) {
  const status = missionStatus(mission.statut);
  const decision = mission.decision ? missionDecision(mission.decision) : null;
  const lieu =
    mission.terrain?.nom ??
    [mission.localisation, mission.commune, mission.region].filter(Boolean).join(', ');
  const terminee = mission.statut === 'cloturee' || mission.statut === 'abandonnee';
  const etapeCourante = ETAPES.indexOf(mission.statut);
  const avancement = terminee
    ? 100
    : Math.max(0, Math.round(((etapeCourante + 1) / ETAPES.length) * 100));

  return (
    <article className="overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
      <header className="flex flex-col gap-2 border-b border-mtm-border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
            {mission.referenceInterne ?? 'Mission'} · demandée le {formatDate(mission.dateDemande)}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-mtm-text">
            {missionType(mission.typeVerification)}
          </h3>
          {lieu && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-mtm-muted">
              <MapPin className="h-4 w-4 flex-none" aria-hidden="true" />
              <span className="truncate">{lieu}</span>
            </p>
          )}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-mtm-border">
            <div
              className="h-full rounded-full bg-mtm-primary transition-all"
              style={{ width: `${avancement}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-mtm-muted">{status.help}</p>
        </div>

        {mission.dateEcheance && !terminee && (
          <p className="flex items-center gap-1.5 text-sm text-mtm-text">
            <CalendarClock className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
            Réponse attendue pour le {formatDate(mission.dateEcheance)}
          </p>
        )}

        {mission.objectif && (
          <div className="rounded-md bg-mtm-bg px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Votre demande
            </p>
            <p className="mt-1 text-sm text-mtm-text">{mission.objectif}</p>
          </div>
        )}

        {decision && (
          <div className="rounded-md border border-mtm-border px-3 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                Conclusion de MTM
              </p>
              <Badge tone={decision.tone}>{decision.label}</Badge>
            </div>
            <p className="mt-2 text-sm text-mtm-muted">{decision.help}</p>
            {mission.conclusion && (
              <p className="mt-2 whitespace-pre-line text-sm text-mtm-text">{mission.conclusion}</p>
            )}
            {mission.reserves && (
              <p className="mt-2 text-sm text-mtm-warning">Réserves : {mission.reserves}</p>
            )}
            {mission.recommandation && (
              <p className="mt-2 text-sm font-medium text-mtm-text">
                Recommandation : {mission.recommandation}
              </p>
            )}
          </div>
        )}

        {mission.montantDevis !== null && (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-mtm-bg px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                Montant de la mission
              </dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">
                {formatMoney(mission.montantDevis)}
              </dd>
            </div>
            {mission.montantPaye !== null && (
              <div className="rounded-md bg-mtm-bg px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                  Réglé
                </dt>
                <dd className="mt-0.5 font-semibold text-mtm-text">
                  {formatMoney(mission.montantPaye)}
                </dd>
              </div>
            )}
          </dl>
        )}

        {mission.documents.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Documents
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {mission.documents.map((document) => (
                <li key={document.id}>
                  <a
                    href={document.secureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-md border border-mtm-border px-3 py-2 text-sm font-medium text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
                  >
                    <FileText className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
                    <span className="truncate">
                      {document.title ?? missionDocumentType(document.type)}
                    </span>
                    <span className="ml-auto flex-none text-xs text-mtm-muted">
                      {formatDate(document.createdAt)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
