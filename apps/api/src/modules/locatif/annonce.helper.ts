import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AnnonceBienFields } from './dto/annonce.dto';

export type AnnonceData = Partial<
  Pick<
    Prisma.BienLocatifUncheckedCreateInput,
    | 'titre'
    | 'description'
    | 'loyerMensuel'
    | 'charges'
    | 'moisCaution'
    | 'nombrePieces'
    | 'nombreChambres'
    | 'nombreSallesEau'
    | 'meuble'
    | 'equipements'
    | 'latitude'
    | 'longitude'
    | 'disponibleLe'
  >
>;

/**
 * Champs d'annonce à écrire en base, sans la publication (traitée à part,
 * car elle exige des conditions et une permission).
 */
export function annonceData(dto: AnnonceBienFields): AnnonceData {
  return {
    ...(dto.titre !== undefined ? { titre: dto.titre.trim() || null } : {}),
    ...(dto.description !== undefined
      ? { description: dto.description.trim() || null }
      : {}),
    ...(dto.loyerMensuel !== undefined
      ? { loyerMensuel: dto.loyerMensuel }
      : {}),
    ...(dto.charges !== undefined ? { charges: dto.charges } : {}),
    ...(dto.moisCaution !== undefined ? { moisCaution: dto.moisCaution } : {}),
    ...(dto.nombrePieces !== undefined
      ? { nombrePieces: dto.nombrePieces }
      : {}),
    ...(dto.nombreChambres !== undefined
      ? { nombreChambres: dto.nombreChambres }
      : {}),
    ...(dto.nombreSallesEau !== undefined
      ? { nombreSallesEau: dto.nombreSallesEau }
      : {}),
    ...(dto.meuble !== undefined ? { meuble: dto.meuble } : {}),
    ...(dto.equipements !== undefined
      ? {
          equipements: [
            ...new Set(
              dto.equipements.map((item) => item.trim()).filter(Boolean),
            ),
          ],
        }
      : {}),
    ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
    ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
    ...(dto.disponibleLe !== undefined
      ? { disponibleLe: dto.disponibleLe ? new Date(dto.disponibleLe) : null }
      : {}),
  };
}

/** Ce que le bien doit avoir pour être montré sur le site. */
export interface ConditionsPublication {
  loyerMensuel: number | null;
  nombrePhotos: number;
}

/**
 * Un bien ne se publie pas à moitié : sans loyer, l'annonce n'a pas de prix ;
 * sans photo, elle ne se distingue pas dans la liste et personne ne la
 * demande. La règle porte sur l'état après modification.
 */
export function verifierPublication(conditions: ConditionsPublication): void {
  if (!(Number(conditions.loyerMensuel ?? 0) > 0)) {
    throw new BadRequestException(
      'Renseignez le loyer mensuel avant de publier ce bien.',
    );
  }
  if (conditions.nombrePhotos < 1) {
    throw new BadRequestException(
      'Ajoutez au moins une photo avant de publier ce bien.',
    );
  }
}
