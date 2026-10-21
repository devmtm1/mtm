// Suite des données fictives : visites, ventes avec paiements, objectifs, tâches, agenda, demandes du site.
import { jour, moisCourant } from './jeu-donnees.mjs';

async function essayer(libelle, action) {
  try {
    return await action();
  } catch (erreur) {
    console.warn(`[données] ${libelle} : ${erreur.message.slice(0, 700)}`);
    return null;
  }
}

const heure = (decalageJours, hhmm) => `${jour(decalageJours)}T${hhmm}:00.000Z`;

/** Les paiements d'un dossier, lus sur sa fiche (la création d'un paiement ne renvoie pas toujours sa ligne). */
async function paiementsDe(api, venteId) {
  const dossier = await essayer('lecture du dossier', () => api.get(`/ventes/${venteId}`));
  return dossier?.paiements ?? [];
}

export async function peuplerSuite({ admin, clients, donnees }) {
  const f = clients.commercial;
  const m = clients.commercial2;
  const r = clients.responsable;
  const biens = donnees.terrains;
  const prospect = (nom) => donnees.prospects.find((p) => p.nom === nom);
  const resultat = { ventes: {} };

  // Visites : une programmée pour demain, une effectuée avec son retour client.
  const khady = prospect('Fall');
  if (khady && biens[3]) {
    await essayer('visite Fall', () =>
      f.api.post(`/crm/prospects/${khady.id}/visites`, {
        terrainId: biens[3].id,
        dateProposee: jour(2),
        dateConfirmee: jour(2),
        heure: '10:30',
        lieuRendezVous: 'Almadies, devant la résidence',
      }),
    );
  }
  const modou = prospect('Diouf');
  if (modou && biens[0]) {
    await essayer('visite Diouf', () =>
      f.api.post(`/crm/prospects/${modou.id}/visites`, {
        terrainId: biens[0].id,
        dateConfirmee: jour(-3),
        heure: '09:00',
        lieuRendezVous: 'Diamniadio, lot 12',
        statut: 'effectuee',
        terrainPlait: 'oui_hesitation',
        prixAccepte: 'negociation_demandee',
        objectionPrincipale: 'prix',
        commentaireClient: 'Le terrain lui plaît, il souhaite négocier le prix.',
      }),
    );
  }

  // Ventes : une réservée (acompte validé, deuxième paiement à valider), une soldée.
  const sokhna = prospect('Thiam');
  if (sokhna && biens[3]) {
    const vente = await essayer('dossier de vente Thiam', () =>
      f.api.post('/ventes', { prospectId: sokhna.id, terrainId: biens[3].id, prixVente: 49000000, notes: 'Appartement F3 Almadies.' }),
    );
    if (vente) {
      resultat.ventes.reservee = vente;
      await essayer('réservation Thiam', () =>
        f.api.post(`/ventes/${vente.id}/reservations`, {
          montantAcompte: 5000000,
          dureeBlocageJours: 14,
          conditionsAnnulation: 'Acompte conservé si le client renonce après 7 jours.',
        }),
      );
      // La réservation crée l'acompte comme premier paiement : le responsable le valide.
      for (const paiement of await paiementsDe(f.api, vente.id)) {
        if (paiement.statut !== 'valide') {
          await essayer('validation acompte Thiam', () => r.api.post(`/ventes/${vente.id}/paiements/${paiement.id}/validate`, {}));
        }
      }
      // Un second versement reste « à valider » : de quoi montrer le bandeau orange.
      await essayer('paiement 2 Thiam', () =>
        f.api.post(`/ventes/${vente.id}/paiements`, { montant: 10000000, mode: 'virement', reference: 'VIR-20261020', datePaiement: jour(-1) }),
      );
    }
  }
  const ndeye = prospect('Sy');
  if (ndeye && biens[5]) {
    const vente = await essayer('dossier de vente Sy', () =>
      m.api.post('/ventes', { prospectId: ndeye.id, terrainId: biens[5].id, prixVente: 7900000, notes: 'Terrain Bambilor.' }),
    );
    if (vente) {
      resultat.ventes.soldee = vente;
      await essayer('réservation Sy', () =>
        m.api.post(`/ventes/${vente.id}/reservations`, { montantAcompte: 1500000, dureeBlocageJours: 10, conditionsAnnulation: 'Selon contrat.' }),
      );
      // Acompte validé, puis le solde (prix moins acompte) : le dossier peut être soldé.
      for (const paiement of await paiementsDe(m.api, vente.id)) {
        if (paiement.statut !== 'valide') {
          await essayer('validation acompte Sy', () => r.api.post(`/ventes/${vente.id}/paiements/${paiement.id}/validate`, {}));
        }
      }
      await essayer('paiement du solde Sy', () =>
        m.api.post(`/ventes/${vente.id}/paiements`, { montant: 6400000, mode: 'virement', reference: 'VIR-20261008', datePaiement: jour(-9) }),
      );
      // Un dossier « Réservé » ne valide plus de paiement : il passe d'abord en « Paiement partiel ».
      await essayer('statut paiement partiel Sy', () => r.api.post(`/ventes/${vente.id}/status`, { statut: 'paiement_partiel' }));
      for (const paiement of await paiementsDe(m.api, vente.id)) {
        if (paiement.statut !== 'valide') {
          await essayer('validation solde Sy', () => r.api.post(`/ventes/${vente.id}/paiements/${paiement.id}/validate`, {}));
        }
      }
      await essayer('statut soldé Sy', () => r.api.post(`/ventes/${vente.id}/status`, { statut: 'solde' }));
    }
  }

  // Objectifs du mois.
  for (const [client, ventes, ca, commissions] of [
    [f, 3, 60000000, 3000000],
    [m, 2, 20000000, 1000000],
  ]) {
    await essayer('objectif', () =>
      r.api.appeler('PUT', '/ventes/objectifs', {
        commercialId: client.id,
        periode: moisCourant(),
        cibleVentes: ventes,
        cibleChiffreAffaires: ca,
        cibleCommissions: commissions,
      }),
    );
  }

  // Tâches et agenda.
  for (const [titre, priorite, decalage, responsable] of [
    ['Appeler M. Seck pour le plan de masse', 'haute', -1, f],
    ['Envoyer le contrat de réservation signé', 'urgente', 0, f],
    ['Préparer la visite de l’appartement Almadies', 'moyenne', 2, f],
  ]) {
    await essayer(`tâche ${titre}`, () => f.api.post('/taches', { titre, priorite, dateLimite: jour(decalage), responsableId: responsable.id }));
  }
  await essayer('tâche Moussa', () =>
    r.api.post('/taches', { titre: 'Relancer les prospects sans nouvelles', priorite: 'moyenne', dateLimite: jour(1), responsableId: m.id }),
  );
  for (const [type, titre, lieu, decalage, hhmm] of [
    ['visite', 'Visite appartement Almadies — Mme Fall', 'Almadies', 2, '10:30'],
    ['rendez_vous', 'Signature du mandat Mbaye', 'Agence MTM', 1, '15:00'],
    ['appel', 'Rappeler M. Seck', '', 0, '17:00'],
  ]) {
    await essayer(`événement ${titre}`, () => f.api.post('/agenda/evenements', { type, titre, lieu, debut: heure(decalage, hhmm), visibilite: 'equipe' }));
  }

  // Demandes arrivées par le formulaire du site public.
  for (const [nom, email, telephone, sujet, message, bien] of [
    ['Abdoulaye Kane', 'abdoulaye.kane@exemple.test', '77 100 20 30', 'Acquérir un terrain', 'Bonjour, ce terrain est-il toujours disponible ? Je peux visiter samedi.', biens[1]],
    ['Rokhaya Diallo', 'rokhaya.diallo@exemple.test', '76 200 30 40', 'Informations', 'Bonjour, pouvez-vous me rappeler au sujet de vos villas à Saly ?', biens[2]],
    ['Boubacar Sané', 'boubacar.sane@exemple.test', '70 300 40 50', 'Acquérir un terrain', 'Je suis à l’étranger et je cherche un terrain à Diamniadio.', null],
  ]) {
    await essayer(`demande du site ${nom}`, () =>
      admin.post('/contact', { nom, email, telephone, sujet, message, ...(bien ? { terrainId: bien.id } : {}) }, { jeton: null }),
    );
  }
  return resultat;
}
