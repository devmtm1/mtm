import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { TerrainsAccessService } from './terrains-access.service';
import {
  ProgrammesService,
  numeroDeLot,
  resumeLots,
} from './programmes.service';

const user = { id: 'u1', roles: ['commercial'], permissions: [] };

function contexte() {
  const prismaMock = createPrismaMock();
  prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  prismaMock.mandatLot.findMany.mockResolvedValue([]);
  const prisma = prismaMock as unknown as PrismaService;
  const service = new ProgrammesService(
    prisma,
    new SettingsService(prisma),
    new TerrainsAccessService(prisma),
  );
  return { prismaMock, service };
}

const programme = {
  id: 'p1',
  nom: 'Les Almadies',
  archiveLe: null,
  proprietaireId: 'o1',
  statutJuridique: 'Titre foncier',
  typeDocumentFoncier: null,
  niveauVerification: 'Vérifié',
  region: 'Dakar',
  commune: 'Ngor',
  localisationDetail: null,
  prixLot: 12_000_000,
  modalitePaiement: 'Cash',
  dureeMoratoireMois: null,
  acompteMontant: null,
  produitDirect: false,
  commissionLot: 500_000,
  margeLot: null,
};

const direction = { id: 'd1', roles: ['direction'], permissions: [] };

describe('numeroDeLot', () => {
  it('complète le rang à deux chiffres au moins', () => {
    expect(numeroDeLot('A-', 1, 2)).toBe('A-01');
    expect(numeroDeLot('A-', 30, 2)).toBe('A-30');
    expect(numeroDeLot('', 7, 3)).toBe('007');
  });
});

describe('resumeLots', () => {
  it('compte les lots par statut', () => {
    expect(
      resumeLots([
        { statutCommercial: 'Disponible', _count: { _all: 12 } },
        { statutCommercial: 'Vendu', _count: { _all: 5 } },
        { statutCommercial: 'Réservé', _count: { _all: 3 } },
      ]),
    ).toEqual({
      nombreLots: 20,
      lotsDisponibles: 12,
      lotsReserves: 3,
      lotsVendus: 5,
      lotsBrouillon: 0,
    });
  });
});

describe('ProgrammesService.genererLots', () => {
  it('crée les lots en série, avec les conditions du programme et des matricules qui se suivent', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.findMany
      .mockResolvedValueOnce([]) // numéros déjà pris
      .mockResolvedValueOnce([
        { referenceInterne: `T-${new Date().getFullYear()}-0007` },
      ]); // matricules existants
    prismaMock.terrain.createMany.mockResolvedValue({ count: 3 });

    const res = await service.genererLots(
      'p1',
      { nombre: 3, prefixe: 'A-', superficie: 300 },
      user,
    );

    expect(res).toEqual({ crees: 3, premier: 'A-01', dernier: 'A-03' });
    const { data } = prismaMock.terrain.createMany.mock.calls[0][0];
    expect(data).toHaveLength(3);
    const annee = new Date().getFullYear();
    expect(
      data.map((l: { referenceInterne: string }) => l.referenceInterne),
    ).toEqual([`T-${annee}-0008`, `T-${annee}-0009`, `T-${annee}-0010`]);
    expect(data[0]).toMatchObject({
      numeroLot: 'A-01',
      nom: 'Les Almadies — Lot A-01',
      programmeId: 'p1',
      proprietaireId: 'o1',
      superficie: 300,
      prixPublic: 12_000_000,
      modalitePaiement: 'Cash',
      statutCommercial: 'Brouillon',
      commercialResponsableId: 'u1',
      // Ce que la comptabilité attend de chaque lot vendu : copié du programme.
      commission: 500_000,
      marge: null,
      produitDirect: false,
    });
  });

  it('prend le prix et les conditions de la catégorie, et garde ceux du programme pour le reste', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.categorieLot.findFirst.mockResolvedValue({
      id: 'c1',
      prixPublic: 18_000_000,
      modalitePaiement: null,
      dureeMoratoireMois: 6,
      acompteMontant: null,
    });
    prismaMock.terrain.findMany.mockResolvedValue([]);
    prismaMock.terrain.createMany.mockResolvedValue({ count: 1 });

    await service.genererLots(
      'p1',
      { nombre: 1, prefixe: 'F-', categorieLotId: 'c1' },
      user,
    );

    const { data } = prismaMock.terrain.createMany.mock.calls[0][0];
    expect(data[0]).toMatchObject({
      categorieLotId: 'c1',
      prixPublic: 18_000_000,
      modalitePaiement: 'Cash',
      dureeMoratoireMois: 6,
    });
  });

  it('refuse de recréer des numéros qui existent déjà, sans rien créer', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.findMany.mockResolvedValue([{ numeroLot: 'A-02' }]);

    await expect(
      service.genererLots('p1', { nombre: 3, prefixe: 'A-' }, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.terrain.createMany).not.toHaveBeenCalled();
  });
});

