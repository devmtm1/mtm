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
const PHASE_0_RESOURCES = ['users', 'roles', 'permissions', 'settings', 'audit'];

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
