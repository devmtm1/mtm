import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecusClientService, rapportRecu } from './recus-client.service';

const societe = {
  name: 'MTM Immobilier',
  tagline: 'Immobilier',
  adresse: 'Dakar',
  telephone: '+221 77 000 00 00',
  email: 'contact@mtm.test',
};

function montage(opts: {
  user?: Record<string, unknown> | null;
  paiement?: unknown;
}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(opts.user ?? null) },
    paiement: {
      findFirst: jest.fn().mockResolvedValue(opts.paiement ?? null),
      aggregate: jest.fn().mockResolvedValue({ _sum: { montant: 5000000 } }),
    },
    paiementLoyer: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const service = new RecusClientService(
    prisma as never,
    { getSociete: jest.fn().mockResolvedValue(societe) } as never,
  );
  return { service, prisma };
}

describe('RecusClientService', () => {
  it('refuse un compte qui n’est pas rattaché à un client', async () => {
    const { service } = montage({ user: { clientProspectId: null } });
    await expect(service.recuVente('u', 'p')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('ne cherche que les paiements validés du dossier du client : sinon « introuvable »', async () => {
    const { service, prisma } = montage({ user: { clientProspectId: 'pr-1' } });
    await expect(service.recuVente('u', 'p')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.paiement.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'p',
      statut: 'valide',
      dossierVente: { prospectId: 'pr-1' },
    });
  });

  it('délivre un PDF pour un paiement validé de ce client', async () => {
    const { service } = montage({
      user: { clientProspectId: 'pr-1' },
      paiement: {
        id: 'abcdef12-0000',
        montant: 5000000,
        datePaiement: new Date('2026-11-05'),
        mode: 'acompte',
        reference: 'RES-1',
        dossierVenteId: 'd1',
        dossierVente: {
          referenceInterne: 'DV-1',
          prixVente: 49000000,
          terrain: { nom: 'Terrain Bambilor', commune: 'Bambilor' },
          prospect: { nom: 'Thiam', prenom: 'Sokhna' },
        },
      },
    });
    const pdf = await service.recuVente('u', 'abcdef12-0000');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('rapportRecu', () => {
  it('annonce le montant, le mode et un total', () => {
    const rapport = rapportRecu({
      numero: 'R1',
      date: new Date('2026-11-05'),
      montant: 250000,
      mode: 'wave',
      objet: 'Loyer de novembre 2026',
      details: [],
    });
    expect(rapport.titre).toBe('Reçu de paiement');
    expect(rapport.resume.map((r) => r.valeur).join(' ')).toContain('Wave');
    expect(rapport.sections[0].total?.montant).toBe(250000);
  });
});
