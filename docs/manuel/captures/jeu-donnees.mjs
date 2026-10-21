// Données fictives de l'environnement de captures, créées par l'API elle-même (donc avec ses
// règles : numérotation, statuts, notifications). Aucun client, montant ou pièce réels.

/** Une création qui échoue est signalée, jamais fatale : les captures se font avec ce qui existe. */
async function essayer(libelle, action) {
  try {
    return await action();
  } catch (erreur) {
    console.warn(`[données] ${libelle} : ${erreur.message.slice(0, 240)}`);
    return null;
  }
}

export const jour = (decalage) => {
  const date = new Date();
  date.setDate(date.getDate() + decalage);
  return date.toISOString().slice(0, 10);
};

export const moisCourant = () => new Date().toISOString().slice(0, 7);

const PROPRIETAIRES = [
  ['Cheikh', 'Mbaye', '77 123 45 67', 'cheikh.mbaye@exemple.test'],
  ['Mariama', 'Sarr', '76 987 65 43', 'mariama.sarr@exemple.test'],
  ['Ousmane', 'Gueye', '78 555 01 02', 'ousmane.gueye@exemple.test'],
];

// [référence, nom, nature, commune, région, superficie, acquisition, public, commission, statut, propriétaire, responsable, lat, lon]
const BIENS = [
  ['T-2026-001', 'Terrain 300 m² Diamniadio, lot 12', 'terrain', 'Diamniadio', 'Dakar', 300, 6000000, 8500000, 400000, 'Disponible', 0, 'commercial', 14.7167, -17.1833],
  ['T-2026-002', 'Terrain 500 m² Sébikotane', 'terrain', 'Sébikotane', 'Dakar', 500, 9000000, 12500000, 600000, 'Disponible', 0, 'commercial', 14.75, -17.1333],
  ['T-2026-003', 'Villa F4 Saly, 180 m² habitables', 'villa', 'Saly', 'Thiès', 400, 45000000, 62000000, 3000000, 'Disponible', 1, 'commercial', 14.45, -17.0],
  ['T-2026-004', 'Appartement F3 Almadies', 'appartement', 'Almadies', 'Dakar', 120, 38000000, 49000000, 2500000, 'Disponible', 1, 'commercial', 14.7461, -17.5189],
  ['T-2026-005', 'Terrain 200 m² Rufisque', 'terrain', 'Rufisque', 'Dakar', 200, 4500000, 6200000, 300000, 'Disponible', 2, 'commercial2', 14.7167, -17.2667],
  ['T-2026-006', 'Terrain 400 m² Bambilor', 'terrain', 'Bambilor', 'Dakar', 400, 5500000, 7900000, 350000, 'Disponible', 2, 'commercial2', 14.7667, -17.2],
  ['T-2026-007', 'Villa F3 Mbour, en construction', 'villa', 'Mbour', 'Thiès', 300, 30000000, 41000000, 2000000, 'Brouillon', 1, 'commercial', 14.4167, -16.9667],
];

// [compte, prénom, nom, téléphone, e-mail, source, intérêt, zone, budgetMin, budgetMax, étapes]
const PROSPECTS = [
  ['commercial', 'Cheikh', 'Ndoye', '77 400 12 34', 'cheikh.ndoye@exemple.test', 'facebook', 'moyen', 'Diamniadio', 5000000, 9000000, []],
  ['commercial', 'Aminata', 'Ba', '76 300 22 11', 'aminata.ba@exemple.test', 'recommandation', 'fort', 'Saly', 40000000, 65000000, ['contacte']],
  ['commercial', 'Pape', 'Seck', '70 211 45 78', 'pape.seck@exemple.test', 'whatsapp', 'fort', 'Sébikotane', 8000000, 13000000, ['contacte', 'qualifie']],
  ['commercial', 'Khady', 'Fall', '77 888 90 12', 'khady.fall@exemple.test', 'site', 'tres_interesse', 'Almadies', 40000000, 52000000, ['contacte', 'qualifie', 'visite_programmee']],
  ['commercial', 'Modou', 'Diouf', '78 120 33 44', 'modou.diouf@exemple.test', 'instagram', 'tres_interesse', 'Diamniadio', 7000000, 10000000, ['contacte', 'qualifie', 'visite_programmee', 'visite_effectuee', 'negociation']],
  ['commercial', 'Sokhna', 'Thiam', '76 456 78 90', 'sokhna.thiam@exemple.test', 'recommandation', 'tres_interesse', 'Almadies', 45000000, 50000000, ['contacte', 'qualifie', 'visite_programmee', 'visite_effectuee', 'negociation', 'reservation']],
  ['commercial2', 'Ibrahima', 'Camara', '77 654 32 10', 'ibrahima.camara@exemple.test', 'facebook', 'moyen', 'Bambilor', 6000000, 8500000, ['contacte']],
  ['commercial2', 'Ndeye', 'Sy', '70 777 66 55', 'ndeye.sy@exemple.test', 'tiktok', 'fort', 'Rufisque', 5000000, 7000000, ['contacte', 'qualifie']],
];

