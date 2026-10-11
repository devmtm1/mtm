import { A4, PdfDocument, parseJpeg } from './pdf-document';

/** En-tête JPEG minimal : SOI, SOF0 (hauteur, largeur, composantes), EOI. */
function jpeg(largeur: number, hauteur: number, composantes = 3): Buffer {
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(8 + composantes * 3, 2);
  sof[4] = 8;
  sof.writeUInt16BE(hauteur, 5);
  sof.writeUInt16BE(largeur, 7);
  sof[9] = composantes;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    sof.subarray(0, 10 + composantes * 3),
    Buffer.from([0xff, 0xd9]),
  ]);
}

describe('parseJpeg', () => {
  it('lit les dimensions d’un JPEG couleur', () => {
    expect(parseJpeg(jpeg(640, 480))).toMatchObject({
      width: 640,
      height: 480,
      components: 3,
    });
  });

  it('accepte les niveaux de gris', () => {
    expect(parseJpeg(jpeg(100, 50, 1))).toMatchObject({ components: 1 });
  });

  it('refuse ce qui n’est pas un JPEG ou qui est en CMJN', () => {
    expect(parseJpeg(Buffer.from('%PDF-1.4'))).toBeNull();
    expect(parseJpeg(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(parseJpeg(jpeg(10, 10, 4))).toBeNull();
    expect(parseJpeg(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe('PdfDocument — images', () => {
  it('insère le flux JPEG tel quel et référence l’image dans la page', () => {
    const image = parseJpeg(jpeg(800, 600));
    if (!image) throw new Error('JPEG de test invalide');
    const pdf = new PdfDocument('Test');
    const page = pdf.addPage();
    page.image(image, 48, 100, 200, 200);
    pdf.addPage().text('Page sans image', 48, 100);
    const sortie = pdf.build().toString('latin1');

    expect(sortie).toContain('/Subtype /Image /Width 800 /Height 600');
    expect(sortie).toContain('/Filter /DCTDecode');
    expect(sortie).toContain('/XObject << /Im0 ');
    expect(sortie).toContain('/Count 2');
    // Le dictionnaire des pages vient après toutes les images : /Parent pointe dessus.
    const parent = /\/Parent (\d+) 0 R/.exec(sortie);
    expect(parent).not.toBeNull();
    expect(sortie).toContain(`${parent?.[1]} 0 obj\n<< /Type /Pages`);
  });

  it('ajuste l’image au cadre sans la déformer', () => {
    const image = parseJpeg(jpeg(800, 400));
    if (!image) throw new Error('JPEG de test invalide');
    const pdf = new PdfDocument('Test');
    pdf.addPage().image(image, 0, 0, 200, 200);
    // 800×400 dans 200×200 : 200 de large, 100 de haut, centrée verticalement.
    expect(pdf.build().toString('latin1')).toContain(
      `q 200 0 0 100 0 ${(A4.height - 50 - 100).toFixed(2)} cm /Im0 Do Q`,
    );
  });
});
