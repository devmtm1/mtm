/**
 * Ouvre des espaces clients de démonstration (environnement local jetable) : un propriétaire d'une villa de quatre
 * logements, un propriétaire de biens seuls, une locataire avec un bail impayé, deux acheteurs avec un dossier de vente
 * et un chantier. Chaque compte a déjà choisi son mot de passe : on peut s'y connecter tout de suite.
 *
 * Rien n'est écrit ailleurs que dans la base fictive de `npm run dev:local`.
 */
const MOT_DE_PASSE_PROVISOIRE = 'Provisoire-2026!a';
export const MOT_DE_PASSE_CLIENT = 'Client-2026!abc';

const jour = (decalage) => new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);
const liste = (reponse) => reponse?.items ?? reponse ?? [];

async function essayer(libelle, action) {
  try {
    return await action();
  } catch (erreur) {
    console.warn(`  (ignoré) ${libelle} : ${String(erreur.message).slice(0, 400)}`);
    return null;
  }
}

/** Le compte vient d'être créé avec un mot de passe provisoire : son titulaire le remplace, comme à la première connexion. */
async function activer(urlApi, email) {
  const reponse = await fetch(`${urlApi}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: MOT_DE_PASSE_PROVISOIRE }),
  });
  const { accessToken } = await reponse.json();
  if (!accessToken) throw new Error(`connexion impossible pour ${email}`);
  const changement = await fetch(`${urlApi}/auth/change-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ currentPassword: MOT_DE_PASSE_PROVISOIRE, newPassword: MOT_DE_PASSE_CLIENT }),
  });
  if (!changement.ok) throw new Error(`mot de passe non changé pour ${email} (${changement.status})`);
}

