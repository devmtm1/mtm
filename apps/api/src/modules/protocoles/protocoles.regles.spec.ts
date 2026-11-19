import {
  STATUTS_PROTOCOLE,
  STATUTS_SIGNES,
  TRANSITIONS,
  estEnRetard,
  etapeClient,
  lireDebutSuivi,
  verifierChangement,
  type EtatProtocole,
} from './protocoles.regles';

const vide: EtatProtocole = {
  statut: 'a_preparer',
  documentPrepareId: null,
  documentSigneId: null,
  dateEnvoi: null,
  moyenEnvoi: null,
  dateReceptionSignee: null,
};

describe('règles des protocoles', () => {
  it('chaque statut a ses passages définis et ne mène qu’à des statuts connus', () => {
    for (const statut of STATUTS_PROTOCOLE) {
      expect(TRANSITIONS[statut]).toBeDefined();
      for (const cible of TRANSITIONS[statut])
        expect(STATUTS_PROTOCOLE).toContain(cible);
    }
  });

  it('un protocole envoyé n’est jamais « signé » : on ne saute pas de « préparé » à « signé »', () => {
    expect(
      verifierChangement(
        { ...vide, statut: 'prepare_a_verifier', documentPrepareId: 'd1' },
        { vers: 'signe_client' },
        false,
      ),
    ).toMatch(/Passage impossible/);
    expect(STATUTS_SIGNES).not.toContain('envoye');
    expect(STATUTS_SIGNES).not.toContain('en_attente_signature');
  });

  it('« signé par le client » exige la copie signée ET sa date de réception', () => {
    const envoye: EtatProtocole = {
      ...vide,
      statut: 'envoye',
      dateEnvoi: new Date(),
      moyenEnvoi: 'email',
    };
    expect(verifierChangement(envoye, { vers: 'signe_client' }, false)).toMatch(
      /copie signée/,
    );
    expect(
      verifierChangement(
        { ...envoye, documentSigneId: 'd2' },
        { vers: 'signe_client' },
        false,
      ),
    ).toMatch(/date de réception/);
    expect(
      verifierChangement(
        { ...envoye, documentSigneId: 'd2' },
        { vers: 'signe_client', dateReceptionSignee: new Date() },
        false,
      ),
    ).toBeNull();
  });

  it('on ne peut pas dire « préparé » sans avoir déposé le document', () => {
    expect(
      verifierChangement(vide, { vers: 'prepare_a_verifier' }, false),
    ).toMatch(/document préparé/);
    expect(
      verifierChangement(
        { ...vide, documentPrepareId: 'd1' },
        { vers: 'prepare_a_verifier' },
        false,
      ),
    ).toBeNull();
  });

  it('« envoyé » exige la date et le moyen d’envoi', () => {
    const pret: EtatProtocole = {
      ...vide,
      statut: 'prepare_a_verifier',
      documentPrepareId: 'd1',
    };
    expect(verifierChangement(pret, { vers: 'envoye' }, false)).toMatch(
      /date d’envoi/,
    );
    expect(
      verifierChangement(
        pret,
        { vers: 'envoye', dateEnvoi: new Date() },
        false,
      ),
    ).toMatch(/moyen d’envoi/);
    expect(
      verifierChangement(
        pret,
        { vers: 'envoye', dateEnvoi: new Date(), moyenEnvoi: 'whatsapp' },
        false,
      ),
    ).toBeNull();
  });

  it('seule la Direction valide et clôture', () => {
    const aValider: EtatProtocole = {
      ...vide,
      statut: 'a_valider_direction',
      documentSigneId: 'd2',
      dateReceptionSignee: new Date(),
    };
    expect(verifierChangement(aValider, { vers: 'valide' }, false)).toMatch(
      /Direction/,
    );
    expect(verifierChangement(aValider, { vers: 'valide' }, true)).toBeNull();
    expect(
      verifierChangement(
        aValider,
        { vers: 'a_corriger', motif: 'Date erronée' },
        false,
      ),
    ).toMatch(/Direction/);
  });

  it('une correction ou une annulation demande un motif', () => {
    const envoye: EtatProtocole = {
      ...vide,
      statut: 'envoye',
      dateEnvoi: new Date(),
      moyenEnvoi: 'email',
    };
    expect(verifierChangement(envoye, { vers: 'a_corriger' }, false)).toMatch(
      /motif/,
    );
    expect(
      verifierChangement(envoye, { vers: 'annule', motif: '  ' }, false),
    ).toMatch(/motif/);
    expect(
      verifierChangement(
        envoye,
        { vers: 'annule', motif: 'Client désisté' },
        false,
      ),
    ).toBeNull();
  });

  it('un protocole validé ou annulé est définitif', () => {
    expect(
      verifierChangement(
        { ...vide, statut: 'valide' },
        { vers: 'a_corriger', motif: 'x' },
        true,
      ),
    ).toMatch(/Passage impossible/);
    expect(
      verifierChangement(
        { ...vide, statut: 'annule' },
        { vers: 'a_preparer' },
        true,
      ),
    ).toMatch(/Passage impossible/);
  });

  it('est en retard quand il est parti chez le client depuis plus que le délai, sans retour', () => {
    const maintenant = new Date('2026-11-18T12:00:00Z');
    const il_y_a = (jours: number) =>
      new Date(maintenant.getTime() - jours * 86_400_000);
    expect(
      estEnRetard(
        { statut: 'en_attente_signature', dateEnvoi: il_y_a(10) },
        7,
        maintenant,
      ),
    ).toBe(true);
    expect(
      estEnRetard({ statut: 'envoye', dateEnvoi: il_y_a(3) }, 7, maintenant),
    ).toBe(false);
    expect(
      estEnRetard(
        { statut: 'signe_client', dateEnvoi: il_y_a(30) },
        7,
        maintenant,
      ),
    ).toBe(false);
    expect(
      estEnRetard({ statut: 'envoye', dateEnvoi: null }, 7, maintenant),
    ).toBe(false);
  });
});

