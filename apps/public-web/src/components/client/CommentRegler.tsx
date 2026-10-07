import { CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { formatMoney } from '../../utils/format';
import { ClientCard } from './shell/ClientUi';

/** Repli tant que MTM n'a pas saisi ses modes de règlement : aucune coordonnée n'y est inventée. */
const PAR_DEFAUT = [
  'Votre conseiller vous communique les coordonnées de règlement (mobile money, virement ou espèces) : appelez-le ou écrivez-lui sur WhatsApp.',
  'Indiquez toujours la référence de votre dossier ou de votre bail dans le message du paiement.',
  'Une fois le règlement effectué, prévenez MTM : il sera validé puis apparaîtra ici, avec son reçu.',
];

/**
 * « Comment régler ? » : ce que le client doit faire après avoir lu « Reste à
 * régler ». Le texte est administré au back-office (bloc `client.paiement`, une
 * ligne par consigne) ; le bouton prévient MTM sur WhatsApp avec le montant et
 * la référence déjà écrits.
 */
export function CommentRegler({ reference, montant }: { reference: string; montant?: number }) {
  const contact = useSiteContact();
  const { data } = useContentBlocks();

  const saisi = data?.find((bloc) => bloc.key === 'client.paiement')?.content ?? '';
  const lignes = saisi
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter(Boolean);
  const consignes = lignes.length > 0 ? lignes : PAR_DEFAUT;

  const message = `Bonjour, j'ai effectué un règlement${montant ? ` de ${formatMoney(montant)}` : ''} pour ${reference}.`;

  return (
    <ClientCard title="Comment régler ?">
      <ul className="flex flex-col gap-2.5">
        {consignes.map((consigne) => (
          <li key={consigne} className="flex items-start gap-2.5 text-sm text-mtm-muted">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
            <span>{consigne}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-mtm-success px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] sm:col-span-1"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          J’ai payé : prévenir MTM
        </a>
        <a
          href={toTelHref(contact.telephone)}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-mtm-border px-4 py-3 text-sm font-semibold text-mtm-text transition-transform active:scale-[0.98] sm:col-span-1"
        >
          <Phone className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
          Appeler mon conseiller
        </a>
      </div>
    </ClientCard>
  );
}
