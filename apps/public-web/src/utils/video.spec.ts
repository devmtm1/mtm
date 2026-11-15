import { describe, expect, it } from 'vitest';
import { adapterVignette, adresseVignetteYoutube, analyserVideo } from './video';

describe('analyserVideo', () => {
  it('reconnaît YouTube', () => {
    expect(analyserVideo('https://youtu.be/dQw4w9WgXcQ')).toEqual({ type: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît Vimeo, sous ses différentes formes', () => {
    expect(analyserVideo('https://vimeo.com/123456789')).toEqual({ type: 'vimeo', id: '123456789' });
    expect(analyserVideo('https://vimeo.com/channels/staff/123456789')).toEqual({ type: 'vimeo', id: '123456789' });
    expect(analyserVideo('https://player.vimeo.com/video/123456789?h=abc')).toEqual({ type: 'vimeo', id: '123456789' });
  });

  it('reconnaît un fichier vidéo à une adresse https, dont Cloudinary', () => {
    expect(analyserVideo('https://exemple.com/media/presentation.mp4')).toEqual({ type: 'fichier', url: 'https://exemple.com/media/presentation.mp4' });
    expect(analyserVideo('https://exemple.com/a.webm?v=2')).toEqual({ type: 'fichier', url: 'https://exemple.com/a.webm?v=2' });
    expect(analyserVideo('https://res.cloudinary.com/demo/video/upload/v1/mtm/presentation')?.type).toBe('fichier');
  });

  it('refuse le reste : fichier non sécurisé, page web quelconque, valeur vide', () => {
    expect(analyserVideo('http://exemple.com/a.mp4')).toBeNull();
    expect(analyserVideo('https://exemple.com/page')).toBeNull();
    expect(analyserVideo('https://vimeo.com/about')).toBeNull();
    expect(analyserVideo('')).toBeNull();
    expect(analyserVideo(undefined)).toBeNull();
    expect(analyserVideo('pas une adresse')).toBeNull();
  });
});

describe('vignettes YouTube', () => {
  it('demande directement la taille utile, sans passer par la haute définition', () => {
    expect(adresseVignetteYoutube('abc123', 'petite')).toBe('https://i.ytimg.com/vi/abc123/mqdefault.jpg');
    expect(adresseVignetteYoutube('abc123', 'moyenne')).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    expect(adresseVignetteYoutube('abc123', 'grande')).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
  });

  it('retouche une adresse YouTube déjà enregistrée', () => {
    expect(adapterVignette('https://i.ytimg.com/vi/abc123/maxresdefault.jpg', 'petite')).toBe('https://i.ytimg.com/vi/abc123/mqdefault.jpg');
    expect(adapterVignette('https://img.youtube.com/vi/abc123/hqdefault.jpg', 'grande')).toBe('https://img.youtube.com/vi/abc123/maxresdefault.jpg');
  });

  it('laisse intacte une image qui n’est pas une vignette YouTube', () => {
    const cloudinary = 'https://res.cloudinary.com/mtm/video/upload/v1/poster.jpg';
    expect(adapterVignette(cloudinary, 'petite')).toBe(cloudinary);
  });
});
