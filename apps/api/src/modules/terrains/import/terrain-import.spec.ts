import {
  cartographierEntetes,
  lireDate,
  lireDisponibilite,
  lireMontant,
  lireSurface,
  lireTelephone,
  normaliserModalite,
  normaliserTitre,
  parserCsv,
  preparerImport,
  type OptionsImport,
} from './terrain-import';

const TITRES = [
  'Titre foncier',
  'Bail',
  'Délibération',
  'Notification de bail',
  'Bail individuel',
  'Délibération double tampon',
  'Délibération NICAD',
] as const;

const OPTIONS: OptionsImport = {
  titresAutorises: TITRES,
  modalitesAutorisees: ['Cash', 'Moratoire', 'Autre'],
  statutsVisiteAutorises: ['À visiter', 'Visité'],
  publierDisponibles: false,
  archives: false,
};

const ENTETE =
  "N°;MATRICUL;LOCALITE;Nbre T;TITRE JURIDIQUE;images OUI (NON);PRIX DE CESSION;PRIX;PROPRIETAIRE /MANDATAIRE;TELEPHONE;VENDU;SURFACE;MODALITE DE PAIEMENT;DATE ENTREE;DIRECT;PROTOCOLE D'ACCORD";

describe('lecture du tableur historique', () => {
  describe('normaliserTitre', () => {
    it.each([
      ['Délibération', 'Délibération'],
      ['Deliberation', 'Délibération'],
      ['DELIBERATION', 'Délibération'],
      ['Delibération nicad', 'Délibération NICAD'],
      ['DELIBERATION NICADER', 'Délibération NICAD'],
      ['Deliberation double tampon', 'Délibération double tampon'],
      ['Delberation double Tamp', 'Délibération double tampon'],
      ['BAIL', 'Bail'],
      ['BAIL en cour', 'Bail'],
      ['Bail Individuel', 'Bail individuel'],
      ['Notification', 'Notification de bail'],
    ])('« %s » devient « %s »', (brut, attendu) => {
      expect(normaliserTitre(brut, TITRES)).toBe(attendu);
    });

    it('refuse ce qu’il ne reconnaît pas plutôt que de deviner', () => {
      expect(normaliserTitre('DG', TITRES)).toBeNull();
      expect(normaliserTitre('', TITRES)).toBeNull();
    });

    it('ne produit jamais un titre que MTM n’a pas paramétré', () => {
      expect(normaliserTitre('Bail individuel', ['Bail'])).toBeNull();
    });
  });

  describe('lireMontant', () => {
    it.each([
      ['7 000 000', 7_000_000],
      ['3500000', 3_500_000],
      ['10 million', 10_000_000],
      ['2 million 700', 2_700_000],
      ['2 million 500', 2_500_000],
    ])('« %s » vaut %d', (brut, attendu) => {
      expect(lireMontant(brut).valeur).toBe(attendu);
    });

    it('garde la première valeur d’un intervalle et le signale', () => {
      const lu = lireMontant('3 000 000/3 500 000');
      expect(lu.valeur).toBe(3_000_000);
      expect(lu.avertissement).toMatch(/intervalle/);
    });

    it('écarte une faute de frappe plutôt que d’inventer un montant', () => {
      const lu = lireMontant('3 500 00');
      expect(lu.valeur).toBeNull();
      expect(lu.avertissement).toBeDefined();
    });

    it('traite une cellule vide comme une absence de valeur', () => {
      expect(lireMontant('  ')).toEqual({ valeur: null });
    });
  });

  describe('lireSurface', () => {
    it.each([
      ['150m²', 150],
      ['150m2', 150],
      ['150', 150],
      ['1200m²', 1200],
      ['7 Ha', 70_000],
    ])('« %s » vaut %d m²', (brut, attendu) => {
      expect(lireSurface(brut).valeur).toBe(attendu);
    });

    it('signale un intervalle', () => {
      const lu = lireSurface('225m²/300m²');
      expect(lu.valeur).toBe(225);
      expect(lu.avertissement).toMatch(/intervalle/);
    });

    it('ignore un point d’interrogation', () => {
      expect(lireSurface('?').valeur).toBeNull();
    });
  });

  it('lit les dates françaises et ISO, rejette le reste', () => {
    expect(lireDate('07/07/2026')).toBe('2026-07-07');
    expect(lireDate('2/12/2025')).toBe('2025-12-02');
    expect(lireDate('2026-07-07')).toBe('2026-07-07');
    expect(lireDate('31/13/2025')).toBeNull();
    expect(lireDate('bientôt')).toBeNull();
  });

  it('ne prend pas « DG » pour un téléphone', () => {
    expect(lireTelephone('77 712 35 20')).toBe('777123520');
    expect(lireTelephone('33 601 10 81 77')).toBe('33601108177');
    expect(lireTelephone('DG')).toBeNull();
    expect(lireTelephone('')).toBeNull();
  });

  it('normalise la modalité de paiement', () => {
    const ok = ['Cash', 'Moratoire', 'Autre'];
    expect(normaliserModalite('cash', ok)).toBe('Cash');
    expect(normaliserModalite('morato', ok)).toBe('Moratoire');
    expect(normaliserModalite('moratoi', ok)).toBe('Moratoire');
    expect(normaliserModalite('troc', ok)).toBeNull();
  });

  it('sépare disponibilité et suivi de visite de la colonne « Vendu »', () => {
    const visites = ['À visiter', 'Visité'];
    expect(lireDisponibilite('DISPONIBLE', visites)).toEqual({
      disponible: true,
      vendu: false,
      statutVisite: null,
    });
    expect(lireDisponibilite('A VISITER DISPONIBLE', visites)).toEqual({
      disponible: true,
      vendu: false,
      statutVisite: 'À visiter',
    });
    expect(lireDisponibilite('A VISITE', visites).statutVisite).toBe(
      'À visiter',
    );
    expect(lireDisponibilite('Vendu', visites).vendu).toBe(true);
  });

  it('lit un CSV avec guillemets, séparateur « ; » et BOM', () => {
    const lignes = parserCsv('﻿a;b;c\r\n"x;1";"dit ""oui""";\r\n');
    expect(lignes).toEqual([
      ['a', 'b', 'c'],
      ['x;1', 'dit "oui"', ''],
    ]);
  });

  it('reconnaît les colonnes du tableur', () => {
    const carte = cartographierEntetes(ENTETE.split(';'));
    expect(carte).toMatchObject({
      matricule: 1,
      localite: 2,
      nombreLots: 3,
      titre: 4,
      prixCession: 6,
      prix: 7,
      contactNom: 8,
      contactTelephone: 9,
      disponibilite: 10,
      surface: 11,
      modalitePaiement: 12,
      dateEntree: 13,
      direct: 14,
      protocole: 15,
    });
  });
});

