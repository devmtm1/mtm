import { ConflictException } from '@nestjs/common';

/**
 * Le strict minimum dont la numérotation a besoin : le service Prisma comme
 * le client d'une transaction le remplissent.
 */
type ProspectReferenceClient = {
  prospect: {
    count(args: {
      where: { referenceInterne: { startsWith: string } };
    }): Promise<number>;
    findUnique(args: {
      where: { referenceInterne: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

/**
 * Référence lisible d'un prospect : `P-2026-0001` (section 3 du cahier des
 * charges CRM). Elle est attribuée partout où un prospect naît — saisie
 * commerciale, message du site public, demande de réservation — d'où cette
 * fonction partagée plutôt qu'une méthode privée d'un seul service.
 *
 * Le rang repart du nombre de références déjà émises dans l'année et avance
 * tant que la référence est prise : deux créations simultanées ne peuvent
 * donc pas se voler la même.
 */
export async function nextProspectReference(
  // Accepte le client d'une transaction : une réservation venue du site
  // crée son prospect et son dossier dans la même transaction.
  prisma: ProspectReferenceClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `P-${year}-`;
  const count = await prisma.prospect.count({
    where: { referenceInterne: { startsWith: prefix } },
  });
  for (let rank = count + 1; rank <= count + 20; rank += 1) {
    const candidate = `${prefix}${String(rank).padStart(4, '0')}`;
    const exists = await prisma.prospect.findUnique({
      where: { referenceInterne: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new ConflictException(
    'Impossible d’attribuer une référence de prospect, réessayez',
  );
}
