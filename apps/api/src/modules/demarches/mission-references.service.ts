import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DemarchesOptionsService } from './demarches-options.service';
import {
  construireReference,
  decouperFormat,
  rangDeReference,
} from './mission-reference';

type Sorte = 'mission' | 'facture';

/**
 * Attribue les références des missions (MTM-VF-001/2026) et de leurs factures
 * (MTM-FAC-VF-001/2026). Le rang repart de 1 chaque année pour chaque code de
 * famille, et se déduit des références déjà émises sous le même format : si
 * le format change en cours d'année, la numérotation repart proprement sans
 * jamais réutiliser un numéro.
 */
@Injectable()
export class MissionReferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly options: DemarchesOptionsService,
  ) {}

  async prochaine(
    sorte: Sorte,
    typeVerification: string | null | undefined,
  ): Promise<string> {
    const [format, code] = await Promise.all([
      this.options.getFormatReference(sorte),
      this.options.getCodeDuType(typeVerification),
    ]);
    const contexte = { code, annee: new Date().getFullYear() };
    const { prefixe, suffixe } = decouperFormat(format, contexte);
    const filtre = (
      valeur: string | { startsWith: string; endsWith: string },
    ) =>
      sorte === 'mission'
        ? { referenceInterne: valeur }
        : { factureReference: valeur };

    const lignes = await this.prisma.missionVerification.findMany({
      where: filtre({ startsWith: prefixe, endsWith: suffixe }),
      select: { referenceInterne: true, factureReference: true },
    });
    let dernier = 0;
    for (const ligne of lignes) {
      const reference =
        sorte === 'mission' ? ligne.referenceInterne : ligne.factureReference;
      const rang = reference
        ? rangDeReference(format, contexte, reference)
        : null;
      if (rang !== null && rang > dernier) dernier = rang;
    }

    for (let rang = dernier + 1; rang <= dernier + 20; rang += 1) {
      const candidate = construireReference(format, contexte, rang);
      const prise = await this.prisma.missionVerification.findFirst({
        where: filtre(candidate),
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new ConflictException(
      sorte === 'mission'
        ? 'Impossible d’attribuer une référence de mission, réessayez'
        : 'Impossible d’attribuer un numéro de facture, réessayez',
    );
  }
}
