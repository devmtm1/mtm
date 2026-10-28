// Les comptes fictifs de l'environnement de captures. Rien de réel : adresses en .test, mot de passe
// connu de ce seul fichier, base détruite à la fin.
export const MOT_DE_PASSE = 'Captures-2026!x';
export const MOT_DE_PASSE_PROVISOIRE = 'Provisoire-2026!a';

export const COMPTES = {
  administrateur: { email: 'admin@mtm-immobilier.sn', prenom: 'Admin', nom: 'MTM', role: 'administrateur' },
  responsable: { email: 'awa.ndiaye@mtm.test', prenom: 'Awa', nom: 'Ndiaye', role: 'responsable_commercial' },
  commercial: { email: 'fatou.diop@mtm.test', prenom: 'Fatou', nom: 'Diop', role: 'commercial' },
  commercial2: { email: 'moussa.fall@mtm.test', prenom: 'Moussa', nom: 'Fall', role: 'commercial' },
  gestionnaire: { email: 'mariama.ba@mtm.test', prenom: 'Mariama', nom: 'Ba', role: 'responsable_gestion_locative' },
  comptable: { email: 'ibrahima.sow@mtm.test', prenom: 'Ibrahima', nom: 'Sow', role: 'comptable' },
};
