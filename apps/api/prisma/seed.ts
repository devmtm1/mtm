import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Actions génériques conformes à la section 24 du cahier des charges.
const ACTIONS = [
  'consulter',
  'creer',
  'modifier',
  'valider',
  'supprimer',
  'exporter',
  'payer',
  'publier',
  'administrer',
] as const;

// Ressources couvertes par la Phase 0 uniquement.
// Les modules métier futurs ajouteront leurs propres ressources sans
// modifier ce modèle (RBAC générique resource:action).
const PHASE_0_RESOURCES = [
  'users',
  'roles',
  'permissions',
  'settings',
  'audit',
  'terrains',
];

// Rôles initiaux recommandés par la section 24 du CDC.
const INITIAL_ROLES = [
  { name: 'administrateur', description: 'Accès complet au système', isSystem: true },
  { name: 'direction', description: 'Direction MTM Immobilier' },
  { name: 'manager', description: 'Manager d’équipe' },
  { name: 'responsable_commercial', description: 'Responsable commercial' },
  { name: 'commercial', description: 'Commercial' },
  { name: 'comptable', description: 'Comptabilité' },
  { name: 'responsable_gestion_locative', description: 'Responsable gestion locative' },
  { name: 'responsable_demarches', description: 'Responsable démarches administratives' },
  { name: 'responsable_construction', description: 'Responsable construction' },
  { name: 'rh', description: 'Ressources humaines' },
];

async function main(): Promise<void> {
  console.log('Seed Phase 0 — démarrage');

  // --- Permissions ---
  const permissions = [];
  for (const resource of PHASE_0_RESOURCES) {
    for (const action of ACTIONS) {
      permissions.push({
        name: `${resource}:${action}`,
        resource,
        action,
        description: `${action} sur ${resource}`,
      });
    }
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`  ${permissions.length} permissions créées/à jour`);

  // --- Rôles ---
  for (const role of INITIAL_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`  ${INITIAL_ROLES.length} rôles créés/à jour`);

  // --- Le rôle administrateur reçoit toutes les permissions ---
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'administrateur' },
  });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }
  console.log('  Rôle administrateur : toutes permissions attribuées');

  // --- Utilisateur administrateur par défaut ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mtm-immobilier.sn';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'MTM',
      isActive: true,
      // Force le changement dès la première connexion réelle, même si
      // SEED_ADMIN_PASSWORD a été fourni explicitement.
      mustChangePassword: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`  Utilisateur administrateur : ${adminEmail}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      '  ⚠️  Mot de passe par défaut utilisé (ChangeMe!2026) — à changer immédiatement.',
    );
  }

  // --- Paramètres système de base ---
  await prisma.systemSetting.upsert({
    where: { key: 'app.name' },
    update: {},
    create: {
      key: 'app.name',
      value: 'MTM Immobilier',
      description: "Nom de l'application affiché dans le back-office",
      isSensitive: false,
    },
  });

  // --- Statuts juridiques configurables (J1.1) ---
  await prisma.systemSetting.upsert({
    where: { key: 'terrains.statutJuridique' },
    update: {},
    create: {
      key: 'terrains.statutJuridique',
      value: ['Titre foncier', 'Bail', 'Délibération', 'Morcellement', 'Régularisation en cours'],
      description: 'Liste des statuts juridiques configurables pour les terrains',
      isSensitive: false,
    },
  });

  // --- Niveaux de vérification configurables (J1.1) ---
  await prisma.systemSetting.upsert({
    where: { key: 'terrains.niveauVerification' },
    update: {},
    create: {
      key: 'terrains.niveauVerification',
      value: ['Non vérifié', 'En cours', 'Vérifié', 'À compléter'],
      description: 'Liste des niveaux de vérification configurables pour les terrains',
      isSensitive: false,
    },
  });

  // --- Statuts commerciaux configurables (J1.1) ---
  await prisma.systemSetting.upsert({
    where: { key: 'terrains.statutCommercial' },
    update: {},
    create: {
      key: 'terrains.statutCommercial',
      value: ['Brouillon', 'Disponible', 'Réservé', 'Vendu', 'Suspendu'],
      description: 'Liste des statuts commerciaux configurables pour les terrains',
      isSensitive: false,
    },
   });

  // --- Contenus marketing (J1.2) ---
  const contentBlocks = [
    { key: 'home.hero.title', title: 'Hero principal', content: 'Votre projet.\nNotre engagement.', type: 'hero', ordre: 0 },
    { key: 'home.hero.subtitle', title: 'Sous-titre hero', content: 'Terrains vérifiés, accompagnement transparent et solutions concrètes pour investir, construire et transmettre au Sénégal.', type: 'hero', ordre: 1 },
    { key: 'home.cta.title', title: 'CTA principal', content: 'Découvrir nos terrains', type: 'stat', ordre: 2 },
    { key: 'about.title', title: 'Titre À propos', content: 'Une présence locale,\nune vision ouverte.', type: 'text', ordre: 10 },
    { key: 'about.text', title: 'Texte À propos', content: 'MTM Immobilier accompagne les particuliers, les investisseurs et la diaspora dans leurs projets immobiliers au Sénégal avec une approche fondée sur la proximité et la transparence.', type: 'text', ordre: 11 },
    { key: 'testimonial.1', title: 'Témoignage 1', content: '"Terrain idéale pour mon projet de construction. L\'équipe MTM a été à l\'écoute tout au long du processus." — Aminata D. · Dakar', type: 'testimonial', ordre: 20 },
    { key: 'testimonial.2', title: 'Témoignage 2', content: '"Grâce à MTM Immobilier, j\'ai pu acquérir mon terrain à Saly en toute confiance." — Mamadou S. · Saly', type: 'testimonial', ordre: 21 },
    { key: 'testimonial.3', title: 'Témoignage 3', content: '"Professionnels et réactifs. Je recommande vivement MTM pour toute démarche foncière." — Fatou N. · Thiès', type: 'testimonial', ordre: 22 },
    { key: 'news.1.title', title: 'Actualité 1', content: 'Étapes essentielles avant d\'acheter un terrain', type: 'text', ordre: 30 },
    { key: 'news.1.tag', title: 'Tag actualité 1', content: 'Investissement', type: 'stat', ordre: 31 },
    { key: 'news.1.excerpt', title: 'Extrait actualité 1', content: 'Les points à vérifier pour avancer avec clarté.', type: 'text', ordre: 32 },
    { key: 'news.2.title', title: 'Actualité 2', content: 'Investir depuis la diaspora, simplement', type: 'text', ordre: 33 },
    { key: 'news.2.tag', title: 'Tag actualité 2', content: 'Conseil', type: 'stat', ordre: 34 },
    { key: 'news.2.excerpt', title: 'Extrait actualité 2', content: 'Les bons réflexes pour piloter un projet à distance.', type: 'text', ordre: 35 },
    { key: 'news.3.title', title: 'Actualité 3', content: 'Comprendre les statuts fonciers', type: 'text', ordre: 36 },
    { key: 'news.3.tag', title: 'Tag actualité 3', content: 'Territoire', type: 'stat', ordre: 37 },
    { key: 'news.3.excerpt', title: 'Extrait actualité 3', content: 'Un éclairage pour mieux lire les documents d\'un bien.', type: 'text', ordre: 38 },
  ];

  for (const block of contentBlocks) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      update: block,
      create: block,
    });
  }

  console.log('Seed Phase 0 — terminé');
}

main()
  .catch((error) => {
    console.error('Erreur durant le seed :', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
