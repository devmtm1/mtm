import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaMock: { $queryRaw: jest.Mock };
  let configMock: { get: jest.Mock };
  let cloudinaryMock: { isConfigured: jest.Mock };

  beforeEach(() => {
    prismaMock = { $queryRaw: jest.fn() };
    configMock = { get: jest.fn() };
    cloudinaryMock = { isConfigured: jest.fn() };
    service = new HealthService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
      cloudinaryMock as unknown as CloudinaryService,
    );
  });

  it('devrait retourner un statut "ok" et database "up" si la requête réussit', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(true);
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('devrait retourner un statut "error" et database "down" si la requête échoue', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(true);
    prismaMock.$queryRaw.mockRejectedValue(new Error('connexion refusée'));

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });

  it('devrait retourner un timestamp ISO valide', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(true);
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('devrait retourner un uptime positif', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(true);
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('devrait signaler auth "down" si JWT_ACCESS_SECRET est trop court', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'short';
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(true);
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.auth).toBe('down');
    expect(result.status).toBe('error');
  });

  it('devrait signaler storage "skipped" si Cloudinary n est pas configuré', async () => {
    configMock.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
      if (key === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return undefined;
    });
    cloudinaryMock.isConfigured.mockReturnValue(false);
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.storage).toBe('skipped');
    expect(result.status).toBe('ok');
  });
});