/** @returns {Promise<{ email: string, role: string }[]>} les comptes ouverts, à afficher dans la console. */
export async function ouvrirEspacesClients({ api, urlApi }) {
  const comptes = [];
  const ouvrir = async (libelle, creer, email, role) => {
    const compte = await essayer(`compte ${libelle}`, () => creer());
    if (!compte) return;
    await essayer(`activation ${libelle}`, () => activer(urlApi, email));
    comptes.push({ email, role });
  };
  const creerCompte = (chemin) => () => api.post(chemin, { password: MOT_DE_PASSE_PROVISOIRE });

  // Propriétaires : ceux de la démonstration (la villa de quatre logements, des biens seuls).
  const proprietaires = liste(await essayer('liste des propriétaires', () => api.get('/proprietaires')));
  const roles = { Mbaye: 'Propriétaire : villa de 4 logements et biens seuls', Gueye: 'Propriétaire : 2 biens, dont celui de la locataire', Sarr: 'Propriétaire : 2 biens' };
  for (const proprietaire of proprietaires) {
    const email = `${proprietaire.firstName}.${proprietaire.lastName}@exemple.test`.toLowerCase();
    await ouvrir(`propriétaire ${proprietaire.lastName}`, creerCompte(`/proprietaires/${proprietaire.id}/compte-client`), email, roles[proprietaire.lastName] ?? 'Propriétaire');
  }

  // Locataire : un bail commencé il y a cent jours, aucun loyer réglé (retard visible dans l'espace).
  const gueye = proprietaires.find((p) => p.lastName === 'Gueye');
  const biens = liste(await essayer('liste des biens', () => api.get('/locatif/biens?pageSize=100')));
  const bien = biens.find((b) => (b.proprietaireId === gueye?.id || b.proprietaire?.id === gueye?.id) && b.modeLocation !== 'courte_duree');
  if (bien) {
    const locataire = await essayer('locataire', () =>
      api.post('/locatif/locataires', { firstName: 'Aminata', lastName: 'Diallo', email: 'aminata.diallo@exemple.test', phone: '77 000 11 22' }),
    );
    if (locataire) {
      await essayer('bail', () =>
        api.post(`/locatif/biens/${bien.id}/baux`, { locataireId: locataire.id, loyerMensuel: 250000, charges: 15000, jourEcheance: 5, dateDebut: jour(-100), cautionMontant: 500000 }),
      );
      await ouvrir('locataire', creerCompte(`/locatif/locataires/${locataire.id}/compte-client`), 'aminata.diallo@exemple.test', 'Locataire : bail avec 4 loyers impayés');
    }
  }

  // La villa de Cheikh Mbaye : deux appartements loués depuis plus de deux mois, le premier a payé ses loyers, le
  // second pas tout à fait. De quoi lire un relevé de propriété avec des chiffres.
  const immeubles = liste(await essayer('liste des propriétés', () => api.get('/locatif/immeubles')));
  const villa = immeubles.find((immeuble) => String(immeuble.nom).includes('Fall'));
  const detailVilla = villa ? await essayer('fiche de la villa', () => api.get(`/locatif/immeubles/${villa.id}`)) : null;
  const locatairesVilla = [
    ['Moussa', 'Sarr', 150000, 3],
    ['Fatima', 'Ndiaye', 180000, 1],
  ];
  for (const [index, [prenom, nom, loyer, loyersPayes]] of locatairesVilla.entries()) {
    const logement = detailVilla?.logements?.[index];
    if (!logement) continue;
    const locataire = await essayer(`locataire ${nom}`, () => api.post('/locatif/locataires', { firstName: prenom, lastName: nom }));
    const bail = locataire && (await essayer(`bail ${nom}`, () => api.post(`/locatif/biens/${logement.id}/baux`, { locataireId: locataire.id, loyerMensuel: loyer, jourEcheance: 5, dateDebut: jour(-70) })));
    for (let mois = 0; bail && mois < loyersPayes; mois += 1) {
      const paiement = await essayer(`loyer ${nom}`, () => api.post(`/locatif/baux/${bail.id}/paiements`, { type: 'normal', montant: loyer, modePaiement: 'virement', datePaiement: jour(-60 + mois * 30) }));
      if (paiement?.id) await essayer(`validation loyer ${nom}`, () => api.post(`/locatif/baux/${bail.id}/paiements/${paiement.id}/valider`, {}));
    }
  }

  // Acheteurs : un dossier réservé avec acompte, un autre avec son premier versement ; un chantier pour la première.
  const prospects = liste(await essayer('liste des prospects', () => api.get('/crm/prospects?pageSize=100')));
  const terrains = liste(await essayer('liste des terrains', () => api.get('/terrains?pageSize=20')));
  const acheteurs = [
    ['Thiam', 'sokhna.thiam@exemple.test', 49_000_000, 5_000_000, 'Acheteuse : dossier réservé (acompte de 5 M FCFA) et un chantier'],
    ['Sy', 'ndeye.sy@exemple.test', 7_900_000, 1_500_000, 'Acheteuse : dossier réservé (acompte de 1,5 M FCFA)'],
  ];
  for (const [nom, email, prix, acompte, role] of acheteurs) {
    const prospect = prospects.find((p) => p.nom === nom);
    if (!prospect) continue;
    await ouvrir(`acheteur ${nom}`, () => api.post('/ventes/client-accounts', { prospectId: prospect.id, password: MOT_DE_PASSE_PROVISOIRE }), email, role);
    for (const terrain of terrains) {
      const vente = await essayer(`vente ${nom}`, () => api.post('/ventes', { prospectId: prospect.id, terrainId: terrain.id, prixVente: prix }));
      if (!vente) continue;
      await essayer(`réservation ${nom}`, () =>
        api.post(`/ventes/${vente.id}/reservations`, { montantAcompte: acompte, dureeBlocageJours: 10, conditionsAnnulation: 'Selon contrat.' }),
      );
      await essayer(`paiement ${nom}`, () =>
        api.post(`/ventes/${vente.id}/paiements`, { montant: acompte, mode: 'virement', reference: `VIR-${nom.toUpperCase()}`, datePaiement: jour(-1) }),
      );
      break;
    }
    if (nom === 'Thiam') {
      await essayer('chantier', () =>
        api.post('/construction/chantiers', { clientId: prospect.id, intitule: 'Villa R+1 à Diamniadio', typeProjet: 'villa', commune: 'Diamniadio', region: 'Dakar' }),
      );
    }
  }
  return comptes;
}
