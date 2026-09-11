import { Mail, MapPin, Phone } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { ContactForm } from '../components/contact/ContactForm';
import { toTelHref, useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';

export function ContactPage() {
  const contact = useSiteContact();
  usePageMetadata({
    title: 'Contact',
    description:
      'Contactez MTM Immobilier pour une visite, une vérification de terrain ou un projet immobilier au Sénégal — réponse rapide, y compris depuis l’étranger.',
  });

  return (
    <div>
      <PageIntro
        eyebrow="Contact"
        title="Parlons de votre projet"
        description="Une question, une visite à planifier, un dossier à vérifier ? Notre équipe vous répond rapidement."
      />

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-mtm-text">Adresse</p>
              <p className="text-sm text-mtm-muted">{contact.adresse}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-mtm-text">Téléphone</p>
              <a href={toTelHref(contact.telephone)} className="text-sm text-mtm-muted hover:text-mtm-primary">
                {contact.telephone}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-mtm-text">E-mail</p>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-mtm-muted hover:text-mtm-primary"
              >
                {contact.email}
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