describe('ProgrammesService.appliquerCategorie', () => {
  it('ne touche jamais un lot réservé ou vendu', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.categorieLot.findUnique.mockResolvedValue({
      id: 'c1',
      prixPublic: 15_000_000,
      modalitePaiement: 'Cash',
      dureeMoratoireMois: null,
      acompteMontant: null,
      commission: null,
      marge: null,
      programme,
    });
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 4 });

    expect(await service.appliquerCategorie('c1')).toEqual({
      lotsMisAJour: 4,
    });
    expect(prismaMock.terrain.updateMany.mock.calls[0][0].where).toEqual({
      categorieLotId: 'c1',
      statutCommercial: { notIn: ['Réservé', 'Vendu'] },
    });
  });

  it('copie aussi ce que la comptabilité attend : la commission de la catégorie, sinon celle du programme', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.categorieLot.findUnique.mockResolvedValue({
      id: 'c1',
      prixPublic: 15_000_000,
      modalitePaiement: null,
      dureeMoratoireMois: null,
      acompteMontant: null,
      commission: 800_000,
      marge: null,
      programme,
    });
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 1 });
    await service.appliquerCategorie('c1');
    expect(prismaMock.terrain.updateMany.mock.calls[0][0].data).toMatchObject({
      commission: 800_000,
      proprietaireId: 'o1',
      produitDirect: false,
    });

    prismaMock.categorieLot.findUnique.mockResolvedValue({
      id: 'c2',
      prixPublic: null,
      modalitePaiement: null,
      dureeMoratoireMois: null,
      acompteMontant: null,
      commission: null,
      marge: null,
      programme,
    });
    await service.appliquerCategorie('c2');
    expect(prismaMock.terrain.updateMany.mock.calls[1][0].data).toMatchObject({
      commission: 500_000,
      prixPublic: 12_000_000,
    });
  });
});

describe('ProgrammesService.appliquerProgramme', () => {
  it('recopie le programme sur les lots sans catégorie, et chaque catégorie sur les siens — jamais sur un lot réservé ou vendu', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({
      ...programme,
      categories: [
        {
          id: 'c1',
          prixPublic: 15_000_000,
          modalitePaiement: null,
          dureeMoratoireMois: null,
          acompteMontant: null,
          commission: 900_000,
          marge: null,
        },
      ],
    });
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 3 });
    expect(await service.appliquerProgramme('p1')).toEqual({
      lotsMisAJour: 6,
    });
    const [sansCategorie, avecCategorie] =
      prismaMock.terrain.updateMany.mock.calls.map((c) => c[0]);
    expect(sansCategorie.where).toEqual({
      programmeId: 'p1',
      categorieLotId: null,
      statutCommercial: { notIn: ['Réservé', 'Vendu'] },
    });
    expect(sansCategorie.data).toMatchObject({ commission: 500_000 });
    expect(avecCategorie.where.categorieLotId).toBe('c1');
    expect(avecCategorie.data).toMatchObject({
      commission: 900_000,
      prixPublic: 15_000_000,
    });
  });
});

