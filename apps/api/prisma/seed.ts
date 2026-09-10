import 'dotenv/config';
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

// Ressources couvertes par le système MTM.
const PHASE_1_RESOURCES = [
  'terrains',
  'mandats',
  'crm',
  'users',
  'roles',
  'settings',
  'audit',
  'content',
  'contact',
  'proprietaires',
  'ventes',
  'clients',
] as const;

// Rôles initiaux recommandés par la section 24 du CDC.
const INITIAL_ROLES = [
  { name: 'administrateur', description: 'Accès complet au système', isSystem: true },
  { name: 'direction', description: 'Direction MTM Immobilier' },
  { name: 'manager', description: "Manager d'équipe" },
  { name: 'responsable_commercial', description: 'Responsable commercial' },
  { name: 'commercial', description: 'Commercial' },
  { name: 'comptable', description: 'Comptabilité' },
  { name: 'responsable_gestion_locative', description: 'Responsable gestion locative' },
  { name: 'responsable_demarches', description: 'Responsable démarches administratives' },
  { name: 'responsable_construction', description: 'Responsable construction' },
  { name: 'rh', description: 'Ressources humaines' },
  { name: 'client', description: 'Client MTM Immobilier' },
];

async function main(): Promise<void> {
  console.log('Seed Phase 0 — démarrage');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD doit être configuré et contenir au moins 12 caractères',
    );
  }

  // --- Permissions ---
  const permissions = [
    {
      name: 'terrains:consulter_financier',
      resource: 'terrains',
      action: 'consulter_financier',
      description: "Consulter les prix d'acquisition, marges et commissions des terrains",
    },
    {
      name: 'ventes:consulter_financier',
      resource: 'ventes',
      action: 'consulter_financier',
      description: 'Consulter les montants, commissions et soldes des dossiers de vente',
    },
  ];
  for (const resource of PHASE_1_RESOURCES) {
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

  // --- Permissions CRM (J1.5) ---
  const crmPermissions = [
    { name: 'crm:consulter', resource: 'crm', action: 'consulter', description: 'Consulter les prospects et le pipeline' },
    { name: 'crm:creer', resource: 'crm', action: 'creer', description: 'Créer des prospects et activités' },
    { name: 'crm:modifier', resource: 'crm', action: 'modifier', description: 'Modifier des prospects et activités' },
    { name: 'crm:supprimer', resource: 'crm', action: 'supprimer', description: 'Supprimer des prospects et activités' },
  ];
  for (const permission of crmPermissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

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

  // --- Permissions financières ventes par rôle ---
  const ventesFinancialPermission = await prisma.permission.findUniqueOrThrow({
    where: { name: 'ventes:consulter_financier' },
  });
  for (const roleName of ['direction', 'comptable', 'manager', 'responsable_commercial']) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: ventesFinancialPermission.id } },
      update: {},
      create: { roleId: role.id, permissionId: ventesFinancialPermission.id },
    });
  }

  // --- Permissions financières terrains par rôle ---
  const financialPermission = await prisma.permission.findUniqueOrThrow({
    where: { name: 'terrains:consulter_financier' },
  });
  for (const roleName of ['direction', 'comptable', 'manager']) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: financialPermission.id } },
      update: {},
      create: { roleId: role.id, permissionId: financialPermission.id },
    });
  }

  // --- Permissions CRM par rôle métier ---
  const crmPermissionNames = ['crm:consulter', 'crm:creer', 'crm:modifier', 'crm:supprimer'];
  const commercialPermissionNames = ['crm:consulter', 'crm:creer', 'crm:modifier'];

  for (const roleName of ['manager', 'responsable_commercial']) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permissionName of crmPermissionNames) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { name: permissionName } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    console.log(`  Rôle ${roleName} : permissions CRM attribuées`);
  }

  const commercialRole = await prisma.role.findUniqueOrThrow({ where: { name: 'commercial' } });
  for (const permissionName of commercialPermissionNames) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name: permissionName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: commercialRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: commercialRole.id, permissionId: permission.id },
    });
  }
  console.log('  Rôle commercial : permissions CRM limitées attribuées');

  // --- Permissions ventes J1.6 par rôle ---
  const salesPermissionsByRole: Record<string, string[]> = {
    commercial: [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'clients:creer',
    ],
    responsable_commercial: [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'ventes:valider',
      'ventes:exporter',
      'ventes:publier',
      'clients:creer',
    ],
    manager: [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'ventes:valider',
      'ventes:exporter',
      'ventes:publier',
      'clients:creer',
    ],
    comptable: [
      'ventes:consulter',
      'ventes:modifier',
      'ventes:valider',
      'ventes:payer',
      'ventes:exporter',
    ],
    direction: [
      'ventes:consulter',
      'ventes:creer',
      'ventes:modifier',
      'ventes:valider',
      'ventes:payer',
      'ventes:exporter',
      'ventes:administrer',
      'ventes:publier',
      'clients:creer',
    ],
  };
  for (const [roleName, permissionNames] of Object.entries(salesPermissionsByRole)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { name: permissionName },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  console.log('  Permissions ventes J1.6 attribuées');

  const clientRole = await prisma.role.findUniqueOrThrow({ where: { name: 'client' } });
  for (const permissionName of ['clients:consulter']) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { name: permissionName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: clientRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: clientRole.id, permissionId: permission.id },
    });
  }

  // Les propriétaires sont nécessaires aux parcours terrains et mandats.
  // Les rôles commerciaux peuvent les consulter et en créer ; la gestion
  // complète reste réservée à l'encadrement commercial.
  const proprietorPermissionsByRole: Record<string, string[]> = {
    commercial: ['proprietaires:consulter', 'proprietaires:creer'],
    responsable_commercial: [
      'proprietaires:consulter',
      'proprietaires:creer',
      'proprietaires:modifier',
      'proprietaires:supprimer',
    ],
    manager: [
      'proprietaires:consulter',
      'proprietaires:creer',
      'proprietaires:modifier',
      'proprietaires:supprimer',
    ],
  };
  for (const [roleName, permissionNames] of Object.entries(
    proprietorPermissionsByRole,
  )) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { name: permissionName },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // --- Utilisateur administrateur par défaut ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mtm-immobilier.sn';
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

  // --- Types de mandats configurables (J1.4) ---
  await prisma.systemSetting.upsert({
    where: { key: 'mandats.typeMandat' },
    update: {},
    create: {
      key: 'mandats.typeMandat',
      value: ['Vente', 'Location', 'Gestion'],
      description: 'Liste des types de mandats configurables',
      isSensitive: false,
    },
  });

  // --- Statuts de mandats configurables (J1.4) ---
  await prisma.systemSetting.upsert({
    where: { key: 'mandats.statut' },
    update: {},
    create: {
      key: 'mandats.statut',
      value: ['Brouillon', 'Actif', 'Expiré', 'Résilié', 'Clôturé'],
      description: 'Liste des statuts configurables pour les mandats',
      isSensitive: false,
    },
  });

  // --- Statuts de lots de mandats configurables (J1.4) ---
  await prisma.systemSetting.upsert({
    where: { key: 'mandats.statutLot' },
    update: {},
    create: {
      key: 'mandats.statutLot',
      value: ['Confie', 'Disponible', 'Réservé', 'Vendu'],
      description: 'Liste des statuts configurables pour les lots de mandats',
      isSensitive: false,
    },
  });

  // --- Types de documents de mandats configurables (J1.4) ---
  await prisma.systemSetting.upsert({
    where: { key: 'mandats.documentTypes' },
    update: {},
    create: {
      key: 'mandats.documentTypes',
      value: [
        'contrat',
        'avenant',
        'preuve_signature',
        'correspondance',
        'justificatif',
        'autre',
      ],
      description: 'Liste des types de documents contractuels pour les mandats',
      isSensitive: false,
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'mandats.commissionRate' },
    update: {},
    create: {
      key: 'mandats.commissionRate',
      value: 5,
      description: 'Taux de commission par défaut des mandats, en pourcentage',
      isSensitive: true,
    },
  });

  // --- Pipeline CRM configurable (J1.5) ---
  await prisma.systemSetting.upsert({
    where: { key: 'crm.pipelineStages' },
    update: {},
    create: {
      key: 'crm.pipelineStages',
      value: [
        'nouveau_contact',
        'qualification',
        'proposition',
        'visite',
        'negociation',
        'reservation',
        'vente',
        'perdu',
      ],
      description: 'Étapes configurables du pipeline commercial CRM',
      isSensitive: false,
    },
  });

  // --- Types d'activités CRM configurables (J1.5) ---
  await prisma.systemSetting.upsert({
    where: { key: 'crm.activiteTypes' },
    update: {},
    create: {
      key: 'crm.activiteTypes',
      value: ['appel', 'rendez-vous', 'tache', 'relance', 'email', 'note'],
      description: 'Types d\'activités CRM disponibles',
      isSensitive: false,
    },
  });

  // --- Statuts d'activités CRM configurables (J1.5) ---
  await prisma.systemSetting.upsert({
    where: { key: 'crm.activiteStats' },
    update: {},
    create: {
      key: 'crm.activiteStats',
      value: ['a_faire', 'realise', 'reporte', 'annule'],
      description: 'Statuts disponibles pour les activités CRM',
      isSensitive: false,
    },
  });

  // --- Priorités d'activités CRM configurables (J1.5) ---
  await prisma.systemSetting.upsert({
    where: { key: 'crm.priorites' },
    update: {},
    create: {
      key: 'crm.priorites',
      value: ['basse', 'moyenne', 'haute'],
      description: 'Niveaux de priorité pour les activités CRM',
      isSensitive: false,
    },
  });

  // --- Types de documents CRM (J1.5) ---
  await prisma.systemSetting.upsert({
    where: { key: 'crm.documentTypes' },
    update: {},
    create: {
      key: 'crm.documentTypes',
      value: [
        'contrat',
        'avenant',
        'preuve_signature',
        'correspondance',
        'justificatif',
        'autre',
      ],
      description: 'Types de documents CRM disponibles',
      isSensitive: false,
    },
  });

  // --- Statuts de vente configurables (J1.6) ---
  await prisma.systemSetting.upsert({
    where: { key: 'ventes.statuts' },
    update: {},
    create: {
      key: 'ventes.statuts',
      value: [
        'en_cours',
        'pre_reserve',
        'reserve',
        'paiement_partiel',
        'solde',
        'annule',
      ],
      description: 'Statuts configurables des dossiers de vente',
      isSensitive: false,
    },
  });

  // --- Transitions autorisées entre statuts de vente (J1.6) ---
  await prisma.systemSetting.upsert({
    where: { key: 'ventes.transitions' },
    update: {},
    create: {
      key: 'ventes.transitions',
      value: {
        en_cours: ['pre_reserve', 'reserve', 'annule'],
        pre_reserve: ['reserve', 'en_cours', 'annule'],
        reserve: ['paiement_partiel', 'en_cours', 'annule'],
        paiement_partiel: ['solde', 'annule'],
        solde: [],
        annule: ['en_cours'],
      },
      description: 'Matrice des transitions autorisées entre statuts de vente',
      isSensitive: false,
    },
  });

  // --- Modes de paiement autorisés (J1.6) ---
  await prisma.systemSetting.upsert({
    where: { key: 'paiements.modesAutorises' },
    update: {},
    create: {
      key: 'paiements.modesAutorises',
      value: ['especes', 'virement', 'en_ligne'],
      description: 'Modes de paiement autorisés pour les ventes',
      isSensitive: false,
    },
  });

  // --- Types de documents de vente configurables (J1.6) ---
  await prisma.systemSetting.upsert({
    where: { key: 'ventes.documentTypes' },
    update: {},
    create: {
      key: 'ventes.documentTypes',
      value: [
        'bon_reservation',
        'recu',
        'facture',
        'contrat',
        'etat_paiement',
        'justificatif',
        'autre',
      ],
      description: 'Types de documents générables pour les ventes',
      isSensitive: false,
    },
  });

  // --- Nombre d\'échéances par défaut pour les ventes (J1.6) ---
  await prisma.systemSetting.upsert({
    where: { key: 'ventes.echeancesDefaut' },
    update: {},
    create: {
      key: 'ventes.echeancesDefaut',
      value: 3,
      description: 'Nombre d\'échéances par défaut lors de la création d\'un dossier de vente',
      isSensitive: false,
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'ventes.reglesCommissions' },
    update: {},
    create: {
      key: 'ventes.reglesCommissions',
      value: [
        {
          id: 'commission-standard',
          typeRegle: 'pourcentage',
          taux: 2.5,
          description: 'Commission standard : 2,5 % du prix de vente',
        },
        {
          id: 'commission-forfait',
          typeRegle: 'montant_fixe',
          montantFixe: 500000,
          description: 'Commission forfaitaire : 500 000 FCFA',
        },
        {
          id: 'commission-palier',
          typeRegle: 'pourcentage',
          taux: 2,
          palier: 10000000,
          bonus: 200000,
          description: 'Commission avec palier : 2 % + 200 000 FCFA bonus au-delà de 10 M FCFA',
        },
      ],
      description: 'Règles de commission configurables par l’administrateur',
      isSensitive: true,
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
      // Les contenus peuvent être personnalisés depuis le back-office.
      // Le seed ne doit jamais remplacer une valeur existante.
      update: {},
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
