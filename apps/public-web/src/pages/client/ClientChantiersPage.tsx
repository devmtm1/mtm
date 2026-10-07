import { useEffect, useState } from 'react';
import { Download, HardHat } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context-store';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { fetchClientChantier } from '../../api/clientPortal';
import { ClientCard, ClientPageHeader, ClientRow, ProgressBar } from '../../components/client/shell/ClientUi';
import { ShowMoreButton } from '../../components/client/shell/Disclosure';
import { Frise, type FriseItem } from '../../components/client/shell/Frise';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { documentIcone } from '../../utils/documentIcon';
import { formatDate, formatMoney } from '../../utils/format';
import {
  chantierDocumentType,
  chantierJalonStatus,
  chantierStatus,
  chantierType,
} from '../../utils/labels';
import type { ClientChantierDetail } from '../../types/chantier';

/** Avancement : le chiffre en grand, la barre dessous. La première chose que le client cherche. */
function Avancement({ valeur }: { valeur: number }) {
  const pourcent = Math.min(100, Math.max(0, valeur));
  return (
    <div className="rounded-2xl bg-mtm-bg p-4">
      <div className="flex items-end justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-mtm-muted">Avancement du chantier</p>
        <p className="font-display text-3xl font-bold leading-none text-mtm-primary">{pourcent} %</p>
      </div>
      <ProgressBar value={pourcent} label="Avancement du chantier" tone="primary" className="mt-3" />
    </div>
  );
}

/** Les étapes du planning : terminée, en cours (la prochaine à suivre), à venir ; une étape bloquée se signale. */
function etapes(jalons: ClientChantierDetail['jalons']): FriseItem[] {
  return jalons.map((jalon) => {
    const termine = jalon.statut === 'termine';
    const bloque = jalon.statut === 'bloque';
    const etat: FriseItem['etat'] = termine ? 'reglee' : bloque ? 'retard' : jalon.statut === 'en_cours' ? 'prochaine' : 'plus-tard';
    const etatLabel = chantierJalonStatus(jalon.statut).label;
    const date = formatDate(jalon.dateFinReelle ?? jalon.dateFinPrevue);
    return {
      key: jalon.id,
      etat,
      titre: jalon.libelle,
      detail: `${etatLabel}${date !== '—' ? ` · ${termine ? 'achevée le' : 'prévue le'} ${date}` : ''}`,
      droite: termine ? undefined : `${Math.min(100, Math.max(0, jalon.avancement))} %`,
    };
  });
}

/** Libellé et valeur, alignés en colonne : la brique de lecture de la page. */
function Fait({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-mtm-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-mtm-text">{value}</dd>
    </div>
  );
}

/**
 * Espace chantier du client (J2.3, section 16 : « espace client permettant de
 * consulter l'avancement et les rapports autorisés »).
 *
 * Le client voit où en est son chantier, les étapes du planning, les journées
 * que MTM a choisi de publier et les rapports qui lui sont destinés. Le budget
 * interne de MTM et sa marge n'apparaissent nulle part : il a signé un devis,
 * c'est ce montant-là qui le concerne.
 */
