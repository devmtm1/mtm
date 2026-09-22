import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';

/**
 * Construction des liens publics : le format et la compression sont laissés
 * à Cloudinary pour les images (gros gain de poids), mais jamais imposés à
 * une vidéo ou à un document.
 */
describe('CloudinaryService — liens publics', () => {
  const config = {
    get: (cle: string) =>
      ({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'cle',
        CLOUDINARY_API_SECRET: 'secret',
      })[cle],
  } as unknown as ConfigService;

  const service = new CloudinaryService(config);

  it('demande le format et la qualité automatiques pour une image', () => {
    const url = service.url('mtm-prod/terrains/t1/media/photo', 'image', true);

    expect(url).toContain('f_auto');
    expect(url).toContain('q_auto');
    expect(url.startsWith('https://')).toBe(true);
  });

  it('laisse une vidéo intacte', () => {
    const url = service.url('mtm-prod/terrains/t1/media/visite', 'video', true);

    expect(url).not.toContain('f_auto');
    expect(url).not.toContain('q_auto');
  });
});
