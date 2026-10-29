/** Rôle sous lequel une personne est connue de MTM. */
export type RolePersonne = 'prospect' | 'proprietaire' | 'locataire';

/** Une fiche telle qu'elle existe dans sa table d'origine (prospect, propriétaire ou locataire). */
export interface FichePersonne {
  role: RolePersonne;
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  /** Référence ou matricule lisible (P-2026-0001, PRO-2026-0004…). */
  reference: string | null;
  /** Parcours d'un prospect : acheteur, vérification, chantier… */
  parcours?: string | null;
}

export interface Personne {
  cle: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  fiches: FichePersonne[];
  /** Vrai quand plusieurs fiches de même rôle désignent la même personne : un doublon à fusionner. */
  doublon: boolean;
}

/** E-mail comparable : sans espaces ni majuscules. */
export function cleEmail(email: string | null | undefined): string | null {
  const nettoye = email?.trim().toLowerCase();
  return nettoye ? nettoye : null;
}

/**
 * Téléphone comparable : les 9 derniers chiffres, pour que « 77 276 67 98 », « +221 77 276 67 98 » et
 * « 00221772766798 » désignent le même numéro. Moins de 7 chiffres : trop court pour identifier quelqu'un.
 */
export function clePhone(telephone: string | null | undefined): string | null {
  const chiffres = (telephone ?? '').replace(/\D/g, '');
  return chiffres.length >= 7 ? chiffres.slice(-9) : null;
}

/**
 * Rassemble les fiches qui désignent la même personne : même e-mail ou même téléphone. Le nom seul ne suffit pas —
 * deux homonymes sans contact commun restent deux personnes —, et la parenté est transitive (A et B partagent un
 * e-mail, B et C un téléphone : A, B et C sont la même personne).
 */
export function regrouperPersonnes(fiches: FichePersonne[]): Personne[] {
  const parent = fiches.map((_, index) => index);
  const racine = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const vus = new Map<string, number>();
  fiches.forEach((fiche, index) => {
    const email = cleEmail(fiche.email);
    const phone = clePhone(fiche.telephone);
    for (const cle of [email && `e:${email}`, phone && `t:${phone}`]) {
      if (!cle) continue;
      const deja = vus.get(cle);
      if (deja === undefined) vus.set(cle, index);
      else parent[racine(index)] = racine(deja);
    }
  });

  const groupes = new Map<number, FichePersonne[]>();
  fiches.forEach((fiche, index) => {
    const cle = racine(index);
    groupes.set(cle, [...(groupes.get(cle) ?? []), fiche]);
  });

  return [...groupes.values()]
    .map((groupe) => {
      const [premiere] = groupe;
      const roles = groupe.map((fiche) => fiche.role);
      return {
        cle: `${premiere.role}:${premiere.id}`,
        nom: premiere.nom,
        prenom: premiere.prenom,
        email: groupe.find((fiche) => fiche.email)?.email ?? null,
        telephone: groupe.find((fiche) => fiche.telephone)?.telephone ?? null,
        fiches: groupe,
        doublon: new Set(roles).size < roles.length,
      };
    })
    .sort(
      (a, b) =>
        `${a.nom} ${a.prenom ?? ''}`.localeCompare(
          `${b.nom} ${b.prenom ?? ''}`,
          'fr',
          { sensitivity: 'base' },
        ) ||
        // Deux personnes de même nom gardent toujours le même ordre : sinon une page peut en répéter ou en perdre une.
        a.cle.localeCompare(b.cle),
    );
}

/** Ce que l'on peut isoler dans le répertoire : un rôle, ou les personnes à vérifier (doublons). */
export type FiltrePersonnes = 'tous' | RolePersonne | 'doublon';

export const FILTRES_PERSONNES: readonly FiltrePersonnes[] = [
  'tous',
  'prospect',
  'proprietaire',
  'locataire',
  'doublon',
];

export interface CompteursPersonnes {
  total: number;
  prospect: number;
  proprietaire: number;
  locataire: number;
  doublon: number;
}

/** Les chiffres de l'en-tête : une personne compte pour chaque rôle dont elle a une fiche. */
export function compterPersonnes(personnes: Personne[]): CompteursPersonnes {
  const avec = (role: RolePersonne) =>
    personnes.filter((personne) =>
      personne.fiches.some((fiche) => fiche.role === role),
    ).length;
  return {
    total: personnes.length,
    prospect: avec('prospect'),
    proprietaire: avec('proprietaire'),
    locataire: avec('locataire'),
    doublon: personnes.filter((personne) => personne.doublon).length,
  };
}

export function filtrerPersonnes(
  personnes: Personne[],
  filtre: FiltrePersonnes,
): Personne[] {
  if (filtre === 'tous') return personnes;
  if (filtre === 'doublon')
    return personnes.filter((personne) => personne.doublon);
  return personnes.filter((personne) =>
    personne.fiches.some((fiche) => fiche.role === filtre),
  );
}

export interface PagePersonnes<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

/**
 * Une page de la liste. Une page demandée au-delà de la dernière (la recherche a rétréci pendant qu'on tournait les
 * pages) ramène à la dernière page plutôt qu'à une page vide.
 */
export function paginer<T>(
  liste: T[],
  page: number,
  pageSize: number,
): PagePersonnes<T> {
  const taille = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(liste.length / taille));
  const courante = Math.min(Math.max(1, page), pages);
  return {
    items: liste.slice((courante - 1) * taille, courante * taille),
    page: courante,
    pageSize: taille,
    total: liste.length,
    pages,
  };
}