describe('ProgrammesService.changerStatut — la comptabilité d’abord', () => {
  const lot = (surcharge = {}) => ({
    numeroLot: 'A-01',
    proprietaireId: 'o1',
    produitDirect: false,
    commission: null,
    marge: null,
    ...surcharge,
  });

  it('refuse de mettre en vente un lot confié sans commission : il rapporterait zéro à la comptabilité', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.terrain.findMany.mockResolvedValue([
      lot(),
      lot({ numeroLot: 'A-02' }),
    ]);
    await expect(
      service.changerStatut('p1', { lotIds: ['a', 'b'], statut: 'Disponible' }),
    ).rejects.toThrow(/2 lots n’ont pas de commission de MTM \(A-01, A-02\)/);
    expect(prismaMock.terrain.updateMany).not.toHaveBeenCalled();
  });

  it('refuse un lot en propre sans marge, et demande la marge — pas la commission', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.terrain.findMany.mockResolvedValue([
      lot({ proprietaireId: null }),
    ]);
    await expect(
      service.changerStatut('p1', { lotIds: ['a'], statut: 'Disponible' }),
    ).rejects.toThrow(/1 lot n’a pas de marge de MTM/);
  });

  it('met en vente un lot complet, et ne vérifie rien pour un retrait ou une suspension', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.terrain.findMany.mockResolvedValue([
      lot({ commission: 500_000 }),
    ]);
    prismaMock.terrain.updateMany.mockResolvedValue({ count: 1 });
    await service.changerStatut('p1', { lotIds: ['a'], statut: 'Disponible' });
    expect(prismaMock.terrain.updateMany).toHaveBeenCalledTimes(1);

    prismaMock.terrain.findMany.mockClear();
    await service.changerStatut('p1', { lotIds: ['a'], statut: 'Suspendu' });
    expect(prismaMock.terrain.findMany).not.toHaveBeenCalled();
  });
});

