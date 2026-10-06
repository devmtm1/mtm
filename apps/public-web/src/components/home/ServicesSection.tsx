import { Building2, FileCheck2, Key, LandPlot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { SectionHeading } from '../ui/SectionHeading';

const SERVICES = [
  {
    icon: LandPlot,
    title: 'Vente de terrains et villas',
    description: 'Terrains titrés et villas F1 à F4, vérifiés et prêts à la commercialisation, partout au Sénégal.',
    to: ROUTES.catalog,
  },
  {
    icon: Key,
    title: 'Gestion locative',
    description: 'Suivi des loyers, des locataires et des biens confiés, en toute transparence.',
    to: ROUTES.gestionLocative,
  },
  {
    icon: Building2,
    title: 'Construction',
    description: "Accompagnement de vos projets de construction, du devis à la livraison.",
    to: ROUTES.construction,
  },
  {
    icon: FileCheck2,
    title: 'Démarches administratives',
    description: "Vérification foncière et démarches auprès des administrations compétentes.",
    to: ROUTES.demarches,
  },
];

export function ServicesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-16">
      <SectionHeading
        app
        eyebrow="Nos services"
        title="Un accompagnement complet"
        description="De l'acquisition à la gestion, MTM Immobilier couvre l'ensemble de votre projet."
        align="center"
      />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-4 lg:gap-6">
        {SERVICES.map(({ icon: Icon, title, description, to }) => (
          <Link
            key={title}
            to={to}
            className="group flex flex-col gap-2 rounded-2xl border border-mtm-border/70 bg-mtm-surface p-4 shadow-card transition-all duration-150 active:scale-[0.97] sm:gap-3 sm:p-5 lg:rounded-lg lg:border-mtm-border lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:border-mtm-primary-light lg:hover:shadow-card-hover"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary transition-colors group-hover:bg-mtm-primary group-hover:text-white sm:h-11 sm:w-11 lg:rounded-md">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-sm font-bold text-mtm-text sm:text-base">{title}</h3>
            <p className="line-clamp-2 text-xs text-mtm-muted sm:line-clamp-none sm:text-sm">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
