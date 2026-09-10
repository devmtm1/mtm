import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '221770000000';

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
