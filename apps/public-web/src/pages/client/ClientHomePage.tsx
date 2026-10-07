import { useMemo } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  HardHat,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context-store';
import { useClientData } from '../../contexts/client-data-store';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ProgressBar, StatTile } from '../../components/client/shell/ClientUi';
import { ClientDemandesList } from '../../components/client/ClientDemandesSection';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { LinkButton } from '../../components/ui/LinkButton';
import { formatDate, formatMoney } from '../../utils/format';
import { prochainePriorite, type Priorite } from '../../utils/clientPriority';
import { dossierStatus } from '../../utils/labels';
import { ROUTES } from '../../routes';
import type { ClientDossier } from '../../types/clientPortal';

/**
 * Accueil de l'espace client : en haut, ce qui demande son attention
 * maintenant (un loyer, une échéance), puis ses espaces, sa situation
 * financière, ses dossiers et comment joindre son conseiller.
 */
export function ClientHomePage() {
  const { user } = useAuth();
  const contact = useSiteContact();
  const {
    dossiers,
    dossiersLoading,
    dossiersError,
    demandes,
    demandesLoading,
    demandesError,
    missions,
    chantiers,
    proprietaireBiens,
    proprietaireLoading,
    locataireBaux,
    locataireLoading,
    notificationsNonLues,
  } = useClientData();
  usePageMetadata({ title: 'Mon espace client' });

  const list = useMemo(() => dossiers ?? [], [dossiers]);
  const open = list.filter((dossier) => !['solde', 'annule'].includes(dossier.statut));
  const totalPaid = list.reduce((sum, dossier) => sum + dossier.montantPaye, 0);
  const totalRemaining = list
    .filter((dossier) => dossier.statut !== 'annule')
    .reduce((sum, dossier) => sum + Math.max(0, (dossier.prixVente ?? 0) - dossier.montantPaye), 0);

  const bailActif = locataireBaux?.find((b) => b.statut === 'actif' || b.statut === 'preavis') ?? locataireBaux?.[0] ?? null;
  const priorite = useMemo(() => prochainePriorite(dossiers, bailActif), [dossiers, bailActif]);
  const chargement = dossiersLoading || locataireLoading;

  const biens = proprietaireBiens;
  const biensAvecBail = (biens ?? []).filter((bien) => bien.bail);
  const loyersEncaissesTotal = biensAvecBail.reduce((sum, bien) => sum + (bien.bail?.loyersEncaisses ?? 0), 0);

  const demandesEnAttente =
    (demandes?.messages.filter((demande) => !demande.traite).length ?? 0) +
    (demandes?.reservations.filter((demande) => demande.statut !== 'traitee').length ?? 0);

  // Les espaces que ce compte possède vraiment : ni tuile vide, ni détour inutile.
  const espaces: EspaceProps[] = [
    {
      to: ROUTES.clientDossiers,
      icon: FolderOpen,
      label: 'Mes dossiers',
      detail: open.length > 0 ? `${open.length} en cours` : list.length > 0 ? 'Tout est soldé' : 'Aucun pour le moment',
    },
    ...(bailActif
      ? [
          {
            to: ROUTES.clientLocataire,
            icon: KeyRound,
            label: 'Ma location',
            detail: bailActif.solde.resteADevoir > 0 ? `${formatMoney(bailActif.solde.resteADevoir)} à régler` : 'Loyers à jour',
            alerte: bailActif.solde.resteADevoir > 0,
          },
        ]
      : []),
    ...(biens !== null
      ? [
          {
            to: ROUTES.clientProprietaire,
            icon: Building2,
            label: 'Mon bien',
            detail:
              loyersEncaissesTotal > 0
                ? `${formatMoney(loyersEncaissesTotal)} encaissés`
                : biens.length > 0
                  ? `${biens.length} bien${biens.length > 1 ? 's' : ''} confié${biens.length > 1 ? 's' : ''}`
                  : 'Aucun bien',
          },
        ]
      : []),
    ...(chantiers !== null && chantiers.length > 0
      ? [
          {
            to: ROUTES.clientChantiers,
            icon: HardHat,
            label: 'Mon chantier',
            detail: `${chantiers.length} suivi${chantiers.length > 1 ? 's' : ''}`,
          },
        ]
      : []),
    {
      to: ROUTES.clientMissions,
      icon: ShieldCheck,
      label: 'Vérifications',
      detail: (missions?.length ?? 0) > 0 ? `${missions?.length} demandée${(missions?.length ?? 0) > 1 ? 's' : ''}` : 'Faire vérifier un terrain',
    },
    {
      to: ROUTES.clientDemandes,
      icon: MessageSquare,
      label: 'Mes demandes',
      detail: demandesEnAttente > 0 ? `${demandesEnAttente} en attente` : 'Écrire à MTM',
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Accueil : la salutation et l'essentiel, sur le fond de la marque. */}
      <section className="rounded-3xl bg-gradient-to-br from-mtm-primary to-mtm-primary-dark p-5 text-white shadow-card lg:rounded-lg">
        <p className="text-sm text-white/75">Bonjour,</p>
        <h1 className="font-display text-[1.65rem] font-bold leading-tight">{user?.firstName ?? 'et bienvenue'}</h1>
        <div className="mt-4">
          <PrioriteBloc priorite={priorite} loading={chargement} aDesDonnees={list.length > 0 || bailActif !== null} />
        </div>
      </section>

      {notificationsNonLues > 0 && (
        <Link
          to={ROUTES.clientNotifications}
          className="flex items-center gap-3 rounded-2xl border border-mtm-primary/30 bg-mtm-primary-subtle/60 px-4 py-3 transition-transform active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mtm-primary text-white">
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-mtm-text">
            {notificationsNonLues} nouveauté{notificationsNonLues > 1 ? 's' : ''} sur votre compte
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
        </Link>
      )}

      {/* Mes espaces : un toucher pour y aller, l'état en une ligne. */}
      <nav aria-label="Mes espaces">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {espaces.map((espace) => (
            <li key={espace.to}>
              <EspaceTile {...espace} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Situation financière des ventes, seulement s'il y en a. */}
      {!dossiersLoading && !dossiersError && list.length > 0 && (
        <section aria-label="Mes paiements" className="grid grid-cols-2 gap-3">
          <StatTile icon={Wallet} value={formatMoney(totalPaid)} label="Déjà payé" tone="success" />
          <StatTile icon={Wallet} value={formatMoney(totalRemaining)} label="Reste à payer" tone="warning" />
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ClientCard title="Mes dossiers" to={ROUTES.clientDossiers} className="hidden self-start lg:block">
          {dossiersLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          )}
          {dossiersError && <EmptyState title="Impossible de charger vos dossiers" description={dossiersError} />}
          {!dossiersLoading && !dossiersError && list.length === 0 && (
            <EmptyState
              icon={FolderOpen}
              title="Aucun dossier pour le moment"
              description="Vos dossiers de vente apparaîtront ici dès qu'un conseiller MTM vous en aura rattaché un."
              action={<LinkButton to={ROUTES.catalog} variant="secondary">Découvrir nos biens</LinkButton>}
            />
          )}
          {!dossiersLoading && !dossiersError && list.length > 0 && (
            <ul className="flex flex-col gap-3">
              {list.map((dossier) => (
                <li key={dossier.id}>
                  <DossierRow dossier={dossier} />
                </li>
              ))}
            </ul>
          )}
        </ClientCard>

        <div className="flex flex-col gap-5 sm:gap-6">
          {!proprietaireLoading && biens !== null && biens.length > 0 && (
            <ClientCard title="Mes loyers encaissés" to={ROUTES.clientProprietaire} className="hidden lg:block">
              <p className="font-display text-2xl font-bold text-mtm-success">{formatMoney(loyersEncaissesTotal)}</p>
              <p className="mt-0.5 text-sm text-mtm-muted">
                {biensAvecBail.length > 0
                  ? `sur ${biensAvecBail.length} bien${biensAvecBail.length > 1 ? 's' : ''} loué${biensAvecBail.length > 1 ? 's' : ''}`
                  : 'Aucun bail en cours'}
              </p>
            </ClientCard>
          )}

          <ClientCard title="Dernière demande" to={ROUTES.clientDemandes}>
            <ClientDemandesList data={demandes} loading={demandesLoading} error={demandesError} limit={1} />
          </ClientCard>

          <ClientCard title="Votre conseiller">
            <p className="text-sm text-mtm-muted">MTM vous répond du lundi au samedi.</p>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              <ContactTile href={toTelHref(contact.telephone)} icon={Phone} label="Appeler" tone="text-mtm-success" />
              <ContactTile href={`https://wa.me/${contact.whatsapp}`} icon={MessageCircle} label="WhatsApp" tone="text-mtm-success" external />
              <ContactTile href={`mailto:${contact.email}`} icon={Mail} label="E-mail" tone="text-mtm-primary" />
            </ul>
          </ClientCard>
        </div>
      </div>
    </div>
  );
}

interface EspaceProps {
  to: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  /** Met la ligne d'état en valeur : un solde à régler se remarque. */
  alerte?: boolean;
}

function EspaceTile({ to, icon: Icon, label, detail, alerte = false }: EspaceProps) {
  return (
    <Link
      to={to}
      className="flex h-full items-center gap-3 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-3.5 shadow-card transition-transform active:scale-[0.97] lg:rounded-lg lg:border-mtm-border lg:hover:border-mtm-primary-light"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alerte ? 'bg-mtm-warning/10 text-mtm-warning' : 'bg-mtm-primary-subtle text-mtm-primary'}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-mtm-text">{label}</span>
        <span className={`block truncate text-xs ${alerte ? 'font-semibold text-mtm-warning' : 'text-mtm-muted'}`}>{detail}</span>
      </span>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-mtm-muted sm:block" aria-hidden="true" />
    </Link>
  );
}

function ContactTile({ href, icon: Icon, label, tone, external = false }: { href: string; icon: LucideIcon; label: string; tone: string; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-bg px-2 py-3 text-xs font-semibold text-mtm-text transition-transform active:scale-95"
      >
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
        {label}
      </a>
    </li>
  );
}

/** Ce qui demande l'attention du client : en retard, à venir, ou rien du tout. */
function PrioriteBloc({ priorite, loading, aDesDonnees }: { priorite: Priorite | null; loading: boolean; aDesDonnees: boolean }) {
  if (loading) return <Skeleton className="h-28 rounded-2xl bg-white/15" />;

  if (!priorite) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-white" aria-hidden="true" />
        <div>
          <p className="font-display text-lg font-bold">{aDesDonnees ? 'Tout est à jour' : 'Bienvenue dans votre espace'}</p>
          <p className="mt-0.5 text-sm text-white/80">
            {aDesDonnees
              ? 'Aucun paiement n’est attendu pour le moment.'
              : 'Vos dossiers, loyers et demandes apparaîtront ici dès qu’un conseiller MTM les aura rattachés à votre compte.'}
          </p>
        </div>
      </div>
    );
  }

  const cible = priorite.cible === 'locataire' ? ROUTES.clientLocataire : ROUTES.clientDossiers;
  return (
    <div className={`rounded-2xl p-4 ${priorite.enRetard ? 'bg-white text-mtm-text' : 'bg-white/10'}`}>
      <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${priorite.enRetard ? 'text-mtm-accent' : 'text-white/85'}`}>
        {priorite.enRetard ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
        {priorite.enRetard ? `En retard de ${priorite.joursRetard} jour${priorite.joursRetard > 1 ? 's' : ''}` : 'À régler prochainement'}
      </p>
      <p className="mt-1 font-display text-2xl font-bold">{formatMoney(priorite.reste)}</p>
      <p className={`mt-0.5 text-sm ${priorite.enRetard ? 'text-mtm-muted' : 'text-white/80'}`}>
        {priorite.objet} · {priorite.enRetard ? 'était dû le' : 'avant le'} {formatDate(priorite.dateEcheance)}
      </p>
      {priorite.autresEnRetard > 0 && (
        <p className="mt-2 text-xs font-semibold text-mtm-accent">
          + {priorite.autresEnRetard} autre{priorite.autresEnRetard > 1 ? 's' : ''} paiement{priorite.autresEnRetard > 1 ? 's' : ''} en retard
        </p>
      )}
      <div className="mt-3.5 flex gap-2">
        <Link
          to={cible}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${
            priorite.enRetard ? 'bg-mtm-primary text-white' : 'bg-white text-mtm-primary-dark'
          }`}
        >
          Voir le détail
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function DossierRow({ dossier }: { dossier: ClientDossier }) {
  const status = dossierStatus(dossier.statut);
  const price = dossier.prixVente ?? 0;
  const progress = price > 0 ? (dossier.montantPaye / price) * 100 : 0;
  const remaining = Math.max(0, price - dossier.montantPaye);
  const location = [dossier.terrain?.commune, dossier.terrain?.region].filter(Boolean).join(', ');

  return (
    <Link
      to={ROUTES.clientDossiers}
      className="block rounded-2xl border border-mtm-border/70 bg-mtm-bg/60 p-3.5 transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold text-mtm-text">{dossier.terrain?.nom ?? dossier.referenceInterne ?? 'Dossier de vente'}</p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-mtm-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
        <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
      </div>
      <ProgressBar value={progress} label="Avancement du paiement" className="mt-3" />
      <p className="mt-1.5 text-xs text-mtm-muted">
        <span className="font-semibold text-mtm-success">{formatMoney(dossier.montantPaye)}</span> payés sur {formatMoney(price || null)}
        {remaining > 0 ? ` · reste ${formatMoney(remaining)}` : ''}
      </p>
    </Link>
  );
}
