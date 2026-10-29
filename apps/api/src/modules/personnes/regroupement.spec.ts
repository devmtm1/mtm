import {
  clePhone,
  compterPersonnes,
  filtrerPersonnes,
  paginer,
  regrouperPersonnes,
  type FichePersonne,
} from './regroupement';

const fiche = (partiel: Partial<FichePersonne>): FichePersonne => ({
  role: 'prospect',
  id: 'x',
  nom: 'Sow',
  prenom: 'Alassane',
  email: null,
  telephone: null,
  reference: null,
  ...partiel,
});

describe('clePhone', () => {
  it('reconnaît le même numéro écrit de plusieurs façons', () => {
    const formes = ['77 276 67 98', '+221 77 276 67 98', '00221772766798'];
    expect(new Set(formes.map(clePhone)).size).toBe(1);
  });

  it('ignore un numéro trop court pour identifier quelqu’un', () => {
    expect(clePhone('1234')).toBeNull();
    expect(clePhone(null)).toBeNull();
  });
});

describe('regrouperPersonnes', () => {
  it('réunit un prospect et un locataire qui ont le même téléphone', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: 'p1', telephone: '77 276 67 98' }),
      fiche({ role: 'locataire', id: 'l1', telephone: '+221772766798' }),
    ]);

    expect(personnes).toHaveLength(1);
    expect(personnes[0].fiches.map((f) => f.role)).toEqual([
      'prospect',
      'locataire',
    ]);
    expect(personnes[0].doublon).toBe(false);
  });

  it('compare les e-mails sans tenir compte des majuscules ni des espaces', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: 'p1', email: 'Awa@Mail.com' }),
      fiche({ role: 'proprietaire', id: 'o1', email: ' awa@mail.com ' }),
    ]);
    expect(personnes).toHaveLength(1);
  });

  it('ne confond pas deux homonymes sans contact commun', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: 'p1', telephone: '771111111' }),
      fiche({ role: 'locataire', id: 'l1', telephone: '772222222' }),
    ]);
    expect(personnes).toHaveLength(2);
  });

  it('suit la parenté de proche en proche (e-mail puis téléphone)', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: 'a', email: 'a@x.sn' }),
      fiche({ id: 'b', email: 'a@x.sn', telephone: '771234567' }),
      fiche({ role: 'locataire', id: 'c', telephone: '771234567' }),
    ]);
    expect(personnes).toHaveLength(1);
    expect(personnes[0].fiches).toHaveLength(3);
  });

  it('signale un doublon : deux fiches de même rôle pour la même personne', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: 'p1', telephone: '771234567' }),
      fiche({ id: 'p2', telephone: '771234567' }),
    ]);
    expect(personnes[0].doublon).toBe(true);
  });

  it('garde le même ordre pour deux personnes de même nom, quel que soit l’ordre de lecture', () => {
    const lues = [
      fiche({ id: 'b', nom: 'Sow', telephone: '770000002' }),
      fiche({ id: 'a', nom: 'Sow', telephone: '770000001' }),
    ];
    const ordre = (fiches: FichePersonne[]) =>
      regrouperPersonnes(fiches).map((p) => p.cle);
    expect(ordre(lues)).toEqual(ordre([...lues].reverse()));
  });

  it('range les personnes par nom, accents ignorés', () => {
    const personnes = regrouperPersonnes([
      fiche({ id: '1', nom: 'Zoé', telephone: '770000001' }),
      fiche({ id: '2', nom: 'Ébène', telephone: '770000002' }),
    ]);
    expect(personnes.map((p) => p.nom)).toEqual(['Ébène', 'Zoé']);
  });
});

describe('compteurs et filtres', () => {
  const personnes = regrouperPersonnes([
    fiche({ id: 'p1', nom: 'Ba', telephone: '771111111' }),
    fiche({ role: 'locataire', id: 'l1', nom: 'Ba', telephone: '771111111' }),
    fiche({ id: 'p2', nom: 'Camara', telephone: '772222222' }),
    fiche({ id: 'p3', nom: 'Camara', telephone: '772222222' }),
    fiche({
      role: 'proprietaire',
      id: 'o1',
      nom: 'Diop',
      telephone: '773333333',
    }),
  ]);

  it('compte une personne pour chaque rôle dont elle a une fiche', () => {
    expect(compterPersonnes(personnes)).toEqual({
      total: 3,
      prospect: 2,
      proprietaire: 1,
      locataire: 1,
      doublon: 1,
    });
  });

  it('isole un rôle ou les doublons', () => {
    expect(filtrerPersonnes(personnes, 'tous')).toHaveLength(3);
    expect(filtrerPersonnes(personnes, 'locataire').map((p) => p.nom)).toEqual([
      'Ba',
    ]);
    expect(filtrerPersonnes(personnes, 'doublon').map((p) => p.nom)).toEqual([
      'Camara',
    ]);
  });
});

describe('paginer', () => {
  const liste = Array.from({ length: 53 }, (_, i) => i + 1);

  it('découpe en pages et donne le total', () => {
    const page = paginer(liste, 2, 25);
    expect(page.items).toEqual(liste.slice(25, 50));
    expect(page).toMatchObject({ page: 2, pageSize: 25, total: 53, pages: 3 });
  });

  it('la dernière page est partielle', () => {
    expect(paginer(liste, 3, 25).items).toEqual([51, 52, 53]);
  });

  it('ramène à la dernière page quand on en demande une qui n’existe plus', () => {
    const page = paginer(liste, 9, 25);
    expect(page.page).toBe(3);
    expect(page.items).toHaveLength(3);
  });

  it('une liste vide donne une seule page vide, jamais « page 0 »', () => {
    expect(paginer([], 1, 25)).toMatchObject({
      items: [],
      page: 1,
      total: 0,
      pages: 1,
    });
    expect(paginer(liste, 0, 25).page).toBe(1);
  });
});
