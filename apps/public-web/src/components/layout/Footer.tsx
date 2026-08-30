import { Mail, MapPin, Phone } from 'lucide-react';

type FooterProps = {
  onNavigate: (href: string) => void;
};

export function Footer({ onNavigate }: Readonly<FooterProps>) {
  const navLink = (href: string, label: string) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {label}
    </a>
  );
  return (
    <footer id="contact" className="site-footer">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-16">
        <div className="footer-main-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span>MTM</span>
              <span>Immobilier</span>
            </div>
            <p>
              Construire en confiance, au Sénégal et au-delà.
            </p>
            <span className="footer-signature">Terrains · projets · accompagnement</span>
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Explorer</h3>
            {navLink('#terrains', 'Nos terrains')}
            {navLink('#services', 'Nos services')}
            {navLink('#realisations', 'Nos réalisations')}
          </div>
          <div className="footer-column">
            <h3 className="footer-title">Services</h3>
            {navLink('#verification-fonciere', 'Vérification foncière')}
            {navLink('#gestion-locative', 'Gestion locative')}
            {navLink('#construction', 'Construction')}
            {navLink('#demarches', 'Démarches')}
          </div>
          <div className="footer-column footer-contact">
            <h3 className="footer-title">Nous trouver</h3>
            <p><MapPin size={16} /> Dakar, Sénégal</p>
            <p><Phone size={16} /> +221 77 000 00 00</p>
            <p><Mail size={16} /> bonjour@mtm-immobilier.sn</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MTM Immobilier. Tous droits réservés.</span>
          <span>Une expertise immobilière locale</span>
        </div>
      </div>
    </footer>
  );
}
