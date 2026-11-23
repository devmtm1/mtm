import { ProtocolesRappelsService } from './protocoles-rappels.service';

const MAINTENANT = new Date('2026-11-19T08:00:00Z');
const ilYa = (jours: number) =>
  new Date(MAINTENANT.getTime() - jours * 86_400_000);

function montage(delai = 7) {
  const prisma = {
    protocoleDossier: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const notifications = { notifierPermission: jest.fn().mockResolvedValue(2) };
  const settings = { getPositiveNumber: jest.fn().mockResolvedValue(delai) };
  const service = new ProtocolesRappelsService(
    prisma as never,
    notifications as never,
    settings as never,
  );
  return { service, prisma, notifications };
}

const protocole = (id: string, jours: number) => ({
  id,
  titre: 'Protocole lot 12',
  dateEnvoi: ilYa(jours),
  dossierVente: {
    id: 'dv-1',
    referenceInterne: 'VTE-0001',
    prospect: { nom: 'Diop', prenom: 'Awa' },
  },
});

describe('ProtocolesRappelsService', () => {
  it('ne cherche que les protocoles envoyés sans retour signé, au-delà du délai, sur un dossier (vente, bail ou chantier) non clos', async () => {
    const { service, prisma } = montage(7);
    await service.rappeler(MAINTENANT);
    const where = prisma.protocoleDossier.findMany.mock.calls[0][0].where;
    expect(where.statut).toEqual({ in: ['envoye', 'en_attente_signature'] });
    expect(where.dateEnvoi.lt).toEqual(ilYa(7));
    expect(where.OR).toEqual([
      { dossierVente: { statut: { not: 'annule' } } },
      {
        bailLocatif: {
          statut: { notIn: ['termine', 'resilie_sans_preavis'] },
        },
      },
      { projetConstruction: { statut: { not: 'annule' } } },
    ]);
  });

  it('prévient les titulaires de « protocoles:modifier » avec le dossier, le client et le nombre de jours', async () => {
    const { service, prisma, notifications } = montage(7);
    prisma.protocoleDossier.findMany.mockResolvedValue([protocole('p1', 9)]);
    const rappeles = await service.rappeler(MAINTENANT);
    expect(rappeles).toBe(1);
    expect(notifications.notifierPermission).toHaveBeenCalledWith(
      'protocoles:modifier',
      expect.objectContaining({
        type: 'protocole_rappel',
        titre: expect.stringContaining('9 jours'),
        message: expect.stringContaining('Awa Diop'),
        dedupeKey: 'protocole-rappel:p1:1',
      }),
    );
  });

  it('un seul rappel par période : le même jour, la clé de dédoublonnage est identique', async () => {
    const { service, prisma, notifications } = montage(7);
    prisma.protocoleDossier.findMany.mockResolvedValue([protocole('p1', 8)]);
    await service.rappeler(MAINTENANT);
    await service.rappeler(new Date(MAINTENANT.getTime() + 3 * 3_600_000));
    const cles = notifications.notifierPermission.mock.calls.map(
      (appel: unknown[]) => (appel[1] as { dedupeKey: string }).dedupeKey,
    );
    expect(new Set(cles).size).toBe(1);
  });

  it('rappelle de nouveau à la période suivante', async () => {
    const { service, prisma, notifications } = montage(7);
    prisma.protocoleDossier.findMany.mockResolvedValue([protocole('p1', 15)]);
    await service.rappeler(MAINTENANT);
    expect(
      (
        notifications.notifierPermission.mock.calls[0][1] as {
          dedupeKey: string;
        }
      ).dedupeKey,
    ).toBe('protocole-rappel:p1:2');
  });

  it('respecte un délai plus court réglé par la direction', async () => {
    const { service, prisma } = montage(3);
    await service.rappeler(MAINTENANT);
    expect(
      prisma.protocoleDossier.findMany.mock.calls[0][0].where.dateEnvoi.lt,
    ).toEqual(ilYa(3));
  });

  it('ne compte pas un protocole dont personne n’a été prévenu', async () => {
    const { service, prisma, notifications } = montage(7);
    prisma.protocoleDossier.findMany.mockResolvedValue([protocole('p1', 9)]);
    notifications.notifierPermission.mockResolvedValue(0);
    expect(await service.rappeler(MAINTENANT)).toBe(0);
  });

  it('la tâche planifiée ne lève jamais d’erreur', async () => {
    const { service, prisma } = montage();
    prisma.protocoleDossier.findMany.mockRejectedValue(
      new Error('base indisponible'),
    );
    await expect(service.rappelerChaqueJour()).resolves.toBeUndefined();
  });
});
