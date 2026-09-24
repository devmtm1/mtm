import { Quote } from 'lucide-react';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import { SectionHeading } from '../ui/SectionHeading';
import { Carousel } from '../ui/Carousel';
import { countryFlag, parseTestimonialAuthor } from '../../utils/countryFlag';

export function TestimonialsSection() {
  const { data, loading, error } = useContentBlocks('testimonial');

  // Section facultative sous la ligne de flottaison : un spinner sur fond
  // clair suivi d'un bloc sombre faisait un flash inutile. Elle apparaît
  // simplement une fois les témoignages disponibles.
  if (loading || error || !data || data.length === 0) return null;

  return (
    <section className="bg-mtm-primary-dark py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Ils nous font confiance"
          title="Ce que disent nos clients"
          align="center"
          inverted
        />
        {/* Témoignages : un par écran, défilement automatique toutes les 6 s. */}
        <div className="mt-6 sm:mt-10">
        <Carousel ariaLabel="Témoignages de clients" itemClassName="w-[88%] sm:w-[60%] lg:w-auto" lgClassName="lg:grid lg:grid-cols-3 lg:gap-6" autoplayMs={6000} inverted>
          {data.map((block) => {
            const author = block.title ? parseTestimonialAuthor(block.title) : null;
            const flag = author?.country ? countryFlag(author.country) : null;
            return (
              <blockquote
                key={block.key}
                className="flex h-full flex-col gap-4 rounded-lg bg-white/5 p-5 text-white sm:p-6"
              >
                <Quote className="h-6 w-6 text-white/50" aria-hidden="true" />
                <p className="text-sm text-white/90">{block.content}</p>
                {author && (
                  <cite className="text-sm font-semibold not-italic text-white/70">
                    — {author.name}
                    {flag && (
                      <span className="ml-1.5" aria-hidden="true">
                        {flag}
                      </span>
                    )}
                  </cite>
                )}
              </blockquote>
            );
          })}
        </Carousel>
        </div>
      </div>
    </section>
  );
}
