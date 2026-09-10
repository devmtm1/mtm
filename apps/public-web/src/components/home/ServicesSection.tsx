import { Building2, FileCheck2, Key, LandPlot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { SectionHeading } from '../ui/SectionHeading';

const SERVICES = [
  {
    icon: LandPlot,
    title: 'Vente de terrains',
    description: 'Terrains vérifiés, titrés et prêts à la commercialisation, partout au Sénégal.',
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
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Nos services"
        title="Un accompagnement complet"
        description="De l'acquisition à la gestion, MTM Immobilier couvre l'ensemble de votre projet."
        align="center"
      />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map(({ icon: Icon, title, description, to }) => (
          <Link
            key={title}
            to={to}
            className="flex flex-col gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-5 shadow-card transition-shadow hover:shadow-lg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-base font-bold text-mtm-text">{title}</h3>
            <p className="text-sm text-mtm-muted">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
