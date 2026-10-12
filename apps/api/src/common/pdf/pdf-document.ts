/**
 * Générateur PDF minimal, sans dépendance : pages A4, rectangles, traits,
 * texte Helvetica / Helvetica-Bold (polices standard, encodage WinAnsi pour
 * les accents), largeur de texte pour aligner à droite ou centrer, retour à
 * la ligne automatique, images JPEG (annexe photo d'un rapport). Suffisant pour
 * les documents de vente (factures, reçus, bons de réservation, contrats) sans
 * embarquer une bibliothèque.
 */

export type PdfFont = 'regular' | 'bold';
export type PdfAlign = 'left' | 'right' | 'center';

export interface TextOptions {
  font?: PdfFont;
  size?: number;
  color?: string;
  align?: PdfAlign;
  /** Largeur disponible : le texte est replié sur plusieurs lignes. */
  width?: number;
  lineHeight?: number;
}

export const A4 = { width: 595.28, height: 841.89 } as const;

/** Image JPEG prête à être placée : le flux est inséré tel quel (filtre DCT). */
export interface PdfJpeg {
  data: Buffer;
  width: number;
  height: number;
  /** 1 = niveaux de gris, 3 = couleurs. */
  components: 1 | 3;
}

/**
 * Lit les dimensions d'un JPEG (marqueur SOF). Renvoie `null` si le fichier
 * n'est pas un JPEG exploitable — autre format, CMJN, fichier tronqué : l'appelant
 * saute alors la photo au lieu de produire un PDF illisible.
 */
export function parseJpeg(data: Buffer): PdfJpeg | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Marqueurs sans longueur.
    if (
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    const estSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (estSof) {
      // Progressif (0xc2) accepté ; arithmétique et sans perte, non.
      if (marker > 0xc2) return null;
      if (offset + 10 > data.length) return null;
      const height = data.readUInt16BE(offset + 5);
      const width = data.readUInt16BE(offset + 7);
      const components = data[offset + 9];
      if (!width || !height || (components !== 1 && components !== 3)) {
        return null;
      }
      return { data, width, height, components };
    }
    offset += 2 + length;
  }
  return null;
}

/* Largeurs des glyphes Helvetica / Helvetica-Bold (AFM, pour 1000 unités), codes 32 à 126. */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];

/** Caractères hors Latin-1 remplacés par leur équivalent WinAnsi ou ASCII. */
const WINANSI_MAP: Record<string, number> = {
  '€': 0x80,
  '…': 0x85,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '™': 0x99,
  Œ: 0x8c,
  œ: 0x9c,
  Š: 0x8a,
  š: 0x9a,
  Ž: 0x8e,
  ž: 0x9e,
  Ÿ: 0x9f,
  ' ': 0x20,
  ' ': 0x20,
  ' ': 0x20,
};

function baseLetter(char: string): string {
  return char.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function glyphWidth(char: string, font: PdfFont): number {
  const table = font === 'bold' ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let code = char.charCodeAt(0);
  if (code < 32 || code > 126) {
    const base = baseLetter(char);
    code = base.charCodeAt(0);
    if (code < 32 || code > 126) return 556;
  }
  return table[code - 32] ?? 556;
}

export function textWidth(text: string, font: PdfFont, size: number): number {
  let total = 0;
  for (const char of text) total += glyphWidth(char, font);
  return (total * size) / 1000;
}

/** Encode une chaîne en WinAnsi et l'échappe pour un littéral PDF. */
function encodeText(text: string): Buffer {
  const bytes: number[] = [];
  for (const char of text) {
    const mapped = WINANSI_MAP[char];
    let code = mapped ?? char.charCodeAt(0);
    if (mapped === undefined && code > 255) {
      const base = baseLetter(char);
      code = base.charCodeAt(0) <= 255 ? base.charCodeAt(0) : 0x3f;
    }
    if (code === 0x28 || code === 0x29 || code === 0x5c) bytes.push(0x5c);
    bytes.push(code);
  }
  return Buffer.from(bytes);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value, 16);
  return [
    ((int >> 16) & 255) / 255,
    ((int >> 8) & 255) / 255,
    (int & 255) / 255,
  ];
}

