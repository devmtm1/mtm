import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  House,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  MessageSquareText,
  Search,
  Settings,
  ShieldCheck,
  UserCircle2,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  clearClientSession,
  getClientPortal,
  getStoredClientAccessToken,
  loginClient,
  logoutClient,
  type ClientPortalDossier,
  type ClientPortalUser,
} from '../../services/client-portal-api';

type ClientPortalPageProps = {
  onBack: () => void;
};

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'À déterminer';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `${numericValue.toLocaleString('fr-FR')} FCFA`;
}

function getStatusClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'validé':
    case 'valide':
    case 'payé':
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'en_cours':
    case 'en cours':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'annulé':
    case 'refusé':
    case 'refuse':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200';
  }
}

export function ClientPortalPage({ onBack }: Readonly<ClientPortalPageProps>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<ClientPortalUser | null>(null);
  const [dossiers, setDossiers] = useState<ClientPortalDossier[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    const accessToken = getStoredClientAccessToken();
    if (!accessToken) return;

    const restoreSession = async () => {
      try {
        setLoadingPortal(true);
        const portal = await getClientPortal();
        const saved = JSON.parse(localStorage.getItem('mtm_client_session') ?? 'null') as
          | { user?: ClientPortalUser }
          | null;
        setUser(saved?.user ?? null);
        setDossiers(portal);
      } catch {
        clearClientSession();
      } finally {
        setLoadingPortal(false);
      }
    };

    void restoreSession();
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await loginClient({ email, password });
      setUser(response.user);
      const portal = await getClientPortal();
      setDossiers(portal);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Connexion impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logoutClient();
    setUser(null);
    setDossiers([]);
    setEmail('');
    setPassword('');
  };

  const stats = useMemo(() => {
    const totalPaid = dossiers.reduce(
      (sum, dossier) => sum + Number(dossier.montantPaye ?? 0),
      0,
    );

    return {
      totalDossiers: dossiers.length,
      totalPaid,
      soldDossiers: dossiers.filter((dossier) => /valide|validé|payé/i.test(dossier.statut)).length,
    };
  }, [dossiers]);

  if (user) {
    const firstName = user.firstName || user.email?.split('@')[0] || 'Client';
    const sidebarItems = [
      { label: 'Tableau de bord', icon: LayoutDashboard, active: true },
      { label: 'Mes dossiers', icon: FolderOpen, active: false },
      { label: 'Mes biens', icon: House, active: false },
      { label: 'Mes contrats', icon: FileText, active: false },
      { label: 'Paiements', icon: Wallet, active: false },
      { label: 'Messages', icon: MessageSquareText, active: false },
    ];

    return (
      <div className="min-h-screen bg-[#edf3f9] text-[#1F2937]">
        <div className="flex min-h-screen w-full flex-col lg:flex-row">
          <aside className="w-full border-b border-slate-200 bg-white p-3 text-slate-700 lg:sticky lg:top-0 lg:h-screen lg:w-[240px] lg:border-b-0 lg:border-r lg:p-5 lg:flex lg:flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-[#4B1D73] ring-1 ring-violet-100">
                  <Building2 size={18} />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-700">
                    MTM Immobilier
                  </p>
                  <p className="text-sm font-medium text-slate-600">Client</p>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 lg:hidden">
                <Building2 size={16} />
              </div>
            </div>

            <div className="hidden lg:block lg:flex-1">
              <nav className="mt-5 space-y-1.5">
                {sidebarItems.map(({ label, icon: Icon, active }) => (
                  <button
                    key={label}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-violet-50 text-[#32124F] ring-1 ring-violet-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} />
                      {label}
                    </span>
                    <ChevronRight size={14} className={active ? 'opacity-100' : 'opacity-0'} />
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-3 grid grid-cols-6 gap-2 lg:hidden">
              {sidebarItems.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  className={`flex h-11 items-center justify-center rounded-xl border text-sm transition ${
                    active
                      ? 'border-violet-200 bg-violet-50 text-[#32124F]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 lg:pt-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1C65E] text-[#0B2C52]">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">MTM Immobilier</p>
                    <p className="text-xs text-slate-500">Votre espace sécurisé</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 bg-[#f5f7fb]">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-2.5 backdrop-blur-sm md:px-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-[#32124F]"
                >
                  <ArrowLeft size={15} /> Retour
                </button>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
                  <Search size={16} className="text-slate-500" />
                  <input
                    aria-label="Rechercher"
                    className="w-64 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="Rechercher une annonce..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-[#32124F]"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-[#32124F]"
                >
                  <LogOut size={15} /> Déconnexion
                </button>
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ecff] text-[#243b86]">
                    <UserCircle2 size={18} />
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-slate-800">{firstName}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Client</p>
                  </div>
                </div>
              </div>
            </header>

            <main className="p-4 md:p-5 lg:p-6">
              <section className="rounded-[22px] border border-[#d9dfe8] bg-[#f5f6f8] p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.01)] md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4B1D73]">
                      MES DOSSIERS
                    </p>
                    <h1 className="mt-2 text-[2rem] font-bold leading-none text-[#1F2937] md:text-[2.25rem]">
                      Suivi de vos projets immobiliers
                    </h1>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-[#d8b67c] bg-[#f7f0e6] px-5 py-2.5 text-sm font-medium text-[#4B1D73] shadow-[inset_0_0_0_1px_rgba(160,120,60,0.08)] transition hover:bg-[#f1e5d3]"
                  >
                    Voir tous les dossiers
                  </button>
                </div>
              </section>

              <section className="mt-5 space-y-3">
                {loadingPortal ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Chargement de vos dossiers…
                  </div>
                ) : dossiers.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <FileText size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1F2937]">
                      Aucun dossier pour le moment
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Aucun dossier de vente ou réservation n’est encore associé à votre compte.
                    </p>
                  </div>
                ) : (
                  dossiers.map((dossier) => (
                    <article
                      key={dossier.id}
                      className="flex flex-col gap-4 rounded-[22px] border border-[#dfe4ea] bg-[#f5f6f8] p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.01)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                        <div className="min-w-[140px]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4B1D73]">
                            {dossier.referenceInterne ?? 'Dossier'}
                          </p>
                          <h3 className="mt-2 text-[1.05rem] font-semibold text-[#1F2937]">
                            {dossier.terrain?.nom ?? 'Terrain non attribué'}
                          </h3>
                        </div>

                        <div className="grid flex-1 gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              PRIX DE VENTE
                            </p>
                            <p className="mt-2 text-[1.05rem] font-semibold text-[#1F2937]">
                              {dossier.prixVente ? formatMoney(dossier.prixVente) : 'À déterminer'}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              MONTANT PAYÉ
                            </p>
                            <p className="mt-2 text-[1.05rem] font-semibold text-[#1F2937]">
                              {formatMoney(dossier.montantPaye)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              LOCALISATION
                            </p>
                            <p className="mt-2 inline-flex items-center gap-2 text-[1.05rem] font-semibold text-[#1F2937]">
                              <MapPin size={14} className="text-slate-500" />
                              {dossier.terrain?.commune ?? dossier.terrain?.region ?? '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                        <span
                          className={`inline-flex items-center rounded-full border border-[#efc977] bg-[#f4e2b7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a5d00] ${getStatusClasses(dossier.statut)}`}
                        >
                          {dossier.statut}
                        </span>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-[#d6dce5] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Consulter
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F0F7] px-4 py-6 text-[#1F2937] md:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#32124F]"
        >
          <ArrowLeft size={16} /> Retour au site
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
          <div className="rounded-3xl border border-violet-100 bg-white p-7 shadow-[0_12px_30px_rgba(75,29,115,0.08)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
              <ShieldCheck size={14} /> Espace client MTM
            </div>
            <h1 className="mt-6 text-3xl font-bold md:text-4xl">Suivez vos dossiers en toute simplicité.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              Consultez vos terrains, réservations, paiements et documents depuis un espace unique et sécurisé.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-violet-500" />
                Accès rapide à vos dossiers et statuts
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-violet-500" />
                Documents publics et réservations centralisés
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-violet-500" />
                Interface sécurisée avec MTM Immobilier
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                <Lock size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accès sécurisé</p>
                <h2 className="text-2xl font-bold text-[#1F2937]">Connexion</h2>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  aria-label="Email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="vous@exemple.com"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Mot de passe
                <input
                  aria-label="Mot de passe"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white"
                  placeholder="Votre mot de passe"
                  required
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#4B1D73] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#32124F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