describe('ProgrammesService.update — données sensibles', () => {
  const actuel = { ...programme, justification: undefined };

  it('exige une justification pour changer la commission d’un programme qui a des lots', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(actuel);
    prismaMock.terrain.count.mockResolvedValue(12);
    await expect(
      service.update('p1', { commissionLot: 600_000 }, direction),
    ).rejects.toThrow(/justification est obligatoire/);
    await service.update(
      'p1',
      { commissionLot: 600_000, justification: 'Avenant au mandat' },
      direction,
    );
    const { data } = prismaMock.programmeLotissement.update.mock.calls[0][0];
    expect(data).toEqual({ commissionLot: 600_000 });
  });

  it('ne demande rien quand le formulaire renvoie des valeurs inchangées', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(actuel);
    prismaMock.terrain.count.mockResolvedValue(12);
    await service.update(
      'p1',
      { nom: 'Nouveau nom', commissionLot: 500_000, produitDirect: false },
      direction,
    );
    expect(prismaMock.programmeLotissement.update).toHaveBeenCalled();
  });

  it('n’exige pas de justification tant que le programme n’a aucun lot', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(actuel);
    prismaMock.terrain.count.mockResolvedValue(0);
    await service.update('p1', { commissionLot: 700_000 }, direction);
    expect(prismaMock.programmeLotissement.update).toHaveBeenCalled();
  });

  it('refuse à un commercial de saisir la commission, la marge ou le produit direct', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(actuel);
    prismaMock.terrain.count.mockResolvedValue(0);
    await expect(
      service.update('p1', { commissionLot: 1 }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create(
        {
          nom: 'X',
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Vérifié',
          margeLot: 100,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.creerCategorie('p1', { nom: 'Angle', commission: 10 }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ProgrammesService.findOne — montants internes', () => {
  const brut = {
    ...programme,
    proprietaire: null,
    categories: [
      {
        id: 'c1',
        nom: 'Angle',
        prixPublic: 15_000_000,
        commission: 800_000,
        marge: null,
      },
    ],
    lots: [
      {
        id: 'l1',
        numeroLot: 'A-01',
        statutCommercial: 'Brouillon',
        prixPublic: 12_000_000,
        proprietaireId: 'o1',
        produitDirect: false,
        commission: null,
        marge: null,
      },
    ],
  };

  it('cache la commission et la marge à un commercial, les montre à la direction', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(brut);
    const vueCommercial = await service.findOne('p1', user);
    expect(vueCommercial.commissionLot).toBeNull();
    expect(vueCommercial.categories[0].commission).toBeNull();
    const vueDirection = await service.findOne('p1', direction);
    expect(Number(vueDirection.commissionLot)).toBe(500_000);
    expect(Number(vueDirection.categories[0].commission)).toBe(800_000);
  });

  it('signale les lots qui ne sont pas prêts pour la comptabilité, sans jamais exposer leurs montants', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(brut);
    const vue = await service.findOne('p1', user);
    expect(vue.lotsSansCompta).toBe(1);
    expect(vue.lots[0].comptaComplete).toBe(false);
    expect(vue.lots[0]).not.toHaveProperty('commission');
    expect(vue.lots[0]).not.toHaveProperty('marge');
  });
});

describe('ProgrammesService.supprimerCategorie', () => {
  it('refuse de supprimer une catégorie qui contient des lots', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.terrain.count.mockResolvedValue(3);
    await expect(service.supprimerCategorie('c1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prismaMock.categorieLot.delete).not.toHaveBeenCalled();
  });
});

describe('ProgrammesService.archiver', () => {
  it('refuse d’archiver tant qu’un lot est réservé', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.count.mockResolvedValue(2);
    await expect(service.archiver('p1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prismaMock.programmeLotissement.update).not.toHaveBeenCalled();
  });

  it('archive quand plus aucune vente n’est en cours', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.count.mockResolvedValue(0);
    prismaMock.programmeLotissement.update.mockResolvedValue({});
    await service.archiver('p1');
    expect(
      prismaMock.programmeLotissement.update.mock.calls[0][0].data.archiveLe,
    ).toBeInstanceOf(Date);
  });
});

describe('ProgrammesService.findPublic', () => {
  it('résume chaque programme par ses lots libres : nombre et fourchette de prix', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findMany.mockResolvedValue([
      { id: 'p1', nom: 'Les Almadies' },
    ]);
    prismaMock.terrain.findMany.mockResolvedValue([
      { programmeId: 'p1', prixPublic: 12_000_000 },
      { programmeId: 'p1', prixPublic: 18_000_000 },
      { programmeId: 'p1', prixPublic: null },
    ]);
    const [p] = await service.findPublic();
    expect(p).toMatchObject({
      lotsDisponibles: 3,
      prixMin: 12_000_000,
      prixMax: 18_000_000,
    });
    // Seuls les programmes qui ont encore un lot disponible sont listés.
    expect(
      prismaMock.programmeLotissement.findMany.mock.calls[0][0].where,
    ).toMatchObject({
      archiveLe: null,
      lots: { some: { statutCommercial: 'Disponible' } },
    });
  });
});

describe('ProgrammesService.genererLots et mandats', () => {
  it('rattache les nouveaux lots aux mandats qui portent déjà le programme', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.findMany
      .mockResolvedValueOnce([]) // numéros déjà pris
      .mockResolvedValueOnce([]) // matricules existants
      .mockResolvedValueOnce([{ id: 'n1' }, { id: 'n2' }]); // lots créés
    prismaMock.terrain.createMany.mockResolvedValue({ count: 2 });
    prismaMock.mandatLot.findMany.mockResolvedValue([{ mandatId: 'm1' }]);
    prismaMock.mandatLot.createMany.mockResolvedValue({ count: 2 });

    await service.genererLots('p1', { nombre: 2, prefixe: 'C-' }, user);

    expect(prismaMock.mandatLot.createMany.mock.calls[0][0].data).toEqual([
      { mandatId: 'm1', terrainId: 'n1' },
      { mandatId: 'm1', terrainId: 'n2' },
    ]);
  });

  it('ne touche à aucun mandat quand le programme n’en porte pas', async () => {
    const { prismaMock, service } = contexte();
    prismaMock.programmeLotissement.findUnique.mockResolvedValue(programme);
    prismaMock.terrain.findMany.mockResolvedValue([]);
    prismaMock.terrain.createMany.mockResolvedValue({ count: 1 });
    prismaMock.mandatLot.findMany.mockResolvedValue([]);

    await service.genererLots('p1', { nombre: 1, prefixe: 'D-' }, user);

    expect(prismaMock.mandatLot.createMany).not.toHaveBeenCalled();
  });
});