/** Crée un jeu de données crédible pour toutes les captures. Renvoie ce dont les captures ont besoin. */
export async function peuplerDonnees({ admin, clients }) {
  const r = clients.responsable;
  const resultat = { terrains: [], prospects: [], proprietaires: [] };

  // Propriétaires, biens et mandats : posés par l'administrateur, biens affectés aux commerciaux.
  for (const [prenom, nom, tel, email] of PROPRIETAIRES) {
    resultat.proprietaires.push(await essayer(`propriétaire ${nom}`, () => admin.post('/proprietaires', { firstName: prenom, lastName: nom, phone: tel, email })));
  }
  for (const [reference, nomBien, typeBien, commune, region, superficie, acquisition, prix, commission, statut, p, qui, latitude, longitude] of BIENS) {
    const bati = typeBien === 'villa' || typeBien === 'appartement';
    resultat.terrains.push(
      await essayer(`bien ${reference}`, () =>
        admin.post('/terrains', {
          referenceInterne: reference,
          nom: nomBien,
          typeBien,
          statutJuridique: 'Titre foncier',
          niveauVerification: 'Vérifié',
          region,
          commune,
          latitude,
          longitude,
          superficie,
          prixAcquisition: acquisition,
          prixPublic: prix,
          commission,
          statutCommercial: statut,
          vocation: 'residentiel',
          description: `${nomBien} : bien situé à ${commune}, titre foncier vérifié par MTM.`,
          proprietaireId: resultat.proprietaires[p]?.id,
          commercialResponsableId: clients[qui].id,
          ...(bati ? { surfaceHabitable: Math.round(superficie * 0.45), nombrePieces: 'F3', nombreChambres: 3 } : {}),
        }),
      ),
    );
  }
  for (const [reference, index, fin] of [
    ['MAN-2026-001', 0, '2027-06-30'],
    ['MAN-2026-002', 1, jour(20)],
  ]) {
    await essayer(`mandat ${reference}`, () =>
      r.api.post('/mandats', {
        referenceInterne: reference,
        proprietaireId: resultat.proprietaires[index]?.id,
        typeMandat: 'Vente',
        dateDebut: '2026-01-15',
        dateFin: fin,
        exclusivite: index === 0,
        alerteEcheanceJours: 30,
        statut: 'Actif',
      }),
    );
  }

  // Prospects : chacun fait avancer les siens, étape par étape.
  for (const [compte, prenom, nom, telephone, email, source, interet, zone, budgetMin, budgetMax, etapes] of PROSPECTS) {
    const api = clients[compte].api;
    const prospect = await essayer(`prospect ${nom}`, () =>
      api.post('/crm/prospects', {
        prenom,
        nom,
        telephone: `+221 ${telephone}`,
        email,
        whatsapp: true,
        paysResidence: 'Sénégal',
        villeResidence: 'Dakar',
        sourceAcquisition: source,
        niveauInteret: interet,
        zoneRecherchee: zone,
        besoins: `Cherche un bien à ${zone}.`,
        budgetMin,
        budgetMax,
      }),
    );
    if (!prospect) continue;
    let numero = 0;
    for (const etape of etapes) {
      numero += 1;
      // Un prospect a une relance en retard : de quoi montrer le rouge.
      const prochaine = nom === 'Seck' && etape === 'qualifie' ? jour(-2) : jour(numero + 1);
      await essayer(`étape ${etape} de ${nom}`, () =>
        api.patch(`/crm/prospects/${prospect.id}/pipeline`, {
          statutPipeline: etape,
          prochaineAction: 'Rappeler le client',
          prochaineRelanceLe: prochaine,
        }),
      );
    }
    resultat.prospects.push({ compte, nom, ...prospect });
  }
  return resultat;
}
