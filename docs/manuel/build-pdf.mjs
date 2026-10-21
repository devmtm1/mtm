// Fabrique les PDF des guides par métier : un fichier téléchargeable et imprimable par guide.
//
//   npm run manuel:pdf        (depuis la racine du dépôt, après `npm run manuel`)
//
// Utilise Chrome (ou Edge) installé sur le poste, piloté par puppeteer-core : aucun navigateur
// n'est téléchargé. Chemin du navigateur : variable CHROME_PATH, sinon les emplacements usuels.
// Résultat : apps/backoffice/public/manuel/pdf/guide-<id>.pdf (servi sur /manuel/pdf/…).
// Les PDF sont versionnés avec le reste du guide : relancez ce script quand un guide change,
// puis commitez les fichiers générés.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SORTIE, lireGuides } from './lib.mjs';

const CANDIDATS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const navigateur = CANDIDATS.find((chemin) => existsSync(chemin));
if (!navigateur) {
  console.error('Aucun Chrome ou Edge trouvé. Indiquez son chemin dans la variable CHROME_PATH.');
  process.exit(1);
}

const DOSSIER_PDF = join(SORTIE, 'pdf');
mkdirSync(DOSSIER_PDF, { recursive: true });

const pied = `<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#6b7280;text-align:center">
MTM Immobilier · <span class="title"></span> · page <span class="pageNumber"></span> sur <span class="totalPages"></span>
</div>`;

const browser = await puppeteer.launch({ executablePath: navigateur, headless: true });
try {
  for (const guide of lireGuides()) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(SORTIE, `${guide.id}.html`)).href, { waitUntil: 'networkidle0', timeout: 60_000 });
    // Les images sont en chargement différé : on les force toutes, puis on attend qu'elles soient décodées.
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      images.forEach((image) => { image.loading = 'eager'; });
      await Promise.all(images.map((image) => (image.complete ? null : new Promise((fin) => { image.onload = fin; image.onerror = fin; }))));
      await document.fonts.ready;
    });
    await page.emulateMediaType('print');
    const fichier = join(DOSSIER_PDF, `guide-${guide.id}.pdf`);
    await page.pdf({
      path: fichier,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: pied,
      margin: { top: '16mm', right: '15mm', bottom: '18mm', left: '15mm' },
    });
    await page.close();
    console.log(`PDF « ${guide.titre} » -> pdf/guide-${guide.id}.pdf`);
  }
} finally {
  await browser.close();
}
