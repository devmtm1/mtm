import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { ContactForm } from './ContactForm';

interface ContactModalProps {
  title?: string;
  terrainId?: string;
  initialSujet?: string;
  /** Sujets proposés au lieu d'un champ libre. */
  sujetOptions?: string[];
  /**
   * Inséré au-dessus du formulaire : la page « Démarches » y place son appel
   * WhatsApp, pour que la fenêtre offre les deux chemins comme la section de
   * bas de page.
   */
  intro?: ReactNode;
  demandeType?: 'information' | 'visite';
  onClose: () => void;
}

export function ContactModal({
  title = 'Nous contacter',
  terrainId,
  initialSujet,
  sujetOptions,
  intro,
  demandeType,
  onClose,
}: ContactModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      {intro}
      <ContactForm
        terrainId={terrainId}
        initialSujet={initialSujet}
        sujetOptions={sujetOptions}
        demandeType={demandeType}
        onSuccess={onClose}
      />
    </Modal>
  );
}
