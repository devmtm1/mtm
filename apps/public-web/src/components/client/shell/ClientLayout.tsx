import { useCallback, useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Building2,
  FolderOpen,
  Home,
  KeyRound,
  LogOut,
  MessageSquare,
  RefreshCw,
  HardHat,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../../contexts/auth-context-store';
import { ClientDataContext } from '../../../contexts/client-data-store';
import {
  useClientChantiers,
  useClientDemandes,
  useClientMissions,
  useClientPortal,
  useLocataireBaux,
  useLocataireIncidents,
  useLocatairePaiements,
  useProprietaireBiens,
  useProprietaireDocuments,
  useProprietaireSynthese,
} from '../../../hooks/useClientPortal';
import { ROUTES } from '../../../routes';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useClientNotifications } from '../../../hooks/useClientNotifications';
import { markAllNotificationsRead, markNotificationRead } from '../../../api/notifications';
import { prochainePriorite } from '../../../utils/clientPriority';
import { useToast } from '../../ui/toast-store';
import { ClientTabBar, type ClientTab } from './ClientTabBar';
import { ScrollManager } from '../../layout/ScrollManager';
import { RouteAnnouncer } from '../../layout/RouteAnnouncer';

const MAIN_ID = 'contenu-principal';

const ONGLET_ACCUEIL: ClientTab = { to: ROUTES.clientPortal, label: 'Accueil', icon: Home, end: true };
const ONGLETS_COMMUNS: ClientTab[] = [
  { to: ROUTES.clientDossiers, label: 'Dossiers', icon: FolderOpen, end: false },
  { to: ROUTES.clientDemandes, label: 'Demandes', icon: MessageSquare, end: false },
  { to: ROUTES.clientMissions, label: 'Vérifications', icon: ShieldCheck, end: false },
  { to: ROUTES.clientCompte, label: 'Compte', icon: UserRound, end: false },
];

/** Initiales pour l'avatar : « Awa Diop » → « AD ». */
function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
}

/**
 * Coquille de l'espace client : une application à part entière, sans
 * l'en-tête ni le pied de page du site vitrine. Sur ordinateur, une barre
 * latérale fixe ; sur mobile, une barre supérieure compacte et des onglets
 * en bas d'écran, comme une application native. Les données (dossiers,
 * demandes) sont chargées ici une seule fois et partagées entre les écrans.
 */
