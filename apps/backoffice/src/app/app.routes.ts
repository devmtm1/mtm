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
        path: 'audit',
        canActivate: [permissionsGuard(['audit:consulter'])],
        loadComponent: () =>
          import('./features/audit/audit').then((m) => m.Audit),
      },
      {
        path: 'content',
        canActivate: [permissionsGuard(['settings:consulter'])],
        loadComponent: () =>
          import('./features/content/content-blocks').then((m) => m.ContentBlocks),
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
        path: 'crm/prospects/nouveau',
        canActivate: [permissionsGuard(['crm:creer'])],
        loadComponent: () =>
          import('./features/crm/prospect-form/prospect-form').then(
            (m) => m.ProspectForm,
          ),
      },
      {
        path: 'crm/prospects/:id/modifier',
        canActivate: [permissionsGuard(['crm:modifier'])],
        loadComponent: () =>
          import('./features/crm/prospect-form/prospect-form').then(
            (m) => m.ProspectForm,
          ),
      },
      {
        path: 'crm/prospects/:id/360',
        canActivate: [permissionsGuard(['crm:consulter'])],
        loadComponent: () =>
          import('./features/crm/prospect-360/prospect-360').then(
            (m) => m.Prospect360,
          ),
      },
      {
        path: 'crm/prospects/:id',
        canActivate: [permissionsGuard(['crm:consulter'])],
        loadComponent: () =>
          import('./features/crm/prospect-detail/prospect-detail').then(
            (m) => m.ProspectDetail,
          ),
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
