import type { ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { ContactForm } from './ContactForm';

interface ContactModalProps {
  title?: string;
  terrainId?: string;
  bienLocatifId?: string;
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
  /** Rappel du bien concerné, au-dessus du formulaire (photo, titre, loyer). */
  recap?: ReactNode;
  /** Sujet imposé (affiché en rappel, non modifiable) : la demande part d'une fiche précise. */
  sujetFige?: boolean;
  libelleBouton?: string;
  avecIcones?: boolean;
  onClose: () => void;
}

export function ContactModal({
  title = 'Nous contacter',
  terrainId,
  bienLocatifId,
  initialSujet,
  sujetOptions,
  intro,
  demandeType,
  recap,
  sujetFige,
  libelleBouton,
  avecIcones,
  onClose,
}: ContactModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      {recap}
      {intro}
      <ContactForm
        terrainId={terrainId}
        bienLocatifId={bienLocatifId}
        initialSujet={initialSujet}
        sujetOptions={sujetOptions}
        demandeType={demandeType}
        sujetFige={sujetFige}
        libelleBouton={libelleBouton}
        avecIcones={avecIcones}
        onSuccess={onClose}
      />
    </Modal>
  );
}
