import { Modal } from '../ui/Modal';
import { ContactForm } from './ContactForm';

interface ContactModalProps {
  title?: string;
  terrainId?: string;
  initialSujet?: string;
  demandeType?: 'information' | 'visite';
  onClose: () => void;
}

export function ContactModal({ title = 'Nous contacter', terrainId, initialSujet, demandeType, onClose }: ContactModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <ContactForm terrainId={terrainId} initialSujet={initialSujet} demandeType={demandeType} onSuccess={onClose} />
    </Modal>
  );
}
