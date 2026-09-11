import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ROUTES } from '../../routes';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';

export function Footer() {
  const year = new Date().getFullYear();
  const contact = useSiteContact();

  return (
    <footer className="border-t border-mtm-border bg-mtm-primary-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <img src="/logomtm.jpeg" alt="MTM Immobilier" className="h-11 w-11 rounded-full object-cover" />
            <span className="font-display text-lg font-bold">MTM Immobilier</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Commercialisation de terrains, gestion locative, construction et démarches
            foncières — un accompagnement fiable et transparent, y compris à distance.
          </p>
        </div>

        <nav aria-label="Liens rapides">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Explorer</h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-white/80">
            <li><Link to={ROUTES.catalog} className="hover:text-white">Nos terrains</Link></li>
            <li><Link to={ROUTES.realisations} className="hover:text-white">Nos réalisations</Link></li>
            <li><Link to={ROUTES.projetsAVenir} className="hover:text-white">Projets à venir</Link></li>
            <li><Link to={ROUTES.about} className="hover:text-white">À propos</Link></li>
            <li><Link to={ROUTES.actualites} className="hover:text-white">Actualités</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Contact</h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{contact.adresse}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={toTelHref(contact.telephone)} className="hover:text-white">
                {contact.telephone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${contact.email}`} className="hover:text-white">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {year} MTM Immobilier. Tous droits réservés.
      </div>
    </footer>
  );
}