export function ClientChantiersPage() {
  const { accessToken } = useAuth();
  const { chantiers, chantiersLoading } = useClientData();
  usePageMetadata({ title: 'Mon chantier' });

  const liste = chantiers ?? [];
  const [choisiId, setChoisiId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientChantierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [journalComplet, setJournalComplet] = useState(false);

  // Un seul chantier dans l'immense majorité des cas : on l'ouvre d'emblée
  // plutôt que d'imposer un clic pour arriver à la seule chose à lire.
  const actifId = choisiId ?? liste[0]?.id ?? null;

  useEffect(() => {
    if (!accessToken || !actifId) return;
    let annule = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchClientChantier(accessToken, actifId)
      .then((donnees) => {
        if (!annule) setDetail(donnees);
      })
      .catch(() => {
        if (!annule) setDetailError('Impossible de charger ce chantier pour le moment.');
      })
      .finally(() => {
        if (!annule) setDetailLoading(false);
      });
    return () => {
      annule = true;
    };
  }, [accessToken, actifId]);

  if (chantiersLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (liste.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ClientPageHeader title="Mon chantier" />
        <EmptyState
          title="Aucun chantier en cours"
          description="Dès qu’un projet de construction vous est ouvert, vous suivrez ici son avancement, son planning et les rapports que MTM vous adresse."
        />
      </div>
    );
  }

  const statut = detail ? chantierStatus(detail.statut) : null;
  const journalVisible = detail ? (journalComplet ? detail.journal : detail.journal.slice(0, 3)) : [];

  return (
    <div className="flex flex-col gap-6">
      <ClientPageHeader
        title="Mon chantier"
        description={
          liste.length > 1
            ? `${liste.length} projets de construction suivis par MTM.`
            : undefined
        }
      />

      {liste.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {liste.map((chantier) => (
            <button
              key={chantier.id}
              type="button"
              onClick={() => setChoisiId(chantier.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                chantier.id === actifId
                  ? 'border-mtm-primary bg-mtm-primary text-white'
                  : 'border-mtm-border bg-mtm-surface text-mtm-muted hover:border-mtm-primary hover:text-mtm-primary'
              }`}
            >
              {chantier.intitule}
            </button>
          ))}
        </div>
      )}

      {detailLoading && <Skeleton className="h-56 rounded-2xl" />}
      {detailError && <EmptyState title="Chantier indisponible" description={detailError} />}

      {!detailLoading && !detailError && detail && (
        <>
          <ClientCard>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-mtm-muted">
                    {detail.referenceInterne}
                  </p>
                  {statut && <Badge tone={statut.tone} className="shrink-0">{statut.label}</Badge>}
                </div>
                <h2 className="mt-0.5 font-display text-xl font-bold text-mtm-text">{detail.intitule}</h2>
                <p className="text-sm text-mtm-muted">
                  {chantierType(detail.typeProjet)}
                  {[detail.adresse, detail.commune].filter(Boolean).length > 0 &&
                    ` · ${[detail.adresse, detail.commune].filter(Boolean).join(', ')}`}
                </p>
                {statut && <p className="mt-2 text-sm leading-snug text-mtm-muted">{statut.help}</p>}
              </div>

              <Avancement valeur={detail.avancement} />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-4">
                <Fait
                  label="Montant du devis"
                  value={detail.montantDevis === null ? '—' : formatMoney(detail.montantDevis)}
                />
                <Fait
                  label="Début"
                  value={formatDate(detail.dateDebutReelle ?? detail.dateDebutPrevue)}
                />
                <Fait
                  label="Fin prévue"
                  value={formatDate(detail.dateFinReelle ?? detail.dateFinPrevue)}
                />
                <Fait
                  label="Surface bâtie"
                  value={detail.surfaceBatie === null ? '—' : `${detail.surfaceBatie} m²`}
                />
              </dl>

              {detail.programme && (
                <p className="text-sm leading-relaxed text-mtm-text">{detail.programme}</p>
              )}
            </div>
          </ClientCard>

          {detail.jalons.length > 0 && (
            <ClientCard title="Les étapes">
              <Frise label="Étapes du chantier" items={etapes(detail.jalons)} />
            </ClientCard>
          )}

          {detail.journal.length > 0 && (
            <ClientCard title="Ce qui s’est passé sur le chantier">
              <ol className="flex flex-col gap-4">
                {journalVisible.map((journee) => (
                  <li
                    key={journee.id}
                    className="border-l-2 border-mtm-border pl-3 first:border-mtm-primary"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <strong className="text-sm text-mtm-text">
                        {formatDate(journee.date)}
                      </strong>
                      {journee.avancement !== null && (
                        <span className="text-xs font-bold text-mtm-primary">
                          {journee.avancement} %
                        </span>
                      )}
                    </div>
                    {journee.intervenants && (
                      <p className="text-xs text-mtm-muted">Sur place : {journee.intervenants}</p>
                    )}
                    {journee.observations && (
                      <p className="mt-1 text-sm leading-relaxed text-mtm-text">
                        {journee.observations}
                      </p>
                    )}
                    {journee.decisions && (
                      <p className="mt-1 text-sm leading-relaxed text-mtm-text">
                        <span className="font-semibold">Décision :</span> {journee.decisions}
                      </p>
                    )}
                    {journee.prochaineAction && (
                      <p className="mt-1 text-xs italic text-mtm-muted">
                        Prochaine étape : {journee.prochaineAction}
                      </p>
                    )}
                    {journee.documents.length > 0 && (
                      <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {journee.documents.map((piece) => (
                          <a
                            key={piece.id}
                            href={piece.secureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-mtm-primary hover:underline"
                          >
                            {piece.title || chantierDocumentType(piece.type)}
                          </a>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              <ShowMoreButton
                hiddenCount={detail.journal.length - journalVisible.length}
                expanded={journalComplet}
                onToggle={() => setJournalComplet((ouvert) => !ouvert)}
                noun="journées"
              />
            </ClientCard>
          )}

          {detail.documents.length > 0 && (
            <ClientCard title="Rapports et documents">
              <ul className="-my-1">
                {detail.documents.map((piece) => (
                  <li key={piece.id}>
                    <ClientRow
                      href={piece.secureUrl}
                      icon={documentIcone(piece.type)}
                      title={piece.title || chantierDocumentType(piece.type)}
                      subtitle={`${chantierDocumentType(piece.type)}${piece.createdAt ? ` · ${formatDate(piece.createdAt)}` : ''}`}
                      trailing={<Download className="h-4 w-4 shrink-0 text-mtm-primary" aria-label="Ouvrir" />}
                    />
                  </li>
                ))}
              </ul>
            </ClientCard>
          )}

          {detail.journal.length === 0 && detail.documents.length === 0 && (
            <ClientCard>
              <div className="flex items-start gap-3">
                <HardHat className="mt-0.5 h-5 w-5 shrink-0 text-mtm-muted" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-mtm-muted">
                  Aucun compte rendu publié pour l’instant. Dès que MTM vous adresse une journée de
                  chantier ou un rapport d’avancement, il apparaîtra ici.
                </p>
              </div>
            </ClientCard>
          )}
        </>
      )}
    </div>
  );
}
