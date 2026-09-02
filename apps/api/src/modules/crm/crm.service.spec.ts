import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CrmService } from './crm.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { AuditService } from '../audit/audit.service';

describe('CrmService', () => {
  let service: CrmService;
  let prismaMock: {
    prospect: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
    };
    activiteCrm: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    documentCrm: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    dossierVente: {
      findMany: jest.Mock;
    };
    auditLog: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    systemSetting: {
      findUnique: jest.Mock;
    };
    contact: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let cloudinaryMock: { upload: jest.Mock; url: jest.Mock; destroy: jest.Mock };
  let auditMock: { record: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      prospect: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
      },
      activiteCrm: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      documentCrm: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      dossierVente: {
        findMany: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      systemSetting: {
        findUnique: jest.fn(),
      },
      contact: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    cloudinaryMock = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'mtm/crm/p1/documents/doc1',
        resourceType: 'raw',
        secureUrl: 'https://cloudinary.test/mtm/crm/p1/documents/doc1',
      }),
      url: jest.fn((id: string) => `https://cloudinary.test/${id}`),
      destroy: jest.fn(),
    };
    auditMock = { record: jest.fn() };

    service = new CrmService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
      cloudinaryMock as unknown as CloudinaryService,
    );
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

  it('calcule les stats avec prochaines tâches', async () => {
    prismaMock.prospect.groupBy.mockResolvedValue([]);
    prismaMock.prospect.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0);
    prismaMock.activiteCrm.count.mockResolvedValue(3);
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    const stats = await service.getStats({ id: 'u1', roles: ['commercial'] });

    expect(stats).toEqual({
      totalProspects: 10,
      nouveaux: 0,
      upcomingTasksCount: 3,
      pipeline: {},
    });
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

  it('supprime un document et nettoie le storage', async () => {
    prismaMock.documentCrm.findFirst.mockResolvedValue({
      id: 'd1',
      storageKey: 'mtm/crm/p1/documents/doc1',
      resourceType: 'raw',
      isPublic: false,
    });
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      commercialResponsableId: 'u1',
    });

    await service.removeDocument('p1', 'd1', {
      id: 'u1',
      roles: ['commercial'],
    });

    expect(prismaMock.documentCrm.delete).toHaveBeenCalledWith({
      where: { id: 'd1' },
    });
    expect(cloudinaryMock.destroy).toHaveBeenCalledWith(
      'mtm/crm/p1/documents/doc1',
      'raw',
      false,
    );
  });

  it('retourne la timeline', async () => {
    prismaMock.prospect.findUnique.mockResolvedValue({
      id: 'p1',
      nom: 'Dupont',
      commercialResponsableId: 'u1',
    });
    prismaMock.activiteCrm.findMany.mockResolvedValue([
      {
        id: 'a1',
        titre: 'Appel',
        statut: 'a_faire',
        dateEcheance: new Date(Date.now() + 86400000),
      },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.dossierVente.findMany.mockResolvedValue([]);

    const timeline = await service.getTimeline('p1', {
      id: 'u1',
      roles: ['commercial'],
    });

    expect(timeline.prospect?.id).toBe('p1');
    expect(timeline.upcoming).toHaveLength(1);
    expect(timeline.overdue).toHaveLength(0);
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
});
