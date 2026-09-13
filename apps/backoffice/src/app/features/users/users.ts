import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideSearch, LucideShieldAlert, LucideUserCheck, LucideUserPlus, LucideUserX, LucideX } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import type { UserListItem } from '../../core/models/user.model';
import { NotificationService } from '../../shared/services/notification.service';
import { relativeDate, requiresTwoFactor, roleLabel } from '../admin/admin-labels';
import { DeleteUserDialog } from './delete-user-dialog';
import { ResetTwoFactorDialog } from './reset-two-factor-dialog';
import { UserFormDialog } from './user-form-dialog';

type Scope = 'all' | 'active' | 'inactive' | 'attention';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

/**
 * Comptes du back-office (Phase 0). Un compte = une personne, un rôle, un
 * accès actif ou non. Les points d'attention (2FA manquante sur un rôle
 * sensible, mot de passe provisoire jamais changé) sont mis en avant.
 */
@Component({
  selector: 'app-users',
  imports: [AgGridAngular, MatButtonModule, MatFormFieldModule, MatInputModule, MatTooltipModule, LucideSearch, LucideShieldAlert, LucideUserCheck, LucideUserPlus, LucideUserX, LucideX],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly users = signal<UserListItem[]>([]);
  protected readonly scope = signal<Scope>('all');
  protected readonly search = signal('');

  protected readonly canCreate = this.session.hasPermission('users:creer');
  protected readonly canModify = this.session.hasPermission('users:modifier');
  protected readonly canDelete = this.session.hasPermission('users:supprimer');
  protected readonly canResetTwoFactor = this.session.hasPermission('users:administrer');
  private readonly myId = this.session.user()?.id;

  protected readonly activeCount = computed(() => this.users().filter((user) => user.isActive).length);
  protected readonly inactiveCount = computed(() => this.users().filter((user) => !user.isActive).length);
  /** Comptes actifs à surveiller : 2FA manquante sur un rôle sensible ou mot de passe provisoire. */
  protected readonly attention = computed(() => this.users().filter((user) => user.isActive && this.needsAttention(user)));

  protected readonly filtered = computed(() => {
    const scope = this.scope();
    const term = this.search().trim().toLowerCase();
    return this.users()
      .filter((user) => {
        if (scope === 'active') return user.isActive;
        if (scope === 'inactive') return !user.isActive;
        if (scope === 'attention') return user.isActive && this.needsAttention(user);
        return true;
      })
      .filter((user) => !term || `${user.firstName} ${user.lastName} ${user.email} ${user.roles.map(roleLabel).join(' ')}`.toLowerCase().includes(term));
  });

  protected readonly hasActiveFilters = computed(() => this.scope() !== 'all' || this.search().trim() !== '');

  protected readonly defaultColDef: ColDef<UserListItem> = { resizable: true, sortable: true, minWidth: 90 };

  protected readonly columnDefs: ColDef<UserListItem>[] = [
    {
      headerName: 'Utilisateur',
      colId: 'user',
      flex: 2,
      minWidth: 220,
      valueGetter: (params) => `${params.data?.lastName ?? ''} ${params.data?.firstName ?? ''}`.trim(),
      cellRenderer: (params: ICellRendererParams<UserListItem>) => {
        const user = params.data;
        if (!user) return '';
        const me = user.id === this.myId ? ' <span class="status-pill status-pill--primary">Vous</span>' : '';
        return `<div class="user-cell"><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}${me}</strong><span class="cell-muted">${escapeHtml(user.email)}</span></div>`;
      },
    },
    {
      headerName: 'Rôle',
      colId: 'role',
      flex: 1.3,
      minWidth: 170,
      valueGetter: (params) => (params.data?.roles ?? []).map(roleLabel).join(', ') || 'Aucun rôle',
      cellRenderer: (params: ICellRendererParams<UserListItem>) => {
        const roles = params.data?.roles ?? [];
        if (roles.length === 0) return '<span class="status-pill status-pill--danger">Aucun rôle</span>';
        return roles.map((role) => `<span class="status-pill status-pill--info">${escapeHtml(roleLabel(role))}</span>`).join(' ');
      },
    },
    {
      headerName: 'Accès',
      colId: 'access',
      flex: 0.9,
      minWidth: 110,
      valueGetter: (params) => (params.data?.isActive ? 'Actif' : 'Désactivé'),
      cellRenderer: (params: ICellRendererParams<UserListItem>) =>
        params.data?.isActive ? '<span class="status-pill status-pill--success">Actif</span>' : '<span class="status-pill status-pill--danger">Désactivé</span>',
    },
    {
      headerName: 'Sécurité',
      colId: 'security',
      flex: 1.3,
      minWidth: 180,
      valueGetter: (params) => (params.data ? this.securityText(params.data) : ''),
      cellRenderer: (params: ICellRendererParams<UserListItem>) => {
        const user = params.data;
        if (!user) return '';
        const pills: string[] = [];
        if (user.twoFactorEnabled) pills.push('<span class="status-pill status-pill--success">2FA activée</span>');
        else if (requiresTwoFactor(user.roles)) pills.push('<span class="status-pill status-pill--warning" title="Rôle sensible : ce compte doit activer la double authentification à sa prochaine connexion">2FA à activer</span>');
        else pills.push('<span class="status-pill">Sans 2FA</span>');
        if (user.mustChangePassword) pills.push('<span class="status-pill status-pill--warning" title="Le mot de passe provisoire n’a pas encore été remplacé">Mot de passe provisoire</span>');
        return `<div class="pill-stack">${pills.join('')}</div>`;
      },
    },
    {
      headerName: 'Dernière connexion',
      colId: 'lastLogin',
      flex: 1,
      minWidth: 165,
      valueGetter: (params) => params.data?.lastLoginAt ?? '',
      valueFormatter: (params) => relativeDate(params.data?.lastLoginAt),
      cellClass: (params) => (params.data?.lastLoginAt ? '' : 'cell-muted'),
    },
    {
      headerName: '',
      colId: 'actions',
      width: 170,
      minWidth: 170,
      sortable: false,
      resizable: false,
      pinned: 'right',
      cellClass: 'list-grid__actions',
      cellRenderer: (params: ICellRendererParams<UserListItem>) => {
        const user = params.data;
        if (!user) return '';
        const container = document.createElement('div');
        container.className = 'grid-actions';
        const add = (title: string, icon: string, tone: string, handler: () => void): void => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `grid-icon-btn ${tone}`.trim();
          button.title = title;
          button.setAttribute('aria-label', title);
          button.innerHTML = icon;
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            handler();
          });
          container.appendChild(button);
        };
        if (this.canModify) {
          add('Modifier le compte', '<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>', '', () => this.openEditDialog(user));
          if (user.id !== this.myId) {
            add(
              user.isActive ? 'Désactiver : la personne ne pourra plus se connecter' : 'Réactiver l’accès',
              user.isActive
                ? '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
              user.isActive ? 'danger' : 'success',
              () => this.toggleActive(user),
            );
          }
        }
        if (this.canResetTwoFactor && user.twoFactorEnabled && user.id !== this.myId) {
          add('Réinitialiser le 2FA (téléphone perdu)', '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/><path d="M12 8v4l2.5 1.5"/></svg>', 'warning', () => this.resetTwoFactor(user));
        }
        if (this.canDelete && user.id !== this.myId) {
          add('Supprimer définitivement', '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>', 'danger', () => this.removeUser(user));
        }
        return container;
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
  }

  protected resetFilters(): void {
    this.scope.set('all');
    this.search.set('');
  }

  protected onRowClicked(event: RowClickedEvent<UserListItem>): void {
    if (event.data && this.canModify) this.openEditDialog(event.data);
  }

  protected openCreateDialog(): void {
    UserFormDialog.open(this.dialog, {}).subscribe((created) => {
      if (created) this.load();
    });
  }

  private openEditDialog(user: UserListItem): void {
    UserFormDialog.open(this.dialog, { user }).subscribe((updated) => {
      if (updated) this.load();
    });
  }

  private needsAttention(user: UserListItem): boolean {
    return (requiresTwoFactor(user.roles) && !user.twoFactorEnabled) || !!user.mustChangePassword;
  }

  private securityText(user: UserListItem): string {
    const parts = [user.twoFactorEnabled ? '2FA activée' : requiresTwoFactor(user.roles) ? '2FA à activer' : 'Sans 2FA'];
    if (user.mustChangePassword) parts.push('Mot de passe provisoire');
    return parts.join(', ');
  }

  private removeUser(user: UserListItem): void {
    const ref = this.dialog.open(DeleteUserDialog, { width: '440px', maxWidth: 'calc(100vw - 32px)', data: user.email });
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;
      this.usersApi.remove(user.id).subscribe({
        next: () => {
          this.notify.success('Compte supprimé');
          this.load();
        },
        error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
      });
    });
  }

  private toggleActive(user: UserListItem): void {
    const action$ = user.isActive ? this.usersApi.deactivate(user.id) : this.usersApi.activate(user.id);
    action$.subscribe({
      next: () => {
        this.notify.success(user.isActive ? 'Accès désactivé : la personne ne peut plus se connecter' : 'Accès réactivé');
        this.load();
      },
      error: (error: unknown) => this.notify.error(error, 'Action impossible'),
    });
  }

  private resetTwoFactor(user: UserListItem): void {
    const ref = this.dialog.open(ResetTwoFactorDialog, { width: '480px', maxWidth: 'calc(100vw - 32px)', data: user.email });
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;
      this.usersApi.resetTwoFactor(user.id).subscribe({
        next: () => {
          this.notify.success('2FA réinitialisée : la personne la reconfigurera à sa prochaine connexion');
          this.load();
        },
        error: (error: unknown) => this.notify.error(error, 'Réinitialisation du 2FA impossible'),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.users.set([...users].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.lastName.localeCompare(b.lastName, 'fr')));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des utilisateurs');
      },
    });
  }
}
