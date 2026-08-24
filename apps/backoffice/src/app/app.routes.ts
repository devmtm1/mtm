import { Routes } from '@angular/router';
import { Shell } from './layout/shell';
import { authGuard } from './core/guards/auth.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { permissionsGuard } from './core/guards/permissions.guard';

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
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
