import { BadRequestException } from '@nestjs/common';
import { createLocatifTestContext } from './locatif.test-support';
import { appliquerJetons } from './relances.service';

describe('appliquerJetons', () => {
  it('remplace les jetons du modèle et ignore les inconnus', () => {
    expect(
      appliquerJetons('Loyer de {{periode}} — {{montantDu}} ({{inconnu}})', {
        periode: 'octobre 2026',
        montantDu: '150 000 FCFA',
      }),
    ).toBe('Loyer de octobre 2026 — 150 000 FCFA ()');
  });
});

describe('RelancesLoyerService', () => {
  const gestionnaire = {
    id: 'u-loc',
    roles: ['responsable_gestion_locative'],
    permissions: ['locatif:modifier'],
  };

  let prismaMock: ReturnType<typeof createLocatifTestContext>['prismaMock'];
  let mailMock: ReturnType<typeof createLocatifTestContext>['mailMock'];
  let relances: ReturnType<typeof createLocatifTestContext>['relances'];

  const echeanceEnRetard = (joursRetard: number, dejaEmises: string[] = []) => [
    {
      id: 'ech-1',
      periode: new Date('2026-10-01T00:00:00Z'),
      dateEcheance: new Date(Date.now() - joursRetard * 24 * 3600 * 1000),
      montantPrevu: 150000,
      montantPaye: 0,
      statut: 'impayee',
      relances: dejaEmises.map((modeleCode) => ({ modeleCode })),
      bailLocatif: {
        id: 'bail-1',
        referenceInterne: 'B-2026-0001',
        locataire: {
          firstName: 'Aissatou',
          lastName: 'Ba',
          email: 'aissatou@example.com',
        },
        bienLocatif: {
          adresse: 'Cité Keur Gorgui',
          referenceInterne: 'L-2026-0001',
        },
      },
    },
  ];

  beforeEach(() => {
    ({ prismaMock, mailMock, relances } = createLocatifTestContext());
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.relanceLoyer.create.mockResolvedValue({ id: 'rel-1' });
    prismaMock.bienLocatif.findFirst.mockResolvedValue({ id: 'bien-1' });
  });

  it('n’émet que les paliers atteints du calendrier paramétré', async () => {
    // Calendrier par défaut : 5, 15 et 30 jours. À 16 jours de retard, les deux
    // premiers paliers sont dus, pas la mise en demeure.
    prismaMock.echeanceLoyer.findMany.mockResolvedValue(echeanceEnRetard(16));

    const creees = await relances.genererFile();

    expect(creees).toBe(2);
    const modeles = prismaMock.relanceLoyer.create.mock.calls.map(
      (appel) => (appel[0] as { data: { modeleCode: string } }).data.modeleCode,
    );
    expect(modeles).toEqual(['rappel_amiable', 'relance_ferme']);
  });

  it('ne réémet pas un palier déjà envoyé', async () => {
    prismaMock.echeanceLoyer.findMany.mockResolvedValue(
      echeanceEnRetard(16, ['rappel_amiable', 'relance_ferme']),
    );

    expect(await relances.genererFile()).toBe(0);
    expect(prismaMock.relanceLoyer.create).not.toHaveBeenCalled();
  });

  it('renseigne le message avec la période, le montant dû et le retard', async () => {
    prismaMock.echeanceLoyer.findMany.mockResolvedValue(echeanceEnRetard(6));

    await relances.genererFile();

    const data = prismaMock.relanceLoyer.create.mock.calls[0][0] as {
      data: { objet: string; message: string; joursRetard: number };
    };
    expect(data.data.objet).toContain('octobre 2026');
    expect(data.data.message).toContain('Aissatou Ba');
    // `toLocaleString('fr-FR')` sépare les milliers par une espace insécable :
    // on compare avec le même formatage plutôt qu'une espace ordinaire.
    expect(data.data.message).toContain(
      `${(150000).toLocaleString('fr-FR')} FCFA`,
    );
    expect(data.data.joursRetard).toBe(6);
  });

  it('envoie la relance par e-mail et la marque envoyée', async () => {
    prismaMock.relanceLoyer.findUnique.mockResolvedValue({
      id: 'rel-1',
      statut: 'a_envoyer',
      canal: 'email',
      destinataire: 'aissatou@example.com',
      objet: 'Rappel',
      message: 'Bonjour',
      bailLocatif: {
        bienLocatif: { id: 'bien-1' },
        locataire: { email: 'aissatou@example.com' },
      },
    });
    prismaMock.relanceLoyer.update.mockResolvedValue({ id: 'rel-1' });

    await relances.envoyer('rel-1', {}, gestionnaire);

    expect(mailMock.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'aissatou@example.com' }),
    );
    expect(prismaMock.relanceLoyer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'envoyee' }),
      }),
    );
  });

  it('refuse l’envoi par e-mail à un locataire sans adresse', async () => {
    prismaMock.relanceLoyer.findUnique.mockResolvedValue({
      id: 'rel-1',
      statut: 'a_envoyer',
      canal: 'email',
      destinataire: null,
      objet: 'Rappel',
      message: 'Bonjour',
      bailLocatif: {
        bienLocatif: { id: 'bien-1' },
        locataire: { email: null },
      },
    });

    await expect(relances.envoyer('rel-1', {}, gestionnaire)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('permet de tracer une relance passée par un autre canal', async () => {
    prismaMock.relanceLoyer.findUnique.mockResolvedValue({
      id: 'rel-1',
      statut: 'a_envoyer',
      canal: 'email',
      destinataire: null,
      objet: 'Rappel',
      message: 'Bonjour',
      bailLocatif: {
        bienLocatif: { id: 'bien-1' },
        locataire: { email: null },
      },
    });
    prismaMock.relanceLoyer.update.mockResolvedValue({ id: 'rel-1' });

    await relances.envoyer(
      'rel-1',
      { canal: 'manuel', note: 'Appel téléphonique, promesse de règlement' },
      gestionnaire,
    );

    expect(mailMock.send).not.toHaveBeenCalled();
    expect(prismaMock.relanceLoyer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'envoyee', canal: 'manuel' }),
      }),
    );
  });
});
