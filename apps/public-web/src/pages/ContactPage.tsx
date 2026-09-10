import { Mail, MapPin, Phone } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { ContactForm } from '../components/contact/ContactForm';

export function ContactPage() {
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
              <p className="text-sm text-mtm-muted">Dakar, Sénégal</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-mtm-text">Téléphone</p>
              <a href="tel:+221770000000" className="text-sm text-mtm-muted hover:text-mtm-primary">
                +221 77 000 00 00
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
                href="mailto:contact@mtm-immobilier.sn"
                className="text-sm text-mtm-muted hover:text-mtm-primary"
              >
                contact@mtm-immobilier.sn
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
