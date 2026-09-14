// Jeu de données pour le parcours Comptable : un dossier réservé avec un
// paiement en attente de validation, porté par Fallou (commercial).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const fallou = await prisma.user.findUniqueOrThrow({ where: { email: 'fallou@gmail.com' } });
  const terrain = await prisma.terrain.create({
    data: { referenceInterne: 'T-CPTTEST', nom: 'Terrain CPTTEST', statutJuridique: 'Titre foncier', niveauVerification: 'Vérifié', statutCommercial: 'Réservé', region: 'Dakar', commune: 'Yoff', superficie: 250, prixPublic: 6000000, prixAcquisition: 4500000, marge: 1500000, commercialResponsableId: fallou.id },
  });
  const prospect = await prisma.prospect.create({ data: { nom: 'CPTTEST Client', prenom: 'Mame', telephone: '+221770000095', email: 'cpttest-client@mtm.test', statutPipeline: 'reservation', commercialResponsableId: fallou.id } });
  const dossier = await prisma.dossierVente.create({
    data: { prospectId: prospect.id, terrainId: terrain.id, commercialResponsableId: fallou.id, referenceInterne: 'DV-CPTTEST', prixVente: 6000000, statut: 'reserve' },
  });
  const now = new Date();
  await prisma.reservation.create({ data: { dossierVenteId: dossier.id, montantAcompte: 500000, dureeBlocageJours: 30, dateDebut: now, dateExpiration: new Date(now.getTime() + 30 * 86400000), statut: 'active', reference: 'RES-CPTTEST', createdById: fallou.id } });
  await prisma.paiement.create({ data: { dossierVenteId: dossier.id, montant: 500000, mode: 'acompte', statut: 'valide', datePaiement: now, recordedById: fallou.id, notes: 'Acompte de réservation' } });
  await prisma.paiement.create({ data: { dossierVenteId: dossier.id, montant: 1500000, mode: 'virement', statut: 'en_attente', reference: 'VIR-CPT-001', datePaiement: now, recordedById: fallou.id } });
  for (let i = 1; i <= 3; i++) {
    await prisma.echeancePaiement.create({ data: { dossierVenteId: dossier.id, numero: i, dateEcheance: new Date(now.getTime() + i * 30 * 86400000), montantPrevu: 2000000, montantPaye: 0, statut: i === 1 ? 'en_attente' : 'planifiee' } });
  }
  console.log('dossier de test créé', dossier.id);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
