import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn().mockResolvedValue(undefined);
vi.mock('../api/client', () => ({ apiClient: { post: (...args: unknown[]) => post(...args) } }));

import { classerSource, signalerVisite, sourceDeLaSession } from './suivi';

describe('classerSource', () => {
  const site = 'www.mtm-immobilier.com';

  it('reconnaît les moteurs de recherche et les réseaux sociaux', () => {
    expect(classerSource('https://www.google.com/', null, site)).toBe('google');
    expect(classerSource('https://www.google.sn/search?q=mtm', null, site)).toBe('google');
    expect(classerSource('https://l.facebook.com/l.php?u=x', null, site)).toBe('facebook');
    expect(classerSource('https://l.instagram.com/?u=x', null, site)).toBe('instagram');
    expect(classerSource('https://wa.me/221783662651', null, site)).toBe('whatsapp');
    expect(classerSource('https://www.tiktok.com/@mtm', null, site)).toBe('tiktok');
    expect(classerSource('https://www.youtube.com/watch?v=1', null, site)).toBe('youtube');
    expect(classerSource('https://annuaire.example/agences', null, site)).toBe('autre');
  });

  it('compte direct sans provenance ou depuis le site lui-même', () => {
    expect(classerSource('', null, site)).toBe('direct');
    expect(classerSource('https://www.mtm-immobilier.com/terrains', null, site)).toBe('direct');
    expect(classerSource('pas une adresse', null, site)).toBe('direct');
  });

  it('préfère utm_source (liens partagés sur WhatsApp, qui n’envoie aucune provenance)', () => {
    expect(classerSource('', 'whatsapp', site)).toBe('whatsapp');
    expect(classerSource('https://www.google.com/', 'facebook', site)).toBe('facebook');
    expect(classerSource('', 'newsletter', site)).toBe('autre');
  });
});

describe('signalerVisite', () => {
  beforeEach(() => {
    post.mockClear();
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.stubEnv('DEV', false);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
  });

  it('envoie la page vue avec la provenance de la session', () => {
    signalerVisite('terrain', 'abc');
    expect(post).toHaveBeenCalledWith('/visites', { type: 'terrain', id: 'abc', source: 'direct' });
  });

  it('garde la provenance de la première page pendant toute la visite', () => {
    window.history.replaceState({}, '', '/?utm_source=whatsapp');
    expect(sourceDeLaSession()).toBe('whatsapp');
    window.history.replaceState({}, '', '/terrains');
    expect(sourceDeLaSession()).toBe('whatsapp');
  });

  it('ne compte rien en développement ni avec « Ne pas me suivre »', () => {
    vi.stubEnv('DEV', true);
    signalerVisite('site');
    expect(post).not.toHaveBeenCalled();
    vi.stubEnv('DEV', false);
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    signalerVisite('site');
    expect(post).not.toHaveBeenCalled();
  });

  it('exclut le navigateur de l’équipe avec ?pas-de-suivi=1, jusqu’à ?pas-de-suivi=0', () => {
    window.history.replaceState({}, '', '/?pas-de-suivi=1');
    signalerVisite('site');
    expect(post).not.toHaveBeenCalled();
    window.history.replaceState({}, '', '/terrains');
    signalerVisite('site');
    expect(post).not.toHaveBeenCalled();
    window.history.replaceState({}, '', '/?pas-de-suivi=0');
    signalerVisite('site');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('ne remonte jamais d’erreur au visiteur', async () => {
    post.mockRejectedValueOnce(new Error('réseau'));
    expect(() => signalerVisite('site')).not.toThrow();
    await Promise.resolve();
  });
});
