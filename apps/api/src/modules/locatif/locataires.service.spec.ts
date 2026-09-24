import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';

describe('LocatairesService', () => {
  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let mailMock: ReturnType<typeof createLocatifTestContext>['mailMock'];
  let configMock: ReturnType<typeof createLocatifTestContext>['configMock'];
  let locataires: ReturnType<typeof createLocatifTestContext>['locataires'];

  beforeEach(() => {
    ({ prismaMock, mailMock, configMock, locataires } =
      createLocatifTestContext());
  });

  it("renvoie l'historique des baux d'un locataire, du plus récent au plus ancien", async () => {
    prismaMock.locataire.findUnique.mockResolvedValue({ id: 'loc-1' });
    prismaMock.bailLocatif.findMany.mockResolvedValue([
      { id: 'bail-2', referenceInterne: 'B-2026-0002', statut: 'actif' },
      { id: 'bail-1', referenceInterne: 'B-2025-0001', statut: 'termine' },
    ]);

    const result = await locataires.findBaux('loc-1');

    expect(result).toHaveLength(2);
    expect(prismaMock.bailLocatif.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locataireId: 'loc-1' },
        orderBy: { dateDebut: 'desc' },
      }),
    );
  });

  it('refuse de lister les baux d’un locataire introuvable', async () => {
    prismaMock.locataire.findUnique.mockResolvedValue(null);

    await expect(locataires.findBaux('inconnu')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.bailLocatif.findMany).not.toHaveBeenCalled();
  });

  describe('createClientAccount', () => {
    const locataire = {
      id: 'loc-1',
      email: 'loc@example.com',
      firstName: 'Awa',
      lastName: 'Diop',
      clientUser: null,
    };

    it('ouvre un compte client et envoie l’invitation par e-mail', async () => {
      configMock.get.mockReturnValue('https://mtm-immobilier.sn');
      prismaMock.locataire.findUnique.mockResolvedValue(locataire);
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-client' });
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        email: locataire.email,
        firstName: locataire.firstName,
        lastName: locataire.lastName,
      });

      const result = await locataires.createClientAccount(
        'loc-1',
        'MotDePasse123!',
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientLocataireId: 'loc-1' }),
        }),
      );
      expect(mailMock.send).toHaveBeenCalled();
      expect(result.invitationSent).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });

    it('refuse si un compte existe déjà pour ce locataire', async () => {
      prismaMock.locataire.findUnique.mockResolvedValue({
        ...locataire,
        clientUser: { id: 'user-existant' },
      });

      await expect(
        locataires.createClientAccount('loc-1', 'MotDePasse123!'),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('refuse si le locataire n’a pas d’adresse e-mail', async () => {
      prismaMock.locataire.findUnique.mockResolvedValue({
        ...locataire,
        email: null,
      });

      await expect(
        locataires.createClientAccount('loc-1', 'MotDePasse123!'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('refuse si l’adresse e-mail est déjà utilisée par un autre compte', async () => {
      prismaMock.locataire.findUnique.mockResolvedValue(locataire);
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-client' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'un-autre-compte' });

      await expect(
        locataires.createClientAccount('loc-1', 'MotDePasse123!'),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });
});
