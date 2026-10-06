import { CalendarClock, FileText, MapPin, ShieldCheck } from 'lucide-react';
import type { ClientMission } from '../../types/mission';
import { cloudinaryWidth, isCloudinaryImage } from '../../utils/cloudinary';
import { formatDate, formatMoney } from '../../utils/format';
import { missionDecision, missionDocumentType, missionStatus, missionType } from '../../utils/labels';
import { Badge } from '../ui/Badge';
import { ProgressBar } from './shell/ClientUi';
import { ClientDisclosure } from './shell/Disclosure';

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
export function ClientMissionCard({ mission, defaultOpen = false }: { mission: ClientMission; defaultOpen?: boolean }) {
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

  // Les photos d'une visite se regardent, elles ne se téléchargent pas une
  // à une : vignettes d'un côté, rapport et pièces de l'autre.
  const photos = mission.documents.filter((document) => isCloudinaryImage(document.secureUrl));
  const fichiers = mission.documents.filter((document) => !isCloudinaryImage(document.secureUrl));

  return (
    <ClientDisclosure
      defaultOpen={defaultOpen}
      summary={
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                {mission.referenceInterne ?? 'Mission'} · demandée le {formatDate(mission.dateDemande)}
              </p>
              <h3 className="mt-0.5 font-display text-[17px] font-bold text-mtm-text">
                {missionType(mission.typeVerification)}
              </h3>
              {lieu && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-mtm-muted">
                  <MapPin className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  <span className="truncate">{lieu}</span>
                </p>
              )}
            </div>
            <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
          </div>
          <ProgressBar value={avancement} label="Avancement de la vérification" tone="primary" className="mt-3" />
          {mission.dateEcheance && !terminee && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mtm-primary">
              <CalendarClock className="h-4 w-4 flex-none" aria-hidden="true" />
              Réponse attendue pour le {formatDate(mission.dateEcheance)}
            </p>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-mtm-muted">{status.help}</p>

        {mission.objectif && (
          <div className="rounded-xl bg-mtm-bg px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Votre demande
            </p>
            <p className="mt-1 text-sm text-mtm-text">{mission.objectif}</p>
          </div>
        )}

        {decision && (
          <div className="rounded-xl border border-mtm-border px-3 py-3">
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
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-mtm-bg px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                Montant de la mission
              </dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">
                {formatMoney(mission.montantDevis)}
              </dd>
            </div>
            {mission.montantPaye !== null && (
              <div className="rounded-xl bg-mtm-bg px-3 py-2">
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

        {photos.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Photos de la visite
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <li key={photo.id}>
                  <a
                    href={photo.secureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-mtm-border transition-colors hover:border-mtm-primary"
                  >
                    <img
                      src={cloudinaryWidth(photo.secureUrl, 400)}
                      alt={photo.title ?? 'Photo prise lors de la vérification'}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fichiers.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Documents
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {fichiers.map((document) => (
                <li key={document.id}>
                  <a
                    href={document.secureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-mtm-border px-3 py-2 text-sm font-medium text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
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
    </ClientDisclosure>
  );
}
