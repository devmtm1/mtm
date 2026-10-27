import type { EditableStep } from '../hooks/useEditableContent';

/**
 * Contenus de départ de la page « Gestion locative ». Chaque bloc se remplace depuis le back-office (Contenus du
 * site › Gestion locative) ; ces textes servent tant qu'aucun n'a été saisi. Ils ne promettent ni délai, ni montant,
 * ni taux : les conditions se donnent sur devis.
 */

export const INTRO_GESTION =
  'Confiez-nous votre bien : nous trouvons le locataire, encaissons les loyers et suivons le quotidien, et vous gardez une vue claire sur votre bien, même depuis l’étranger.';

export const REASSURANCE_GESTION = ['Un interlocuteur dédié', 'Loyers suivis mois par mois', 'Relevé de gestion détaillé'];

export const SERVICES_GESTION: EditableStep[] = [
  { title: 'Recherche de locataires', description: 'Annonce soignée avec photos, visites organisées et étude du dossier des candidats.' },
  { title: 'Bail et état des lieux', description: 'Contrat de bail, état des lieux d’entrée et de sortie, documents classés dans le dossier du bien.' },
  { title: 'Encaissement des loyers', description: 'Loyers et charges encaissés chaque mois, quittances remises aux locataires.' },
  { title: 'Suivi des impayés', description: 'Relances dès qu’un loyer est en retard, et suivi jusqu’à la régularisation.' },
  { title: 'Cautions et incidents', description: 'Dépôt de garantie suivi, demandes et incidents des locataires pris en charge.' },
  { title: 'Reversement et relevé', description: 'Loyers reversés au propriétaire, avec un relevé de gestion qui détaille chaque mouvement.' },
];

export const ETAPES_GESTION: EditableStep[] = [
  { title: 'Vous nous confiez votre bien', description: 'Nous fixons ensemble les conditions de la gestion et ouvrons le dossier du bien.' },
  { title: 'Nous le mettons en location', description: 'Photos, annonce sur le site, visites et choix du locataire avec vous.' },
  { title: 'Nous gérons au quotidien', description: 'Bail, loyers, impayés, cautions et incidents : tout est suivi par votre interlocuteur.' },
  { title: 'Vous suivez, où que vous soyez', description: 'Relevé de gestion et espace propriétaire en ligne pour garder la main à distance.' },
];

export const FAQ_GESTION: EditableStep[] = [
  { title: 'Quels biens pouvez-vous gérer ?', description: 'Appartements, studios, villas, immeubles ou villas divisées en plusieurs logements, bureaux, locaux commerciaux, et biens meublés loués au séjour. Chaque logement garde son loyer et son locataire, et vous gardez une vue d’ensemble.' },
  { title: 'Comment suis-je informé, depuis l’étranger ?', description: 'Tout se fait à distance : échanges par WhatsApp, téléphone ou e-mail, relevé de gestion détaillé et espace propriétaire en ligne. En cas d’incident ou d’impayé, votre interlocuteur vous prévient.' },
  { title: 'Combien coûte la gestion ?', description: 'La rémunération de MTM est présentée avant tout engagement, selon le type de bien. Contactez-nous : nous vous répondons sur devis.' },
  { title: 'Que se passe-t-il si un locataire ne paie pas ?', description: 'Nous relançons le locataire dès le retard et suivons la situation jusqu’à la régularisation. Vous êtes tenu informé à chaque étape.' },
];
