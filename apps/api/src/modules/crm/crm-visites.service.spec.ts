import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createCrmTestContext } from './crm.test-support';

describe('CrmVisitesService', () => {
  let prismaMock: ReturnType<typeof createCrmTestContext>['prismaMock'];
  let visites: ReturnType<typeof createCrmTestContext>['visites'];
  const manager = { id: 'm1', roles: ['manager'] };

  beforeEach(() => {
    ({ prismaMock, visites } = createCrmTestContext());
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'm1',
    });
    prismaMock.terrain.findUnique.mockResolvedValue({ id: 't1' });
    prismaMock.visiteProspect.create.mockResolvedValue({ id: 'v1' });
  });

  it('enregistre un terrain proposé, sans rendez-vous', async () => {
    await visites.create('p1', { terrainId: 't1' }, manager);

    expect(prismaMock.visiteProspect.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prospectId: 'p1',
          terrainId: 't1',
          statut: 'proposee',
          createdById: 'm1',
        }),
      }),
    );
  });

  it('déduit « programmée » d’une date confirmée', async () => {
    await visites.create(
      'p1',
      { terrainId: 't1', dateConfirmee: '2026-10-12', heure: '10:30' },
      manager,
    );

    expect(prismaMock.visiteProspect.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'programmee' }),
      }),
    );
  });

  it('déduit « effectuée » dès qu’un retour est saisi', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await visites.create(
      'p1',
      {
        terrainId: 't1',
        dateRetour: '2026-10-13',
        terrainPlait: 'oui_hesitation',
        prixAccepte: 'negociation_demandee',
        objectionPrincipale: 'prix',
      },
      manager,
    );

    expect(prismaMock.visiteProspect.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statut: 'effectuee',
          terrainPlait: 'oui_hesitation',
          objectionPrincipale: 'prix',
        }),
      }),
    );
  });

  it('refuse une appréciation hors référentiel', async () => {
    await expect(
      visites.create(
        'p1',
        { terrainId: 't1', terrainPlait: 'peut-etre' },
        manager,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.visiteProspect.create).not.toHaveBeenCalled();
  });

  it('refuse un terrain inexistant', async () => {
    prismaMock.terrain.findUnique.mockResolvedValue(null);

    await expect(
      visites.create('p1', { terrainId: 't404' }, manager),
    ).rejects.toThrow(BadRequestException);
  });

  it('passe une visite programmée à « effectuée » quand le commercial saisit le retour', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.visiteProspect.findFirst.mockResolvedValue({
      id: 'v1',
      prospectId: 'p1',
      statut: 'programmee',
    });
    prismaMock.visiteProspect.update.mockResolvedValue({ id: 'v1' });

    await visites.update(
      'p1',
      'v1',
      { dateRetour: '2026-10-13', terrainPlait: 'oui_beaucoup' },
      manager,
    );

    expect(prismaMock.visiteProspect.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'effectuee' }),
      }),
    );
  });

  it('ne change pas le statut d’une visite quand on corrige seulement l’heure', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.visiteProspect.findFirst.mockResolvedValue({
      id: 'v1',
      prospectId: 'p1',
      statut: 'annulee',
    });
    prismaMock.visiteProspect.update.mockResolvedValue({ id: 'v1' });

    await visites.update('p1', 'v1', { heure: '11:00' }, manager);

    expect(prismaMock.visiteProspect.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'annulee' }),
      }),
    );
  });

  it('refuse de modifier une visite d’un autre prospect', async () => {
    prismaMock.visiteProspect.findFirst.mockResolvedValue(null);

    await expect(
      visites.update('p1', 'v9', { heure: '11:00' }, manager),
    ).rejects.toThrow(NotFoundException);
  });
});
