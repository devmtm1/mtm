import { ficheVitrine } from '../_lib/vitrine.js';

export const onRequestGet = (contexte) => ficheVitrine(contexte, '/realisations', 'Nos réalisations', 'realisation');
