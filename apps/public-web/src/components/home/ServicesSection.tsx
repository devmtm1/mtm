import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileCog,
  Home,
} from 'lucide-react';

const services = [
  {
    id: 'gestion-locative',
    number: '01',
    title: 'Gestion locative',
    description:
      'Confier vos biens, suivre vos revenus et simplifier la relation avec vos locataires.',
    icon: Home,
  },
  {
    id: 'verification-fonciere',
    number: '02',
    title: 'Vérification foncière',
    description:
      'Faire vérifier un terrain à distance avec un rapport clair, documenté et traçable.',
    icon: ClipboardCheck,
  },
  {
    id: 'construction',
    number: '03',
    title: 'Construction',
    description:
      'Donner vie à votre projet grâce à un suivi structuré du devis à la livraison.',
    icon: Building2,
  },
  {
    id: 'demarches',
    number: '04',
    title: 'Démarches',
    description:
      'Formalités administratives, permis de construire et raccordements gérés pour vous.',
    icon: FileCog,
  },
];

export function ServicesSection() {
  return (
    <section
      id="services"
      className="reveal-section border-y border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
        <p className="eyebrow">Nos services</p>
        <h2 className="section-title">
          Un seul partenaire pour
          <br />
          <i>tous vos projets.</i>
        </h2>
        <div className="services-grid mt-10">
          {services.map(({ id, number, title, description, icon: Icon }) => (
            <article className="service-card" id={id} key={id}>
              <div className="service-card-topline">
                <span className="service-number">{number}</span>
                <span className="service-icon"><Icon size={20} strokeWidth={1.7} /></span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#contact">
                En savoir plus <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
