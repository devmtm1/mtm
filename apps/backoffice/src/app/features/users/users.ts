import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideUserPlus } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { UsersApiService } from '../../core/services/api/users-api.service';
import type { UserListItem } from '../../core/models/user.model';
import { UserFormDialog } from './user-form-dialog';

@Component({
  selector: 'app-users',
  imports: [AgGridAngular, MatButtonModule, MatDialogModule, LucideUserPlus],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sessionService = inject(SessionService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<UserListItem[]>([]);
  protected readonly canCreate = computed(() =>
    this.sessionService.hasPermission('users:creer'),
  );
  protected readonly canModify = computed(() =>
    this.sessionService.hasPermission('users:modifier'),
  );

  protected readonly columnDefs: ColDef<UserListItem>[] = [
    { field: 'email', headerName: 'E-mail', flex: 2, sortable: true, filter: true },
    { field: 'firstName', headerName: 'Prénom', flex: 1, sortable: true, filter: true },
    { field: 'lastName', headerName: 'Nom', flex: 1, sortable: true, filter: true },
    {
      field: 'roles',
      headerName: 'Rôles',
      flex: 1.5,
      valueFormatter: (params) => (params.value as string[]).join(', '),
    },
    {
      field: 'isActive',
      headerName: 'Statut',
      flex: 0.8,
      cellRenderer: (params: ICellRendererParams<UserListItem>) =>
        params.value
          ? '<span class="mtm-badge mtm-badge--success">Actif</span>'
          : '<span class="mtm-badge mtm-badge--red">Inactif</span>',
    },
    {
      field: 'twoFactorEnabled',
      headerName: '2FA',
      flex: 0.6,
      cellRenderer: (params: ICellRendererParams<UserListItem>) =>
        params.value ? 'Oui' : 'Non',
    },
    {
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<UserListItem>) => {
        if (!this.canModify() || !params.data) return '';
        const button = document.createElement('button');
        button.className = params.data.isActive ? 'grid-icon-btn danger' : 'grid-icon-btn success';
        button.title = params.data.isActive ? 'Désactiver l\'utilisateur' : 'Activer l\'utilisateur';

        button.innerHTML = params.data.isActive
          ? `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>`
          : `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`;

        button.addEventListener('click', () => this.toggleActive(params.data!));
        return button;
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.rowData.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', {
          duration: 4000,
        });
      },
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(UserFormDialog, { width: '420px' });
    ref.afterClosed().subscribe((created: UserListItem | undefined) => {
      if (created) {
        this.snackBar.open('Utilisateur créé', 'Fermer', { duration: 3000 });
        this.load();
      }
    });
  }

  private toggleActive(user: UserListItem): void {
    const action$ = user.isActive
      ? this.usersApi.deactivate(user.id)
      : this.usersApi.activate(user.id);

    action$.subscribe({
      next: () => {
        this.snackBar.open(
          user.isActive ? 'Utilisateur désactivé' : 'Utilisateur activé',
          'Fermer',
          { duration: 3000 },
        );
        this.load();
      },
      error: () => {
        this.snackBar.open('Action impossible', 'Fermer', { duration: 4000 });
      },
    });
  }
}
