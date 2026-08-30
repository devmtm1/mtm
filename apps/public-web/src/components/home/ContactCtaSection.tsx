import { ArrowRight, MessageCircle } from 'lucide-react';
export function ContactCtaSection({
  onContact,
}: Readonly<{ onContact: () => void }>) {
  return (
    <section className="cta-section">
      <div className="cta-section-inner mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
        <div className="cta-copy">
          <span className="cta-icon"><MessageCircle size={20} /></span>
          <div>
            <p className="eyebrow text-light">Un projet en tête ?</p>
            <h2>Parlons de ce qui compte pour vous.</h2>
          </div>
        </div>
        <div className="cta-action">
          <p>Un premier échange suffit pour comprendre votre besoin et vous orienter.</p>
        <button
          type="button"
          className="cta-button"
          onClick={onContact}
        >
          Prendre rendez-vous <ArrowRight size={16} />
        </button>
        </div>
      </div>
    </section>
  );
}
