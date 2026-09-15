import { CalendarClock, FolderOpen, Mail, MapPin, MessageCircle, Phone, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context-store';
import { useClientData } from '../../contexts/client-data-store';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientDemandesList } from '../../components/client/ClientDemandesSection';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { LinkButton } from '../../components/ui/LinkButton';
import { formatDate, formatMoney } from '../../utils/format';
import { dossierStatus } from '../../utils/labels';
import { ROUTES } from '../../routes';
import type { ClientDossier } from '../../types/clientPortal';

/** Prochaine échéance non soldée, tous dossiers confondus. */
function nextEcheance(dossiers: ClientDossier[]) {
  return dossiers
    .filter((dossier) => !['solde', 'annule'].includes(dossier.statut))
    .flatMap((dossier) =>
      dossier.echeances
        .filter((echeance) => echeance.statut !== 'payee')
        .map((echeance) => ({ dossier, echeance, reste: Math.max(0, echeance.montantPrevu - echeance.montantPaye) })),
    )
    .filter((item) => item.reste > 0)
    .sort((a, b) => new Date(a.echeance.dateEcheance).getTime() - new Date(b.echeance.dateEcheance).getTime())[0];
}

/**
 * Accueil de l'espace client : l'essentiel en un écran — où en est le
 * paiement, la prochaine échéance, les dossiers en cours, les dernières
 * demandes et comment joindre son conseiller.
 */
