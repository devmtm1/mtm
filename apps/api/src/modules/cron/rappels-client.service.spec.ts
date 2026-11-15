import { RappelsClientService } from './rappels-client.service';

const JOUR = 24 * 60 * 60 * 1000;
const maintenant = new Date(2026, 10, 5, 8, 0, 0);

function jour(decalage: number): Date {
  return new Date(2026, 10, 5 + decalage);
}

function montage(opts: {
  loyers?: unknown[];
  echeances?: unknown[];
  reservations?: unknown[];
}) {
  const notifierClient = jest.fn().mockResolvedValue(1);
  const prisma = {
    echeanceLoyer: { findMany: jest.fn().mockResolvedValue(opts.loyers ?? []) },
    echeancePaiement: {
      findMany: jest.fn().mockResolvedValue(opts.echeances ?? []),
    },
    reservation: {
      findMany: jest.fn().mockResolvedValue(opts.reservations ?? []),
    },
  };
  const service = new RappelsClientService(
    prisma as never,
    { notifierClient } as never,
  );
  return { service, notifierClient };
}

const loyer = (decalage: number, paye = 0) => ({
  id: `l${decalage}`,
  periode: jour(decalage),
  dateEcheance: jour(decalage),
  montantPrevu: 100000,
  montantPaye: paye,
  bailLocatif: { locataireId: 'loc-1' },
});

describe('RappelsClientService', () => {
  it('prévient le locataire 3 jours avant, le jour même, puis à J+3 et J+10', async () => {
    const { service, notifierClient } = montage({
      loyers: [loyer(3), loyer(0), loyer(-3), loyer(-10)],
    });
    const bilan = await service.envoyerRappels(maintenant);
    expect(bilan.loyers).toBe(4);
    const cles = notifierClient.mock.calls.map((c) => c[1].dedupeKey);
    expect(cles).toEqual([
      'rappel-loyer:l3:j-3',
      'rappel-loyer:l0:j',
      'rappel-loyer:l-3:j+3',
      'rappel-loyer:l-10:j+10',
    ]);
    expect(notifierClient.mock.calls[2][1].niveau).toBe('alerte');
    expect(notifierClient.mock.calls[0][0]).toEqual({ locataireId: 'loc-1' });
  });

  it('ne dit rien les autres jours ni quand tout est réglé', async () => {
    const { service, notifierClient } = montage({
      loyers: [loyer(1), loyer(-1), loyer(-5), loyer(0, 100000)],
    });
    expect((await service.envoyerRappels(maintenant)).loyers).toBe(0);
    expect(notifierClient).not.toHaveBeenCalled();
  });

  it('rappelle une échéance de vente à son acheteur, avec le nom du bien', async () => {
    const { service, notifierClient } = montage({
      echeances: [
        {
          id: 'e1',
          numero: 2,
          dateEcheance: jour(0),
          montantPrevu: 500000,
          montantPaye: 100000,
          dossierVente: { prospectId: 'p-1', terrain: { nom: 'Terrain Saly' } },
        },
      ],
    });
    expect((await service.envoyerRappels(maintenant)).echeancesVente).toBe(1);
    const [cible, contenu] = notifierClient.mock.calls[0];
    expect(cible).toEqual({ prospectId: 'p-1' });
    expect(contenu.message).toContain('Terrain Saly');
    expect(contenu.message).toContain('400');
    expect(contenu.email).toBe(true);
  });

  it('avertit d’une réservation qui expire dans 3 jours et demain, pas à 2 jours', async () => {
    const reservation = (id: string, decalage: number) => ({
      id,
      dateExpiration: new Date(maintenant.getTime() + decalage * JOUR),
      dossierVente: { prospectId: 'p-1', terrain: { nom: 'Lot 4' } },
    });
    const { service, notifierClient } = montage({
      reservations: [
        reservation('r3', 3),
        reservation('r2', 2),
        reservation('r1', 1),
      ],
    });
    expect((await service.envoyerRappels(maintenant)).reservations).toBe(2);
    expect(notifierClient.mock.calls.map((c) => c[1].dedupeKey)).toEqual([
      'rappel-reservation:r3:j-3',
      'rappel-reservation:r1:j-1',
    ]);
  });
});
