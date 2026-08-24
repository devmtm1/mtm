import { ConflictException, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../database/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prismaMock: {
    systemSetting: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const sensitiveSetting = {
    id: 's1',
    key: 'finance.taux_commission',
    value: 5,
    description: 'Taux de commission par défaut',
    isSensitive: true,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const publicSetting = {
    id: 's2',
    key: 'app.name',
    value: 'MTM Immobilier',
    description: null,
    isSensitive: false,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      systemSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new SettingsService(prismaMock as unknown as PrismaService);
  });

  describe('findAll — masquage des valeurs sensibles', () => {
    it('masque la valeur d’un paramètre sensible si canViewSensitive=false', async () => {
      prismaMock.systemSetting.findMany.mockResolvedValue([
        sensitiveSetting,
        publicSetting,
      ]);

      const result = await service.findAll(false);

      const sensitive = result.find((s) => s.key === 'finance.taux_commission');
      expect(sensitive?.value).toBeUndefined();
      expect(sensitive?.redacted).toBe(true);
    });

    it('ne masque pas si canViewSensitive=true', async () => {
      prismaMock.systemSetting.findMany.mockResolvedValue([sensitiveSetting]);

      const result = await service.findAll(true);

      expect(result[0].value).toBe(5);
      expect(result[0].redacted).toBe(false);
    });

    it('ne masque jamais un paramètre non sensible', async () => {
      prismaMock.systemSetting.findMany.mockResolvedValue([publicSetting]);

      const result = await service.findAll(false);

      expect(result[0].value).toBe('MTM Immobilier');
      expect(result[0].redacted).toBe(false);
    });
  });

  describe('findByKey', () => {
    it('lève NotFoundException si la clé est inconnue', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      await expect(service.findByKey('inconnu', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('rejette si la clé existe déjà', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(publicSetting);

      await expect(
        service.create({ key: 'app.name', value: 'x' }, 'admin-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('crée le paramètre si la clé est disponible', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);
      prismaMock.systemSetting.create.mockResolvedValue(publicSetting);

      const result = await service.create(
        { key: 'app.name', value: 'MTM Immobilier' },
        'admin-id',
      );

      expect(result.key).toBe('app.name');
      expect(prismaMock.systemSetting.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('lève NotFoundException si la clé est inconnue', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inconnu', 'x', undefined, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isSensitive', () => {
    it('retourne false pour une clé inconnue (fail-safe)', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.isSensitive('inconnu');

      expect(result).toBe(false);
    });

    it('retourne le flag isSensitive réel', async () => {
      prismaMock.systemSetting.findUnique.mockResolvedValue({
        isSensitive: true,
      });

      const result = await service.isSensitive('finance.taux_commission');

      expect(result).toBe(true);
    });
  });
});
