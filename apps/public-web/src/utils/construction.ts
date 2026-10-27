import type { EditableStep } from '../hooks/useEditableContent';

/**
 * Contenus de départ de la page « Construction ». Chaque bloc se remplace depuis le back-office (Contenus du site ›
 * Construction) ; ces textes servent tant qu'aucun n'a été saisi. Ils ne promettent ni délai, ni prix.
 */

export const INTRO_CONSTRUCTION =
  'Du devis à la livraison, MTM Immobilier accompagne vos projets de construction avec un suivi rigoureux et transparent, même depuis l’étranger.';

export const REASSURANCE_CONSTRUCTION = ['Devis détaillé avant tout engagement', 'Chantier suivi par photos et rapports', 'Un interlocuteur unique'];

export const PRESTATIONS_CONSTRUCTION: EditableStep[] = [
  { title: 'Construction neuve', description: 'Villas, maisons et immeubles, du plan à la remise des clés.' },
  { title: 'Rénovation et extension', description: 'Remise à niveau, agrandissement et finitions de votre bien existant.' },
  { title: 'Suivi à distance', description: 'Journal de chantier, photos et rapports partagés avec vous, où que vous soyez.' },
  { title: 'Devis détaillé', description: 'Chiffrage détaillé de votre projet, présenté et validé avec vous avant le démarrage.' },
];

export const ETAPES_CONSTRUCTION: EditableStep[] = [
  { title: 'Étude et devis', description: 'Analyse de votre terrain et de votre programme, chiffrage détaillé.' },
  { title: 'Planification', description: 'Planning de chantier avec jalons et points de contrôle réguliers.' },
  { title: 'Suivi de chantier', description: 'Journal de chantier, photos et rapports partagés avec vous.' },
  { title: 'Livraison', description: 'Réception des travaux et remise des documents du projet.' },
];

export const FAQ_CONSTRUCTION: EditableStep[] = [
  { title: 'Dois-je déjà avoir un terrain ?', description: 'Non. Si vous n’en avez pas, nous pouvons vous proposer des terrains vérifiés de notre catalogue, puis lancer votre projet dessus.' },
  { title: 'Puis-je suivre mon chantier depuis l’étranger ?', description: 'Oui. Journal de chantier, photos et rapports sont partagés avec vous, et vous échangez avec votre interlocuteur par WhatsApp, téléphone ou e-mail.' },
  { title: 'Comment le devis est-il établi ?', description: 'Après avoir étudié votre terrain et votre programme, nous chiffrons le projet en détail et vous le présentons avant tout engagement. Vous pouvez le demander ci-dessous, sans engagement.' },
];
