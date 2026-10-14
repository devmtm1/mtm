/** Doublure de CloudinaryService : l'upload renvoie un identifiant sous le préfixe donné. */
export function createCloudinaryMock(publicId: string, resourceType = 'raw') {
  return {
    upload: jest.fn().mockResolvedValue({
      publicId,
      resourceType,
      secureUrl: `https://cloudinary.test/${publicId}`,
    }),
    url: jest.fn((id: string) => `https://cloudinary.test/${id}`),
    destroy: jest.fn(),
    downloadJpeg: jest.fn().mockResolvedValue(null),
    videoPosterUrl: jest.fn(
      (id: string) => `https://cloudinary.test/${id}.jpg`,
    ),
  };
}

/**
 * Stockage de test par défaut des parcours e2e : chaque envoi reçoit un
 * identifiant unique et son type (image, vidéo, autre) selon le fichier, comme
 * le ferait le vrai service, sans rien envoyer. Les identifiants Cloudinary du
 * poste (.env) ne doivent jamais servir à un test.
 */
export function createStockageDeTest() {
  const mock = createCloudinaryMock('mtm-e2e/defaut');
  mock.upload.mockImplementation(
    (file: { mimetype?: string }, dossier: string) => {
      const type = file.mimetype ?? '';
      const resourceType = type.startsWith('image/')
        ? 'image'
        : type.startsWith('video/')
          ? 'video'
          : 'raw';
      const publicId = `mtm-e2e/${dossier}/${Math.random().toString(36).slice(2)}`;
      return Promise.resolve({
        publicId,
        resourceType,
        secureUrl: `https://cloudinary.test/${publicId}`,
      });
    },
  );
  return { ...mock, isConfigured: jest.fn().mockReturnValue(false) };
}
