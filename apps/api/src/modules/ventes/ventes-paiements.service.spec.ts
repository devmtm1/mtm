import { ConflictException } from '@nestjs/common';
import { createVentesTestContext } from './ventes.test-support';

describe('VentesPaiementsService', () => {
  let prismaMock: ReturnType<typeof createVentesTestContext>['prismaMock'];
  let paiements: ReturnType<typeof createVentesTestContext>['paiements'];

  beforeEach(() => {
    ({ prismaMock, paiements } = createVentesTestContext());
  });

  it('refuse un nouveau paiement sur un dossier déjà soldé ou annulé', async () => {
    prismaMock.dossierVente.findUnique.mockResolvedValue({
      id: 'd1',
      statut: 'solde',
      prixVente: 1000,
    });
    prismaMock.dossierVente.findFirst.mockResolvedValue({ id: 'd1' });

    await expect(
      paiements.createPaiement(
        'd1',
        { montant: 100, mode: 'virement', reference: 'REF-1' },
        { id: 'u1', roles: ['commercial'], permissions: ['ventes:payer'] },
      ),
    ).rejects.toThrow(ConflictException);
  });
});