describe('preparerImport', () => {
  const ligne = (...cellules: string[]) => cellules.join(';');
  const csv = (...lignes: string[]) =>
    parserCsv([ENTETE, ...lignes].join('\n'));

  it('prépare un bien complet sans rien publier par défaut', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '1',
          'KNL001',
          'Keur ndiaye lo',
          '1',
          'Délibération',
          'OUI',
          '7 000 000',
          '8 000 000',
          'Maty KHOULE',
          '77 712 35 20',
          'DISPONIBLE',
          '150m²',
          'cash',
          '07/07/2026',
          '',
          '',
        ),
      ),
      OPTIONS,
    );
    expect(rapport.refuses).toEqual([]);
    expect(rapport.biens).toHaveLength(1);
    expect(rapport.biens[0]).toMatchObject({
      ligne: 2,
      referenceInterne: 'KNL001',
      parcelleMatricule: 'KNL001',
      nom: 'Keur ndiaye lo',
      localisationDetail: 'Keur ndiaye lo',
      statutJuridique: 'Délibération',
      // « Disponible » dans le tableur n'est PAS publié sans demande.
      statutCommercial: 'Brouillon',
      niveauVerification: 'Non vérifié',
      nombreLots: 1,
      superficie: 150,
      uniteSuperficie: 'm²',
      prixCession: 7_000_000,
      prixPublic: 8_000_000,
      contactVendeurNom: 'Maty KHOULE',
      contactVendeurTelephone: '777123520',
      modalitePaiement: 'Cash',
      dateEntree: '2026-07-07',
      produitDirect: false,
      protocoleAccord: false,
      archive: false,
    });
  });

  it('publie les « Disponible » seulement sur demande explicite', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'A1',
          'Thiès',
          '1',
          'Bail',
          '',
          '',
          '',
          '',
          '',
          'Disponible',
          '',
          '',
          '',
          '',
          '',
        ),
      ),
      { ...OPTIONS, publierDisponibles: true },
    );
    expect(rapport.biens[0].statutCommercial).toBe('Disponible');
  });

  it('rend deux matricules identiques uniques et le signale', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'TMB',
          'Bandia',
          '7',
          'Notification',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ),
        ligne(
          '',
          'TMB',
          'Bandia',
          '6',
          'Notification',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ),
      ),
      OPTIONS,
    );
    expect(rapport.biens.map((b) => b.referenceInterne)).toEqual([
      'TMB',
      'TMB-L3',
    ]);
    expect(
      rapport.avertissements.some((a) => /déjà utilisé/.test(a.message)),
    ).toBe(true);
  });

  it('donne une référence à une ligne sans matricule', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          '',
          'noflaye',
          '30',
          'Délibération double tampon',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ),
      ),
      OPTIONS,
    );
    expect(rapport.biens[0].referenceInterne).toBe('IMP-L2');
    expect(rapport.biens[0].parcelleMatricule).toBeUndefined();
    expect(rapport.biens[0].statutJuridique).toBe('Délibération double tampon');
  });

  it('refuse une ligne sans titre reconnu et dit pourquoi', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'X1',
          'Diass',
          '1',
          'DG',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ),
      ),
      OPTIONS,
    );
    expect(rapport.biens).toEqual([]);
    expect(rapport.refuses).toEqual([
      {
        ligne: 2,
        raison: expect.stringContaining('titre juridique non reconnu « DG »'),
      },
    ]);
  });

  it('garde la saisie d’origine en note quand elle est écartée', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'P1',
          'Diamniadio',
          '?',
          'Bail',
          '',
          '',
          '3 500 00',
          '',
          'DG',
          '',
          '225m²/300m²',
          '',
          '',
          '',
          '',
        ),
      ),
      OPTIONS,
    );
    const bien = rapport.biens[0];
    expect(bien.prixPublic).toBeUndefined();
    expect(bien.contactVendeurTelephone).toBeUndefined();
    expect(bien.superficie).toBe(225);
    expect(bien.notesInternes).toContain(
      'Prix saisi dans le tableur : 3 500 00',
    );
    expect(bien.notesInternes).toContain(
      'Surface saisie dans le tableur : 225m²/300m²',
    );
    expect(bien.notesInternes).toContain(
      'Téléphone saisi dans le tableur : DG',
    );
    expect(bien.notesInternes).toContain(
      'Nombre de terrains saisi dans le tableur : ?',
    );
  });

  it('reporte le suivi de visite et le drapeau « Direct »', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'V1',
          'Thiafrour',
          '5',
          'Délibération',
          '',
          '',
          '',
          '',
          '',
          'A VISITER DISPONIBLE',
          '150m²',
          'moratoi',
          '24/09/2025',
          'DIRECT',
          'oui',
        ),
      ),
      OPTIONS,
    );
    expect(rapport.biens[0]).toMatchObject({
      statutVisite: 'À visiter',
      produitDirect: true,
      protocoleAccord: true,
      modalitePaiement: 'Moratoire',
    });
  });

  it('reprend les biens de l’onglet ARCHIVES déjà archivés', () => {
    const rapport = preparerImport(
      csv(
        ligne(
          '',
          'O1',
          'Ancien',
          '1',
          'Bail',
          '',
          '',
          '',
          '',
          '',
          'Vendu',
          '',
          '',
          '',
          '',
          '',
        ),
      ),
      { ...OPTIONS, archives: true },
    );
    expect(rapport.biens[0]).toMatchObject({
      archive: true,
      statutCommercial: 'Vendu',
    });
  });

  it('ignore les lignes vides et refuse un fichier sans les colonnes clés', () => {
    expect(preparerImport(csv(';;;;;;;;;;;;;;;'), OPTIONS).ignorees).toBe(1);
    const sansEntetes = preparerImport(parserCsv('a;b\n1;2'), OPTIONS);
    expect(sansEntetes.refuses[0].raison).toMatch(/En-têtes introuvables/);
  });
});
