import { Routes } from '@angular/router';
import { Shell } from './layout/shell';
import { authGuard } from './core/guards/auth.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { permissionsGuard } from './core/guards/permissions.guard';
import { twoFactorGuard } from './core/guards/two-factor.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'password-reset',
    loadComponent: () =>
      import('./features/auth/password-reset/password-reset').then((m) => m.PasswordReset),
  },
  {
    path: 'change-password',
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
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./features/security/security').then((m) => m.Security),
      },
      {
        path: 'users',
        canActivate: [permissionsGuard(['users:consulter'])],
        loadComponent: () =>
          import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'terrains/nouveau',
        canActivate: [permissionsGuard(['terrains:creer'])],
        loadComponent: () =>
          import('./features/terrains/terrain-form/terrain-form').then(
            (m) => m.TerrainForm,
          ),
      },
      {
        path: 'terrains/:id/modifier',
        canActivate: [permissionsGuard(['terrains:modifier'])],
        loadComponent: () =>
          import('./features/terrains/terrain-form/terrain-form').then(
            (m) => m.TerrainForm,
          ),
      },
      {
        path: 'terrains/:id',
        canActivate: [permissionsGuard(['terrains:consulter'])],
        loadComponent: () =>
          import('./features/terrains/terrain-detail/terrain-detail').then(
            (m) => m.TerrainDetail,
          ),
      },
      {
        path: 'terrains',
        canActivate: [permissionsGuard(['terrains:consulter'])],
        loadComponent: () =>
          import('./features/terrains/terrains').then((m) => m.Terrains),
      },
      {
        path: 'roles',
        canActivate: [permissionsGuard(['roles:consulter'])],
        loadComponent: () =>
          import('./features/roles/roles').then((m) => m.Roles),
      },
      {
        path: 'settings',
        canActivate: [permissionsGuard(['settings:consulter'])],
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'contacts',
        canActivate: [permissionsGuard(['contact:consulter'])],
        loadComponent: () =>
          import('./features/contacts/contacts').then((m) => m.Contacts),
      },
      {
        path: 'audit',
        canActivate: [permissionsGuard(['audit:consulter'])],
        loadComponent: () =>
          import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'content',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/content-blocks').then((m) => m.ContentBlocks),
      },
      {
        path: 'content/showcase',
        canActivate: [permissionsGuard(['content:consulter'])],
        loadComponent: () =>
          import('./features/content/showcase-items/showcase-items').then(
            (m) => m.ShowcaseItems,
          ),
      },
      {
        path: 'mandats/nouveau',
        canActivate: [permissionsGuard(['mandats:creer'])],
        loadComponent: () =>
          import('./features/mandats/mandat-form/mandat-form').then(
            (m) => m.MandatForm,
          ),
      },
      {
        path: 'mandats/:id/modifier',
        canActivate: [permissionsGuard(['mandats:modifier'])],
        loadComponent: () =>
          import('./features/mandats/mandat-form/mandat-form').then(
            (m) => m.MandatForm,
          ),
      },
      {
        path: 'mandats/:id',
        canActivate: [permissionsGuard(['mandats:consulter'])],
        loadComponent: () =>
          import('./features/mandats/mandat-detail/mandat-detail').then(
            (m) => m.MandatDetail,
          ),
      },
      {
        path: 'mandats',
        canActivate: [permissionsGuard(['mandats:consulter'])],
        loadComponent: () =>
          import('./features/mandats/mandats/mandats').then(
            (m) => m.Mandats,
          ),
      },
      {
        path: 'proprietaires',
        canActivate: [permissionsGuard(['proprietaires:consulter'])],
        loadComponent: () =>
          import('./features/proprietaires/proprietaires').then(
            (m) => m.Proprietaires,
          ),
      },
      {
        path: 'proprietaires/:id',
        canActivate: [permissionsGuard(['proprietaires:consulter'])],
        loadComponent: () =>
          import('./features/proprietaires/proprietaire-detail/proprietaire-detail').then(
            (m) => m.ProprietaireDetail,
          ),
      },
      {
        path: 'crm/prospects/nouveau',
        canActivate: [permissionsGuard(['crm:creer'])],
        loadComponent: () =>
          import('./features/crm/prospect-form/prospect-form').then(
            (m) => m.ProspectForm,
          ),
      },
      // Routes fixes d'abord : « ventes/:id » capturerait « objectifs » et « documents ».
      {
        path: 'ventes/objectifs',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/objectifs/objectifs').then((m) => m.Objectifs),
      },
      {
        path: 'ventes/documents',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/documents/documents').then(
            (m) => m.VenteDocumentsPage,
          ),
      },
      {
        path: 'ventes/:id',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/vente-detail/vente-detail').then(
            (m) => m.VenteDetailPage,
          ),
      },
      {
        path: 'ventes',
        canActivate: [permissionsGuard(['ventes:consulter'])],
        loadComponent: () =>
          import('./features/ventes/ventes').then((m) => m.Ventes),
      },
      {
        path: 'crm/prospects/:id/modifier',
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
        canActivate: [permissionsGuard(['crm:consulter'])],
        loadComponent: () =>
          import('./features/crm/prospect-detail/prospect-detail').then(
            (m) => m.ProspectDetail,
          ),
      },
      {
        path: 'demarches/missions/nouvelle',
        canActivate: [permissionsGuard(['demarches:creer'])],
        loadComponent: () =>
          import('./features/demarches/mission-form/mission-form').then(
            (m) => m.MissionForm,
          ),
      },
      {
        path: 'demarches/missions/:id',
        canActivate: [permissionsGuard(['demarches:consulter'])],
        loadComponent: () =>
          import('./features/demarches/mission-detail/mission-detail').then(
            (m) => m.MissionDetail,
          ),
      },
      {
        path: 'demarches/missions',
        canActivate: [permissionsGuard(['demarches:consulter'])],
        loadComponent: () =>
          import('./features/demarches/missions/missions').then((m) => m.Missions),
      },
      {
        path: 'locatif/biens/nouveau',
        canActivate: [permissionsGuard(['locatif:creer'])],
        loadComponent: () =>
          import('./features/locatif/bien-form/bien-form').then((m) => m.BienForm),
      },
      {
        path: 'locatif/biens/:id',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/bien-detail/bien-detail').then(
            (m) => m.BienDetailPage,
          ),
      },
      {
        path: 'locatif/biens',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/biens/biens').then((m) => m.Biens),
      },
      {
        path: 'locatif/relances',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/relances/relances').then((m) => m.Relances),
      },
      {
        path: 'locatif/locataires/:id',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/locataires/locataire-detail/locataire-detail').then(
            (m) => m.LocataireDetail,
          ),
      },
      {
        path: 'locatif/locataires',
        canActivate: [permissionsGuard(['locatif:consulter'])],
        loadComponent: () =>
          import('./features/locatif/locataires/locataires').then((m) => m.Locataires),
      },
      {
        path: 'crm/prospects',
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
