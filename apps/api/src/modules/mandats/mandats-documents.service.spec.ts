import { BadRequestException } from '@nestjs/common';
import { createMandatsTestContext } from './mandats.test-support';

describe('MandatsDocumentsService', () => {
  const internalUser = { id: 'u1', roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createMandatsTestContext>['prismaMock'];
  let cloudinaryMock: ReturnType<
    typeof createMandatsTestContext
  >['cloudinaryMock'];
  let documents: ReturnType<typeof createMandatsTestContext>['documents'];

  beforeEach(() => {
    ({ prismaMock, cloudinaryMock, documents } = createMandatsTestContext());
  });

  it('refuse un type de document invalide', async () => {
    prismaMock.mandat.findFirst.mockResolvedValue({ id: 'm1' });
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['contrat', 'avenant'],
    });

    await expect(
      documents.addDocument(
        'm1',
        { type: 'photo' },
        {
          buffer: Buffer.from('%PDF-1.7'),
          mimetype: 'application/pdf',
          size: 1024,
        } as Express.Multer.File,
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});