export function ClientHomePage() {
  const { user } = useAuth();
  const contact = useSiteContact();
  const { dossiers, dossiersLoading, dossiersError, demandes, demandesLoading, demandesError } = useClientData();
  usePageMetadata({ title: 'Mon espace client' });

  const list = dossiers ?? [];
  const open = list.filter((dossier) => !['solde', 'annule'].includes(dossier.statut));
  const totalPaid = list.reduce((sum, dossier) => sum + dossier.montantPaye, 0);
  const totalRemaining = list
    .filter((dossier) => dossier.statut !== 'annule')
    .reduce((sum, dossier) => sum + Math.max(0, (dossier.prixVente ?? 0) - dossier.montantPaye), 0);
  const upcoming = nextEcheance(list);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <ClientPageHeader
        title={`Bonjour ${user?.firstName ?? ''}`}
        description="Voici où en sont vos projets avec MTM Immobilier."
      />

      {/* Synthèse */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {dossiersLoading ? (
          [0, 1, 2].map((index) => <Skeleton key={index} className={`h-20 rounded-lg sm:h-24 ${index === 0 ? 'col-span-2 sm:col-span-1' : ''}`} />)
        ) : (
          <>
            <Kpi icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />} value={String(open.length)} label={open.length > 1 ? 'Dossiers en cours' : 'Dossier en cours'} wide />
            <Kpi icon={<Wallet className="h-5 w-5" aria-hidden="true" />} value={formatMoney(totalPaid)} label="Total payé" tone="success" />
            <Kpi icon={<Wallet className="h-5 w-5" aria-hidden="true" />} value={formatMoney(totalRemaining)} label="Reste à payer" />
          </>
        )}
      </div>

      {/* Prochaine échéance : l'information que le client vient chercher le plus souvent. */}
      {!dossiersLoading && !dossiersError && list.length > 0 && (
        <section className="rounded-lg bg-mtm-primary-dark p-4 text-white sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>
            {upcoming ? (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Prochaine échéance</p>
                <p className="mt-0.5 font-display text-xl font-bold">{formatMoney(upcoming.reste)}</p>
                <p className="mt-0.5 text-sm text-white/80">
                  Avant le {formatDate(upcoming.echeance.dateEcheance)} · {upcoming.dossier.terrain?.nom ?? upcoming.dossier.referenceInterne}
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Échéances</p>
                <p className="mt-0.5 font-display text-lg font-bold">Rien à régler pour le moment</p>
                <p className="mt-0.5 text-sm text-white/80">Vos prochaines échéances apparaîtront ici.</p>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
            <a
              href={toTelHref(contact.telephone)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-mtm-primary-dark sm:px-5"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Appeler
            </a>
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-3 py-2 text-sm font-semibold text-white sm:px-5"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Dossiers en cours, en version compacte */}
        <ClientCard title="Mes dossiers" to={ROUTES.clientDossiers} linkLabel="Détail" className="self-start">
          {dossiersLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          )}
          {dossiersError && <EmptyState title="Impossible de charger vos dossiers" description={dossiersError} />}
          {!dossiersLoading && !dossiersError && list.length === 0 && (
            <EmptyState
              title="Aucun dossier pour le moment"
              description="Vos dossiers de vente apparaîtront ici dès qu'un conseiller MTM vous en aura rattaché un."
              action={<LinkButton to={ROUTES.catalog} variant="secondary">Découvrir les terrains</LinkButton>}
            />
          )}
          {!dossiersLoading && !dossiersError && list.length > 0 && (
            <ul className="divide-y divide-mtm-border">
              {list.map((dossier) => (
                <li key={dossier.id}>
                  <DossierRow dossier={dossier} />
                </li>
              ))}
            </ul>
          )}
        </ClientCard>

        <div className="flex flex-col gap-4 sm:gap-6">
          <ClientCard title="Dernières demandes" to={ROUTES.clientDemandes}>
            <ClientDemandesList data={demandes} loading={demandesLoading} error={demandesError} limit={2} />
          </ClientCard>

          <ClientCard title="Votre conseiller">
            <p className="text-sm text-mtm-muted">MTM vous répond du lundi au samedi.</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li>
                <a href={toTelHref(contact.telephone)} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2 font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary">
                  <Phone className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                  {contact.telephone}
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2 font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary">
                  <Mail className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                  <span className="truncate">{contact.email}</span>
                </a>
              </li>
            </ul>
          </ClientCard>
        </div>
      </div>
    </div>
  );
}

function DossierRow({ dossier }: { dossier: ClientDossier }) {
  const status = dossierStatus(dossier.statut);
  const price = dossier.prixVente ?? 0;
  const progress = price > 0 ? Math.min(100, Math.round((dossier.montantPaye / price) * 100)) : 0;
  const remaining = Math.max(0, price - dossier.montantPaye);
  const location = [dossier.terrain?.commune, dossier.terrain?.region].filter(Boolean).join(', ');

  return (
    <Link to={ROUTES.clientDossiers} className="-mx-1 flex flex-col gap-2 rounded-md px-1 py-3 first:pt-0 last:pb-0 hover:bg-mtm-bg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold text-mtm-text">{dossier.terrain?.nom ?? dossier.referenceInterne ?? 'Dossier de vente'}</p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-mtm-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>
        <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-mtm-border" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du paiement">
        <div className="h-full rounded-full bg-mtm-success" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-mtm-muted">
        <span className="font-semibold text-mtm-success">{formatMoney(dossier.montantPaye)}</span> payés sur {formatMoney(price || null)}
        {remaining > 0 ? ` · reste ${formatMoney(remaining)}` : ''}
      </p>
    </Link>
  );
}

function Kpi({
  icon,
  value,
  label,
  tone = 'primary',
  wide = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: 'primary' | 'success';
  wide?: boolean;
}) {
  const iconClass = tone === 'success' ? 'bg-mtm-success/10 text-mtm-success' : 'bg-mtm-primary-subtle text-mtm-primary';
  const valueClass = tone === 'success' ? 'text-mtm-success' : 'text-mtm-text';
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-mtm-border bg-mtm-surface px-3.5 py-3 shadow-card sm:gap-4 sm:px-4 sm:py-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <span className={`h-9 w-9 shrink-0 items-center justify-center rounded-md sm:flex sm:h-11 sm:w-11 ${iconClass} ${wide ? 'flex' : 'hidden'}`}>{icon}</span>
      <div className="min-w-0">
        <p className={`font-display text-lg font-bold leading-tight sm:text-xl ${valueClass}`}>{value}</p>
        <p className="text-xs font-semibold text-mtm-muted sm:text-sm">{label}</p>
      </div>
    </div>
  );
}
