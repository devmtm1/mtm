import { Modal } from '../ui/Modal';
import { ContactForm } from './ContactForm';

interface ContactModalProps {
  title?: string;
  terrainId?: string;
  initialSujet?: string;
  onClose: () => void;
}

export function ContactModal({ title = 'Nous contacter', terrainId, initialSujet, onClose }: ContactModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <ContactForm terrainId={terrainId} initialSujet={initialSujet} onSuccess={onClose} />
    </Modal>
  );
}