function rgbOperator(hex: string, fill: boolean): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${fill ? 'rg' : 'RG'}`;
}

/** Découpe un texte en lignes qui tiennent dans `width`. */
export function wrapText(
  text: string,
  font: PdfFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, font, size) <= width || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

export class PdfPage {
  private readonly ops: Buffer[] = [];
  readonly images: PdfJpeg[] = [];

  /**
   * Place une image dans le rectangle donné (repère haut-gauche), sans la
   * déformer : elle est centrée et ajustée au plus grand côté qui tient.
   *
   * Avec `rond`, l'image remplit un cercle inscrit dans le rectangle et déborde
   * pas de son contour : c'est ainsi que le logo, rond sur fond blanc, se pose
   * sur une bande colorée sans laisser un carré blanc autour.
   */
  image(
    jpeg: PdfJpeg,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { rond?: boolean } = {},
  ): void {
    const rond = options.rond === true;
    // Rond : l'image couvre tout le cercle ; sinon elle tient entière dans le cadre.
    const echelle = rond
      ? Math.max(width / jpeg.width, height / jpeg.height)
      : Math.min(width / jpeg.width, height / jpeg.height);
    const w = jpeg.width * echelle;
    const h = jpeg.height * echelle;
    const left = x + (width - w) / 2;
    const top = y + (height - h) / 2;
    // Une même image (le logo, en-tête et pied) n'est référencée qu'une fois par page.
    let indice = this.images.indexOf(jpeg);
    if (indice < 0) indice = this.images.push(jpeg) - 1;
    const dessin = `${n(w)} 0 0 ${n(h)} ${n(left)} ${n(A4.height - top - h)} cm /Im${indice} Do`;
    if (!rond) {
      this.push(`q ${dessin} Q`);
      return;
    }
    const rayon = Math.min(width, height) / 2;
    const cx = x + width / 2;
    const cy = A4.height - (y + height / 2);
    const k = rayon * 0.5523;
    this.push(
      `q ${n(cx + rayon)} ${n(cy)} m ` +
        `${n(cx + rayon)} ${n(cy + k)} ${n(cx + k)} ${n(cy + rayon)} ${n(cx)} ${n(cy + rayon)} c ` +
        `${n(cx - k)} ${n(cy + rayon)} ${n(cx - rayon)} ${n(cy + k)} ${n(cx - rayon)} ${n(cy)} c ` +
        `${n(cx - rayon)} ${n(cy - k)} ${n(cx - k)} ${n(cy - rayon)} ${n(cx)} ${n(cy - rayon)} c ` +
        `${n(cx + k)} ${n(cy - rayon)} ${n(cx + rayon)} ${n(cy - k)} ${n(cx + rayon)} ${n(cy)} c ` +
        `W n ${dessin} Q`,
    );
  }

  /** Rectangle plein ; `y` est la coordonnée du bord supérieur (repère haut-gauche). */
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ): void {
    this.push(
      `${rgbOperator(color, true)} ${n(x)} ${n(A4.height - y - height)} ${n(width)} ${n(height)} re f`,
    );
  }

  /** Bordure de rectangle. */
  stroke(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth = 0.75,
  ): void {
    this.push(
      `${rgbOperator(color, false)} ${n(lineWidth)} w ${n(x)} ${n(A4.height - y - height)} ${n(width)} ${n(height)} re S`,
    );
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth = 0.75,
  ): void {
    this.push(
      `${rgbOperator(color, false)} ${n(lineWidth)} w ${n(x1)} ${n(A4.height - y1)} m ${n(x2)} ${n(A4.height - y2)} l S`,
    );
  }

  /**
   * Écrit un texte ; `y` est la ligne de base en repère haut-gauche. Renvoie
   * la hauteur occupée (utile pour enchaîner des paragraphes).
   */
  text(value: string, x: number, y: number, options: TextOptions = {}): number {
    const font = options.font ?? 'regular';
    const size = options.size ?? 10;
    const color = options.color ?? '#1F2937';
    const lineHeight = options.lineHeight ?? size * 1.35;
    const lines = options.width
      ? wrapText(value, font, size, options.width)
      : [value];
    let baseline = y;
    for (const line of lines) {
      let startX = x;
      if (options.align === 'right') startX = x - textWidth(line, font, size);
      else if (options.align === 'center')
        startX = x - textWidth(line, font, size) / 2;
      this.ops.push(
        Buffer.from(
          `BT ${rgbOperator(color, true)} /${font === 'bold' ? 'F2' : 'F1'} ${n(size)} Tf ${n(startX)} ${n(A4.height - baseline)} Td (`,
          'latin1',
        ),
        encodeText(line),
        Buffer.from(') Tj ET\n', 'latin1'),
      );
      baseline += lineHeight;
    }
    return lines.length * lineHeight;
  }

  content(): Buffer {
    return Buffer.concat(this.ops);
  }

  private push(op: string): void {
    this.ops.push(Buffer.from(`${op}\n`, 'latin1'));
  }
}

function n(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export class PdfDocument {
  private readonly pages: PdfPage[] = [];
  private readonly title: string;

  constructor(title: string) {
    this.title = title;
  }

  addPage(): PdfPage {
    const page = new PdfPage();
    this.pages.push(page);
    return page;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /** Assemble le fichier : catalogue, pages, contenus, polices, table xref. */
  build(): Buffer {
    const objects: Buffer[] = [];
    const add = (body: Buffer | string): number => {
      objects.push(
        typeof body === 'string' ? Buffer.from(body, 'latin1') : body,
      );
      return objects.length;
    };

    const fontRegular = add(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );
    const fontBold = add(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );
    // Chaque image n'est écrite qu'une fois dans le fichier, même si plusieurs pages l'utilisent.
    const totalImages = new Set(this.pages.flatMap((page) => page.images)).size;
    const objetsImage = new Map<PdfJpeg, number>();
    const pagesId = objects.length + 1 + this.pages.length * 2 + totalImages;
    const pageIds: number[] = [];
    for (const page of this.pages) {
      const content = page.content();
      const imageIds = page.images.map((jpeg) => {
        const connu = objetsImage.get(jpeg);
        if (connu !== undefined) return connu;
        const id = add(
          Buffer.concat([
            Buffer.from(
              `<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /${jpeg.components === 1 ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.data.length} >>\nstream\n`,
              'latin1',
            ),
            jpeg.data,
            Buffer.from('\nendstream', 'latin1'),
          ]),
        );
        objetsImage.set(jpeg, id);
        return id;
      });
      const xobjects = imageIds.length
        ? ` /XObject << ${imageIds.map((id, index) => `/Im${index} ${id} 0 R`).join(' ')} >>`
        : '';
      const contentId = add(
        Buffer.concat([
          Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'latin1'),
          content,
          Buffer.from('\nendstream', 'latin1'),
        ]),
      );
      const pageId = add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >>${xobjects} >> >>`,
      );
      pageIds.push(pageId);
    }
    const pagesObj = add(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
    );
    const catalog = add(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
    const info = add(
      `<< /Title (${encodeText(this.title).toString('latin1')}) /Producer (MTM Immobilier) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`,
    );

    const parts: Buffer[] = [
      Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1'),
    ];
    const offsets: number[] = [];
    let offset = parts[0].length;
    objects.forEach((body, index) => {
      offsets.push(offset);
      const chunk = Buffer.concat([
        Buffer.from(`${index + 1} 0 obj\n`, 'latin1'),
        body,
        Buffer.from('\nendobj\n', 'latin1'),
      ]);
      parts.push(chunk);
      offset += chunk.length;
    });
    const xref = [
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
      ...offsets.map(
        (value) => `${String(value).padStart(10, '0')} 00000 n \n`,
      ),
    ].join('');
    parts.push(
      Buffer.from(
        `${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`,
        'latin1',
      ),
    );
    return Buffer.concat(parts);
  }
}
