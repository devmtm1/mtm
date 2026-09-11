import { Mail, Phone } from 'lucide-react';
import { ContactForm } from '../contact/ContactForm';
import { SectionHeading } from '../ui/SectionHeading';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';

export function ContactCtaSection() {
  const contact = useSiteContact();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="grid gap-8 rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card sm:p-10 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="Contact"
            title="Une question ? Un projet en tête ?"
            description="Notre équipe vous accompagne, où que vous soyez, y compris depuis l'étranger."
          />

          {/* Appel rapide demandé en section 6 du CDC, en complément du
              bouton WhatsApp flottant présent sur toutes les pages. */}
          <div className="flex flex-col gap-3">
            <a
              href={toTelHref(contact.telephone)}
              className="flex items-center gap-3 rounded-md border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
            >
              <Phone className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
              Appeler {contact.telephone}
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 rounded-md border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
            >
              <Mail className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
              {contact.email}
            </a>
          </div>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
