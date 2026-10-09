import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  Handshake,
  HeartHandshake,
  Key,
  LandPlot,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '../../routes';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { LinkButton } from '../ui/LinkButton';
import { Reveal } from '../ui/Reveal';
import { SectionHeading } from '../ui/SectionHeading';

const DISTINCTIONS = [
  'Des biens vérifiés avant d’être publiés : titre, statut juridique, documents.',
  'Un espace client pour suivre vos dossiers, vos documents et les rapports de vérification.',
  'Un interlocuteur dédié, le même de la première visite jusqu’à la signature.',
  'Une équipe joignable par téléphone et WhatsApp, pensée pour ceux qui vivent loin.',
];

/** Qui nous sommes : le texte de présentation (modifiable au back-office) et ce qui nous distingue. */
export function AboutStory({ texte }: { texte: string }) {
  const paragraphes = texte
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="qui-sommes-nous" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-wider text-mtm-primary">Qui sommes-nous</span>
          <h2 id="qui-sommes-nous" className="mt-2 font-display text-2xl font-bold text-mtm-text sm:text-3xl">
            Une agence qui vous accompagne de bout en bout
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-mtm-muted sm:text-base">
            {paragraphes.map((paragraphe, index) => (
              <p key={index}>{paragraphe}</p>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl border border-mtm-border/70 bg-mtm-surface p-6 shadow-card lg:rounded-lg lg:p-7">
            <h3 className="font-display text-base font-bold text-mtm-text">Ce qui nous distingue</h3>
            <ul className="mt-4 space-y-4">
              {DISTINCTIONS.map((ligne) => (
                <li key={ligne} className="flex items-start gap-3 text-sm leading-relaxed text-mtm-text">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-mtm-success" aria-hidden="true" />
                  {ligne}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const VALEURS: { icon: LucideIcon; titre: string; texte: string }[] = [
  {
    icon: ShieldCheck,
    titre: 'Transparence',
    texte: 'Chaque bien est vérifié avant commercialisation ; les documents justificatifs sont accessibles à nos clients.',
  },
  {
    icon: HeartHandshake,
    titre: 'Proximité, même à distance',
    texte: 'Un interlocuteur dédié et un suivi régulier, pensés pour les clients de la diaspora.',
  },
  {
    icon: Handshake,
    titre: 'Engagement',
    texte: 'De l’acquisition à la construction, nous accompagnons chaque étape de votre projet.',
  },
];

export function AboutValues() {
  return (
    <section aria-labelledby="nos-valeurs" className="border-y border-mtm-border/70 bg-mtm-surface">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
        <SectionHeading eyebrow="Nos valeurs" title="Ce qui guide chacune de nos décisions" align="center" />
        <h2 id="nos-valeurs" className="sr-only">
          Nos valeurs
        </h2>
        <ul className="mt-9 grid gap-4 sm:grid-cols-3 lg:gap-6">
          {VALEURS.map(({ icon: Icon, titre, texte }, index) => (
            <li key={titre}>
              <Reveal delay={index * 80} className="h-full">
                <div className="h-full rounded-2xl border border-mtm-border/70 border-t-4 border-t-mtm-primary bg-mtm-bg p-6 lg:rounded-lg">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mtm-surface text-mtm-primary shadow-card lg:rounded-md">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-mtm-text">{titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mtm-muted">{texte}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const METIERS: { icon: LucideIcon; titre: string; texte: string; to: string }[] = [
  {
    icon: LandPlot,
    titre: 'Vente de terrains et villas',
    texte: 'Terrains titrés et villas, vérifiés et prêts à la commercialisation, partout au Sénégal.',
    to: ROUTES.catalog,
  },
  {
    icon: Key,
    titre: 'Gestion locative',
    texte: 'Suivi des loyers, des locataires et des biens confiés, en toute transparence.',
    to: ROUTES.gestionLocative,
  },
  {
    icon: Building2,
    titre: 'Construction',
    texte: 'Accompagnement de vos projets de construction, du devis à la livraison.',
    to: ROUTES.construction,
  },
  {
    icon: FileCheck2,
    titre: 'Démarches administratives',
    texte: 'Vérification foncière et démarches auprès des administrations compétentes.',
    to: ROUTES.demarches,
  },
];

export function AboutServices() {
  return (
    <section aria-labelledby="nos-metiers" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeading
        eyebrow="Nos métiers"
        title="Quatre expertises, un seul interlocuteur"
        description="De l’achat à la gestion, MTM Immobilier couvre l’ensemble de votre projet immobilier."
        align="center"
      />
      <h2 id="nos-metiers" className="sr-only">
        Nos métiers
      </h2>
      <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:gap-6">
        {METIERS.map(({ icon: Icon, titre, texte, to }, index) => (
          <li key={titre}>
            <Reveal delay={(index % 2) * 80} className="h-full">
              <Link
                to={to}
                className="group flex h-full items-start gap-4 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-5 shadow-card transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary lg:rounded-lg lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:border-mtm-primary-light lg:hover:shadow-card-hover"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white lg:rounded-md">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold text-mtm-text">{titre}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-mtm-muted">{texte}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-mtm-primary">
                    En savoir plus
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ETAPES = [
  { titre: 'Nous vous écoutons', texte: 'Votre projet, votre budget, vos délais : nous cernons vos besoins avant de proposer quoi que ce soit.' },
  { titre: 'Nous sélectionnons et vérifions', texte: 'Nous ne vous présentons que des biens contrôlés : situation juridique, documents, environnement.' },
  { titre: 'Nous vous accompagnons', texte: 'Visites, démarches administratives, négociation et signature : un interlocuteur dédié à chaque étape.' },
  { titre: 'Nous restons à vos côtés', texte: 'Votre espace client garde vos dossiers et documents à jour, bien après la remise des clés.' },
];

export function AboutProcess() {
  return (
    <section aria-labelledby="notre-methode" className="border-y border-mtm-border/70 bg-mtm-surface">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
        <SectionHeading eyebrow="Notre méthode" title="Comment nous travaillons" align="center" />
        <h2 id="notre-methode" className="sr-only">
          Notre méthode
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {ETAPES.map(({ titre, texte }, index) => (
            <li key={titre} className="relative flex gap-4 lg:block">
              {/* Trait vertical reliant les étapes sur téléphone. */}
              {index < ETAPES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-2rem] left-5 top-12 w-px bg-mtm-primary-light sm:hidden"
                />
              )}
              <Reveal delay={index * 80} className="flex gap-4 lg:block">
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mtm-primary font-display text-base font-bold text-white ring-4 ring-mtm-surface">
                  {index + 1}
                </span>
                <span className="block lg:mt-4">
                  <span className="block font-display text-base font-bold text-mtm-text">{titre}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-mtm-muted">{texte}</span>
                </span>
              </Reveal>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <LinkButton to={ROUTES.clientLogin} variant="secondary">
            Accéder à mon espace client
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

/** Où nous joindre : trois actions directes, grandes et faciles à toucher, et l'adresse. */
export function AboutContact() {
  const contact = useSiteContact();
  const actions = [
    { icon: Phone, titre: 'Appeler', detail: contact.telephone, href: toTelHref(contact.telephone), externe: false },
    { icon: MessageCircle, titre: 'WhatsApp', detail: 'Écrire un message', href: `https://wa.me/${contact.whatsapp}`, externe: true },
    { icon: Mail, titre: 'E-mail', detail: contact.email, href: `mailto:${contact.email}`, externe: false },
  ];

  return (
    <section aria-labelledby="nous-trouver" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
      <SectionHeading eyebrow="Contact" title="Venez nous rencontrer, ou écrivez-nous" align="center" />
      <h2 id="nous-trouver" className="sr-only">
        Nous trouver
      </h2>
      <ul className="mt-9 grid gap-3 sm:grid-cols-3 lg:gap-5">
        {actions.map(({ icon: Icon, titre, detail, href, externe }) => (
          <li key={titre}>
            <a
              href={href}
              {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group flex h-full items-center gap-4 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-4 shadow-card transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary sm:flex-col sm:text-center lg:rounded-lg lg:hover:-translate-y-0.5 lg:hover:shadow-card-hover"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-mtm-text">{titre}</span>
                <span className="mt-0.5 block truncate text-sm text-mtm-muted">{detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-start justify-center gap-2 text-center text-sm text-mtm-muted">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-mtm-accent" aria-hidden="true" />
        <span>
          {contact.adresse}{' '}
          <Link to={ROUTES.contact} className="font-semibold text-mtm-primary underline-offset-2 hover:underline">
            Voir la carte
          </Link>
        </span>
      </p>
    </section>
  );
}
