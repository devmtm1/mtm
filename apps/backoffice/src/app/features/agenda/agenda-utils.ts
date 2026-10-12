import type { ItemAgenda } from '../../core/services/api/agenda-api.service';

/** Types d'événements qu'on peut saisir. */
export const TYPES_EVENEMENT: { code: string; label: string }[] = [
  { code: 'rendez_vous', label: 'Rendez-vous' },
  { code: 'visite', label: 'Visite' },
  { code: 'appel', label: 'Appel' },
  { code: 'verification', label: 'Vérification' },
  { code: 'reunion', label: 'Réunion' },
  { code: 'echeance', label: 'Échéance' },
  { code: 'autre', label: 'Autre' },
];

const LIBELLES_TYPE: Record<string, string> = {
  ...Object.fromEntries(TYPES_EVENEMENT.map((t) => [t.code, t.label])),
  tache: 'Tâche',
};

export function libelleType(code: string): string {
  return LIBELLES_TYPE[code] ?? code;
}

/** Ce qui est affiché : on peut masquer une famille d'éléments. */
export type Famille = 'evenements' | 'taches' | 'visites' | 'echeances';

export const FAMILLES: { code: Famille; label: string }[] = [
  { code: 'evenements', label: 'Événements' },
  { code: 'taches', label: 'Tâches' },
  { code: 'visites', label: 'Visites' },
  { code: 'echeances', label: 'Échéances' },
];

export function familleDe(item: Pick<ItemAgenda, 'source'>): Famille {
  switch (item.source) {
    case 'evenement':
      return 'evenements';
    case 'tache':
      return 'taches';
    case 'visite':
      return 'visites';
    default:
      return 'echeances';
  }
}

/** Clé « AAAA-MM-JJ » du jour d'un élément : le jour calendaire pour une journée entière, le jour local sinon. */
export function cleJour(item: Pick<ItemAgenda, 'debut' | 'journeeEntiere'>): string {
  if (item.journeeEntiere) return item.debut.slice(0, 10);
  return cleDate(new Date(item.debut));
}

export function cleDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${j}`;
}

/** Lundi de la semaine de `date`, à minuit local. */
export function debutDeSemaine(date: Date): Date {
  const resultat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const decalage = (resultat.getDay() + 6) % 7;
  resultat.setDate(resultat.getDate() - decalage);
  return resultat;
}

export function ajouterJours(date: Date, jours: number): Date {
  const resultat = new Date(date.getFullYear(), date.getMonth(), date.getDate() + jours);
  return resultat;
}

export interface JourGrille {
  date: Date;
  cle: string;
  dansLeMois: boolean;
  aujourdhui: boolean;
}

/** Grille d'un mois : semaines complètes du lundi au dimanche (4 à 6 lignes). */
export function grilleMois(reference: Date, maintenant = new Date()): JourGrille[][] {
  const premier = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const dernier = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  let courant = debutDeSemaine(premier);
  const semaines: JourGrille[][] = [];
  const cleAujourdhui = cleDate(maintenant);
  while (courant <= dernier) {
    const semaine: JourGrille[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = ajouterJours(courant, i);
      semaine.push({
        date,
        cle: cleDate(date),
        dansLeMois: date.getMonth() === reference.getMonth(),
        aujourdhui: cleDate(date) === cleAujourdhui,
      });
    }
    semaines.push(semaine);
    courant = ajouterJours(courant, 7);
  }
  return semaines;
}

/** Période à demander à l'API pour afficher une grille : du premier au dernier jour affiché, fin exclue. */
export function periodeDeGrille(semaines: JourGrille[][]): { du: Date; au: Date } {
  const premier = semaines[0][0].date;
  const dernier = semaines[semaines.length - 1][6].date;
  return { du: premier, au: ajouterJours(dernier, 1) };
}

export function grouperParJour(items: ItemAgenda[]): Map<string, ItemAgenda[]> {
  const jours = new Map<string, ItemAgenda[]>();
  for (const item of items) {
    const cle = cleJour(item);
    const liste = jours.get(cle) ?? [];
    liste.push(item);
    jours.set(cle, liste);
  }
  for (const liste of jours.values()) {
    // Les journées entières d'abord, puis par heure.
    liste.sort(
      (a, b) =>
        Number(b.journeeEntiere) - Number(a.journeeEntiere) ||
        new Date(a.debut).getTime() - new Date(b.debut).getTime(),
    );
  }
  return jours;
}

/** « 14:30 », « 14:30 – 15:30 » ou « Toute la journée ». */
export function heureDite(item: Pick<ItemAgenda, 'debut' | 'fin' | 'journeeEntiere'>): string {
  if (item.journeeEntiere) return 'Toute la journée';
  const format = (valeur: string) =>
    new Date(valeur).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return item.fin ? `${format(item.debut)} – ${format(item.fin)}` : format(item.debut);
}

/** Valeur pour un champ `datetime-local` (heure locale, sans fuseau). */
export function versChampDateHeure(valeur: string | Date | null | undefined): string {
  if (!valeur) return '';
  const date = typeof valeur === 'string' ? new Date(valeur) : valeur;
  const decale = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return decale.toISOString().slice(0, 16);
}

export function titreMois(date: Date): string {
  const texte = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export const NOMS_JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
