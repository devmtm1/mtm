import { Quote } from 'lucide-react';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import { SectionHeading } from '../ui/SectionHeading';
import { Spinner } from '../ui/Spinner';

export function TestimonialsSection() {
  const { data, loading, error } = useContentBlocks('testimonial');

  if (loading) return <Spinner />;
  if (error || !data || data.length === 0) return null;

  return (
    <section className="bg-mtm-primary-dark py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Ils nous font confiance"
          title="Ce que disent nos clients"
          align="center"
          inverted
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((block) => (
            <blockquote
              key={block.key}
              className="flex flex-col gap-4 rounded-lg bg-white/5 p-6 text-white"
            >
              <Quote className="h-6 w-6 text-white/50" aria-hidden="true" />
              <p className="text-sm text-white/90">{block.content}</p>
              {block.title && <cite className="text-sm font-semibold not-italic text-white/70">— {block.title}</cite>}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
