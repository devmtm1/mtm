import { BadRequestException } from '@nestjs/common';

export type AssetKind = 'media' | 'document';

const MAX_ASSET_SIZE = 10 * 1024 * 1024;

const MIME_TYPES: Record<AssetKind, ReadonlySet<string>> = {
  media: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
  ]),
  document: new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
};

export function validateUploadedAsset(
  file: Express.Multer.File,
  kind: AssetKind,
): void {
  if (!file?.buffer || !file.mimetype) {
    throw new BadRequestException('Le fichier reçu est invalide');
  }
  if (file.size > MAX_ASSET_SIZE) {
    throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo');
  }
  if (!MIME_TYPES[kind].has(file.mimetype)) {
    throw new BadRequestException('Le type de fichier n’est pas autorisé');
  }
  if (!matchesSignature(file, kind)) {
    throw new BadRequestException('Le contenu du fichier est invalide');
  }
}

function matchesSignature(file: Express.Multer.File, kind: AssetKind): boolean {
  const buffer = file.buffer;
  const mimetype = file.mimetype;

  if (mimetype === 'image/jpeg') {
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (mimetype === 'image/png') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  if (mimetype === 'application/pdf') {
    return buffer.toString('ascii', 0, 5) === '%PDF-';
  }
  if (
    mimetype ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return buffer.subarray(0, 2).equals(Buffer.from([0x50, 0x4b]));
  }
  if (
    kind === 'media' &&
    (mimetype === 'video/mp4' || mimetype === 'video/quicktime')
  ) {
    return buffer.toString('ascii', 4, 8) === 'ftyp';
  }
  return false;
}
