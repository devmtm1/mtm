import { Routes } from '@angular/router';
import { Shell } from './layout/shell';
import { authGuard } from './core/guards/auth.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { permissionsGuard } from './core/guards/permissions.guard';
import { twoFactorGuard } from './core/guards/two-factor.guard';
import { modificationsNonEnregistreesGuard } from './core/guards/modifications-non-enregistrees.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'password-reset',
    title: 'Mot de passe oublié',
    loadComponent: () =>
      import('./features/auth/password-reset/password-reset').then((m) => m.PasswordReset),
  },
  {
    path: 'change-password',
    title: 'Nouveau mot de passe',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password').then(
        (m) => m.ChangePassword,
      ),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard, passwordChangeGuard],
    canActivateChild: [twoFactorGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Tableau de bord',
        data: { preload: true },
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'security',
        title: 'Sécurité du compte',
        loadComponent: () =>
          import('./features/security/security').then((m) => m.Security),
      },
      {
        path: 'users',
        title: 'Utilisateurs',
        canActivate: [permissionsGuard(['users:consulter'])],
        loadComponent: () =>
          import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'terrains/import',
        title: 'Importer des biens',
        canActivate: [permissionsGuard(['terrains:creer'])],
        loadComponent: () =>
          import('./features/terrains/terrain-import/terrain-import').then(
            (m) => m.TerrainImport,
          ),
      },
      {
        path: 'terrains/nouveau',
        title: 'Nouveau bien',
        canActivate: [permissionsGuard(['terrains:creer'])],
        loadComponent: () =>
          import('./features/terrains/terrain-form/terrain-form').then(
            (m) => m.TerrainForm,
          ),
      },
      {
        path: 'terrains/:id/modifier',
        title: 'Modifier le bien',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['terrains:modifier'])],
        loadComponent: () =>
          import('./features/terrains/terrain-form/terrain-form').then(
            (m) => m.TerrainForm,
          ),
      },
      {
        path: 'terrains/:id',
        title: 'Fiche du bien',
        data: { preload: true },
        canActivate: [permissionsGuard(['terrains:consulter'])],
        loadComponent: () =>
          import('./features/terrains/terrain-detail/terrain-detail').then(
            (m) => m.TerrainDetail,
          ),
      },
      {
        path: 'terrains',
        title: 'Biens à vendre',
        data: { preload: true },
        canActivate: [permissionsGuard(['terrains:consulter'])],
        loadComponent: () =>
          import('./features/terrains/terrains').then((m) => m.Terrains),
      },
      {
        path: 'roles',
        title: 'Rôles et accès',
        canActivate: [permissionsGuard(['roles:consulter'])],
        loadComponent: () =>
          import('./features/roles/roles').then((m) => m.Roles),
      },
      {
        path: 'finances/tresorerie',
        title: 'Trésorerie',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/tresorerie').then((m) => m.Tresorerie),
      },
      {
        path: 'finances/rapprochement',
        title: 'Rapprochement bancaire',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/rapprochement').then((m) => m.RapprochementBancaire),
      },
      {
        path: 'finances/reversements',
        title: 'Reversements',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/reversements').then((m) => m.Reversements),
      },
      {
        path: 'finances/remboursements',
        title: 'Remboursements',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/remboursements').then((m) => m.Remboursements),
      },
      {
        path: 'finances/chantiers/:id',
        title: 'Finances du chantier',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/chantier-finance-fiche').then((m) => m.ChantierFinanceFiche),
      },
      {
        path: 'finances/chantiers',
        title: 'Finances des chantiers',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/chantiers-finance').then((m) => m.ChantiersFinance),
      },
      {
        path: 'finances/etats',
        title: 'États financiers',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/etats').then((m) => m.EtatsFinanciers),
      },
      {
        path: 'finances/rapport-quotidien',
        title: 'Rapport quotidien',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/rapport-quotidien').then((m) => m.RapportQuotidienPage),
      },
      {
        path: 'finances/journal',
        title: 'Journal comptable',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/journal').then((m) => m.JournalFinancier),
      },
      {
        path: 'finances/operations',
        title: 'Opérations',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/operations').then((m) => m.OperationsFinancieres),
      },
      {
        path: 'finances/clotures',
        title: 'Clôtures',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/clotures').then((m) => m.CloturesFinancieres),
      },
      {
        path: 'finances',
        title: 'Finances',
        canActivate: [permissionsGuard(['finances:consulter'])],
        loadComponent: () => import('./features/finances/tableau-financier').then((m) => m.TableauFinancierPage),
      },
      {
        path: 'pilotage/reglages',
        title: 'Réglages du pilotage',
        canActivate: [permissionsGuard(['rapports:administrer'])],
        loadComponent: () => import('./features/pilotage/reglages-pilotage').then((m) => m.ReglagesPilotageComponent),
      },
      {
        path: 'rapports',
        title: 'Rapports',
        canActivate: [permissionsGuard(['rapports:consulter'])],
        loadComponent: () => import('./features/rapports/rapports').then((m) => m.Rapports),
      },
      {
        path: 'agenda',
        title: 'Agenda',
        data: { preload: true },
        canActivate: [permissionsGuard(['agenda:consulter'])],
        loadComponent: () => import('./features/agenda/agenda').then((m) => m.Agenda),
      },
      {
        path: 'taches',
        title: 'Tâches',
        data: { preload: true },
        canActivate: [permissionsGuard(['taches:consulter'])],
        loadComponent: () => import('./features/taches/taches').then((m) => m.Taches),
      },
      {
        path: 'notifications/regles',
        title: 'Règles de notification',
        canActivate: [permissionsGuard(['notifications:administrer'])],
        loadComponent: () =>
          import('./features/notifications/regles-notification').then((m) => m.ReglesNotification),
      },
      {
        path: 'notifications',
        title: 'Notifications',
        data: { preload: true },
        loadComponent: () =>
          import('./features/notifications/mes-notifications').then((m) => m.MesNotifications),
      },
      {
        path: 'workflows',
        title: 'Workflows',
        canActivate: [permissionsGuard(['settings:consulter'])],
        loadComponent: () => import('./features/workflows/workflows').then((m) => m.Workflows),
      },
      {
        path: 'entreprise',
        title: 'Entreprise',
        canActivate: [permissionsGuard(['settings:consulter'])],
        loadComponent: () =>
          import('./features/entreprise/entreprise').then((m) => m.Entreprise),
      },
      {
        path: 'settings',
        title: 'Réglages',
        canActivate: [permissionsGuard(['settings:consulter'])],
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'contacts',
        title: 'Demandes du site',
        canActivate: [permissionsGuard(['contact:consulter'])],
        loadComponent: () =>
          import('./features/contacts/contacts').then((m) => m.Contacts),
      },
      {
        path: 'audit',
        title: 'Journal d’audit',
        canActivate: [permissionsGuard(['audit:consulter'])],
        loadComponent: () =>
          import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'statistiques',
        title: 'Fréquentation du site',
        canActivate: [permissionsGuard(['statistiques:consulter'])],
        loadComponent: () => import('./features/statistiques/statistiques').then((m) => m.Statistiques),
      },
      {
        path: 'content',
        title: 'Contenus du site',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/content-blocks').then((m) => m.ContentBlocks),
      },
      {
        path: 'content/showcase',
        title: 'Réalisations et projets',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/showcase-items/showcase-items').then(
            (m) => m.ShowcaseItems,
          ),
      },
      {
        path: 'content/actualites',
        title: 'Actualités et conseils',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/publications/publications').then((m) => m.Publications),
      },
      {
        path: 'content/promotions',
        title: 'Publicités du bandeau',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/promotions/promotions').then((m) => m.Promotions),
      },
      {
        path: 'content/equipe',
        title: 'Équipe du site',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/team/team').then((m) => m.Team),
      },
      {
        path: 'mandats/nouveau',
        title: 'Nouveau mandat',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['mandats:creer'])],
        loadComponent: () =>
          import('./features/mandats/mandat-form/mandat-form').then(
            (m) => m.MandatForm,
          ),
      },
      {
        path: 'mandats/:id/modifier',
        title: 'Modifier le mandat',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['mandats:modifier'])],
        loadComponent: () =>
          import('./features/mandats/mandat-form/mandat-form').then(
            (m) => m.MandatForm,
          ),
      },
      {
        path: 'mandats/:id',
        title: 'Fiche du mandat',
        canActivate: [permissionsGuard(['mandats:consulter'])],
        loadComponent: () =>
          import('./features/mandats/mandat-detail/mandat-detail').then(
            (m) => m.MandatDetail,
          ),
      },
      {
        path: 'mandats',
        title: 'Mandats',
        data: { preload: true },
        canActivate: [permissionsGuard(['mandats:consulter'])],
        loadComponent: () =>
          import('./features/mandats/mandats/mandats').then(
            (m) => m.Mandats,
          ),
      },
      {
        path: 'proprietaires',
        title: 'Propriétaires',
        data: { preload: true },
        canActivate: [permissionsGuard(['proprietaires:consulter'])],
        loadComponent: () =>
          import('./features/proprietaires/proprietaires').then(
            (m) => m.Proprietaires,
          ),
      },
      {
        path: 'proprietaires/:id',
        title: 'Fiche du propriétaire',
        canActivate: [permissionsGuard(['proprietaires:consulter'])],
        loadComponent: () =>
          import('./features/proprietaires/proprietaire-detail/proprietaire-detail').then(
            (m) => m.ProprietaireDetail,
          ),
      },
      {
        path: 'crm/prospects/nouveau',
        title: 'Nouveau prospect',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['crm:creer'])],
        loadComponent: () =>
          import('./features/crm/prospect-form/prospect-form').then(
            (m) => m.ProspectForm,
          ),
      },
      // Routes fixes d'abord : « ventes/:id » capturerait « objectifs » et « documents ».
      {
        path: 'documents',
        title: 'Documents',
        loadComponent: () =>
          import('./features/documents/documents').then((m) => m.DocumentsPage),
      },
      {
        path: 'ventes/commissions',
        title: 'Commissions',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () => import('./features/ventes/commissions/mes-commissions').then((m) => m.MesCommissionsComponent),
      },
      {
        path: 'ventes/objectifs',
        title: 'Objectifs de vente',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/objectifs/objectifs').then((m) => m.Objectifs),
      },
      {
        path: 'ventes/documents',
        title: 'Documents de vente',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/documents/documents').then(
            (m) => m.VenteDocumentsPage,
          ),
      },
      {
        path: 'ventes/:id',
        title: 'Dossier de vente',
        data: { preload: true },
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/vente-detail/vente-detail').then(
            (m) => m.VenteDetailPage,
          ),
      },
      {
        path: 'ventes',
        title: 'Dossiers de vente',
        data: { preload: true },
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/ventes').then((m) => m.Ventes),
      },
      {
        path: 'crm/prospects/:id/modifier',
        title: 'Modifier le prospect',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['crm:modifier'])],
        loadComponent: () =>
          import('./features/crm/prospect-form/prospect-form').then(
            (m) => m.ProspectForm,
          ),
      },
      // L'ancienne « vue 360° » est intégrée à la fiche prospect.
      { path: 'crm/prospects/:id/360', redirectTo: 'crm/prospects/:id' },
      {
        path: 'crm/prospects/:id',
        title: 'Fiche du prospect',
        data: { preload: true },
        canActivate: [permissionsGuard(['crm:consulter'])],
        loadComponent: () =>
          import('./features/crm/prospect-detail/prospect-detail').then(
            (m) => m.ProspectDetail,
          ),
      },
      {
        path: 'demarches/missions/nouvelle',
        title: 'Nouvelle mission',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['demarches:creer'])],
        loadComponent: () =>
          import('./features/demarches/mission-form/mission-form').then(
            (m) => m.MissionForm,
          ),
      },
      {
        path: 'demarches/missions/:id',
        title: 'Mission de vérification',
        canActivate: [permissionsGuard(['demarches:consulter'])],
        loadComponent: () =>
          import('./features/demarches/mission-detail/mission-detail').then(
            (m) => m.MissionDetail,
          ),
      },
      {
        path: 'demarches/missions',
        title: 'Vérifications et démarches',
        canActivate: [permissionsGuard(['demarches:consulter'])],
        loadComponent: () =>
          import('./features/demarches/missions/missions').then((m) => m.Missions),
      },
      {
        path: 'locatif/immeubles/nouveau',
        title: 'Nouvelle propriété',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['locatif:creer'])],
        loadComponent: () =>
          import('./features/locatif/immeubles/immeuble-form/immeuble-form').then((m) => m.ImmeubleForm),
      },
      {
        path: 'locatif/immeubles/:id/modifier',
        title: 'Modifier la propriété',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['locatif:modifier'])],
        loadComponent: () =>
          import('./features/locatif/immeubles/immeuble-form/immeuble-form').then((m) => m.ImmeubleForm),
      },
      {
        path: 'locatif/immeubles/:id',
        title: 'Fiche de la propriété',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/immeubles/immeuble-detail/immeuble-detail').then(
            (m) => m.ImmeubleDetailPage,
          ),
      },
      {
        path: 'locatif/immeubles',
        title: 'Propriétés',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/immeubles/immeubles').then((m) => m.Immeubles),
      },
      {
        path: 'locatif/biens/nouveau',
        title: 'Nouveau bien locatif',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['locatif:creer'])],
        loadComponent: () =>
          import('./features/locatif/bien-form/bien-form').then((m) => m.BienForm),
      },
      {
        path: 'locatif/biens/:id',
        title: 'Fiche du bien locatif',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/bien-detail/bien-detail').then(
            (m) => m.BienDetailPage,
          ),
      },
      {
        path: 'locatif/biens',
        title: 'Gestion locative',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/biens/biens').then((m) => m.Biens),
      },
      {
        path: 'locatif/sejours/:id',
        title: 'Séjour',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/sejours/sejour-detail/sejour-detail').then(
            (m) => m.SejourDetailPage,
          ),
      },
      {
        path: 'locatif/sejours',
        title: 'Séjours de courte durée',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/sejours/sejours').then((m) => m.Sejours),
      },
      {
        path: 'locatif/resiliations',
        title: 'Résiliations',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/resiliations/resiliations').then(
            (m) => m.Resiliations,
          ),
      },
      {
        path: 'locatif/relances',
        title: 'Relances de loyers',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/relances/relances').then((m) => m.Relances),
      },
      {
        path: 'locatif/locataires/:id',
        title: 'Fiche du locataire',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/locataires/locataire-detail/locataire-detail').then(
            (m) => m.LocataireDetail,
          ),
      },
      {
        path: 'locatif/locataires',
        title: 'Locataires',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/locataires/locataires').then((m) => m.Locataires),
      },
      {
        path: 'construction/chantiers/nouveau',
        title: 'Nouveau chantier',
        canDeactivate: [modificationsNonEnregistreesGuard],
        canActivate: [permissionsGuard(['construction:creer'])],
        loadComponent: () =>
          import('./features/construction/chantier-form/chantier-form').then(
            (m) => m.ChantierForm,
          ),
      },
      {
        path: 'construction/chantiers/:id',
        title: 'Fiche du chantier',
        canActivate: [permissionsGuard(['construction:consulter'])],
        loadComponent: () =>
          import('./features/construction/chantier-detail/chantier-detail').then(
            (m) => m.ChantierDetailPage,
          ),
      },
      {
        path: 'construction/chantiers',
        title: 'Chantiers',
        canActivate: [permissionsGuard(['construction:consulter'])],
        loadComponent: () =>
          import('./features/construction/chantiers/chantiers').then(
            (m) => m.Chantiers,
          ),
      },
      {
        path: 'crm/prospects',
        title: 'Prospects',
        data: { preload: true },
        canActivate: [permissionsGuard(['crm:consulter'])],
        loadComponent: () =>
          import('./features/crm/prospects/prospects').then(
            (m) => m.Prospects,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