export function ClientLayout() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const dossiers = useClientPortal(accessToken);
  const demandes = useClientDemandes(accessToken);
  const missions = useClientMissions(accessToken);
  const chantiers = useClientChantiers(accessToken);
  const proprietaireBiens = useProprietaireBiens(accessToken);
  const proprietaireSynthese = useProprietaireSynthese(accessToken);
  const proprietaireDocuments = useProprietaireDocuments(accessToken);
  const locataireBaux = useLocataireBaux(accessToken);
  const locatairePaiements = useLocatairePaiements(accessToken);
  const locataireIncidents = useLocataireIncidents(accessToken);
  const notificationsData = useClientNotifications(accessToken);

  // Un compte non rattaché reçoit `data: null` (voir clientPortal.ts) : ces
  // onglets n'existent que pour un vrai propriétaire ou locataire.
  const estProprietaire = proprietaireBiens.data !== null;
  const estLocataire = locataireBaux.data !== null;
  const suitUnChantier = (chantiers.data?.length ?? 0) > 0;
  const bailActif = locataireBaux.data?.find((b) => b.statut === 'actif' || b.statut === 'preavis') ?? locataireBaux.data?.[0] ?? null;
  const retardLoyer = useMemo(() => prochainePriorite(null, bailActif)?.enRetard === true, [bailActif]);
  const retardVente = useMemo(() => prochainePriorite(dossiers.data, null)?.enRetard === true, [dossiers.data]);

  // Les espaces propres au compte (location, bien, chantier) passent avant les
  // écrans communs : un locataire retrouve « Ma location » dans la barre, pas
  // derrière « Plus ». Une pastille signale un paiement en retard.
  const TABS = useMemo(() => {
    const tabs: ClientTab[] = [ONGLET_ACCUEIL];
    if (estLocataire) {
      tabs.push({ to: ROUTES.clientLocataire, label: 'Ma location', icon: KeyRound, end: false, alerte: retardLoyer });
    }
    if (estProprietaire) {
      tabs.push({ to: ROUTES.clientProprietaire, label: 'Mon bien', icon: Building2, end: false });
    }
    if (suitUnChantier) {
      tabs.push({ to: ROUTES.clientChantiers, label: 'Mon chantier', icon: HardHat, end: false });
    }
    tabs.push(...ONGLETS_COMMUNS.map((tab) => (tab.to === ROUTES.clientDossiers ? { ...tab, alerte: retardVente } : tab)));
    return tabs;
  }, [estProprietaire, estLocataire, suitUnChantier, retardLoyer, retardVente]);

  const refetchNotifications = notificationsData.refetch;
  const marquerNotificationLue = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      try {
        await markNotificationRead(accessToken, id);
      } finally {
        refetchNotifications({ silent: true });
      }
    },
    [accessToken, refetchNotifications],
  );
  const toutMarquerNotificationsLues = useCallback(async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsRead(accessToken);
    } finally {
      refetchNotifications({ silent: true });
    }
  }, [accessToken, refetchNotifications]);

  // Actualisation : au retour sur l'application après une minute d'absence, et
  // au geste « tirer pour actualiser ». Silencieuse : l'écran garde ses données.
  const toast = useToast();
  const sources = [dossiers, demandes, missions, chantiers, proprietaireBiens, proprietaireSynthese, proprietaireDocuments, locataireBaux, locatairePaiements, locataireIncidents, notificationsData];
  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  });
  const derniereActualisation = useRef(Date.now());
  const actualiser = useCallback(() => {
    derniereActualisation.current = Date.now();
    sourcesRef.current.forEach((source) => source.refetch({ silent: true }));
  }, []);
  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState === 'visible' && Date.now() - derniereActualisation.current > 60_000) actualiser();
    };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
  }, [actualiser]);
  // La cloche se met à jour seule, toutes les minutes, tant que l'écran est ouvert.
  useEffect(() => {
    const minuteur = window.setInterval(() => {
      if (document.visibilityState === 'visible') refetchNotifications({ silent: true });
    }, 60_000);
    return () => window.clearInterval(minuteur);
  }, [refetchNotifications]);
  const nonLues = notificationsData.data?.nonLues ?? 0;
  const { pull, refreshing } = usePullToRefresh(() => {
    actualiser();
    toast.show('Données à jour');
  }, true);


  const value = useMemo(
    () => ({
      dossiers: dossiers.data,
      dossiersLoading: dossiers.loading,
      dossiersError: dossiers.error,
      demandes: demandes.data,
      demandesLoading: demandes.loading,
      demandesError: demandes.error,
      missions: missions.data,
      missionsLoading: missions.loading,
      missionsError: missions.error,
      chantiers: chantiers.data,
      chantiersLoading: chantiers.loading,
      proprietaireBiens: proprietaireBiens.data,
      proprietaireSynthese: proprietaireSynthese.data,
      proprietaireDocuments: proprietaireDocuments.data,
      proprietaireLoading:
        proprietaireBiens.loading || proprietaireSynthese.loading || proprietaireDocuments.loading,
      locataireBaux: locataireBaux.data,
      locatairePaiements: locatairePaiements.data,
      locataireIncidents: locataireIncidents.data,
      locataireLoading: locataireBaux.loading || locatairePaiements.loading || locataireIncidents.loading,
      notifications: notificationsData.data?.items ?? null,
      notificationsNonLues: nonLues,
      marquerNotificationLue,
      toutMarquerNotificationsLues,
      refetchDemandes: demandes.refetch,
      refetchMissions: missions.refetch,
      refetchLocataireIncidents: locataireIncidents.refetch,
    }),
    [
      dossiers.data, dossiers.loading, dossiers.error,
      demandes.data, demandes.loading, demandes.error, demandes.refetch,
      missions.data, missions.loading, missions.error, missions.refetch,
      chantiers.data, chantiers.loading,
      proprietaireBiens.data, proprietaireBiens.loading,
      proprietaireSynthese.data, proprietaireSynthese.loading,
      proprietaireDocuments.data, proprietaireDocuments.loading,
      locataireBaux.data, locataireBaux.loading,
      locatairePaiements.data, locatairePaiements.loading,
      locataireIncidents.data, locataireIncidents.loading, locataireIncidents.refetch,
      notificationsData.data, nonLues, marquerNotificationLue, toutMarquerNotificationsLues,
    ],
  );

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  async function handleLogout(): Promise<void> {
    await logout();
    navigate(ROUTES.home);
  }

  return (
    <ClientDataContext.Provider value={value}>
      <div className="flex min-h-[100dvh] bg-mtm-bg text-mtm-text">
        <ScrollManager />
        <a
          href={`#${MAIN_ID}`}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-mtm-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Aller au contenu principal
        </a>

        {/* ---- Barre latérale (ordinateur) ---- */}
        <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col bg-mtm-primary-dark text-white lg:flex">
          <div className="flex items-center gap-3 px-5 py-5">
            <img src="/logomtm.jpeg" alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight">MTM Immobilier</p>
              <p className="text-xs text-white/60">Espace client</p>
            </div>
          </div>

          <nav className="mt-2 flex flex-col gap-1 px-3" aria-label="Espace client">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to={ROUTES.clientNotifications}
            className={({ isActive }) =>
              `mx-3 mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            Notifications
            {nonLues > 0 && (
              <span className="ml-auto rounded-full bg-mtm-accent px-2 py-0.5 text-xs font-bold text-white">{nonLues}</span>
            )}
          </NavLink>

          <div className="mt-auto border-t border-white/10 px-3 py-4">
            <div className="flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mtm-accent text-xs font-bold text-white">
                {user ? initials(user.firstName, user.lastName) : '?'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-white/60">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-0.5">
              <NavLink to={ROUTES.home} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour au site
              </NavLink>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Se déconnecter
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ---- Barre supérieure (mobile / tablette) ---- */}
          <header className="sticky top-0 z-40 border-b border-mtm-border/70 bg-mtm-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4 sm:max-w-none">
              <NavLink to={ROUTES.clientPortal} className="flex items-center gap-2.5">
                <img src="/logomtm.jpeg" alt="" className="h-8 w-8 rounded-full object-cover" />
                <span className="font-display text-base font-bold leading-tight">
                  Espace client
                </span>
              </NavLink>
              <div className="flex items-center gap-1.5">
                <NavLink
                  to={ROUTES.clientNotifications}
                  aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Notifications'}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-mtm-text active:scale-90 active:bg-mtm-bg"
                >
                  <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
                  {nonLues > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-mtm-surface bg-mtm-accent px-1 text-[10px] font-bold leading-none text-white"
                    >
                      {nonLues > 9 ? '9+' : nonLues}
                    </span>
                  )}
                </NavLink>
                              <NavLink
                to={ROUTES.clientCompte}
                aria-label="Mon compte"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-mtm-primary text-xs font-bold text-white shadow-card active:scale-90"
              >
                {user ? initials(user.firstName, user.lastName) : '?'}
              </NavLink>
              </div>
            </div>
          </header>

          {(pull > 0 || refreshing) && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex justify-center lg:hidden"
              style={{ transform: `translateY(${refreshing ? 14 : Math.max(pull - 28, 0)}px)` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mtm-surface text-mtm-primary shadow-card">
                <RefreshCw
                  className={`h-5 w-5 ${refreshing ? 'motion-safe:animate-spin' : ''}`}
                  style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
                />
              </span>
            </div>
          )}

          <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
            <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:pb-10 lg:pt-8">
              <Outlet />
            </div>
          </main>

          {/* ---- Onglets (mobile / tablette) ---- */}
          <ClientTabBar tabs={TABS} onLogout={() => void handleLogout()} />
        </div>
        <RouteAnnouncer mainId={MAIN_ID} />
      </div>
    </ClientDataContext.Provider>
  );
}
