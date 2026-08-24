import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaMock: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prismaMock = { $queryRaw: jest.fn() };
    service = new HealthService(prismaMock as unknown as PrismaService);
  });

  it('devrait retourner un statut "ok" et database "up" si la requête réussit', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('devrait retourner un statut "error" et database "down" si la requête échoue', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connexion refusée'));

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });

  it('devrait retourner un timestamp ISO valide', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('devrait retourner un uptime positif', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });
});
