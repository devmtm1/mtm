import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { ROUTES } from '../../routes';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';

const SERVICE_LINKS = [
  { to: ROUTES.catalog, label: 'Vente de terrains' },
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
        className="flex min-h-11 w-full items-center justify-between py-3 text-left text-sm font-semibold uppercase tracking-wide text-white/70 sm:pointer-events-none sm:min-h-0 sm:py-0"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <ul id={listId} className={`${open ? 'flex' : 'hidden'} flex-col gap-1 pb-3 sm:mt-4 sm:flex sm:gap-2 sm:pb-0`}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="block py-1.5 text-[15px] text-white/85 transition-colors hover:text-white sm:py-0 sm:text-sm">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const contact = useSiteContact();

  const contactActions = [
    { href: toTelHref(contact.telephone), icon: Phone, label: 'Appeler', external: false },
    { href: `https://wa.me/${contact.whatsapp}`, icon: MessageCircle, label: 'WhatsApp', external: true },
    { href: `mailto:${contact.email}`, icon: Mail, label: 'E-mail', external: false },
  ];

  return (
    <footer className="border-t border-mtm-border bg-mtm-primary-dark text-white">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Marque */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/logomtm.jpeg" alt="MTM Immobilier" className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11" />
              <span className="font-display text-lg font-bold"><span className="text-mtm-info">MTM</span> Immobilier</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/75 sm:mt-4">
              Terrains vérifiés, gestion locative, construction et démarches foncières — un
              accompagnement fiable et transparent, y compris à distance.
            </p>
          </div>

          {/* Contact : en premier sur mobile, en boutons tactiles. */}
          <div className="order-first sm:order-none sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-start-1">
            <h3 className="hidden text-sm font-semibold uppercase tracking-wide text-white/70 sm:block">Contact</h3>
            <ul className="grid grid-cols-3 gap-2 sm:mt-4 sm:flex sm:flex-col sm:gap-3">
              {contactActions.map(({ href, icon: Icon, label, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 sm:flex-row sm:justify-start sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-sm sm:font-normal sm:text-white/85 sm:hover:bg-transparent sm:hover:text-white"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="sm:hidden">{label}</span>
                    <span className="hidden sm:inline">
                      {label === 'Appeler' ? contact.telephone : label === 'E-mail' ? contact.email : 'WhatsApp'}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {contact.adresse}
            </p>
          </div>

          <nav aria-label="Services" className="lg:col-start-2 lg:row-start-1">
            <LinkColumn title="Services" links={SERVICE_LINKS} />
          </nav>
          <nav aria-label="Liens rapides" className="-mt-6 sm:mt-0 lg:col-start-3 lg:row-start-1">
            <LinkColumn title="Explorer" links={EXPLORE_LINKS} />
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-white/60 sm:flex-row sm:px-6 sm:text-left">
          <span>© {year} MTM Immobilier. Tous droits réservés.</span>
          <Link to={ROUTES.clientPortal} className="font-semibold text-white/85 hover:text-white">
            Espace client
          </Link>
        </div>
      </div>
    </footer>
  );
}
