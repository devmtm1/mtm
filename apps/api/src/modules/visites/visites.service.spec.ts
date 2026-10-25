import { VisitesService } from './visites.service';
import {
  ajouterJours,
  empreinteVisiteur,
  estUnRobot,
  formaterJour,
  jourDe,
  periodeValide,
} from './visites.utils';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const ID = '11111111-1111-4111-8111-111111111111';

describe('utilitaires de visites', () => {
  it('écarte les robots, les aperçus de liens et les agents vides', () => {
    expect(estUnRobot(CHROME)).toBe(false);
    expect(estUnRobot(undefined)).toBe(true);
    expect(
      estUnRobot(
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ),
    ).toBe(true);
    expect(
      estUnRobot(
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      ),
    ).toBe(true);
    expect(estUnRobot('WhatsApp/2.23.20 A')).toBe(true);
    expect(estUnRobot('curl/8.4.0 something')).toBe(true);
  });

  it('ramène la période à 7, 30 ou 90 jours', () => {
    expect(periodeValide('7')).toBe(7);
    expect(periodeValide(45)).toBe(30);
    expect(periodeValide('200')).toBe(90);
    expect(periodeValide('abc')).toBe(30);
    expect(periodeValide(undefined)).toBe(30);
  });

  it("produit une empreinte stable dans la journée, différente d'un jour à l'autre et sans l'adresse", () => {
    const jour = new Date('2026-10-25T10:00:00Z');
    const a = empreinteVisiteur('sel', jourDe(jour), '41.82.1.1', CHROME);
    expect(a).toBe(empreinteVisiteur('sel', jourDe(jour), '41.82.1.1', CHROME));
    expect(a).not.toBe(
      empreinteVisiteur(
        'sel',
        jourDe(ajouterJours(jour, 1)),
        '41.82.1.1',
        CHROME,
      ),
    );
    expect(a).not.toBe(
      empreinteVisiteur('sel', jourDe(jour), '41.82.1.2', CHROME),
    );
    expect(a).not.toContain('41.82');
    expect(a).toHaveLength(32);
  });
});

