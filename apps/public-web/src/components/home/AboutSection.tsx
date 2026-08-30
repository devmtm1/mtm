import { ArrowRight } from 'lucide-react';

type AboutSectionProps = {
  contentBlocks: Record<string, string>;
  onContact: () => void;
};

export function AboutSection({
  contentBlocks,
  onContact,
}: Readonly<AboutSectionProps>) {
  return (
    <section id="a-propos" className="about-section reveal-section bg-mist">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:py-28">
        <div className="about-copy">
          <p className="eyebrow">À propos de MTM</p>
          <h2 className="section-title">
            Une présence locale,
            <br />
            <i>une vision ouverte.</i>
          </h2>
          <p className="about-description mt-6 max-w-lg leading-7 text-slate-600">
            {contentBlocks['about.text'] ??
              'MTM Immobilier accompagne les particuliers, les investisseurs et la diaspora dans leurs projets immobiliers au Sénégal.'}
          </p>
          <button
            type="button"
            className="about-link mt-8 font-bold text-coral"
            onClick={onContact}
          >
            Échanger avec nous <ArrowRight className="ml-2 inline" size={16} />
          </button>
        </div>
        <div className="about-panel">
          <div className="about-panel-heading">
            <span className="about-panel-mark">MTM</span>
            <span>Notre manière de faire</span>
          </div>
          <p className="about-panel-title">Une présence locale, une vision ouverte.</p>
          <div className="about-stats">
            <div><strong>15+</strong><span>années d'expérience</span></div>
            <div><strong>360°</strong><span>d'accompagnement</span></div>
            <div><strong>Sénégal</strong><span>une expertise ancrée dans les territoires</span></div>
          </div>
          <div className="about-panel-footer">Construire en confiance, au Sénégal et au-delà.</div>
        </div>
      </div>
    </section>
  );
}