describe('début du suivi des signatures', () => {
  it('lit une date AAAA-MM-JJ, sinon aucune limite', () => {
    expect(lireDebutSuivi('2026-11-19')?.toISOString()).toBe(
      '2026-11-19T00:00:00.000Z',
    );
    expect(lireDebutSuivi(' 2026-11-19 ')).not.toBeNull();
    for (const invalide of ['', 'hier', '19/11/2026', '2026-13-45', null, 42]) {
      expect(lireDebutSuivi(invalide)).toBeNull();
    }
  });
});

describe('ce que voit le client de son protocole', () => {
  it('résume chaque statut interne en une étape simple', () => {
    expect(etapeClient('a_preparer')?.etape).toBe('en_preparation');
    expect(etapeClient('prepare_a_verifier')?.etape).toBe('en_preparation');
    expect(etapeClient('envoye')?.etape).toBe('a_signer');
    expect(etapeClient('en_attente_signature')?.etape).toBe('a_signer');
    expect(etapeClient('signe_client')?.etape).toBe('signe');
    expect(etapeClient('a_valider_direction')?.etape).toBe('signe');
    expect(etapeClient('valide')?.etape).toBe('valide');
  });

  it('ne montre ni l’annulation ni les termes internes', () => {
    expect(etapeClient('annule')).toBeNull();
    for (const statut of STATUTS_PROTOCOLE) {
      const etape = etapeClient(statut);
      if (!etape) continue;
      const texte = `${etape.libelle} ${etape.aide}`.toLowerCase();
      expect(texte).not.toMatch(/direction|a_corriger|motif|interne/);
    }
  });

  it('un protocole « à corriger » reste « en préparation » pour le client, sans révéler le motif', () => {
    expect(etapeClient('a_corriger')?.etape).toBe('en_preparation');
  });
});
