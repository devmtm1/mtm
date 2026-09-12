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
  };
}
