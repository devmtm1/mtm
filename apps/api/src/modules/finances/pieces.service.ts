import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';

export interface PieceEnvoyee {
  key: string;
  type: string;
}

/**
 * Pièces justificatives de la trésorerie (facture, reçu, preuve de paiement,
 * relevé) : dépôt, adresse de consultation et retrait. Une pièce reste
 * archivée tant que l'écriture qu'elle justifie existe ; le retrait ne sert
 * qu'à remplacer une pièce d'une écriture encore modifiable.
 */
@Injectable()
export class PiecesService {
  constructor(private readonly cloudinary: CloudinaryService) {}

  async deposer(
    file: Express.Multer.File | undefined,
    dossier: string,
  ): Promise<PieceEnvoyee> {
    if (!file) throw new BadRequestException('Un fichier est obligatoire');
    validateUploadedAsset(file, 'document');
    const envoye = await this.cloudinary.upload(
      file,
      `finances/${dossier}`,
      false,
    );
    return { key: envoye.publicId, type: envoye.resourceType };
  }

  url(key: string | null, type: string | null): string | null {
    return key ? this.cloudinary.url(key, type ?? 'raw', false) : null;
  }

  /** Un échec de retrait ne bloque jamais l'opération métier. */
  async retirer(key: string | null, type: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.cloudinary.destroy(key, type ?? 'raw', false);
    } catch {
      /* le fichier orphelin sera nettoyé à la main */
    }
  }
}
