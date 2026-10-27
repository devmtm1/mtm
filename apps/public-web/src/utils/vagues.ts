/**
 * Les trois formes de vague qui terminent les bandeaux des pages. Une seule forme partout lasse ; trop de formes
 * désordonnent. Chaque famille de pages a la sienne :
 *  - « ample » : pages de présentation (À propos, Actualités, Nos réalisations, Projets à venir), un mouvement plus large ;
 *  - « douce » : pages de services (Construction, Gestion locative, Contact), la vague d'origine ;
 *  - « discrete » : pages de recherche (Nos biens, Locations), une courbe presque droite, pour ne pas charger le bas du
 *    bandeau sur lequel vient se poser le panneau de recherche.
 *
 * Les tracés s'inscrivent dans un cadre de 1440 × 90 ; la zone sous la courbe prend la couleur de fond de la page.
 */
export type FormeVague = 'ample' | 'douce' | 'discrete';

export const VAGUES: Record<FormeVague, string> = {
  ample: 'M0,30 C200,88 420,92 680,56 C940,20 1140,10 1300,40 C1370,54 1410,62 1440,66 L1440,90 L0,90 Z',
  douce: 'M0,46 C180,92 360,88 560,52 C760,16 940,6 1140,38 C1270,58 1360,70 1440,52 L1440,90 L0,90 Z',
  discrete: 'M0,64 C300,50 620,76 900,62 C1130,50 1320,56 1440,62 L1440,90 L0,90 Z',
};
