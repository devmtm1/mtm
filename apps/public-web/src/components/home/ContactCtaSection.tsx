import { Mail, MessageCircle, PenLine, Phone } from 'lucide-react';
import { ContactForm } from '../contact/ContactForm';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/LinkButton';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { ROUTES } from '../../routes';

export function ContactCtaSection() {
  const contact = useSiteContact();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid grid-cols-1 gap-6 rounded-lg border border-mtm-border bg-mtm-surface p-5 shadow-card sm:gap-8 sm:p-10 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Contact"
            title="Une question ? Un projet en tête ?"
            description="Notre équipe vous accompagne, où que vous soyez, y compris depuis l'étranger."
          />

          {/* Appel rapide demandé en section 6 du CDC, en complément du
              bouton WhatsApp flottant présent sur toutes les pages. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3">
            <a
              href={toTelHref(contact.telephone)}
              className="flex items-center gap-3 rounded-md border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
            >
              <Phone className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              <span className="truncate">
                <span className="sm:hidden">Appeler</span>
                <span className="hidden sm:inline">Appeler {contact.telephone}</span>
              </span>
            </a>
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary md:hidden"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="col-span-2 flex items-center gap-3 rounded-md border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
            >
              <Mail className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              <span className="truncate">{contact.email}</span>
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
