import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type HeaderProps = {
  onContact: () => void;
  onNavigate: (href: string) => void;
};

const navItems = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Nos terrains', href: '#terrains' },
  { label: 'Projets', href: '#projets' },
  { label: 'Réalisations', href: '#realisations' },
  { label: 'Actualités', href: '#actualites' },
  { label: 'À propos', href: '#a-propos' },
  { label: 'Contact', href: '#contact' },
  { label: 'Espace client', href: '#client' },
];

const serviceItems = [
  { label: 'Gestion locative', href: '#gestion-locative' },
  { label: 'Construction', href: '#construction' },
  { label: 'Démarches', href: '#demarches' },
];

export function Header({ onContact, onNavigate }: Readonly<HeaderProps>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (!servicesOpen) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!servicesRef.current?.contains(event.target as Node)) {
        setServicesOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setServicesOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [servicesOpen]);

  const openContact = () => {
    setMenuOpen(false);
    setServicesOpen(false);
    onContact();
  };

  const openClientSpace = () => {
    setMenuOpen(false);
    setServicesOpen(false);
    onNavigate('#client');
  };

  return (
    <header className="site-header fixed left-0 right-0 top-0 z-40 border-b border-white/15 bg-ink/95 text-white shadow-lg shadow-ink/10 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <a
          href="#accueil"
          className="flex items-center gap-3"
          aria-label="MTM Immobilier, accueil"
          onClick={(event) => {
            event.preventDefault();
            setMenuOpen(false);
            setServicesOpen(false);
            onNavigate('#accueil');
          }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/40 bg-white">
            <img
              src="/logomtm.jpeg"
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            MTM <em className="not-italic text-coral">Immobilier</em>
          </span>
        </a>
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-3 text-[0.8rem] text-white/75 2xl:flex"
          aria-label="Navigation principale"
        >
          {navItems.map((item, index) => (
            <a
              className="nav-link"
              style={{ '--nav-index': index } as React.CSSProperties}
              href={item.href}
              key={item.href}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <div
            className="relative"
            ref={servicesRef}
          >
            <button
              type="button"
              className="nav-link flex items-center gap-1"
              aria-haspopup="true"
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((open) => !open)}
            >
              Services
              <ChevronDown
                size={14}
                className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {servicesOpen && (
              <div className="nav-dropdown-panel" role="menu">
                {serviceItems.map((item) => (
                  <a
                    className="nav-dropdown-item"
                    href={item.href}
                    key={item.href}
                    role="menuitem"
                    onClick={(event) => {
                      event.preventDefault();
                      setServicesOpen(false);
                      onNavigate(item.href);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="hidden shrink-0 items-center gap-4 2xl:flex">
          <a className="text-sm font-medium text-white/75 transition hover:text-white" href="#contact">
            Nous contacter
          </a>
          <button
            type="button"
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8f3f2b]"
            onClick={openClientSpace}
          >
            Espace client <ArrowRight className="ml-2 inline" size={15} />
          </button>
        </div>
        <button
          type="button"
          className="menu-toggle rounded-lg p-2 2xl:hidden"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-menu border-t border-white/15 px-4 pb-5 pt-3 sm:px-6 2xl:hidden" aria-label="Navigation mobile">
          {navItems.map((item) => (
            <a
              className="mobile-nav-link block border-b border-white/10 py-3 text-white/80 last:border-0"
              href={item.href}
              key={item.href}
              onClick={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                onNavigate(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <p className="mobile-nav-group-label">Services</p>
          {serviceItems.map((item) => (
            <a
              className="mobile-nav-link mobile-nav-sublink block border-b border-white/10 py-3 text-white/80 last:border-0"
              href={item.href}
              key={item.href}
              onClick={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                onNavigate(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            className="mobile-nav-link block border-b border-white/10 py-3 text-white/80 last:border-0"
            href="#client"
            onClick={(event) => {
              event.preventDefault();
              setMenuOpen(false);
              onNavigate('#client');
            }}
          >
            Espace client
          </a>
          <button type="button" className="mt-4 flex w-full items-center justify-center rounded-lg bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8f3f2b]" onClick={openContact}>
            Nous contacter <ArrowRight className="ml-2" size={15} />
          </button>
        </nav>
      )}
    </header>
  );
}
