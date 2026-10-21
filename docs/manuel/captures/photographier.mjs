// Prend les captures d'écran du guide : Chrome piloté par puppeteer-core, un compte par métier,
// viewport 1366 × 820 (téléphone : 390 × 844). Les fichiers remplacent ceux de
// apps/backoffice/public/manuel/img/ : le guide complet et les guides par métier en profitent.
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authenticator } from 'otplib';
import puppeteer from 'puppeteer-core';
import { COMPTES, MOT_DE_PASSE } from './comptes.mjs';
import { SORTIE } from '../lib.mjs';

const CANDIDATS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const BUREAU = { width: 1366, height: 820, deviceScaleFactor: 1 };
const TELEPHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DOSSIER_IMG = join(SORTIE, 'img');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Attend que la page ait fini de charger : plus de réseau, plus de squelettes, graphiques posés. */
async function attendreStable(page, supplementMs = 900) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 20_000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('.skeleton').length === 0, { timeout: 8_000 }).catch(() => {});
  await pause(supplementMs);
}

/**
 * Change d'écran SANS recharger la page : le routeur de l'application réagit à l'historique du
 * navigateur. Recharger à chaque capture redemanderait un jeton à l'API et finit par casser la session.
 */
async function naviguer(page, adresse) {
  await page.evaluate((cible) => {
    window.history.pushState({}, '', cible);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, adresse);
  await pause(400);
  await attendreStable(page);
}

/** Clique le premier bouton ou lien visible dont le texte contient `texte`. */
async function cliquer(page, texte) {
  const trouve = await page.evaluate((recherche) => {
    const normaliser = (valeur) => valeur.replace(/\s+/g, ' ').trim().toLowerCase();
    const cible = normaliser(recherche);
    const candidats = Array.from(document.querySelectorAll('button, a, [role="tab"], [role="menuitem"], mat-option, .mat-mdc-option'));
    const element = candidats.find((candidat) => {
      const rect = candidat.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && normaliser(candidat.textContent ?? '').includes(cible);
    });
    if (!element) return false;
    element.scrollIntoView({ block: 'center' });
    element.click();
    return true;
  }, texte);
  if (!trouve) throw new Error(`Bouton « ${texte} » introuvable`);
  await pause(700);
}

async function connecter(navigateur, urlFront, compte, secretTotp, viewport = BUREAU) {
  const contexte = await navigateur.createBrowserContext();
  const page = await contexte.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport(viewport);
  if (process.env.CAPTURES_DEBUG) {
    page.on('console', (message) => console.log(`[navigateur] ${message.type()} ${message.text().slice(0, 300)}`));
    page.on('requestfailed', (requete) => console.log(`[navigateur] requête échouée ${requete.url()} ${requete.failure()?.errorText}`));
    page.on('response', (reponse) => reponse.status() >= 400 && console.log(`[navigateur] HTTP ${reponse.status()} ${reponse.url()}`));
  }
  await page.goto(`${urlFront}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', compte.email);
  await page.type('input[type="password"]', MOT_DE_PASSE);
  await page.click('button[type="submit"]');
  if (secretTotp) {
    await page.waitForSelector('input[formcontrolname="code"]', { timeout: 15_000 });
    await page.type('input[formcontrolname="code"]', authenticator.generate(secretTotp));
    await page.click('button[type="submit"]');
  }
  try {
    await page.waitForFunction(() => location.pathname.startsWith('/dashboard'), { timeout: 30_000 });
  } catch (erreur) {
    // On garde une trace de ce que la personne voit : bien plus parlant qu'un délai dépassé.
    const trace = join(tmpdir(), 'mtm-captures-echec-connexion.png');
    await page.screenshot({ path: trace }).catch(() => {});
    const texte = await page.evaluate(() => document.body.innerText.slice(0, 400)).catch(() => '');
    throw new Error(`Connexion de ${compte.email} impossible (adresse ${page.url()}). Capture : ${trace}. Texte : ${texte}`, { cause: erreur });
  }
  await attendreStable(page, 600);
  return page;
}

export async function photographier({ urlFront, secretTotp, ids }) {
  const chemin = CANDIDATS.find((c) => existsSync(c));
  if (!chemin) throw new Error('Aucun Chrome ou Edge trouvé : indiquez son chemin dans CHROME_PATH.');
  mkdirSync(DOSSIER_IMG, { recursive: true });
  const navigateur = await puppeteer.launch({ executablePath: chemin, headless: true, args: ['--hide-scrollbars'] });
  const faites = [];
  const echecs = [];

  /** Une capture : ouvre l'adresse, prépare l'écran, enregistre. Un échec est noté, pas fatal. */
  async function prendre(page, nom, adresse, preparer, { viewport = BUREAU, rechargement = false } = {}) {
    try {
      await page.setViewport(viewport);
      if (adresse && rechargement) {
        await page.goto(`${urlFront}${adresse}`, { waitUntil: 'networkidle0' });
        await attendreStable(page);
      } else if (adresse) {
        await naviguer(page, adresse);
      }
      if (preparer) await preparer(page);
      await page.screenshot({ path: join(DOSSIER_IMG, `${nom}.png`), type: 'png' });
      faites.push(nom);
    } catch (erreur) {
      echecs.push(`${nom} : ${erreur.message.slice(0, 160)}`);
    } finally {
      // Referme une éventuelle fenêtre de dialogue pour ne pas gêner la suite.
      await page.keyboard.press('Escape').catch(() => {});
      await pause(300);
    }
  }

  try {
    // Page de connexion (sans compte).
    const anonyme = await navigateur.newPage();
    await anonyme.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await prendre(anonyme, '01-connexion', '/login', null, { rechargement: true });
    await anonyme.close();

    // --- Commercial -------------------------------------------------------------------
    const f = await connecter(navigateur, urlFront, COMPTES.commercial);
    await prendre(f, '02-accueil', '/dashboard');
    await prendre(f, '03-prospects', '/crm/prospects');
    await prendre(f, '15-prospect-nouveau-haut', '/crm/prospects/nouveau');
    if (ids.prospectNegociation) {
      const fiche = `/crm/prospects/${ids.prospectNegociation}`;
      await prendre(f, '05-fiche-prospect', fiche);
      await prendre(f, '16-dialogue-relance', fiche, (p) => cliquer(p, 'Programmer une relance'));
      await prendre(f, '17-dialogue-etape', fiche, (p) => cliquer(p, 'Changer d’étape'));
      await prendre(f, '18-dialogue-note', fiche, (p) => cliquer(p, 'Ajouter une note'));
      await prendre(f, '19-dialogue-visite', fiche, async (p) => {
        await cliquer(p, 'Proposer un terrain');
      });
      await prendre(f, '21-dialogue-dossier', fiche, (p) => cliquer(p, 'Ouvrir un dossier'));
    }
    await prendre(f, '06-biens', '/terrains');
    if (ids.bien) await prendre(f, '07-fiche-bien', `/terrains/${ids.bien}`);
    await prendre(f, '08-ventes', '/ventes');
    if (ids.venteReservee) {
      const dossier = `/ventes/${ids.venteReservee}`;
      await prendre(f, '09-dossier-vente', dossier);
      await prendre(f, '20-dialogue-paiement', dossier, (p) => cliquer(p, 'Enregistrer un paiement'));
    }
    await prendre(f, 'com-01-mes-commissions', '/ventes/commissions');
    await prendre(f, 'com-02-nouveau-dossier-client', '/ventes', (p) => cliquer(p, 'Nouveau dossier'));
    await prendre(f, '10-taches', '/taches');
    await prendre(f, '11-agenda', '/agenda');
    await prendre(f, '12-notifications', '/notifications');
    await prendre(f, '13-documents', '/documents');
    await prendre(f, '14-securite', '/security');
    await prendre(f, '22-recherche-rapide', '/dashboard', async (p) => {
      await p.click('input[aria-label="Recherche globale"]');
      await p.type('input[aria-label="Recherche globale"]', 'Diouf', { delay: 40 });
      await pause(1500);
    });
    await prendre(f, 'web-01-demandes', '/contacts');
    await prendre(f, 'imm-01-mandats', '/mandats');
    await prendre(f, 'imm-03-proprietaires', '/proprietaires');
    await prendre(f, 'imm-06-nouveau-bien', '/terrains/nouveau');
    await prendre(f, 'imm-04-nouveau-mandat', '/mandats/nouveau');
    await prendre(f, 'imm-05-nouveau-proprietaire', '/proprietaires', (p) => cliquer(p, 'Nouveau propriétaire'));
    await f.close();

    // --- Téléphone : une session à part, ouverte directement en émulation mobile ----------
    const tel = await connecter(navigateur, urlFront, COMPTES.commercial, undefined, TELEPHONE);
    await prendre(tel, '23-telephone-accueil', null, null, { viewport: TELEPHONE });
    if (ids.prospectNegociation) await prendre(tel, '24-telephone-fiche', `/crm/prospects/${ids.prospectNegociation}`, null, { viewport: TELEPHONE });
    await tel.close();

    // --- Responsable commercial -------------------------------------------------------
    const r = await connecter(navigateur, urlFront, COMPTES.responsable);
    await prendre(r, 'resp-01-tableau-equipe', '/dashboard');
    await prendre(r, 'resp-02-objectifs', '/ventes/objectifs');
    await prendre(r, 'resp-05-fixer-objectif', '/ventes/objectifs', (p) => cliquer(p, 'Fixer un objectif'));
    await prendre(r, 'resp-03-prospects-equipe', '/crm/prospects');
    await prendre(r, 'resp-04-ventes-equipe', '/ventes');
    if (ids.mandat) await prendre(r, 'imm-02-fiche-mandat', `/mandats/${ids.mandat}`);
    await r.close();

    // --- Administrateur ---------------------------------------------------------------
    const a = await connecter(navigateur, urlFront, COMPTES.administrateur, secretTotp);
    await prendre(a, 'adm-01-utilisateurs', '/users');
    await prendre(a, 'adm-09-nouvel-utilisateur', '/users', (p) => cliquer(p, 'Nouvel utilisateur'));
    await prendre(a, 'adm-02-roles', '/roles');
    await prendre(a, 'adm-03-parametres', '/settings');
    await prendre(a, 'adm-04-parcours', '/workflows');
    await prendre(a, 'adm-05-identite', '/entreprise');
    await prendre(a, 'adm-06-regles-notification', '/notifications/regles');
    await prendre(a, 'adm-07-audit', '/audit');
    await prendre(a, 'adm-08-import-biens', '/terrains/import');
    await prendre(a, 'adm-11-pilotage-reglages', '/pilotage/reglages');
    await prendre(a, 'web-02-contenus', '/content');
    await a.close();
  } finally {
    await navigateur.close();
  }
  return { faites, echecs };
}
