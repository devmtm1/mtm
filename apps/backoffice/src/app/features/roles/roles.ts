import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideShieldPlus } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { RoleListItem } from '../../core/models/role.model';
import { RoleFormDialog } from './role-form-dialog';
import { AssignPermissionsDialog } from './assign-permissions-dialog';

@Component({
  selector: 'app-roles',
  imports: [AgGridAngular, MatButtonModule, MatDialogModule, LucideShieldPlus],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  private readonly rolesApi = inject(RolesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sessionService = inject(SessionService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<RoleListItem[]>([]);
  protected readonly canCreate = computed(() =>
    this.sessionService.hasPermission('roles:creer'),
  );
  protected readonly canAdminister = computed(() =>
    this.sessionService.hasPermission('roles:administrer'),
  );

  protected readonly columnDefs: ColDef<RoleListItem>[] = [
    { field: 'name', headerName: 'Nom', flex: 1, sortable: true, filter: true },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Permissions',
      flex: 0.8,
      valueGetter: (params) => params.data?.permissions.length ?? 0,
    },
    {
      headerName: 'Utilisateurs',
      flex: 0.8,
      valueGetter: (params) => params.data?._count?.users ?? 0,
    },
    {
      field: 'isSystem',
      headerName: 'Système',
      flex: 0.7,
      cellRenderer: (params: ICellRendererParams<RoleListItem>) =>
        params.value ? 'Oui' : 'Non',
    },
    {
      headerName: 'Actions',
      flex: 0.6,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<RoleListItem>) => {
        if (!this.canAdminister() || !params.data) return '';
        const button = document.createElement('button');
        button.className = 'grid-icon-btn';
        button.title = 'Gérer les permissions';
        button.innerHTML = `<svg viewBox="0 0 24 24"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;
        button.addEventListener('click', () => this.openPermissionsDialog(params.data!));
        return button;
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.rolesApi.findAll().subscribe({
      next: (roles) => {
        this.rowData.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des rôles', 'Fermer', {
          duration: 4000,
        });
      },
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(RoleFormDialog, { width: '420px' });
    ref.afterClosed().subscribe((created: RoleListItem | undefined) => {
      if (created) {
        this.snackBar.open('Rôle créé', 'Fermer', { duration: 3000 });
        this.load();
      }
    });
  }

  private openPermissionsDialog(role: RoleListItem): void {
    const ref = this.dialog.open(AssignPermissionsDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      data: { role },
    });
    ref.afterClosed().subscribe((changed: boolean | undefined) => {
      if (changed) {
        this.snackBar.open('Permissions mises à jour', 'Fermer', { duration: 3000 });
        this.load();
      }
    });
  }
}
