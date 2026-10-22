// Script jetable : mesure les sauts de mise en page (avec les éléments responsables) et les actions.
import { writeFileSync } from 'node:fs';
import { authenticator } from 'otplib';
import puppeteer from 'puppeteer-core';
import { creerUtilisateurs, preparerAdministrateur } from './donnees.mjs';
import { demarrer } from './environnement.mjs';
import { peuplerDonnees } from './jeu-donnees.mjs';
import { peuplerSuite } from './jeu-donnees-suite.mjs';
import { COMPTES, MOT_DE_PASSE } from './comptes.mjs';

const SORTIE = process.env.AUDIT_SORTIE;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const liste = (x) => (Array.isArray(x) ? x : (x?.items ?? x?.data ?? []));
const RESEAU = { download: 250_000, upload: 90_000, latency: 250 };
const ROUTES = (process.env.AUDIT_ROUTES ?? '/audit,/crm/prospects,/demarches/missions,/terrains,/rapports,/mandats,/ventes,/proprietaires,/locatif/biens,/users').split(',');

const env = await demarrer({ reconstruireFront: true });
let code = 0;
const rapport = { routes: [], actions: [], titres: [] };
try {
  const { api, secretTotp } = await preparerAdministrateur(env.urlApi);
  const clients = await creerUtilisateurs(env.urlApi, api);
  const donnees = await peuplerDonnees({ admin: api, clients });
  await peuplerSuite({ admin: api, clients, donnees });

  const navigateur = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
  const ctx = await navigateur.createBrowserContext();
  const page = await ctx.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1366, height: 820, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0; window.__sources = [];
    const decrire = (n) => { if (!n || !n.tagName) return '?'; const c = (typeof n.className === 'string' ? n.className : '').split(' ').filter(Boolean).slice(0, 2).join('.'); return n.tagName.toLowerCase() + (c ? '.' + c : ''); };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; for (const s of e.sources ?? []) window.__sources.push({ v: Number(e.value.toFixed(3)), n: decrire(s.node), de: Math.round(s.previousRect.y) + '+' + Math.round(s.previousRect.height), vers: Math.round(s.currentRect.y) + '+' + Math.round(s.currentRect.height) }); } }).observe({ type: 'layout-shift', buffered: true }); } catch {}
    window.__sq = { episodes: 0, ms: 0, depuis: null };
    const verifier = () => { const present = document.querySelector('.skeleton') !== null; if (present && window.__sq.depuis === null) { window.__sq.depuis = performance.now(); window.__sq.episodes += 1; } if (!present && window.__sq.depuis !== null) { window.__sq.ms += performance.now() - window.__sq.depuis; window.__sq.depuis = null; } };
    window.addEventListener('DOMContentLoaded', () => new MutationObserver(verifier).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }));
    window.__conteneur = () => { let m = null; for (const el of document.querySelectorAll('*')) { const s = getComputedStyle(el); if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 40 && (!m || el.clientHeight * el.clientWidth > m.clientHeight * m.clientWidth)) m = el; } return m; };
  });

  await page.goto(`${env.urlFront}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', COMPTES.administrateur.email);
  await page.type('input[type="password"]', MOT_DE_PASSE);
  await page.click('button[type="submit"]');
  await page.waitForSelector('input[formcontrolname="code"]', { timeout: 30000 });
  await page.type('input[formcontrolname="code"]', authenticator.generate(secretTotp));
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith('/dashboard'), { timeout: 60000 });
  await page.waitForNetworkIdle({ idleTime: 1500, timeout: 60000 }).catch(() => {});
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: RESEAU.download, uploadThroughput: RESEAU.upload, latency: RESEAU.latency });

  const attendreStable = async (max = 20000) => { const t0 = Date.now(); await pause(150); while (Date.now() - t0 < max) { const sq = await page.evaluate(() => document.querySelector('.skeleton') !== null); if (!sq) break; await pause(40); } await page.waitForNetworkIdle({ idleTime: 400, timeout: max }).catch(() => {}); };
  const aller = (route) => page.evaluate((p) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }, route);

  for (const route of ROUTES) {
    await aller('/dashboard'); await attendreStable();
    await page.evaluate(() => { window.__cls = 0; window.__sources = []; });
    await aller(route); await attendreStable(25000); await pause(400);
    const m = await page.evaluate(() => ({ cls: Number(window.__cls.toFixed(3)), sources: [...window.__sources].sort((a, b) => b.v - a.v).slice(0, 6), titre: document.title }));
    rapport.routes.push({ route, ...m });
    console.log(`CLS ${String(m.cls).padStart(5)} | ${route} | titre « ${m.titre} »`);
    for (const s of m.sources.slice(0, 4)) console.log(`        ${s.v} ${s.n} ${s.de} → ${s.vers}`);
  }

  async function tester(nom, route, motif, defiler = true) {
    try {
      await aller(route); await attendreStable(20000);
      const avant = await page.evaluate((d) => { const c = window.__conteneur?.(); if (c && d) c.scrollTop = 500; return c ? Math.round(c.scrollTop) : null; }, defiler);
      await pause(200);
      await page.evaluate(() => { window.__sq = { episodes: 0, ms: 0, depuis: null }; window.__cls = 0; window.__sources = []; });
      const t0 = Date.now();
      const cliqué = await page.evaluate((re) => { const r = new RegExp(re, 'i'); const b = [...document.querySelectorAll('button, [role=button]')].find((x) => r.test(x.getAttribute('aria-label') || '') || r.test((x.textContent || '').trim())); if (b) { b.click(); return (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40); } return null; }, motif);
      await pause(200); await attendreStable(15000);
      const fin = await page.evaluate(() => { const c = window.__conteneur?.(); return { top: c ? Math.round(c.scrollTop) : null, sqMs: Math.round(window.__sq.ms), sqN: window.__sq.episodes, cls: Number(window.__cls.toFixed(3)), barre: !!document.querySelector('.barre') }; });
      rapport.actions.push({ nom, cliqué, ...fin, scrollAvant: avant });
      console.log(`ACTION ${nom}: cliqué=${cliqué} | squelette ${fin.sqMs} ms (${fin.sqN}×) | défilement ${avant}→${fin.top} | CLS ${fin.cls}`);
    } catch (e) { console.log('ACTION', nom, 'ERREUR', String(e).slice(0, 120)); }
  }
  await tester('Contenus du site : masquer un texte', '/content', '^Masquer');
  await tester('Équipe du site : publier', '/content/equipe', '^Publier|^Masquer');
  await tester('Tâches : onglet « Toute l’équipe »', '/taches', '^Toute');
  await tester('Biens : filtre statut Disponible', '/terrains', 'Disponible', false);
  await tester('Biens : filtre nature Terrain', '/terrains', '^Terrain', false);

  // Barre de progression visible pendant un changement d'écran lent ?
  await aller('/dashboard'); await attendreStable();
  await aller('/ventes');
  await pause(450);
  const barre = await page.evaluate(() => !!document.querySelector('.barre.is-visible'));
  console.log('BARRE visible 450 ms après le clic :', barre);
  rapport.barreVisible = barre;
  await navigateur.close();
  if (SORTIE) writeFileSync(SORTIE, JSON.stringify(rapport, null, 1));
} catch (e) { console.error(e); code = 1; } finally { await env.arreter(); }
process.exit(code);
