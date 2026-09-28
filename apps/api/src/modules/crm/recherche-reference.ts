import { ConflictException } from '@nestjs/common';

/** Le strict minimum dont la numérotation a besoin. */
type RechercheReferenceClient = {
  prospect: {
    count(args: {
      where: { rechercheReference: { startsWith: string } };
    }): Promise<number>;
    findUnique(args: {
      where: { rechercheReference: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

/**
 * Référence d'un mandat de recherche de terrain : `NS-2026-0001`. C'est le
 * numéro que le formulaire papier porte en tête et que le client cite quand
 * il rappelle ; elle est donc distincte de la référence du prospect, qui
 * suit la fiche et non la recherche.
 *
 * Même principe que `nextProspectReference` : le rang repart du nombre de
 * références déjà émises dans l'année et avance tant que la référence est
 * prise, pour que deux ouvertures simultanées ne se volent pas la même.
 */
export async function nextRechercheReference(
  prisma: RechercheReferenceClient,
): Promise<string> {
  const annee = new Date().getFullYear();
  const prefixe = `NS-${annee}-`;
  const emises = await prisma.prospect.count({
    where: { rechercheReference: { startsWith: prefixe } },
  });
  for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
    const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
    const prise = await prisma.prospect.findUnique({
      where: { rechercheReference: candidate },
      select: { id: true },
    });
    if (!prise) return candidate;
  }
  throw new ConflictException(
    'Impossible d’attribuer une référence de recherche, réessayez',
  );
}
