import { createCrmTestContext } from './crm.test-support';

describe('CrmDocumentsService', () => {
  let prismaMock: ReturnType<typeof createCrmTestContext>['prismaMock'];
  let cloudinaryMock: ReturnType<typeof createCrmTestContext>['cloudinaryMock'];
  let documents: ReturnType<typeof createCrmTestContext>['documents'];

  beforeEach(() => {
    ({ prismaMock, cloudinaryMock, documents } = createCrmTestContext());
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

    await documents.removeDocument('p1', 'd1', {
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
});
