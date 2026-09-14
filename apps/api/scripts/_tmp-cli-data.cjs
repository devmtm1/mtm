// Jeu de données pour le parcours Client : un prospect (suivi par le
// commercial de test) avec un dossier en paiement partiel, un échéancier,
// et des demandes déposées depuis le site public avec le même e-mail.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const commercial = await prisma.user.findUniqueOrThrow({ where: { email: 'test-commercial@mtm.test' } });
  const terrain = await prisma.terrain.create({
    data: { referenceInterne: 'T-CLITEST', nom: 'Terrain CLITEST', statutJuridique: 'Titre foncier', niveauVerification: 'Vérifié', statutCommercial: 'Réservé', region: 'Thiès', commune: 'Mbour', superficie: 300, prixPublic: 9000000, prixAcquisition: 6000000, marge: 3000000, commercialResponsableId: commercial.id },
  });
  const prospect = await prisma.prospect.create({ data: { nom: 'CLITEST Client', prenom: 'Awa', telephone: '+221770000097', email: 'clitest-client@mtm.test', statutPipeline: 'reservation', commercialResponsableId: commercial.id } });
  const dossier = await prisma.dossierVente.create({
    data: { prospectId: prospect.id, terrainId: terrain.id, commercialResponsableId: commercial.id, referenceInterne: 'DV-CLITEST', prixVente: 9000000, statut: 'paiement_partiel' },
  });
  const now = new Date();
  await prisma.reservation.create({ data: { dossierVenteId: dossier.id, montantAcompte: 1000000, dureeBlocageJours: 45, dateDebut: now, dateExpiration: new Date(now.getTime() + 45 * 86400000), statut: 'active', reference: 'RES-CLITEST', createdById: commercial.id } });
  await prisma.paiement.create({ data: { dossierVenteId: dossier.id, montant: 1000000, mode: 'acompte', statut: 'valide', datePaiement: now, recordedById: commercial.id, notes: 'Acompte de réservation' } });
  await prisma.paiement.create({ data: { dossierVenteId: dossier.id, montant: 2000000, mode: 'virement', statut: 'valide', reference: 'VIR-CLI-001', datePaiement: now, recordedById: commercial.id } });
  await prisma.paiement.create({ data: { dossierVenteId: dossier.id, montant: 500000, mode: 'especes', statut: 'en_attente', reference: 'ESP-CLI-002', datePaiement: now, recordedById: commercial.id } });
  for (let i = 1; i <= 4; i++) {
    const paye = i === 1 ? 2000000 : i === 2 ? 1000000 : 0;
    await prisma.echeancePaiement.create({ data: { dossierVenteId: dossier.id, numero: i, dateEcheance: new Date(now.getTime() + i * 30 * 86400000), montantPrevu: 2000000, montantPaye: paye, statut: paye >= 2000000 ? 'payee' : paye > 0 ? 'partielle' : 'planifiee' } });
  }
  await prisma.contact.create({ data: { nom: 'Awa CLITEST Client', email: 'clitest-client@mtm.test', telephone: '+221770000097', sujet: 'Question sur le bornage', message: 'Bonjour, le bornage du terrain est-il déjà fait ?', terrainId: terrain.id } });
  await prisma.reservationRequest.create({ data: { terrainId: terrain.id, nom: 'Awa CLITEST Client', email: 'clitest-client@mtm.test', telephone: '+221770000097', message: 'Je souhaite réserver ce terrain.', statut: 'nouvelle' } }).catch(async (e) => { console.log('reservationRequest :', e.message.split('\n').pop()); });
  console.log('données CLITEST créées', { prospect: prospect.id, dossier: dossier.id });
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
