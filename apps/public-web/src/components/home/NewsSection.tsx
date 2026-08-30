import { ArrowRight, BookOpen } from 'lucide-react';

type NewsSectionProps = { contentBlocks: Record<string, string> };

export function NewsSection({ contentBlocks }: Readonly<NewsSectionProps>) {
  const apiNews = [1, 2, 3]
    .map((index) => ({
      tag: contentBlocks[`news.${index}.tag`],
      title: contentBlocks[`news.${index}.title`],
      excerpt: contentBlocks[`news.${index}.excerpt`],
    }))
    .filter((item) => item.tag && item.title && item.excerpt);
  const news = apiNews.length > 0 ? apiNews : [
    {
      tag: 'Investissement',
      title: "Les étapes essentielles avant d'acheter un terrain",
      excerpt: 'Les points à vérifier pour avancer avec clarté.',
    },
    {
      tag: 'Conseil',
      title: 'Investir depuis la diaspora, simplement',
      excerpt: 'Les bons réflexes pour piloter un projet à distance.',
    },
    {
      tag: 'Territoire',
      title: 'Comprendre les statuts fonciers',
      excerpt: "Un éclairage pour mieux lire les documents d'un bien.",
    },
  ];
  return (
    <section id="actualites" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
        <div className="news-heading">
          <div>
            <p className="eyebrow">Actualités et conseils</p>
            <h2 className="section-title">
              Mieux décider,
              <br />
              <i>mieux investir.</i>
            </h2>
          </div>
          <p className="news-intro">Des repères simples pour comprendre le marché, préparer votre projet et investir avec confiance.</p>
        </div>
        <div className="news-grid">
          {news.map((item, index) => (
            <article className="news-card" key={item.title}>
              <div className="news-card-topline">
                <span className="news-index">0{index + 1}</span>
                <BookOpen size={18} />
              </div>
              <span className="news-tag">{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
              <a href="#contact">Lire le conseil <ArrowRight size={15} /></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
