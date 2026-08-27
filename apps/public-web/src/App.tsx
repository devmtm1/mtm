import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  FileCheck2,
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
  image: string;
  tag: string;
  detail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  access?: string | null;
  waterAvailable?: boolean | null;
  electricityAvailable?: boolean | null;
  media?: Array<{ secureUrl?: string; type?: string; title?: string | null }>;
  documents?: Array<{
    secureUrl?: string;
    type?: string;
    title?: string | null;
  }>;
};

type PublicTerrainResponse = {
  id: string;
  referenceInterne: string;
  nom: string;
  statutJuridique: string;
  region?: string | null;
  commune?: string | null;
  superficie?: number | string | null;
  uniteSuperficie?: string | null;
  prixPublic?: number | string | null;
  medias?: Array<{ secureUrl?: string; type?: string }>;
  documents?: Array<{
    secureUrl?: string;
    type?: string;
    title?: string | null;
  }>;
  localisationDetail?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accesRoutier?: string | null;
  eauDisponible?: boolean | null;
  electriciteDisponible?: boolean | null;
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
  },
];

const navItems = [
  { label: 'Nos terrains', href: '#terrains' },
  { label: 'Nos services', href: '#services' },
  { label: 'À propos', href: '#a-propos' },
  { label: 'Nos réalisations', href: '#realisations' },
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
  };
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogue, setCatalogue] = useState(terrains);
  const [region, setRegion] = useState('Toutes les zones');
  const [budget, setBudget] = useState('Tous les budgets');
  const [size, setSize] = useState('Toutes les superficies');
  const [legalStatus, setLegalStatus] = useState('Tous les statuts');
  const [showAll, setShowAll] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
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

    void loadPublicTerrains();
  }, []);

  const filteredTerrains = useMemo(() => {
    return catalogue.filter((terrain) => {
      const matchesRegion =
        region === 'Toutes les zones' || terrain.region === region;
      const matchesBudget =
        budget === 'Tous les budgets' ||
        (budget === 'Moins de 15 M' && !terrain.price.includes('22')) ||
        (budget === '15 à 30 M' && terrain.price.includes('22'));
      const matchesSize =
        size === 'Toutes les superficies' ||
        (size === 'Moins de 200 m²' && terrain.size === '150 m²') ||
        (size === '200 à 400 m²' && terrain.size === '300 m²') ||
        (size === 'Plus de 400 m²' && terrain.size === '500 m²');
      const matchesLegalStatus =
        legalStatus === 'Tous les statuts' ||
        terrain.legalStatus === legalStatus;
      return (
        matchesRegion && matchesBudget && matchesSize && matchesLegalStatus
      );
    });
  }, [budget, catalogue, legalStatus, region, size]);

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
                Votre projet.
                <br />
                <span className="text-light">Notre engagement.</span>
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
                Terrains vérifiés, accompagnement transparent et solutions
                concrètes pour investir, construire et transmettre au Sénégal.
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
                MTM Immobilier accompagne les particuliers, les investisseurs et
                la diaspora dans leurs projets immobiliers au Sénégal avec une
                approche fondée sur la proximité et la transparence.
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
              <blockquote className="quote-card">
                <p>
                  “Depuis la France, j'ai pu suivre chaque étape de
                  l'acquisition de mon terrain avec une vraie visibilité.”
                </p>
                <footer>— Awa D. · Diaspora</footer>
              </blockquote>
              <blockquote className="quote-card">
                <p>
                  “Les explications sont claires et les documents transmis au
                  bon moment. C'est rassurant.”
                </p>
                <footer>— Mamadou S. · Dakar</footer>
              </blockquote>
              <blockquote className="quote-card">
                <p>
                  “Une équipe disponible, du premier échange jusqu'à la remise
                  des clés.”
                </p>
                <footer>— Fatou N. · Saly</footer>
              </blockquote>
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
              <article className="news-card">
                <span>Investissement</span>
                <h3>Les étapes essentielles avant d'acheter un terrain</h3>
                <p>Les points à vérifier pour avancer avec clarté.</p>
              </article>
              <article className="news-card">
                <span>Conseil</span>
                <h3>Investir depuis la diaspora, simplement</h3>
                <p>Les bons réflexes pour piloter un projet à distance.</p>
              </article>
              <article className="news-card">
                <span>Territoire</span>
                <h3>Comprendre les statuts fonciers</h3>
                <p>Un éclairage pour mieux lire les documents d'un bien.</p>
              </article>
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
            <a href="#contact">Vérification foncière</a>
            <a href="#contact">Gestion locative</a>
            <a href="#contact">Construction</a>
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
        <div className="terrain-detail-page fixed inset-0 z-50 overflow-y-auto bg-mist">
          <div className="mx-auto min-h-full max-w-7xl px-5 pb-16 pt-24 lg:px-10">
            <button
              type="button"
              className="detail-back"
              aria-label="Retour au catalogue des terrains"
              onClick={() => setSelectedTerrain(null)}
            >
              <ArrowRight className="rotate-180" size={17} /> Retour au
              catalogue
            </button>
            <div className="detail-hero-grid mt-7">
              <div className="detail-gallery">
                <img
                  className="detail-main-image"
                  src={selectedTerrain.image}
                  alt={selectedTerrain.name}
                />
                {selectedTerrain.media && selectedTerrain.media.length > 0 && (
                  <div className="detail-thumbnails">
                    {selectedTerrain.media
                      .slice(0, 4)
                      .map(
                        (media) =>
                          media.secureUrl && (
                            <img
                              key={media.secureUrl}
                              src={media.secureUrl}
                              alt={media.title ?? selectedTerrain.name}
                            />
                          ),
                      )}
                  </div>
                )}
              </div>
              <div className="detail-intro">
                <p className="eyebrow">
                  {selectedTerrain.id} · {selectedTerrain.status}
                </p>
                <h1>{selectedTerrain.name}</h1>
                <p className="detail-location">
                  <MapPin size={17} /> {selectedTerrain.location}
                </p>
                <p className="detail-price">{selectedTerrain.price}</p>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="detail-primary"
                    onClick={() => {
                      setSelectedTerrain(null);
                      setContactOpen(true);
                    }}
                  >
                    Demander une visite <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="detail-secondary"
                    onClick={() => {
                      setSelectedTerrain(null);
                      setContactOpen(true);
                    }}
                  >
                    Réserver
                  </button>
                </div>
              </div>
            </div>
            <div className="detail-content-grid mt-10">
              <div>
                <p className="eyebrow">À propos de ce terrain</p>
                <h2 className="detail-section-title">
                  Un emplacement pensé
                  <br />
                  <i>pour votre projet.</i>
                </h2>
                <p className="mt-5 max-w-2xl leading-7 text-slate-600">
                  Terrain sélectionné par MTM Immobilier, avec informations
                  publiques, accès et statut juridique présentés de manière
                  transparente. La localisation et les documents publiables sont
                  communiqués lors de l'étude de votre demande.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
                </div>
                <div className="detail-location-panel mt-8">
                  <div>
                    <MapPin size={19} />
                    <div>
                      <strong>Localisation</strong>
                      <span>
                        {selectedTerrain.detail ?? selectedTerrain.location}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Compass size={19} />
                    <div>
                      <strong>Accès</strong>
                      <span>
                        {selectedTerrain.access ??
                          'Informations communiquées sur demande'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <aside className="detail-side-panel">
                <p className="eyebrow">Caractéristiques</p>
                <h2>
                  Tout commence
                  <br />
                  par un bon emplacement.
                </h2>
                <ul>
                  <li>
                    <Check size={16} /> Statut juridique:{' '}
                    {selectedTerrain.legalStatus}
                  </li>
                  <li>
                    <Check size={16} /> Eau disponible:{' '}
                    {selectedTerrain.waterAvailable ? 'Oui' : 'À confirmer'}
                  </li>
                  <li>
                    <Check size={16} /> Électricité:{' '}
                    {selectedTerrain.electricityAvailable
                      ? 'Oui'
                      : 'À confirmer'}
                  </li>
                </ul>
                <button
                  type="button"
                  className="detail-contact-link"
                  onClick={() => {
                    setSelectedTerrain(null);
                    setContactOpen(true);
                  }}
                >
                  Demander des informations <ArrowRight size={16} />
                </button>
              </aside>
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
              onClick={() => setContactOpen(false)}
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
              onSubmit={(event) => {
                event.preventDefault();
                setContactOpen(false);
              }}
            >
              <input className="input" required placeholder="Nom complet" />
              <input
                className="input"
                required
                type="email"
                placeholder="Adresse e-mail"
              />
              <input className="input" required placeholder="Téléphone" />
              <select className="input">
                <option>Je souhaite...</option>
                <option>Acquérir un terrain</option>
                <option>Demander une vérification</option>
                <option>Parler de gestion locative</option>
              </select>
              <button className="mt-2 w-full rounded-xl bg-coral py-3.5 font-bold text-white hover:bg-[#8f3f2b]">
                Envoyer ma demande{' '}
                <ArrowRight className="ml-2 inline" size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
