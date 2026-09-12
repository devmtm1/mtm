import { BadRequestException } from '@nestjs/common';
import { createTerrainsTestContext } from './terrains.test-support';

describe('TerrainsAssetsService', () => {
  const internalUser = { roles: ['commercial'], permissions: [] };

  let prismaMock: ReturnType<typeof createTerrainsTestContext>['prismaMock'];
  let cloudinaryMock: ReturnType<
    typeof createTerrainsTestContext
  >['cloudinaryMock'];
  let assets: ReturnType<typeof createTerrainsTestContext>['assets'];

  beforeEach(() => {
    ({ prismaMock, cloudinaryMock, assets } = createTerrainsTestContext());
  });

  it('rattache un média au terrain existant', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });
    prismaMock.terrainMedia.create.mockResolvedValue({
      id: 'm1',
      terrainId: 't1',
    });

    const result = await assets.addMedia(
      't1',
      { type: 'photo', title: 'Vue principale' },
      {
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimetype: 'image/jpeg',
        size: 3,
      } as Express.Multer.File,
      internalUser,
    );

    expect(result).toEqual({ id: 'm1', terrainId: 't1' });
    expect(prismaMock.terrainMedia.create).toHaveBeenCalledWith({
      data: {
        terrainId: 't1',
        type: 'photo',
        title: 'Vue principale',
        isPublic: false,
        storageKey: 'terrains/t1/image',
        resourceType: 'image',
      },
    });
  });

  it('refuse un média dépassant la limite de 10 Mo', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });

    await expect(
      assets.addMedia(
        't1',
        { type: 'photo' },
        {
          buffer: Buffer.from([0xff, 0xd8, 0xff]),
          mimetype: 'image/jpeg',
          size: 10 * 1024 * 1024 + 1,
        } as Express.Multer.File,
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it('refuse la publication d’un média sans permission de publication', async () => {
    prismaMock.terrain.findFirst.mockResolvedValue({ id: 't1' });

    await expect(
      assets.addMedia(
        't1',
        { type: 'photo', isPublic: true },
        {
          buffer: Buffer.from([0xff, 0xd8, 0xff]),
          mimetype: 'image/jpeg',
          size: 3,
        } as Express.Multer.File,
        internalUser,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});
