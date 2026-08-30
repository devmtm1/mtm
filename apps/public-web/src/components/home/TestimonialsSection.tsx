import { Quote, Star } from 'lucide-react';

type TestimonialsSectionProps = { contentBlocks: Record<string, string> };

export function TestimonialsSection({
  contentBlocks,
}: Readonly<TestimonialsSectionProps>) {
  const testimonials = Object.entries(contentBlocks)
    .filter(([key]) => key.startsWith('testimonial.'))
    .map(([, value]) => value)
    .sort((a, b) => a.localeCompare(b))
    .map((content) => {
      const separatorIndex = content.indexOf('—');
      return separatorIndex > 0
        ? {
            quote: content.slice(1, separatorIndex).replace(/^"/, '').trim(),
            author: content.slice(separatorIndex + 1).trim(),
          }
        : { quote: content.slice(0, 100), author: '' };
    });
  const items = testimonials.length ? testimonials : [
    {
      quote: 'Depuis la France, j’ai pu suivre chaque étape de mon acquisition avec une vraie visibilité.',
      author: 'Awa D. · Diaspora',
    },
    {
      quote: 'Les explications sont claires et les documents transmis au bon moment. C’est rassurant.',
      author: 'Mamadou S. · Dakar',
    },
    {
      quote: 'Une équipe disponible, du premier échange jusqu’à la remise des clés.',
      author: 'Fatou N. · Saly',
    },
  ];
  return (
    <section id="temoignages" className="testimonials-section border-y border-slate-200 bg-mist">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
        <div className="testimonials-heading">
          <div>
            <p className="eyebrow">Ils nous font confiance</p>
            <h2 className="section-title">
              Des projets vécus,
              <br />
              <i>des paroles sincères.</i>
            </h2>
          </div>
          <p className="testimonials-description">Chaque projet compte. La confiance de nos clients accompagne chacune de nos réalisations.</p>
        </div>
        <div className="testimonials-grid">
          {items.map((item) => (
            <blockquote key={`${item.author}-${item.quote}`} className="testimonial-card">
              <div className="testimonial-card-brand">
                <span className="testimonial-brand-mark">MT</span>
                <span>MTM Immobilier</span>
                <Quote className="testimonial-quote-icon" size={20} />
              </div>
              <p className="testimonial-quote">“{item.quote}”</p>
              <div className="testimonial-rating" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill="currentColor" />)}
              </div>
              <footer className="testimonial-author">
                <span className="testimonial-avatar">{item.author.charAt(0).toUpperCase()}</span>
                <span>{item.author}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
