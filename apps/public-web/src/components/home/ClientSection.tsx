import { ArrowRight, FileText, LockKeyhole, MessageCircle } from 'lucide-react';

type ClientSectionProps = { onContact: () => void };
export function ClientSection({ onContact }: Readonly<ClientSectionProps>) {
  return (
    <section id="client" className="client-section border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10 lg:py-28">
        <div>
          <p className="eyebrow">Espace client</p>
          <h2 className="section-title">
            Votre projet,<br />
            <i>au même endroit.</i>
          </h2>
          <p className="client-description">Suivez vos demandes, consultez vos documents et restez informé de l’avancement de votre projet avec MTM Immobilier.</p>
          <button
            type="button"
            className="client-link mt-8 font-bold text-coral"
            onClick={onContact}
          >
            Demander mon accès <ArrowRight size={16} />
          </button>
        </div>
        <div className="client-panel">
          <div className="client-panel-header"><span className="client-panel-icon"><LockKeyhole size={19} /></span><div><strong>Un espace qui vous suit</strong><span>Simple, confidentiel et accessible</span></div></div>
          <div className="client-benefits">
            <div><span className="client-benefit-icon"><FileText size={18} /></span><div><strong>Vos documents</strong><p>Retrouvez les pièces importantes de votre projet.</p></div></div>
            <div><span className="client-benefit-icon"><MessageCircle size={18} /></span><div><strong>Vos échanges</strong><p>Gardez le lien avec votre interlocuteur MTM.</p></div></div>
          </div>
          <div className="client-panel-footer">Vous n’avez pas encore vos identifiants ? <button type="button" onClick={onContact}>Contactez-nous <ArrowRight size={14} /></button></div>
        </div>
      </div>
    </section>
  );
}
