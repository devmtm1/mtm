import { Mail, MapPin, MessageCircle, Navigation, Phone, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BandeauPage } from '../components/layout/BandeauPage';
import { useEditableContent } from '../hooks/useEditableContent';
import { BandeauEngagements } from '../components/ui/BandeauEngagements';
import { ContactForm } from '../components/contact/ContactForm';
import { TerrainMap } from '../components/terrains/TerrainMap';
import { toMapsHref, toTelHref, useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';

/** Photo du bandeau par défaut, tirée de la maquette ; le back-office peut la remplacer (Contenus du site › Contact). */
const IMAGE_CONTACT = '/bandeaux/contact-banniere.jpg';

const SUJETS = ['Achat d’un bien', 'Location', 'Gestion locative', 'Construction', 'Vérification foncière', 'Démarches administratives', 'Autre demande'];

function LigneCoordonnee({ icone: Icone, titre, succes = false, children }: { icone: LucideIcon; titre: string; succes?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${succes ? 'bg-mtm-success/10 text-mtm-success' : 'bg-mtm-primary-subtle text-mtm-primary'}`}>
        <Icone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-mtm-text">{titre}</p>
        {children}
      </div>
    </li>
  );
}

export function ContactPage() {
  const contact = useSiteContact();
  // Un pôle de la page d'accueil (Clean, Conciergerie, Maintenance) arrive ici avec son sujet déjà choisi.
  const [recherche] = useSearchParams();
  const sujetDemande = recherche.get('sujet')?.trim().slice(0, 120) || undefined;
  const { text, loading: contenuEnCours } = useEditableContent();
  usePageMetadata({
    title: 'Contact',
    description:
      'Contactez MTM Immobilier pour une visite, une vérification de bien ou un projet immobilier au Sénégal — réponse rapide, y compris depuis l’étranger.',
  });

  return (
    <div>
      <BandeauPage
        chevauche={false}
        eyebrow="Contact"
        title={<>Parlons de votre <span className="text-mtm-accent">projet</span></>}
        description="Une question, une visite à planifier, un dossier à vérifier ? Notre équipe vous répond rapidement."
        image={text('contact.image', IMAGE_CONTACT)}
        chargement={contenuEnCours}
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-10 lg:py-14">
        {/* Une photo d'immeuble, comme sur la maquette : elle ne sert qu'à habiller l'écran large. */}
        <img
          src="/contact-immeuble.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="hidden aspect-[5/8] w-full self-start rounded-2xl object-cover shadow-card lg:block"
        />

        <div className="flex flex-col">
          <h2 className="font-display text-xl font-bold text-mtm-primary-dark">Nos coordonnées</h2>
          <p className="mt-2 text-sm text-mtm-muted">Nous sommes à votre écoute pour vous accompagner dans tous vos projets immobiliers.</p>
          <ul className="mt-5 flex flex-col gap-4">
            <LigneCoordonnee icone={MapPin} titre="Adresse">
              <p className="text-sm text-mtm-muted">{contact.adresse}</p>
            </LigneCoordonnee>
            <LigneCoordonnee icone={Phone} titre="Téléphone">
              <a href={toTelHref(contact.telephone)} className="inline-flex min-h-10 items-center text-sm text-mtm-muted transition-colors hover:text-mtm-primary">
                {contact.telephone}
              </a>
            </LigneCoordonnee>
            <LigneCoordonnee icone={Mail} titre="E-mail">
              <a href={`mailto:${contact.email}`} className="inline-flex min-h-10 items-center break-all text-sm text-mtm-muted transition-colors hover:text-mtm-primary">
                {contact.email}
              </a>
            </LigneCoordonnee>
            <LigneCoordonnee icone={MessageCircle} titre="WhatsApp" succes>
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center text-sm text-mtm-muted transition-colors hover:text-mtm-primary"
              >
                Écrire directement à un conseiller
              </a>
            </LigneCoordonnee>
          </ul>

          {/* Réassurance : la page contact est la porte d'entrée de la diaspora, qui ne peut pas passer à l'agence. */}
          <p className="mt-6 rounded-xl border border-mtm-border bg-mtm-surface p-4 text-sm text-mtm-muted">
            Vous êtes à l’étranger ? Nous organisons visites, vérifications et rendez-vous à distance, avec photos et visioconférence.
          </p>
        </div>

        <div className="rounded-2xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card sm:p-7">
          <div className="mb-5 border-l-4 border-mtm-primary pl-4">
            <h2 className="font-display text-xl font-bold text-mtm-primary-dark">Envoyez-nous un message</h2>
            <p className="mt-1 text-sm text-mtm-muted">Remplissez le formulaire, nous vous répondrons dans les plus brefs délais.</p>
          </div>
          <ContactForm initialSujet={sujetDemande} sujetOptions={SUJETS} avecIcones />
        </div>
      </section>

      <BandeauEngagements className="mx-auto max-w-6xl px-4 pb-10 sm:px-6" />

      {/* Où nous trouver : la position de l'agence, et l'itinéraire en un toucher. */}
      <section aria-labelledby="nous-trouver" className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        <h2 id="nous-trouver" className="font-display text-xl font-bold text-mtm-text">
          Nous trouver
        </h2>
        <p className="mt-1 text-sm text-mtm-muted">{contact.adresse}</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-mtm-border/70 shadow-card lg:rounded-lg">
          <TerrainMap latitude={contact.latitude} longitude={contact.longitude} title="MTM Immobilier" />
        </div>
        <a
          href={toMapsHref(contact)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-mtm-primary px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] lg:rounded-md"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Itinéraire
        </a>
      </section>
    </div>
  );
}
