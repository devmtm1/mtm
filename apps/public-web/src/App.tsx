import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Compass,
  FileCheck2,
  FileText,
  Filter,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

type Terrain = {
  id: string;
  name: string;
  location: string;
  region: string;
  size: string;
  price: string;
  status: string;
  legalStatus: string;
  tag: string;
  image: string;
  detail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  access?: string | null;
  waterAvailable?: boolean | null;
  electricityAvailable?: boolean | null;
  media?: Array<{ secureUrl?: string; type?: string }>;
  documents?: Array<{
    secureUrl: string;
    type: string;
    title: string | null;
  }>;
  pointsInteret?: Array<Record<string, unknown>> | null;
  dimensions?: Record<string, unknown> | null;
  superficieRaw?: number | null;
  prixPublicRaw?: number | null;
  misEnAvant?: boolean;
};

type PublicTerrainResponse = {
  id: string;
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  niveauVerification: string;
  region?: string | null;
  commune?: string | null;
  superficie?: number | string | null;
  uniteSuperficie?: string | null;
  prixPublic?: number | string | null;
  misEnAvant?: boolean;
  medias?: Array<{ secureUrl?: string; type?: string }>;
  documents?: Array<{
    secureUrl: string;
    type: string;
    title: string | null;
  }>;
  localisationDetail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accesRoutier?: string | null;
  eauDisponible?: boolean | null;
  electriciteDisponible?: boolean | null;
  voisinage?: string | null;
  vocation?: string | null;
  proximiteAxes?: string | null;
  pointsInteret?: Array<Record<string, unknown>> | null;
  dimensions?: Record<string, unknown> | null;
};

const terrains: Terrain[] = [
  {
    id: 'MTM-TH-024',
    name: 'Les Jardins de Tivaouane',
    location: 'Tivaouane, Thiès',
    region: 'Thiès',
    size: '300 m²',
    price: 'À partir de 9,5 M FCFA',
    status: 'Titre foncier',
    legalStatus: 'Titre foncier',
    tag: 'Dernières parcelles',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85',
    misEnAvant: true,
  },
  {
    id: 'MTM-LB-011',
    name: 'Résidence Baobab',
    location: 'Lac Rose, Dakar',
    region: 'Dakar',
    size: '150 m²',
    price: 'À partir de 12 M FCFA',
    status: 'Délibération vérifiée',
    legalStatus: 'Délibération',
    tag: 'Nouveau',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1000&q=85',
    misEnAvant: false,
  },
  {
    id: 'MTM-SM-008',
    name: 'Horizon Saly',
    location: 'Saly, Mbour',
    region: 'Thiès',
    size: '500 m²',
    price: 'À partir de 22 M FCFA',
    status: 'Titre foncier',
    legalStatus: 'Titre foncier',
    tag: 'Vue dégagée',
    image:
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1000&q=85',
    misEnAvant: true,
  },
];

const navItems = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Nos terrains', href: '#terrains' },
  { label: 'Services', href: '#services' },
  { label: 'Projets', href: '#projets' },
  { label: 'Actualités', href: '#actualites' },
  { label: 'À propos', href: '#a-propos' },
  { label: 'Contact', href: '#contact' },
  { label: 'Espace client', href: '#client' },
];

const publicApiUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

