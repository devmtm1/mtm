import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  FolderOpen,
  Home,
  KeyRound,
  LogOut,
  MessageSquare,
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
import { ScrollManager } from '../../layout/ScrollManager';
import { RouteAnnouncer } from '../../layout/RouteAnnouncer';

const MAIN_ID = 'contenu-principal';

interface ClientTab {
  to: string;
  label: string;
  icon: typeof Home;
  end: boolean;
}

const BASE_TABS: ClientTab[] = [
  { to: ROUTES.clientPortal, label: 'Accueil', icon: Home, end: true },
  { to: ROUTES.clientDossiers, label: 'Dossiers', icon: FolderOpen, end: false },
  { to: ROUTES.clientMissions, label: 'Vérifications', icon: ShieldCheck, end: false },
  { to: ROUTES.clientDemandes, label: 'Demandes', icon: MessageSquare, end: false },
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
  const { pathname } = useLocation();
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

  // Un compte non rattaché reçoit `data: null` (voir clientPortal.ts) : ces
  // onglets n'existent que pour un vrai propriétaire ou locataire.
  const estProprietaire = proprietaireBiens.data !== null;
  const estLocataire = locataireBaux.data !== null;
  const suitUnChantier = (chantiers.data?.length ?? 0) > 0;
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (estLocataire) {
      tabs.splice(2, 0, {
        to: ROUTES.clientLocataire,
        label: 'Ma location',
        icon: KeyRound,
        end: false,
      });
    }
    if (estProprietaire) {
      tabs.splice(2, 0, {
        to: ROUTES.clientProprietaire,
        label: 'Mon bien',
        icon: Building2,
        end: false,
      });
    }
    if (suitUnChantier) {
      tabs.splice(2, 0, {
        to: ROUTES.clientChantiers,
        label: 'Mon chantier',
        icon: HardHat,
        end: false,
      });
    }
    return tabs;
  }, [estProprietaire, estLocataire, suitUnChantier]);

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
    ],
  );

  const current = TABS.find((tab) => (tab.end ? pathname === tab.to : pathname.startsWith(tab.to))) ?? TABS[0];
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
          <header className="sticky top-0 z-40 border-b border-mtm-border bg-mtm-surface/95 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <NavLink to={ROUTES.clientPortal} className="flex items-center gap-2.5">
                <img src="/logomtm.jpeg" alt="" className="h-8 w-8 rounded-full object-cover" />
                <span className="font-display text-base font-bold leading-tight">
                  {current.end ? 'Espace client' : current.label}
                </span>
              </NavLink>
              <NavLink
                to={ROUTES.clientCompte}
                aria-label="Mon compte"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-mtm-primary text-xs font-bold text-white"
              >
                {user ? initials(user.firstName, user.lastName) : '?'}
              </NavLink>
            </div>
          </header>

          <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
            <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:pb-10 lg:pt-8">
              <Outlet />
            </div>
          </main>

          {/* ---- Onglets (mobile / tablette) ---- */}
          <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-mtm-border bg-mtm-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
            aria-label="Espace client"
          >
            <ul className="grid" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
              {TABS.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors ${
                        isActive ? 'text-mtm-primary' : 'text-mtm-muted hover:text-mtm-text'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive ? 'bg-mtm-primary-subtle' : ''}`}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <RouteAnnouncer mainId={MAIN_ID} />
      </div>
    </ClientDataContext.Provider>
  );
}
