import { Handshake, ShieldCheck, Users } from 'lucide-react';
import { PageIntro } from '../components/layout/PageIntro';
import { useContentBlocks } from '../hooks/useContentBlocks';
import { usePageMetadata } from '../hooks/usePageMetadata';

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Transparence',
    description:
      "Chaque terrain est vérifié avant commercialisation ; les documents justificatifs sont accessibles à nos clients.",
  },
  {
    icon: Users,
    title: 'Proximité, même à distance',
    description:
      'Un interlocuteur dédié et un suivi régulier, pensés pour les clients de la diaspora.',
  },
  {
    icon: Handshake,
    title: 'Engagement',
    description: "De l'acquisition à la construction, nous accompagnons chaque étape de votre projet.",
  },
];

const DEFAULT_TAGLINE = 'Une présence locale, une vision ouverte.';
const DEFAULT_TEXT =
  "MTM Immobilier accompagne particuliers et investisseurs — au Sénégal comme à l'international — dans la commercialisation de terrains, la gestion locative, la construction et les démarches foncières, avec un haut niveau de transparence et de suivi à distance.";

export function AboutPage() {
  const { data } = useContentBlocks();
  usePageMetadata({
    title: 'À propos',
    description:
      'MTM Immobilier : une agence immobilière au Sénégal fondée sur la transparence, la proximité à distance et l’engagement auprès de la diaspora.',
  });
  const tagline = data?.find((block) => block.key === 'about.title')?.content ?? DEFAULT_TAGLINE;
  const text = data?.find((block) => block.key === 'about.text')?.content ?? DEFAULT_TEXT;

  return (
    <div>
      <PageIntro eyebrow="À propos" title="MTM Immobilier">
        <p className="mt-4 whitespace-pre-line font-display text-lg font-semibold text-mtm-primary">
          {tagline}
        </p>
        <p className="mt-4 text-base text-mtm-muted">{text}</p>
      </PageIntro>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-mtm-primary/10 text-mtm-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-base font-bold text-mtm-text">{title}</h2>
              <p className="mt-2 text-sm text-mtm-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
