import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideSlidersHorizontal } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { SettingsApiService } from '../../core/services/api/settings-api.service';
import type { SettingListItem } from '../../core/models/setting.model';
import { SettingFormDialog } from './setting-form-dialog';

@Component({
  selector: 'app-settings',
  imports: [AgGridAngular, MatButtonModule, MatDialogModule, LucideSlidersHorizontal],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sessionService = inject(SessionService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<SettingListItem[]>([]);
  protected readonly canCreate = computed(() =>
    this.sessionService.hasPermission('settings:creer'),
  );
  protected readonly canModify = computed(() =>
    this.sessionService.hasPermission('settings:modifier'),
  );

  protected readonly columnDefs: ColDef<SettingListItem>[] = [
    { field: 'key', headerName: 'Clé', flex: 1.2, sortable: true, filter: true },
    {
      headerName: 'Valeur',
      flex: 1,
      valueGetter: (params) =>
        params.data?.redacted ? '••••••••' : JSON.stringify(params.data?.value),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      sortable: true,
      filter: true,
    },
    {
      field: 'isSensitive',
      headerName: 'Sensible',
      flex: 0.7,
      cellRenderer: (params: ICellRendererParams<SettingListItem>) =>
        params.value
          ? '<span class="mtm-badge mtm-badge--red">Oui</span>'
          : '<span class="mtm-badge mtm-badge--purple">Non</span>',
    },
    {
      headerName: 'Actions',
      flex: 0.6,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<SettingListItem>) => {
        if (!this.canModify() || !params.data) return '';
        const button = document.createElement('button');
        button.className = 'grid-icon-btn';
        button.title = 'Modifier le paramètre';
        button.innerHTML = `<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
        button.addEventListener('click', () => this.openEditDialog(params.data!));
        return button;
      },
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.settingsApi.findAll().subscribe({
      next: (settings) => {
        this.rowData.set(settings);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des paramètres', 'Fermer', {
          duration: 4000,
        });
      },
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(SettingFormDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {},
    });
    ref.afterClosed().subscribe((created: SettingListItem | undefined) => {
      if (created) {
        this.snackBar.open('Paramètre créé', 'Fermer', { duration: 3000 });
        this.load();
      }
    });
  }

  private openEditDialog(setting: SettingListItem): void {
    const ref = this.dialog.open(SettingFormDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: { setting },
    });
    ref.afterClosed().subscribe((updated: SettingListItem | undefined) => {
      if (updated) {
        this.snackBar.open('Paramètre mis à jour', 'Fermer', { duration: 3000 });
        this.load();
      }
    });
  }
}