function mapPublicTerrain(terrain: PublicTerrainResponse): Terrain {
  const price = Number(terrain.prixPublic);
  const surface = Number(terrain.superficie);
  const primaryMedia = terrain.medias?.find(
    (media) => media.type !== 'video',
  )?.secureUrl;

  return {
    id: terrain.referenceInterne,
    name: terrain.nom,
    location:
      [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Sénégal',
    region: terrain.region ?? '',
    size: Number.isFinite(surface)
      ? `${surface.toLocaleString('fr-FR')} ${terrain.uniteSuperficie ?? 'm²'}`
      : 'Superficie sur demande',
     price: Number.isFinite(price)
      ? `À partir de ${price.toLocaleString('fr-FR')} FCFA`
      : 'Prix sur demande',
    status: terrain.statutJuridique,
    legalStatus: terrain.statutJuridique,
    tag: 'Disponible',
    image:
      primaryMedia ??
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85',
    detail: terrain.localisationDetail,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    access: terrain.accesRoutier,
    waterAvailable: terrain.eauDisponible,
    electricityAvailable: terrain.electriciteDisponible,
    media: terrain.medias,
    documents: terrain.documents,
    pointsInteret: terrain.pointsInteret,
    dimensions: terrain.dimensions,
    superficieRaw: Number.isFinite(surface) ? surface : null,
    prixPublicRaw: Number.isFinite(price) ? price : null,
    misEnAvant: terrain.misEnAvant ?? false,
  };
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogue, setCatalogue] = useState(terrains);
  const [contentBlocks, setContentBlocks] = useState<Record<string, string>>({});
  const [region, setRegion] = useState('Toutes les zones');
  const [budget, setBudget] = useState('Tous les budgets');
  const [size, setSize] = useState('Toutes les superficies');
  const [legalStatus, setLegalStatus] = useState('Tous les statuts');
  const [showAll, setShowAll] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTerrainId, setContactTerrainId] = useState<string | null>(null);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [selectedTerrain, setSelectedTerrain] = useState<Terrain | null>(null);

  useEffect(() => {
    const loadPublicTerrains = async () => {
      try {
        const response = await fetch(
          `${publicApiUrl}/terrains/public?pageSize=50&sortBy=createdAt&sortOrder=desc`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          items?: PublicTerrainResponse[];
        };
        if (data.items?.length) setCatalogue(data.items.map(mapPublicTerrain));
      } catch {
        // The local catalogue keeps the public preview usable before the API starts.
      }
    };

    const loadContentBlocks = async () => {
      try {
        const response = await fetch(`${publicApiUrl}/content`);
        if (!response.ok) return;
        const data = (await response.json()) as Array<{
          key: string;
          content: string;
        }>;
        const map: Record<string, string> = {};
        for (const block of data) map[block.key] = block.content;
        setContentBlocks(map);
      } catch {
        // Fallback to hardcoded content if API is unavailable.
      }
    };

    void loadPublicTerrains();
    void loadContentBlocks();
  }, []);

  const filteredTerrains = useMemo(() => {
    const sorted = [...catalogue].sort((a, b) => {
      if (a.misEnAvant && !b.misEnAvant) return -1;
      if (!a.misEnAvant && b.misEnAvant) return 1;
      return 0;
    });
    return sorted.filter((terrain) => {
      const matchesRegion =
        region === 'Toutes les zones' || terrain.region === region;
      const matchesBudget = (() => {
        if (budget === 'Tous les budgets') return true;
        if (!terrain.prixPublicRaw) return false;
        const p = terrain.prixPublicRaw;
        return budget === 'Moins de 15 M'
          ? p < 15_000_000
          : budget === '15 à 30 M'
            ? p >= 15_000_000 && p < 30_000_000
            : p >= 30_000_000;
      })();
      const matchesSize = (() => {
        if (size === 'Toutes les superficies') return true;
        if (!terrain.superficieRaw) return false;
        const s = terrain.superficieRaw;
        return size === 'Moins de 200 m²'
          ? s < 200
          : size === '200 à 400 m²'
            ? s >= 200 && s < 400
            : s >= 400;
      })();
      const matchesLegalStatus =
        legalStatus === 'Tous les statuts' ||
        terrain.legalStatus === legalStatus;
      return (
        matchesRegion && matchesBudget && matchesSize && matchesLegalStatus
      );
    });
  }, [budget, catalogue, legalStatus, region, size]);

  const testimonialBlocks = useMemo(
    () =>
      Object.entries(contentBlocks)
        .filter(([k]) => k.startsWith('testimonial.'))
        .map(([_, v]) => v)
        .sort(),
    [contentBlocks],
  );

  const testimonialItems: { quote: string; author: string }[] = useMemo(
    () =>
      testimonialBlocks.length > 0
        ? testimonialBlocks.map((content) => {
            const match = content.match(/^"(.*?)"\s*—\s*(.+)$/);
            return {
              quote: match ? match[1] : content.slice(0, 100),
              author: match ? match[2].trim() : '',
            };
          })
        : [
            {
              quote:
                'Depuis la France, j\'ai pu suivre chaque étape de l\'acquisition de mon terrain avec une vraie visibilité.',
              author: 'Awa D. · Diaspora',
            },
            {
              quote:
                'Les explications sont claires et les documents transmis au bon moment. C\'est rassurant.',
              author: 'Mamadou S. · Dakar',
            },
            {
              quote:
                'Une équipe disponible, du premier échange jusqu\'à la remise des clés.',
              author: 'Fatou N. · Saly',
            },
          ],
    [testimonialBlocks],
  );

  const newsItems = useMemo(() => {
    const items: { tag: string; title: string; excerpt: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const tag = contentBlocks[`news.${i}.tag`];
      const title = contentBlocks[`news.${i}.title`];
      const excerpt = contentBlocks[`news.${i}.excerpt`];
      if (tag && title && excerpt) {
        items.push({ tag, title, excerpt });
      }
    }
    if (items.length > 0) return items;
    return [
      {
        tag: 'Investissement',
        title: 'Les étapes essentielles avant d\'acheter un terrain',
        excerpt: "Les points à vérifier pour avancer avec clarté.",
      },
      {
        tag: 'Conseil',
        title: 'Investir depuis la diaspora, simplement',
        excerpt: "Les bons réflexes pour piloter un projet à distance.",
      },
      {
        tag: 'Territoire',
        title: 'Comprendre les statuts fonciers',
        excerpt: "Un éclairage pour mieux lire les documents d'un bien.",
      },
    ];
  }, [contentBlocks]);

  return (
    <div className="min-h-screen overflow-hidden bg-mist text-ink">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/20 bg-ink/95 text-white shadow-lg shadow-ink/10 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-10">
          <a
            href="#accueil"
            className="flex items-center gap-3"
            aria-label="MTM Immobilier, accueil"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-white/40 bg-white">
              <img
                src="/logomtm.jpeg"
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              MTM <em className="not-italic text-coral">Immobilier</em>
            </span>
          </a>
          <nav
            className="hidden items-center gap-8 text-sm text-white/75 lg:flex"
            aria-label="Navigation principale"
          >
            {navItems.map((item, index) => (
              <a
                className="nav-link"
                style={{ '--nav-index': index } as CSSProperties}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <a
              className="text-sm text-white/75 hover:text-white"
              href="#contact"
            >
              Nous contacter
            </a>
            <button
              type="button"
              className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8f3f2b]"
              onClick={() => setContactOpen(true)}
            >
              Espace client <ArrowRight className="ml-2 inline" size={15} />
            </button>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 lg:hidden"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-menu border-t border-white/15 px-5 pb-5 pt-3 lg:hidden">
            {navItems.map((item) => (
              <a
                className="block py-2 text-white/80"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main>
        <section
          id="accueil"
          className="relative min-h-[590px] overflow-hidden bg-ink pt-32 text-white lg:min-h-[600px] lg:pt-36"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,50,79,.98)_0%,rgba(21,50,79,.78)_43%,rgba(21,50,79,.14)_100%)]" />
          <img
            className="absolute inset-0 -z-0 h-full w-full object-cover opacity-90"
            src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=2200&q=90"
            alt="Projet résidentiel proposé par MTM Immobilier"
          />
          <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-10">
            <div className="max-w-2xl animate-fade-up">
              <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-light">
                <span className="h-px w-8 bg-coral" /> L'immobilier autrement
              </p>
              <h1 className="font-display text-4xl leading-[.98] tracking-[-.03em] sm:text-5xl lg:text-6xl">
                {contentBlocks['home.hero.title']?.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                )) || (
                  <>
                    Votre projet.
                    <br />
                    <span className="text-light">Notre engagement.</span>
                  </>
                )}
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
                {contentBlocks['home.hero.subtitle'] ||
                  'Terrains vérifiés, accompagnement transparent et solutions concrètes pour investir, construire et transmettre au Sénégal.'}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  className="rounded-full bg-coral px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#8f3f2b]/20 transition hover:-translate-y-0.5 hover:bg-[#8f3f2b]"
                  href="#terrains"
                >
                  Découvrir nos terrains{' '}
                  <ArrowRight className="ml-2 inline" size={16} />
                </a>
                <button
                  type="button"
                  className="rounded-full border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={() => setContactOpen(true)}
                >
                  Parler à un conseiller
                </button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-[#f7f8fa] to-transparent" />
        </section>

        <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-5 lg:-mt-8">
          <div className="rounded-2xl bg-white p-4 shadow-soft sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
                  Trouvez votre terrain
                </p>
                <h2 className="mt-1 font-display text-2xl">
                  Commencez votre recherche
                </h2>
              </div>
              <Filter className="hidden text-coral sm:block" size={20} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <label className="field">
                <MapPin size={17} />
                <span>
                  <small>Zone</small>
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                  >
                    <option>Toutes les zones</option>
                    <option>Dakar</option>
                    <option>Thiès</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <label className="field">
                <Compass size={17} />
                <span>
                  <small>Type de projet</small>
                  <select defaultValue="Terrain à bâtir">
                    <option>Terrain à bâtir</option>
                    <option>Résidence</option>
                    <option>Investissement</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <label className="field">
                <span className="ml-1 text-lg font-semibold">m²</span>
                <span>
                  <small>Superficie</small>
                  <select
                    value={size}
                    onChange={(event) => setSize(event.target.value)}
                  >
                    <option>Toutes les superficies</option>
                    <option>Moins de 200 m²</option>
                    <option>200 à 400 m²</option>
                    <option>Plus de 400 m²</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <label className="field">
                <span className="ml-1 text-lg font-semibold">₣</span>
                <span>
                  <small>Budget</small>
                  <select
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  >
                    <option>Tous les budgets</option>
                    <option>Moins de 15 M</option>
                    <option>15 à 30 M</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <label className="field">
                <FileCheck2 size={17} />
                <span>
                  <small>Statut juridique</small>
                  <select
                    value={legalStatus}
                    onChange={(event) => setLegalStatus(event.target.value)}
                  >
                    <option>Tous les statuts</option>
                    <option>Titre foncier</option>
                    <option>Délibération</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
            </div>
            <button
              className="mt-3 w-full rounded-xl bg-ink px-6 py-4 font-bold text-white transition hover:bg-[#1f5b91]"
              onClick={() =>
                document
                  .getElementById('terrains')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Search className="mr-2 inline" size={18} /> Rechercher
            </button>
          </div>
        </section>

        <section
          id="terrains"
          className="reveal-section mx-auto max-w-7xl px-5 pb-24 pt-24 lg:px-10 lg:pt-32"
        >
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Sélection MTM</p>
              <h2 className="section-title">
                Des terrains choisis
                <br />
                <i>pour aller loin.</i>
              </h2>
            </div>
            <button
              type="button"
              className="self-start border-b border-ink pb-1 text-sm font-bold hover:text-coral sm:self-end"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Réduire la sélection' : 'Voir tous les terrains'}{' '}
              <ArrowRight className="ml-2 inline" size={15} />
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {filteredTerrains.map((terrain, index) => (
              <article
                className="terrain-card group"
                style={{ '--card-index': index } as React.CSSProperties}
                key={terrain.id}
              >
                <div className="relative aspect-[1.55] overflow-hidden">
                  <img
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    src={terrain.image}
                    alt={`${terrain.name}, ${terrain.location}`}
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink">
                    {terrain.tag}
                  </span>
                  <span className="absolute bottom-4 right-4 rounded-full bg-ink/90 px-3 py-1.5 text-xs font-semibold text-white">
                    {terrain.status}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-bold tracking-[.15em] text-coral">
                    {terrain.id}
                  </p>
                  <h3 className="mt-2 font-display text-xl leading-tight">
                    {terrain.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    <MapPin className="mr-1 inline" size={14} />
                    {terrain.location}
                  </p>
                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs text-slate-500">Superficie</p>
                      <p className="mt-1 font-semibold">{terrain.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Prix public</p>
                      <p className="mt-1 font-semibold text-ink">
                        {terrain.price}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="card-action mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left text-sm font-bold"
                    onClick={() => setSelectedTerrain(terrain)}
                  >
                    Voir la fiche détaillée{' '}
                    <ArrowRight className="ml-2 inline" size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {filteredTerrains.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-slate-500">
              Aucun terrain ne correspond à ces critères.
            </p>
          )}
        </section>

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
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article id="gestion-locative" className="service-card">
                <p>01</p>
                <h3>Gestion locative</h3>
                <span>
                  Confier vos biens, suivre vos revenus et simplifier la
                  relation avec vos locataires.
                </span>
                <a href="#contact">
                  En savoir plus <ArrowRight size={15} />
                </a>
              </article>
              <article id="verification-fonciere" className="service-card">
                <p>02</p>
                <h3>Vérification foncière</h3>
                <span>
                  Faire vérifier un terrain à distance avec un rapport clair,
                  documenté et traçable.
                </span>
                <a href="#contact">
                  Demander une vérification <ArrowRight size={15} />
                </a>
              </article>
              <article id="construction" className="service-card">
                <p>03</p>
                <h3>Construction</h3>
                <span>
                  Donner vie à votre projet grâce à un suivi structuré du devis
                  à la livraison.
                </span>
                <a href="#contact">
                  Parler de votre projet <ArrowRight size={15} />
                </a>
              </article>
              <article id="demarches" className="service-card">
                <p>04</p>
                <h3>Démarches</h3>
                <span>
                  Formalités administratives, permis de construire et
                  raccordements gérés pour vous.
                </span>
                <a href="#contact">
                  En savoir plus <ArrowRight size={15} />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="a-propos" className="reveal-section bg-mist">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-28">
            <div>
              <p className="eyebrow">À propos de MTM</p>
              <h2 className="section-title">
                Une présence locale,
                <br />
                <i>une vision ouverte.</i>
              </h2>
              <p className="mt-6 max-w-lg leading-7 text-slate-600">
                {contentBlocks['about.text'] ||
                  'MTM Immobilier accompagne les particuliers, les investisseurs et la diaspora dans leurs projets immobiliers au Sénégal avec une approche fondée sur la proximité et la transparence.'}
              </p>
              <button
                type="button"
                className="mt-8 font-bold text-coral"
                onClick={() => setContactOpen(true)}
              >
                Échanger avec nous{' '}
                <ArrowRight className="ml-2 inline" size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-tile rounded-2xl bg-ink p-6 text-white">
                <strong className="font-display text-4xl">15+</strong>
                <p className="mt-2 text-sm text-white/70">
                  années d'expérience
                </p>
              </div>
              <div className="stat-tile rounded-2xl bg-light p-6 text-ink">
                <strong className="font-display text-4xl">360°</strong>
                <p className="mt-2 text-sm text-ink/70">d'accompagnement</p>
              </div>
              <div className="stat-tile col-span-2 rounded-2xl bg-primary p-6 text-white">
                <strong className="font-display text-4xl">Sénégal</strong>
                <p className="mt-2 text-sm text-white/70">
                  Une expertise ancrée dans les territoires
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="projets"
          className="reveal-section mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28"
        >
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="eyebrow">À venir</p>
              <h2 className="section-title">
                Des projets qui
                <br />
                <i>prennent forme.</i>
              </h2>
            </div>
            <span className="hidden text-sm text-slate-500 sm:block">
              Projets à venir
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <article className="project-card">
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85"
                alt="Projet résidentiel en préparation"
              />
              <div>
                <p className="eyebrow">Projet à venir</p>
                <h3>Les résidences du Lac</h3>
                <p>Dakar · Programme résidentiel</p>
              </div>
            </article>
            <article id="realisations" className="project-card">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85"
                alt="Réalisation immobilière MTM"
              />
              <div>
                <p className="eyebrow">Nos réalisations</p>
                <h3>Des lieux pour durer</h3>
                <p>Découvrez l'univers des projets accompagnés par MTM.</p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="temoignages"
          className="border-y border-slate-200 bg-ink text-white"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
            <div className="max-w-xl">
              <p className="eyebrow text-light">Ils nous font confiance</p>
              <h2 className="section-title text-white">
                Des projets vécus,
                <br />
                <i>des paroles sincères.</i>
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {testimonialItems.map((t, idx) => (
                <blockquote key={idx} className="quote-card">
                  <p>“{t.quote}”</p>
                  <footer>— {t.author}</footer>
                </blockquote>
              ))}
             </div>
           </div>
         </section>

        <section id="actualites" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-24">
            <div className="flex items-end justify-between">
              <div>
                <p className="eyebrow">Actualités et conseils</p>
                <h2 className="section-title">
                  Mieux décider,
                  <br />
                  <i>mieux investir.</i>
                </h2>
              </div>
              <button
                className="hidden border-b border-ink pb-1 text-sm font-bold sm:block"
                onClick={() => setContactOpen(true)}
              >
                Recevoir nos conseils{' '}
                <ArrowRight className="ml-2 inline" size={15} />
              </button>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {newsItems.map((news, idx) => (
                <article className="news-card" key={idx}>
                  <span>{news.tag}</span>
                  <h3>{news.title}</h3>
                  <p>{news.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-mist">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.85fr_1.15fr] lg:px-10 lg:py-28">
            <div>
              <p className="eyebrow">Pourquoi MTM</p>
              <h2 className="section-title">
                Investir sereinement,
                <br />
                <i>ça change tout.</i>
              </h2>
              <p className="mt-6 max-w-md leading-7 text-slate-600">
                Nous mettons notre connaissance du terrain et notre exigence au
                service de projets qui comptent vraiment.
              </p>
              <button
                className="mt-8 font-bold text-coral"
                onClick={() => setContactOpen(true)}
              >
                Découvrir notre approche{' '}
                <ArrowRight className="ml-2 inline" size={16} />
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="feature">
                <ShieldCheck />
                <h3>Des biens vérifiés</h3>
                <p>
                  Chaque terrain est documenté et contrôlé avec le niveau de
                  transparence que vous méritez.
                </p>
              </div>
              <div className="feature">
                <MessageCircle />
                <h3>Un accompagnement humain</h3>
                <p>
                  Un interlocuteur dédié vous accompagne, même à distance, à
                  chaque étape.
                </p>
              </div>
              <div className="feature">
                <FileCheck2 />
                <h3>Des démarches simplifiées</h3>
                <p>
                  Nous coordonnons les formalités pour vous faire gagner du
                  temps et de la sérénité.
                </p>
              </div>
              <div className="feature">
                <Sparkles />
                <h3>Une vision durable</h3>
                <p>
                  Des projets pensés pour créer de la valeur aujourd'hui et
                  demain.
                </p>
              </div>
            </div>
          </div>
         </section>

         <section id="client" className="border-t border-slate-200 bg-white">
           <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
             <div className="max-w-xl">
               <p className="eyebrow">Espace client</p>
               <h2 className="section-title">
                 Un accès dédié à
                 <br />
                 <i>vos espaces et documents.</i>
               </h2>
               <p className="mt-6 max-w-lg leading-7 text-slate-600">
               Accédez à votre espace client pour suivre vos demandes, consulter vos documents et rester informé(e) de l'avancement de votre projet.
               </p>
             </div>
             <div className="mt-10">
               <button
                 className="rounded-xl bg-coral px-6 py-3.5 font-bold text-white hover:bg-[#8f3f2b]"
                 onClick={() => setContactOpen(true)}
               >
                 Accéder à mon espace{' '}
                 <ArrowRight className="ml-2 inline" size={16} />
               </button>
             </div>
           </div>
         </section>

         <section className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
          <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-ink px-7 py-10 text-white sm:px-12 lg:grid-cols-[1fr_auto] lg:px-16 lg:py-14">
            <div>
              <p className="eyebrow text-light">Un projet en tête ?</p>
              <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight sm:text-5xl">
                Parlons de ce qui compte pour vous.
              </h2>
              <p className="mt-4 max-w-lg text-white/65">
                Un premier échange suffit pour comprendre votre besoin et vous
                orienter vers la bonne solution.
              </p>
            </div>
            <button
              className="rounded-full bg-coral px-7 py-4 text-sm font-bold transition hover:bg-[#8f3f2b]"
              onClick={() => setContactOpen(true)}
            >
              Prendre rendez-vous{' '}
              <ArrowRight className="ml-2 inline" size={16} />
            </button>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
          <div>
            <div className="font-display text-2xl">
              MTM <em className="not-italic text-coral">Immobilier</em>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              Construire en confiance, au Sénégal et au-delà.
            </p>
          </div>
          <div>
            <h3 className="footer-title">Explorer</h3>
            <a href="#terrains">Nos terrains</a>
            <a href="#services">Nos services</a>
            <a href="#realisations">Nos réalisations</a>
          </div>
          <div>
            <h3 className="footer-title">Services</h3>
            <a href="#services">Vérification foncière</a>
            <a href="#services">Gestion locative</a>
            <a href="#services">Construction</a>
            <a href="#services">Démarches</a>
          </div>
          <div>
            <h3 className="footer-title">Nous trouver</h3>
            <p>Dakar, Sénégal</p>
            <p>+221 77 000 00 00</p>
            <p>bonjour@mtm-immobilier.sn</p>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-5 text-center text-xs text-slate-400">
          © 2026 MTM Immobilier. Tous droits réservés.
        </div>
      </footer>

      {selectedTerrain && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-5 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              className="absolute right-5 top-5 z-10 rounded-full bg-white/90 p-2 text-slate-500 hover:text-ink"
              aria-label="Fermer la fiche terrain"
              onClick={() => setSelectedTerrain(null)}
            >
              <X size={19} />
            </button>

            {/* Gallery */}
            {selectedTerrain.media && selectedTerrain.media.length > 0 ? (
              <div className="relative h-64 w-full sm:h-80">
                <img
                  className="h-full w-full object-cover"
                  src={selectedTerrain.media.find((m) => m.type !== 'video')?.secureUrl ?? selectedTerrain.media[0]?.secureUrl ?? selectedTerrain.image}
                  alt={selectedTerrain.name}
                />
                {selectedTerrain.media.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex gap-2 overflow-x-auto px-3">
                    {selectedTerrain.media.map((media, idx) => (
                      <img
                        key={idx}
                        className="h-16 w-20 flex-shrink-0 rounded-md object-cover ring-2 ring-white"
                        src={media.secureUrl ?? selectedTerrain.image}
                        alt={`${selectedTerrain.name} — galerie ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <img
                className="h-56 w-full object-cover sm:h-72"
                src={selectedTerrain.image}
                alt={selectedTerrain.name}
              />
            )}

            <div className="p-7 sm:p-9">
              <p className="eyebrow">
                {selectedTerrain.id} · {selectedTerrain.status}
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                {selectedTerrain.name}
              </h2>
              <p className="mt-3 flex items-center text-sm text-slate-500">
                <MapPin className="mr-1 inline" size={15} />
                {selectedTerrain.location}
              </p>

              {/* Characteristics grid */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="detail-item">
                  <small>Superficie</small>
                  <strong>{selectedTerrain.size}</strong>
                </div>
                <div className="detail-item">
                  <small>Statut juridique</small>
                  <strong>{selectedTerrain.legalStatus}</strong>
                </div>
                <div className="detail-item">
                  <small>Prix public</small>
                  <strong>{selectedTerrain.price}</strong>
                </div>
                {selectedTerrain.access && (
                  <div className="detail-item">
                    <small>Accès routier</small>
                    <strong>{selectedTerrain.access}</strong>
                  </div>
                )}
                <div className="detail-item">
                  <small>Eau</small>
                  <strong>{selectedTerrain.waterAvailable ? 'Oui' : 'Sur demande'}</strong>
                </div>
                <div className="detail-item">
                  <small>Électricité</small>
                  <strong>{selectedTerrain.electricityAvailable ? 'Oui' : 'Sur demande'}</strong>
                </div>
              </div>

              {/* Rich description */}
              {selectedTerrain.detail && (
                <p className="mt-6 leading-7 text-slate-600">
                  {selectedTerrain.detail}
                </p>
              )}

              {/* Points of interest */}
              {selectedTerrain.pointsInteret && Array.isArray(selectedTerrain.pointsInteret) && selectedTerrain.pointsInteret.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-display text-lg text-ink">Points d'intérêt</h3>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-600">
                    {selectedTerrain.pointsInteret.map((poi, idx) => (
                      <li key={idx}>{typeof poi === 'object' && poi !== null && 'label' in poi ? String(poi.label) : String(poi)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive map */}
              {(selectedTerrain.latitude || selectedTerrain.longitude) && (
                <div className="mt-6">
                  <h3 className="font-display text-lg text-ink">Localisation</h3>
                  <div className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-lg border">
                    <iframe
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedTerrain.longitude) - 0.001},${Number(selectedTerrain.latitude) - 0.001},${Number(selectedTerrain.longitude) + 0.001},${Number(selectedTerrain.latitude) + 0.001}&layer=mapnik&marker=${selectedTerrain.latitude},${selectedTerrain.longitude}`}
                      title={`Carte — ${selectedTerrain.name}`}
                    />
                  </div>
                </div>
              )}

              {/* Documents publics */}
              {selectedTerrain.documents && selectedTerrain.documents.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-display text-lg text-ink">Documents publics</h3>
                  <ul className="mt-3 space-y-2">
                    {selectedTerrain.documents.map((doc, idx) => (
                      <li key={idx}>
                        <a
                          className="flex items-center gap-2 text-sm text-coral hover:underline"
                          href={doc.secureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText size={16} />
                          {doc.title || 'Télécharger le document'}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons — now differentiated */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  className="flex-1 rounded-xl bg-coral px-5 py-3 text-sm font-bold text-white hover:bg-[#8f3f2b]"
                  onClick={() => {
                    setContactTerrainId(selectedTerrain.id);
                    setSelectedTerrain(null);
                    setContactOpen(true);
                  }}
                >
                  Demander une visite
                </button>
                <button
                  className="flex-1 rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary hover:bg-sand"
                  onClick={() => {
                    setContactTerrainId(selectedTerrain.id);
                    setSelectedTerrain(null);
                    setContactOpen(true);
                  }}
                >
                  Demander des informations
                </button>
                <button
                  className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-ink"
                  onClick={() => {
                    setContactTerrainId(selectedTerrain.id);
                    setSelectedTerrain(null);
                    setContactOpen(true);
                  }}
                >
                  Réserver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-5 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
             <button
               className="absolute right-5 top-5 text-slate-400 hover:text-ink"
               aria-label="Fermer"
               onClick={() => { setContactOpen(false); setContactTerrainId(null); }}
             >
               <X />
             </button>
            <p className="eyebrow">Parlons de votre projet</p>
            <h2 className="mt-2 font-display text-3xl">Nous vous rappelons.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Laissez-nous vos coordonnées, un conseiller MTM vous recontactera
              rapidement.
            </p>
             <form
               className="mt-6 space-y-3"
               onSubmit={async (event) => {
                 event.preventDefault();
                 const form = event.currentTarget;
                 const formData = new FormData(form);
                 const payload = {
                   nom: formData.get('nom') as string,
                   email: formData.get('email') as string,
                   telephone: (formData.get('telephone') as string) || undefined,
                   sujet: (formData.get('sujet') as string) || undefined,
                   message: (formData.get('message') as string) || 'Demande depuis le site public',
                   terrainId: formData.get('terrainId') as string | undefined,
                 };
                 setContactSubmitting(true);
                 setContactError(null);
                 setContactSuccess(false);
                 try {
                   const response = await fetch(`${publicApiUrl}/contacts`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(payload),
                   });
                   if (!response.ok) throw new Error('Erreur serveur');
                   setContactSuccess(true);
                   form.reset();
                   setTimeout(() => setContactOpen(false), 1500);
                 } catch {
                   setContactError('Impossible d’envoyer le message. Veuillez réessayer.');
                 } finally {
                   setContactSubmitting(false);
                 }
               }}
             >
               <input className="input" name="nom" required placeholder="Nom complet" />
               <input
                 className="input"
                 name="email"
                 required
                 type="email"
                 placeholder="Adresse e-mail"
               />
               <input className="input" name="telephone" placeholder="Téléphone" />
               <input type="hidden" name="terrainId" value={contactTerrainId ?? ''} />
               <select className="input" name="sujet">
                 <option value="">Je souhaite...</option>
                 <option value="Acquérir un terrain">Acquérir un terrain</option>
                 <option value="Demander une vérification">Demander une vérification</option>
                 <option value="Parler de gestion locative">Parler de gestion locative</option>
               </select>
               <textarea
                 className="input min-h-[80px]"
                 name="message"
                 placeholder="Votre message..."
               ></textarea>
               {contactError && <p className="text-sm text-red-600">{contactError}</p>}
               {contactSuccess && <p className="text-sm text-green-600">Demande envoyée avec succès !</p>}
               <button
                 type="submit"
                 className="mt-2 w-full rounded-xl bg-coral py-3.5 font-bold text-white hover:bg-[#8f3f2b] disabled:opacity-50"
                 disabled={contactSubmitting}
               >
                 {contactSubmitting ? 'Envoi...' : 'Envoyer ma demande'}{' '}
                 <ArrowRight className="ml-2 inline" size={16} />
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
