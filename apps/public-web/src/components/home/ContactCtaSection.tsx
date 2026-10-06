import { Mail, MessageCircle, PenLine, Phone } from 'lucide-react';
import { ContactForm } from '../contact/ContactForm';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { ROUTES } from '../../routes';

export function ContactCtaSection() {
  const contact = useSiteContact();

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-16">
      <div className="grid grid-cols-1 gap-6 rounded-3xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card sm:gap-8 sm:p-8 md:grid-cols-[1fr_1.2fr] lg:rounded-lg lg:border-mtm-border lg:p-10">
        <div className="flex flex-col gap-5">
          <SectionHeading
            app
            eyebrow="Contact"
            title="Une question ? Un projet en tête ?"
            description="Notre équipe vous accompagne, où que vous soyez, y compris depuis l'étranger."
          />

          {/* Appel rapide demandé en section 6 du CDC, en complément du
              bouton WhatsApp flottant présent sur toutes les pages. */}
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:gap-3">
            <a
              href={toTelHref(contact.telephone)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-bg px-2 py-3 text-xs font-semibold text-mtm-text transition-colors active:scale-95 md:flex-row md:gap-3 md:rounded-md md:bg-transparent md:px-4 md:text-sm md:hover:border-mtm-primary md:hover:text-mtm-primary"
            >
              <Phone className="h-5 w-5 shrink-0 text-mtm-success md:h-4 md:w-4 md:text-mtm-primary" aria-hidden="true" />
              <span className="truncate">
                <span className="md:hidden">Appeler</span>
                <span className="hidden md:inline">Appeler {contact.telephone}</span>
              </span>
            </a>
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-bg px-2 py-3 text-xs font-semibold text-mtm-text transition-colors active:scale-95 md:hidden"
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-mtm-success" aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-bg px-2 py-3 text-xs font-semibold text-mtm-text transition-colors active:scale-95 md:flex-row md:gap-3 md:rounded-md md:bg-transparent md:px-4 md:text-sm md:hover:border-mtm-primary md:hover:text-mtm-primary"
            >
              <Mail className="h-5 w-5 shrink-0 text-mtm-primary md:h-4 md:w-4" aria-hidden="true" />
              <span className="truncate">
                <span className="md:hidden">E-mail</span>
                <span className="hidden md:inline">{contact.email}</span>
              </span>
            </a>
          </div>

          {/* Mobile : pas de formulaire de 6 champs en bas de page ; un renvoi
              vers la page Contact suffit, les appels et WhatsApp priment. */}
          <LinkButton to={ROUTES.contact} className="w-full md:hidden">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Écrire un message
          </LinkButton>
        </div>

        <div className="hidden md:block">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
