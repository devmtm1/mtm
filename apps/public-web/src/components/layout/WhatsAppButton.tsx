import { MessageCircle } from 'lucide-react';
import { useSiteContact } from '../../hooks/useSiteContact';

export function WhatsAppButton() {
  const { whatsapp } = useSiteContact();

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