function creerPrisma() {
  return {
    empreinteVisiteur: { createMany: jest.fn(), deleteMany: jest.fn() },
    $executeRaw: jest.fn().mockResolvedValue(1),
    visiteQuotidienne: { groupBy: jest.fn(), aggregate: jest.fn() },
    contact: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    terrain: { findMany: jest.fn().mockResolvedValue([]) },
    bienLocatif: { findMany: jest.fn().mockResolvedValue([]) },
    showcaseItem: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('VisitesService : enregistrement', () => {
  let prisma: ReturnType<typeof creerPrisma>;
  let service: VisitesService;

  beforeEach(() => {
    prisma = creerPrisma();
    service = new VisitesService(prisma as never);
  });

  it('compte une vue et un nouveau visiteur la première fois', async () => {
    prisma.empreinteVisiteur.createMany.mockResolvedValue({ count: 1 });
    await service.enregistrer(
      { type: 'terrain', id: ID, source: 'google' },
      { adresse: '1.1.1.1', userAgent: CHROME },
    );
    expect(
      prisma.empreinteVisiteur.createMany.mock.calls[0][0].data[0].cle,
    ).toBe(`terrain:${ID}`);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    // valeurs : jour, type, cible, source, nouveau (x2 : insertion et mise à jour)
    const valeurs = prisma.$executeRaw.mock.calls[0].slice(1);
    expect(valeurs).toEqual(
      expect.arrayContaining(['terrain', ID, 'google', 1]),
    );
  });

  it('compte la vue mais pas un second visiteur quand la même personne revient', async () => {
    prisma.empreinteVisiteur.createMany.mockResolvedValue({ count: 0 });
    await service.enregistrer(
      { type: 'terrain', id: ID },
      { adresse: '1.1.1.1', userAgent: CHROME },
    );
    const valeurs = prisma.$executeRaw.mock.calls[0].slice(1);
    expect(valeurs).toEqual(expect.arrayContaining(['direct', 0]));
    expect(valeurs).not.toContain(1);
  });

  it('ignore les robots sans toucher à la base', async () => {
    await service.enregistrer(
      { type: 'site' },
      { adresse: '1.1.1.1', userAgent: 'Googlebot/2.1' },
    );
    expect(prisma.empreinteVisiteur.createMany).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('ignore une fiche sans identifiant', async () => {
    await service.enregistrer(
      { type: 'location' },
      { adresse: '1.1.1.1', userAgent: CHROME },
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('compte le site sans cible', async () => {
    prisma.empreinteVisiteur.createMany.mockResolvedValue({ count: 1 });
    await service.enregistrer(
      { type: 'site' },
      { adresse: '1.1.1.1', userAgent: CHROME },
    );
    expect(
      prisma.empreinteVisiteur.createMany.mock.calls[0][0].data[0].cle,
    ).toBe('site:');
    expect(prisma.$executeRaw.mock.calls[0].slice(1)).toEqual(
      expect.arrayContaining(['site', '']),
    );
  });

  it("n'échoue jamais, même si la base est en panne", async () => {
    prisma.empreinteVisiteur.createMany.mockRejectedValue(
      new Error('base indisponible'),
    );
    await expect(
      service.enregistrer(
        { type: 'site' },
        { adresse: '1.1.1.1', userAgent: CHROME },
      ),
    ).resolves.toBeUndefined();
  });

  it('supprime les empreintes de plus de deux jours', async () => {
    prisma.empreinteVisiteur.deleteMany.mockResolvedValue({ count: 4 });
    await service.purgerEmpreintes();
    const limite: Date =
      prisma.empreinteVisiteur.deleteMany.mock.calls[0][0].where.jour.lt;
    expect(formaterJour(limite)).toBe(
      formaterJour(ajouterJours(jourDe(new Date()), -2)),
    );
  });
});

describe('VisitesService : lecture', () => {
  let prisma: ReturnType<typeof creerPrisma>;
  let service: VisitesService;
  const aujourdhui = jourDe(new Date());

  beforeEach(() => {
    prisma = creerPrisma();
    service = new VisitesService(prisma as never);
    prisma.visiteQuotidienne.aggregate.mockResolvedValue({
      _sum: { vues: 0, visiteurs: 0 },
    });
    prisma.visiteQuotidienne.groupBy.mockResolvedValue([]);
  });

  it('complète les jours sans visite et trie les sources', async () => {
    prisma.visiteQuotidienne.groupBy.mockImplementation(
      ({ by }: { by: string[] }) => {
        if (by[0] === 'jour')
          return Promise.resolve([
            { jour: aujourdhui, _sum: { vues: 9, visiteurs: 4 } },
          ]);
        if (by[0] === 'source')
          return Promise.resolve([
            { source: 'direct', _sum: { visiteurs: 1 } },
            { source: 'google', _sum: { visiteurs: 3 } },
            { source: 'inconnue', _sum: { visiteurs: 5 } },
          ]);
        return Promise.resolve([]);
      },
    );
    const resume = await service.resume(7);
    expect(resume.serie).toHaveLength(7);
    expect(resume.serie[6]).toEqual({
      jour: formaterJour(aujourdhui),
      visites: 4,
      pagesVues: 9,
    });
    expect(resume.serie[0].visites).toBe(0);
    expect(resume.sources.map((s) => s.source)).toEqual(['google', 'direct']);
  });

  it('classe les fiches, joint leur titre et leurs demandes, et repère celles sans demande', async () => {
    const B = '22222222-2222-4222-8222-222222222222';
    prisma.visiteQuotidienne.groupBy.mockImplementation(
      ({ by, where }: { by: string[]; where: { type?: string } }) => {
        if (by[0] === 'cible' && where.type === 'terrain')
          return Promise.resolve([
            { cible: ID, _sum: { vues: 40, visiteurs: 25 } },
            { cible: B, _sum: { vues: 12, visiteurs: 9 } },
          ]);
        return Promise.resolve([]);
      },
    );
    prisma.terrain.findMany.mockResolvedValue([
      {
        id: ID,
        nom: 'Terrain Saly',
        referenceInterne: 'T-2026-0001',
        commune: 'Saly',
        region: 'Thiès',
      },
      {
        id: B,
        nom: 'Villa Almadies',
        referenceInterne: 'T-2026-0002',
        commune: null,
        region: null,
      },
    ]);
    prisma.contact.groupBy.mockResolvedValue([
      { terrainId: ID, _count: { _all: 2 } },
    ]);

    const resume = await service.resume(30);
    expect(resume.terrains[0]).toMatchObject({
      id: ID,
      titre: 'Terrain Saly',
      lieu: 'Saly, Thiès',
      vues: 40,
      visiteurs: 25,
      demandes: 2,
    });
    expect(resume.sansDemande.map((l) => l.id)).toEqual([B]);
  });

  it('ignore une fiche supprimée dans les classements', async () => {
    prisma.visiteQuotidienne.groupBy.mockImplementation(
      ({ by, where }: { by: string[]; where: { type?: string } }) =>
        Promise.resolve(
          by[0] === 'cible' && where.type === 'terrain'
            ? [{ cible: ID, _sum: { vues: 5, visiteurs: 3 } }]
            : [],
        ),
    );
    prisma.terrain.findMany.mockResolvedValue([]);
    const resume = await service.resume(30);
    expect(resume.terrains).toEqual([]);
  });

  it("détaille les consultations d'une fiche sur la période et sur 7 jours", async () => {
    prisma.visiteQuotidienne.groupBy.mockImplementation(
      ({ by }: { by: string[] }) =>
        Promise.resolve(
          by[0] === 'jour'
            ? [{ jour: aujourdhui, _sum: { vues: 6, visiteurs: 4 } }]
            : [{ source: 'whatsapp', _sum: { visiteurs: 4 } }],
        ),
    );
    prisma.visiteQuotidienne.aggregate.mockResolvedValue({
      _sum: { vues: 6, visiteurs: 4 },
    });
    prisma.contact.count.mockResolvedValue(1);

    const detail = await service.pourBien('terrain', ID, 30);
    expect(detail.serie).toHaveLength(30);
    expect(detail.totaux).toEqual({ vues: 6, visiteurs: 4, demandes: 1 });
    expect(detail.septJours).toEqual({ vues: 6, visiteurs: 4 });
    expect(detail.sources).toEqual([{ source: 'whatsapp', visiteurs: 4 }]);
    expect(prisma.contact.count.mock.calls[0][0].where.terrainId).toBe(ID);
  });
});
