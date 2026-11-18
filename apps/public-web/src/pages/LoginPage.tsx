import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CreditCard, FileText, FolderOpen, Headphones, Home, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { LinkButton } from '../components/ui/LinkButton';
import { useSiteContact } from '../hooks/useSiteContact';
import { PorteAcces } from '../components/auth/porte/PorteAcces';
import { usePorte } from '../components/auth/porte/usePorte';
import { TwoFactorForm } from '../components/auth/TwoFactorForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm';
import { useAuth } from '../contexts/auth-context-store';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';

type ViewMode = 'login' | 'twoFactor' | 'forgotPassword';

export function LoginPage() {
  const { user, bootstrapping } = useAuth();
  usePageMetadata({ title: 'Connexion à l’espace client', noindex: true });
  // Lien de réinitialisation reçu par e-mail : ouvre directement le formulaire.
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('reset') ?? undefined;
  const [mode, setMode] = useState<ViewMode>(resetToken ? 'forgotPassword' : 'login');
  const [pendingCredentials, setPendingCredentials] = useState<{ identifiant: string; password: string } | null>(null);
  const { etat, porte, enCours } = usePorte();
  const { whatsapp } = useSiteContact();

  if (bootstrapping) return null;

  // Connecté et mot de passe à jour : rien à faire ici.
  // Tant que la porte s'ouvre, on attend la fin de la séquence avant de rediriger.
  if (user && !user.mustChangePassword && !enCours) {
    return <Navigate to={ROUTES.clientPortal} replace />;
  }

  // Mot de passe à changer : la porte a fait son effet, on montre le formulaire sans la laisser recouvrir la page.
  const etatPorte = user?.mustChangePassword && etat === 'ouvert' ? 'repos' : etat;

  const enConnexion = !user?.mustChangePassword && mode === 'login';
  const lienWhatsapp = (message: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

  const pastilles = (
    <ul className="grid grid-cols-3 gap-2 text-center text-xs text-mtm-muted lg:gap-3 lg:text-[13px]">
      {[
        { Icone: CreditCard, texte: 'Paiements et échéances' },
        { Icone: FileText, texte: 'Reçus et contrats' },
        { Icone: ShieldCheck, texte: 'Accès sécurisé' },
      ].map(({ Icone, texte }) => (
        <li key={texte} className="flex flex-col items-center gap-1.5 rounded-xl border border-mtm-border bg-mtm-surface px-2 py-3 lg:py-3.5">
          <Icone className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
          {texte}
        </li>
      ))}
    </ul>
  );

  // L'espace n'est pas en libre inscription : c'est le conseiller qui l'ouvre.
  const pasEncoreAcces = (
    <>
      <p className="mt-4 text-center text-sm text-mtm-muted lg:hidden">
        Pas encore d&apos;accès ? Votre conseiller MTM vous l&apos;ouvre sur simple demande :{' '}
        <Link to={ROUTES.contact} className="font-semibold text-mtm-primary hover:underline">
          contactez-nous
        </Link>
        .
      </p>
      <div className="mt-5 hidden items-start gap-3 rounded-xl bg-mtm-primary-subtle p-4 lg:flex">
        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mtm-primary font-display text-sm font-bold text-white">i</span>
        <div className="text-sm">
          <p className="font-bold text-mtm-text">Pas encore d’accès ?</p>
          <p className="text-mtm-muted">Votre conseiller MTM vous l’ouvre sur simple demande.</p>
          <Link to={ROUTES.contact} className="mt-1 inline-flex items-center gap-1 font-semibold text-mtm-primary underline underline-offset-2">
            Contactez-nous
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-mtm-surface">
      <PorteAcces etat={etatPorte} variante="client" />
      {/* Mobile : la villa sous un ciel clair, avec le titre en bleu marine, puis la carte de connexion qui la touche. */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-[#e6f1fa] lg:hidden">
        <img
          src="/bandeaux/connexion-villa.jpg"
          alt=""
          aria-hidden="true"
          className="w-full [mask-image:linear-gradient(to_bottom,black_75%,transparent)]"
        />
        <div className="relative -mt-14 px-5 pb-6 text-[#0a2a5c]">
          <h1 className="font-display text-[1.9rem] font-extrabold leading-[1.05] [text-shadow:0_0_16px_rgba(255,255,255,0.9)]">
            Accédez à
            <br />
            votre espace
          </h1>
          <svg aria-hidden="true" viewBox="0 0 200 12" className="mt-0.5 h-2.5 w-32 text-mtm-accent" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
            <path d="M3 9 C40 3 90 3 150 7" />
          </svg>
          <p className="mt-2 max-w-xs text-sm font-medium leading-snug [text-shadow:0_0_10px_rgba(255,255,255,0.9)]">
            Suivez vos dossiers, vos paiements et vos documents, où que vous soyez.
          </p>
        </div>
      </div>

      <div className="lg:grid lg:h-dvh lg:min-h-[34rem] lg:grid-cols-[1.05fr_1fr]">
        {/* Ordinateur : la villa et sa piscine sous un ciel clair, le titre en bleu marine, les trois promesses de l'espace, puis une
            vague bleu marine et rouge. Le bord droit est une courbe qui se fond dans la page. */}
        <aside className="relative hidden overflow-hidden bg-[#e6f1fa] lg:block">
          <img
            src="/bandeaux/connexion-villa.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-x-0 top-0 w-full [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
          />
          <svg aria-hidden="true" viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-28 w-full">
            <path d="M0 3 C18 8 38 20 100 17 L100 30 L0 30 Z" fill="#c8202f" />
            <path d="M0 11 C22 13 44 26 100 21 L100 30 L0 30 Z" fill="#0a2142" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-y-0 -right-px h-full w-36 text-[#f6f9fd]" fill="currentColor">
            <path d="M100 0 C88 4 62 12 54 22 C46 34 74 40 98 46 C112 52 92 60 74 66 C56 74 38 86 0 100 L100 100 Z" />
          </svg>
          <div className="relative flex h-full flex-col justify-between px-10 pb-24 pt-9 xl:px-14">
            <Link to={ROUTES.home} className="inline-flex items-center gap-3 self-start" aria-label="MTM Immobilier, accueil">
              <img src="/logomtm-mark.png" alt="" className="h-16 w-16 object-contain" />
              <span className="font-display text-4xl font-bold">
                <span className="text-mtm-accent">MTM</span> <span className="text-mtm-primary">Immobilier</span>
              </span>
            </Link>
            <div className="pr-16 text-[#0a2a5c]">
              <h1 className="font-display text-5xl font-extrabold leading-[1.05] [text-shadow:0_0_22px_rgba(255,255,255,0.85)] xl:text-6xl">
                Accédez à
                <br />
                votre espace
              </h1>
              <svg aria-hidden="true" viewBox="0 0 200 12" className="mt-1 h-3 w-44 text-mtm-accent" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                <path d="M3 9 C40 3 90 3 150 7" />
              </svg>
              <p className="mt-3 max-w-md text-lg font-medium leading-snug text-[#0a2a5c]/90">
                Suivez vos dossiers, vos paiements et vos documents, où que vous soyez.
              </p>
              <ul className="mt-6 grid max-w-lg grid-cols-3 divide-x divide-[#0a2a5c]/15">
                {[
                  { Icone: FolderOpen, texte: 'Vos dossiers en un clic' },
                  { Icone: CreditCard, texte: 'Paiements sécurisés' },
                  { Icone: Headphones, texte: 'Assistance à votre écoute' },
                ].map(({ Icone, texte }) => (
                  <li key={texte} className="flex flex-col items-center gap-2 px-3 text-center text-sm font-medium leading-snug">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-mtm-primary shadow-card">
                      <Icone className="h-6 w-6" aria-hidden="true" />
                    </span>
                    {texte}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="relative mx-auto w-full max-w-md bg-[#f6f9fd] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 lg:isolate lg:flex lg:max-w-none lg:flex-col lg:items-center lg:justify-center lg:overflow-hidden lg:bg-gradient-to-br lg:from-[#f6f9fd] lg:via-white lg:to-[#eaf1fa] lg:px-10 lg:py-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-24 -z-10 hidden h-72 w-24 rotate-[38deg] rounded-full bg-gradient-to-b from-mtm-primary-light/80 to-transparent lg:block" />
          <div aria-hidden="true" className="pointer-events-none absolute right-16 -top-28 -z-10 hidden h-72 w-20 rotate-[38deg] rounded-full bg-gradient-to-b from-mtm-primary-light/50 to-transparent lg:block" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 -z-10 hidden h-80 w-16 rotate-[38deg] rounded-full bg-gradient-to-b from-mtm-accent to-[#e0202f] lg:block" />
          <div className="w-full lg:max-w-[34rem]">
          <div className="rounded-2xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card sm:p-6 lg:rounded-3xl lg:border-mtm-border/60 lg:p-7 lg:shadow-card-hover">
            {enConnexion && (
              <div className="mb-5 hidden flex-col items-center text-center lg:flex">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-primary">
                  <Lock className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-3 font-display text-3xl font-extrabold text-mtm-primary-dark">Connectez-vous</h2>
                <p className="mt-1 text-base text-mtm-muted">pour accéder à votre espace personnel</p>
              </div>
            )}
            {user?.mustChangePassword ? (
              <ChangePasswordForm />
            ) : mode === 'twoFactor' && pendingCredentials ? (
              <TwoFactorForm
                identifiant={pendingCredentials.identifiant}
                password={pendingCredentials.password}
                onCancel={() => setMode('login')}
                porte={porte}
              />
            ) : mode === 'forgotPassword' ? (
              <ForgotPasswordForm onBackToLogin={() => setMode('login')} initialToken={resetToken} />
            ) : (
              <LoginForm
                onRequiresTwoFactor={(identifiant, password) => {
                  setPendingCredentials({ identifiant, password });
                  setMode('twoFactor');
                }}
                onForgotPassword={() => setMode('forgotPassword')}
                porte={porte}
              />
            )}
            {enConnexion && (
              <div className="mt-6 hidden lg:block">
                <div className="[@media(max-height:860px)]:hidden">
                <div className="mb-4 flex items-center gap-4 text-sm text-mtm-muted">
                  <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
                  Ou
                  <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
                </div>
                {pastilles}
                </div>
                {pasEncoreAcces}
              </div>
            )}
          </div>

          {/* Mobile : les pastilles et la mention d'accès, sous la carte. */}
          <div className="mt-6 lg:hidden">
            {pastilles}
            {pasEncoreAcces}
          </div>

          <div className="mt-6 hidden flex-wrap justify-center gap-3 lg:flex">
            <Link
              to={ROUTES.home}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-mtm-accent bg-white px-5 text-sm font-bold text-mtm-accent transition-colors hover:bg-mtm-accent hover:text-white"
            >
              <Home className="h-4 w-4 fill-current" aria-hidden="true" />
              Retour à l’accueil
            </Link>
            <a
              href={lienWhatsapp('Bonjour MTM, j’ai une question sur mon espace client.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-mtm-success bg-white px-5 text-sm font-bold text-mtm-success transition-colors hover:bg-mtm-success hover:text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Écrire sur WhatsApp
            </a>
          </div>
          <p className="mt-4 hidden text-center text-sm text-mtm-muted lg:block">
            Vous avez un bien à confier ?{' '}
            <Link to={`${ROUTES.gestionLocative}#confier`} className="font-semibold text-mtm-accent hover:underline">
              Confier mon bien
            </Link>
          </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-14 sm:px-6 lg:hidden">
          {/* Pour le propriétaire qui hésite : ce que lui apporte l'espace, et deux façons de confier son bien sans quitter la page. */}
          <section aria-labelledby="proprietaire-titre" className="mx-auto w-full max-w-md rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card sm:p-6 lg:max-w-4xl lg:p-7">
            <div className="flex items-start gap-3 lg:items-center lg:gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mtm-accent-subtle text-mtm-accent">
                <Home className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="proprietaire-titre" className="font-display text-base font-bold text-mtm-text">
                  Vous avez un bien à confier ?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-mtm-muted">
                  Fini le stress des loyers et des déplacements : avec votre espace propriétaire, suivez vos loyers, votre solde et vos
                  relevés de gestion où que vous soyez, y compris depuis l’étranger.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row lg:mt-5">
              <LinkButton to={`${ROUTES.gestionLocative}#confier`} variant="accent" className="w-full sm:flex-1">
                Confier mon bien
              </LinkButton>
              <a
                href={lienWhatsapp('Bonjour MTM, je souhaite confier mon bien en gestion locative.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-mtm-success px-4 text-sm font-semibold text-mtm-success transition-colors hover:bg-mtm-success hover:text-white sm:flex-1"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Écrire sur WhatsApp
              </a>
            </div>
          </section>
      </div>
    </div>
  );
}
