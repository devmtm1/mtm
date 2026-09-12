import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createCrmTestContext } from './crm.test-support';

describe('CrmService', () => {
  let prismaMock: ReturnType<typeof createCrmTestContext>['prismaMock'];
  let service: ReturnType<typeof createCrmTestContext>['service'];

  beforeEach(() => {
    ({ prismaMock, service } = createCrmTestContext());
  });

  it('rejette un statut pipeline invalide', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['nouveau_contact', 'qualification'],
    });

    await expect(
      service.create(
        {
          nom: 'Dupont',
          prenom: 'Jean',
          email: 'j@d.com',
          telephone: '',
          paysResidence: '',
          sourceAcquisition: '',
          besoins: '',
          budgetMin: 0,
          budgetMax: 0,
          preferences: '',
          commercialResponsableId: undefined,
          statutPipeline: 'invalide',
          score: 0,
        },
        { id: 'u1', roles: ['commercial'] },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.prospect.create).not.toHaveBeenCalled();
  });

  it('isole les prospects par commercial quand non-manager', async () => {
    prismaMock.prospect.findMany.mockResolvedValue([]);
    prismaMock.prospect.count.mockResolvedValue(0);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await service.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      { id: 'u1', roles: ['commercial'] },
    );

    expect(prismaMock.prospect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ commercialResponsableId: 'u1' }),
      }),
    );
  });

  it('autorise le manager à voir tous les prospects', async () => {
    prismaMock.prospect.findMany.mockResolvedValue([]);
    prismaMock.prospect.count.mockResolvedValue(0);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await service.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      { id: 'm1', roles: ['manager'] },
    );

    expect(prismaMock.prospect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          commercialResponsableId: expect.anything(),
        }),
      }),
    );
  });

  it("autorise l'administrateur à voir tous les prospects", async () => {
    prismaMock.prospect.findMany.mockResolvedValue([]);
    prismaMock.prospect.count.mockResolvedValue(0);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await service.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      { id: 'a1', roles: ['administrateur'] },
    );

    expect(prismaMock.prospect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          commercialResponsableId: expect.anything(),
        }),
      }),
    );
  });

  it('autorise le responsable commercial à voir tous les prospects', async () => {
    prismaMock.prospect.findMany.mockResolvedValue([]);
    prismaMock.prospect.count.mockResolvedValue(0);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await service.findAll(
      { page: 1, pageSize: 25, sortBy: 'createdAt', sortOrder: 'desc' },
      { id: 'r1', roles: ['responsable_commercial'] },
    );

    expect(prismaMock.prospect.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          commercialResponsableId: expect.anything(),
        }),
      }),
    );
  });

  it('transitionne le pipeline avec justification pour perdu', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: null,
      statutPipeline: 'qualification',
    });
    prismaMock.prospect.update.mockResolvedValue({
      id: 'p1',
      statutPipeline: 'perdu',
    });
    prismaMock.systemSetting.findUnique.mockResolvedValue({ value: ['perdu'] });

    const result = await service.transitionPipeline(
      'p1',
      'perdu',
      { id: 'u1', roles: ['manager'] },
      'Client a abandonné',
    );

    expect(prismaMock.prospect.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { statutPipeline: 'perdu' },
      }),
    );
    expect(result.prospect.statutPipeline).toBe('perdu');
  });

  it('rejette la transition en perdu sans justification', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: null,
      statutPipeline: 'qualification',
    });

    await expect(
      service.transitionPipeline(
        'p1',
        'perdu',
        { id: 'u1', roles: ['manager'] },
        '',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('interdit à un commercial d’affecter un prospect à un autre commercial', async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue({
      value: ['nouveau_contact'],
    });

    await expect(
      service.create(
        {
          nom: 'Prospect',
          statutPipeline: 'nouveau_contact',
          commercialResponsableId: 'other',
        },
        { id: 'u1', roles: ['commercial'] },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.prospect.create).not.toHaveBeenCalled();
  });

  it("interdit au commercial de faire avancer un prospect qui n'est pas le sien", async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'other',
      statutPipeline: 'qualification',
    });

    await expect(
      service.transitionPipeline('p1', 'visite', {
        id: 'u1',
        roles: ['commercial'],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('convertit un contact public en prospect', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({
      id: 'c1',
      nom: 'Jean Dupont',
      email: 'j@d.com',
      telephone: '77000000',
      sujet: 'Achat',
      message: 'Je cherche un terrain',
    });
    prismaMock.prospect.findFirst.mockResolvedValue(null);
    prismaMock.prospect.create.mockResolvedValue({
      id: 'p1',
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'j@d.com',
      telephone: '77000000',
      statutPipeline: 'nouveau_contact',
    });
    prismaMock.contact.update.mockResolvedValue({ id: 'c1' });
    prismaMock.activiteCrm.create.mockResolvedValue({ id: 'a1' });

    const prospect = await service.convertContact('c1');

    expect(prismaMock.prospect.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nom: 'Dupont',
          prenom: 'Jean',
          email: 'j@d.com',
          sourceAcquisition: 'contact_public',
          statutPipeline: 'nouveau_contact',
        }),
      }),
    );
    expect(prismaMock.activiteCrm.create).toHaveBeenCalled();
    expect(prospect.id).toBe('p1');
  });

  it('rejette la conversion si le prospect existe déjà', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({
      id: 'c1',
      nom: 'Jean Dupont',
      email: 'j@d.com',
      telephone: '77000000',
      sujet: '',
      message: '',
    });
    prismaMock.prospect.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.convertContact('c1')).rejects.toThrow(
      ConflictException,
    );
    expect(prismaMock.prospect.create).not.toHaveBeenCalled();
  });

  it('assigne un commercial', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: null,
      nom: 'Dupont',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u2',
      isActive: true,
      roles: [{ role: { name: 'commercial' } }],
    });
    prismaMock.prospect.update.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'u2',
    });

    const result = await service.assignCommercial('p1', 'u2', {
      id: 'm1',
      roles: ['manager'],
    });

    expect(prismaMock.prospect.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { commercialResponsableId: 'u2' },
      }),
    );
    expect(result.prospect.commercialResponsableId).toBe('u2');
  });

  it("interdit à un commercial d'affecter un prospect", async () => {
    await expect(
      service.assignCommercial('p1', 'u2', {
        id: 'u1',
        roles: ['commercial'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.prospect.update).not.toHaveBeenCalled();
  });

  it('interdit la réaffectation via la mise à jour générique', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'u1',
    });

    await expect(
      service.update(
        'p1',
        { commercialResponsableId: 'u2' },
        { id: 'u1', roles: ['commercial'] },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.prospect.update).not.toHaveBeenCalled();
  });

  it('autorise la mise à jour sans changement de commercial', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'u1',
    });
    prismaMock.prospect.update.mockResolvedValue({
      id: 'p1',
      nom: 'Prospect modifié',
      commercialResponsableId: 'u1',
    });

    await service.update(
      'p1',
      { nom: 'Prospect modifié', commercialResponsableId: 'u1' },
      { id: 'u1', roles: ['commercial'] },
    );

    expect(prismaMock.prospect.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          nom: 'Prospect modifié',
          commercialResponsableId: 'u1',
        }),
      }),
    );
  });
});
