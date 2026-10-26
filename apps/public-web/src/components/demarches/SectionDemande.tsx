import { Check, MessageCircle } from 'lucide-react';
import { ContactForm } from '../contact/ContactForm';

interface SectionDemandeProps {
  intro: string;
  /** Les engagements du bandeau, repris ici pour rassurer au moment de décider. */
  engagements: string[];
  sujets: string[];
  numeroWhatsapp: string;
  messageWhatsapp: string;
}

/**
 * La demande, au bas de la page : à gauche ce que le visiteur peut attendre de MTM et un accès direct à
 * WhatsApp (le canal préféré de la clientèle à l'étranger, suivi par la direction), à droite le formulaire.
 * L'ancre `demande-verification` garde son nom d'origine : des liens ont pu être partagés.
 */
export function SectionDemande({ intro, engagements, sujets, numeroWhatsapp, messageWhatsapp }: SectionDemandeProps) {
  return (
    <section id="demande-verification" className="scroll-mt-20 bg-[#12365A] py-14 text-white lg:py-20">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="text-[14px] font-bold uppercase tracking-wide text-white/80">
            Faire une demande
            <span aria-hidden="true" className="mt-1 block h-[3px] w-12 rounded-full bg-[#C8102E]" />
          </p>
          <h2 className="mt-4 text-[28px] font-extrabold leading-tight sm:text-[34px]">Parlons de votre projet</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/85">{intro}</p>

          {engagements.length > 0 && (
            <ul className="mt-6 space-y-3">
              {engagements.map((engagement) => (
                <li key={engagement} className="flex items-start gap-3 text-[15px] font-medium text-white">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8102E]">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {engagement}
                </li>
              ))}
            </ul>
          )}

          {/* Les démarches sont suivies directement par la direction : ce bouton pointe sur son numéro, distinct du
              numéro général, en plus de la bulle flottante présente sur tout le site. */}
          <a
            href={`https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(messageWhatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 rounded-xl border border-white/40 px-6 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Discuter directement sur WhatsApp
          </a>
        </div>

        <div className="rounded-2xl bg-white p-6 text-mtm-text shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] sm:p-8">
          <h3 className="text-[20px] font-bold text-[#12365A]">Écrivez-nous</h3>
          <p className="mt-1 text-[14px] text-[#34465A]">Dites-nous ce dont vous avez besoin, nous revenons vers vous rapidement.</p>
          <ContactForm initialSujet={sujets[0]} sujetOptions={sujets} />
        </div>
      </div>
    </section>
  );
}
