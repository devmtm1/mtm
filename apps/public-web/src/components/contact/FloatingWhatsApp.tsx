import { MessageCircle } from 'lucide-react';

const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER ?? '221770000000';
const whatsappMessage = encodeURIComponent(
  'Bonjour MTM Immobilier, je souhaite obtenir des informations sur vos services.',
);

export function FloatingWhatsApp() {
  return (
    <a
      className="floating-whatsapp"
      href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter MTM Immobilier sur WhatsApp"
    >
      <MessageCircle size={23} strokeWidth={2} />
    </a>
  );
}
