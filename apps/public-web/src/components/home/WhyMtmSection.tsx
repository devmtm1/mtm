import { ArrowRight, FileCheck2, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

type WhyMtmSectionProps = { onContact: () => void };
const features: Array<{ title: string; icon: ReactNode; text: string }> = [
  {
    title: 'Des biens vérifiés',
    icon: <ShieldCheck />,
    text: 'Chaque terrain est documenté et contrôlé.',
  },
  {
    title: 'Un accompagnement humain',
    icon: <MessageCircle />,
    text: 'Un interlocuteur dédié vous accompagne.',
  },
  {
    title: 'Des démarches simplifiées',
    icon: <FileCheck2 />,
    text: 'Nous coordonnons les formalités pour vous.',
  },
  {
    title: 'Une vision durable',
    icon: <Sparkles />,
    text: 'Des projets pensés pour créer de la valeur.',
  },
];
export function WhyMtmSection({ onContact }: Readonly<WhyMtmSectionProps>) {
  return (
    <section className="why-section bg-mist">
      <div className="why-section-inner mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
        <div className="why-intro">
          <p className="eyebrow">Pourquoi MTM</p>
          <h2 className="section-title">
            Investir sereinement,
            <br />
            <i>ça change tout.</i>
          </h2>
          <p className="why-description">Nous mettons notre connaissance du terrain et notre exigence au service de projets qui comptent vraiment.</p>
          <button
            type="button"
            className="why-link mt-8 font-bold text-coral"
            onClick={onContact}
          >
            Découvrir notre approche <ArrowRight size={16} />
          </button>
        </div>
        <div className="why-features">
          {features.map((feature, index) => (
            <article className="feature" key={feature.title}>
              <div className="feature-heading">
                <span className="feature-number">0{index + 1}</span>
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
