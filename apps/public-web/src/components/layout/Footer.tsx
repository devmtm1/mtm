import { VAGUES } from '../../utils/vagues';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Facebook, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { ROUTES } from '../../routes';
import { toMapsHref, toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { TikTokIcon } from '../ui/TikTokIcon';

const SERVICE_LINKS = [
  { to: ROUTES.catalog, label: 'Terrains et villas' },
  { to: ROUTES.locations, label: 'Locations disponibles' },
  { to: ROUTES.gestionLocative, label: 'Gestion locative' },
  { to: ROUTES.construction, label: 'Construction' },
  { to: ROUTES.demarches, label: 'Démarches administratives' },
];

const EXPLORE_LINKS = [
  { to: ROUTES.realisations, label: 'Nos réalisations' },
  { to: ROUTES.projetsAVenir, label: 'Projets à venir' },
  { to: ROUTES.about, label: 'À propos' },
  { to: ROUTES.actualites, label: 'Actualités' },
  { to: ROUTES.contact, label: 'Contact' },
];

/**
 * Colonne de liens : repliée sur mobile (le menu les contient déjà, inutile
 * de les dérouler sous chaque page), toujours ouverte à partir de `sm`.
 */
function LinkColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <div className="border-t border-white/10 sm:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex min-h-11 w-full items-center justify-between py-3 text-left text-sm font-semibold uppercase tracking-wide text-white/70 sm:pointer-events-none sm:min-h-0 sm:py-0 sm:relative sm:pb-3 sm:after:absolute sm:after:bottom-0 sm:after:left-0 sm:after:h-0.5 sm:after:w-8 sm:after:rounded-full sm:after:bg-mtm-accent"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <ul id={listId} className={`${open ? 'flex' : 'hidden'} flex-col gap-1 pb-3 sm:mt-4 sm:flex sm:gap-2 sm:pb-0`}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="block py-1.5 text-[15px] text-white/85 transition-colors hover:text-mtm-accent-clair focus-visible:text-mtm-accent-clair sm:py-0 sm:text-sm">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** La seule courbe de la vague (sans la fermeture vers le bas) : elle sert au trait rouge qui en marque la limite. */
const COURBE_VAGUE = VAGUES.douce.replace(/ L1440,90 L0,90 Z$/, '');

export function Footer() {
  const year = new Date().getFullYear();
  const contact = useSiteContact();

  const contactActions = [
    { href: toTelHref(contact.telephone), icon: Phone, label: 'Appeler', external: false },
    { href: `https://wa.me/${contact.whatsapp}`, icon: MessageCircle, label: 'WhatsApp', external: true },
    { href: `mailto:${contact.email}`, icon: Mail, label: 'E-mail', external: false },
  ];

  return (
    <footer className="relative bg-mtm-primary-dark text-white">
      {/* Bord supérieur en vague : le pied de page remonte dans la section qui le précède, quelle que soit sa couleur
          (la forme est de la couleur du pied de page, posée juste au-dessus de lui). Même tracé que les bandeaux ; un
          trait rouge en souligne la limite. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%-1px)] h-6 w-full overflow-visible text-mtm-primary-dark sm:h-9 lg:h-12"
        fill="currentColor"
      >
        <path d={VAGUES.douce} />
        <path d={COURBE_VAGUE} fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" className="stroke-mtm-accent" />
      </svg>
      {/* Motif très léger de pictogrammes d'immobilier (chambre, canapé, maison, clé, immeuble, salle de bain…), répété
          sur tout le pied de page : une ambiance d'agence, sans gêner la lecture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[url('/motifs/immobilier.svg')] bg-[length:520px_340px] bg-repeat opacity-[0.08]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Marque */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/logomtm.jpeg" alt="MTM Immobilier" className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11" />
              <span className="font-display text-lg font-bold"><span className="text-mtm-info">MTM</span> Immobilier</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">Construire vos projets</p>
            {/* Mobile : le logo suffit ; la phrase de présentation reprend ce que dit la page. */}
            <p className="mt-3 hidden max-w-sm text-sm leading-relaxed text-white/75 sm:mt-4 sm:block">
              Terrains et villas vérifiés, gestion locative, construction et démarches
              foncières — un accompagnement fiable et transparent, y compris à distance.
            </p>
            {(contact.facebook || contact.tiktok) && (
              <ul className="mt-4 flex gap-2 sm:mt-6" aria-label="Réseaux sociaux">
                {contact.facebook && (
                  <li>
                    <a
                      href={contact.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="MTM Immobilier sur Facebook"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-mtm-accent-clair hover:bg-white/10 hover:text-mtm-accent-clair"
                    >
                      <Facebook className="h-[18px] w-[18px]" aria-hidden="true" />
                    </a>
                  </li>
                )}
                {contact.tiktok && (
                  <li>
                    <a
                      href={contact.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="MTM Immobilier sur TikTok"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-mtm-accent-clair hover:bg-white/10 hover:text-mtm-accent-clair"
                    >
                      <TikTokIcon className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Contact : en premier sur mobile, en boutons tactiles. */}
          <div className="order-first sm:order-none sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-start-1">
            <h2 className="hidden text-sm font-semibold uppercase tracking-wide text-white/70 sm:block sm:relative sm:pb-3 sm:after:absolute sm:after:bottom-0 sm:after:left-0 sm:after:h-0.5 sm:after:w-8 sm:after:rounded-full sm:after:bg-mtm-accent">Contact</h2>
            <ul className="grid grid-cols-3 gap-2 sm:mt-5 sm:flex sm:flex-col sm:gap-3">
              {contactActions.map(({ href, icon: Icon, label, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 hover:text-mtm-accent-clair sm:min-h-0 sm:flex-row sm:justify-start sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:text-sm sm:font-normal sm:text-white/85 sm:hover:bg-transparent sm:hover:text-mtm-accent-clair"
                  >
                    <span className="inline-flex shrink-0 sm:h-8 sm:w-8 sm:items-center sm:justify-center sm:rounded-lg sm:bg-white/10">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="sm:hidden">{label}</span>
                    <span className="hidden sm:inline">
                      {label === 'Appeler' ? contact.telephone : label === 'E-mail' ? contact.email : 'WhatsApp'}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={toMapsHref(contact)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-11 items-start gap-3 text-sm text-white/75 transition-colors hover:text-mtm-accent-clair focus-visible:text-mtm-accent-clair sm:min-h-0"
            >
              <span className="inline-flex shrink-0 sm:h-8 sm:w-8 sm:items-center sm:justify-center sm:rounded-lg sm:bg-white/10">
                <MapPin className="mt-0.5 h-4 w-4 sm:mt-0" aria-hidden="true" />
              </span>
              <span>
                {contact.adresse}
                <span className="block text-xs text-white/60 underline">Voir sur la carte</span>
              </span>
            </a>
          </div>

          {/* Mobile : ces liens sont dans la barre d'onglets et le menu, inutile de les répéter ici. */}
          <nav aria-label="Services" className="hidden sm:block lg:col-start-2 lg:row-start-1">
            <LinkColumn title="Services" links={SERVICE_LINKS} />
          </nav>
          <nav aria-label="Liens rapides" className="hidden sm:block lg:col-start-3 lg:row-start-1">
            <LinkColumn title="Explorer" links={EXPLORE_LINKS} />
          </nav>
        </div>
      </div>

      <div className="relative border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {/* Petit trait rouge sur le filet : la couleur de la marque, sans rien ajouter de lourd. */}
        <span aria-hidden="true" className="absolute -top-px left-4 h-[2px] w-14 bg-mtm-accent sm:left-[max(1.5rem,calc((100%-72rem)/2+1.5rem))]" />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-white/60 sm:flex-row sm:px-6 sm:text-left max-[1320px]:sm:!pr-20">
          <span>© {year} MTM Immobilier. Tous droits réservés.</span>
          <nav aria-label="Informations légales" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to={ROUTES.mentionsLegales} className="inline-flex min-h-11 items-center transition-colors hover:text-mtm-accent-clair focus-visible:text-mtm-accent-clair">
              Mentions légales
            </Link>
            <Link to={ROUTES.confidentialite} className="inline-flex min-h-11 items-center transition-colors hover:text-mtm-accent-clair focus-visible:text-mtm-accent-clair">
              Confidentialité
            </Link>
            <Link to={ROUTES.clientPortal} className="inline-flex min-h-11 items-center font-semibold text-white/85 transition-colors hover:text-mtm-accent-clair focus-visible:text-mtm-accent-clair">
              Espace client
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
