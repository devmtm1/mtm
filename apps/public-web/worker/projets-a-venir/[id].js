import { ficheVitrine } from '../_lib/vitrine.js';

export const onRequestGet = (contexte) => ficheVitrine(contexte, '/projets-a-venir', 'Projets à venir', 'projet_a_venir');
