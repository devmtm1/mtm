import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { AuditApiService } from '../../core/services/api/audit-api.service';
import type { AuditLogItem } from '../../core/models/audit.model';

const ENTITY_TYPES = ['User', 'Role', 'SystemSetting'] as const;

@Component({
  selector: 'app-audit',
  imports: [
    FormsModule,
    AgGridAngular,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit implements OnInit {
  private readonly auditApi = inject(AuditApiService);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<AuditLogItem[]>([]);
  protected readonly total = signal(0);
  protected readonly entityTypes = ENTITY_TYPES;

  protected entityTypeFilter = '';
  protected actionFilter = '';

  protected readonly columnDefs: ColDef<AuditLogItem>[] = [
    {
      field: 'createdAt',
      headerName: 'Date',
      flex: 1,
      sortable: true,
      valueFormatter: (params) => new Date(params.value as string).toLocaleString('fr-FR'),
    },
    {
      headerName: 'Utilisateur',
      flex: 1.2,
      valueGetter: (params) =>
        params.data?.user
          ? `${params.data.user.firstName} ${params.data.user.lastName}`
          : 'Système',
    },
    { field: 'action', headerName: 'Action', flex: 1.3, sortable: true, filter: true },
    { field: 'entityType', headerName: 'Entité', flex: 0.8, sortable: true, filter: true },
    { field: 'entityId', headerName: 'ID entité', flex: 1 },
    {
      field: 'ipAddress',
      headerName: 'Adresse IP',
      flex: 0.8,
      cellRenderer: (params: ICellRendererParams<AuditLogItem>) => params.value ?? '—',
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.auditApi
      .findAll({
        entityType: this.entityTypeFilter || undefined,
        action: this.actionFilter || undefined,
        pageSize: 100,
      })
      .subscribe({
        next: (page) => {
          this.rowData.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
