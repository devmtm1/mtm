import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { LucideEye, LucideGrid2X2, LucideLandPlot, LucideList, LucidePencil, LucidePlus, LucideSearch } from '@lucide/angular';
import { mtmGridTheme } from '../../core/ag-grid.config';
import { SessionService } from '../../core/services/session.service';
import { TerrainsApiService } from '../../core/services/api/terrains-api.service';
import type { TerrainListItem } from '../../core/models/terrain.model';

@Component({
  selector: 'app-terrains',
  imports: [ReactiveFormsModule, AgGridAngular, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideEye, LucideGrid2X2, LucideLandPlot, LucideList, LucidePencil, LucidePlus, LucideSearch],
  templateUrl: './terrains.html',
  styleUrl: './terrains.scss',
})
export class Terrains implements OnInit {
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly rowData = signal<TerrainListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly viewMode = signal<'table' | 'grid'>('table');
  protected readonly canCreate = computed(() => this.sessionService.hasPermission('terrains:creer'));
  protected readonly canModify = computed(() => this.sessionService.hasPermission('terrains:modifier'));
  protected readonly filters = this.formBuilder.nonNullable.group({ search: [''], statutJuridique: [''], niveauVerification: [''], statutCommercial: [''] });

  protected readonly columnDefs: ColDef<TerrainListItem>[] = [
    { field: 'referenceInterne', headerName: 'Référence', flex: 1, minWidth: 130, sortable: true, filter: true },
    { field: 'nom', headerName: 'Nom', flex: 1.4, minWidth: 160, sortable: true, filter: true },
    { field: 'commune', headerName: 'Localisation', flex: 1.2, valueGetter: (p) => [p.data?.commune, p.data?.region].filter(Boolean).join(', ') },
    { field: 'superficie', headerName: 'Superficie', flex: 0.8, valueFormatter: (p) => p.value == null ? '—' : `${p.value} m²` },
    { field: 'statutJuridique', headerName: 'Juridique', flex: 1, sortable: true },
    { field: 'niveauVerification', headerName: 'Vérification', flex: 1, sortable: true },
    { field: 'statutCommercial', headerName: 'Commercial', flex: 0.9, sortable: true },
    { field: 'prixPublic', headerName: 'Prix public', flex: 1, valueFormatter: (p) => p.value == null ? '—' : `${p.value} FCFA` },
    {
      headerName: 'Actions', flex: 0.8, minWidth: 100, sortable: false, filter: false,
      cellRenderer: (params: ICellRendererParams<TerrainListItem>) => {
        if (!params.data) return '';
        const container = document.createElement('div');
        container.className = 'terrain-row-actions';
        const detail = document.createElement('button');
        detail.type = 'button';
        detail.className = 'grid-icon-btn';
        detail.title = 'Voir les détails';
        detail.setAttribute('aria-label', 'Voir les détails');
        detail.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>';
        detail.addEventListener('click', () => this.openDetail(params.data!.id));
        container.appendChild(detail);
        if (this.canModify()) {
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'grid-icon-btn';
          edit.title = 'Modifier le terrain';
          edit.setAttribute('aria-label', 'Modifier le terrain');
          edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
          edit.addEventListener('click', () => this.openEdit(params.data!.id));
          container.appendChild(edit);
        }
        return container;
      },
    },
  ];

  ngOnInit(): void { this.load(); }
  protected applyFilters(): void { this.load(); }
  protected openCreate(): void { this.router.navigate(['/terrains/nouveau']); }
  protected openDetail(id: string): void { this.router.navigate(['/terrains', id]); }
  protected openEdit(id: string): void { this.router.navigate(['/terrains', id, 'modifier']); }
  protected setViewMode(mode: 'table' | 'grid'): void { this.viewMode.set(mode); }
  protected formatMoney(value: number | string | null): string { return value == null ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`; }
  protected formatLocation(terrain: TerrainListItem): string { return [terrain.commune, terrain.region].filter((value): value is string => Boolean(value)).join(', ') || 'Localisation non renseignée'; }

  private load(): void {
    this.loading.set(true);
    this.terrainsApi.findAll(this.filters.getRawValue()).subscribe({
      next: (page) => { this.rowData.set(page.items); this.total.set(page.total); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erreur lors du chargement des terrains', 'Fermer', { duration: 4000 }); },
    });
  }
}
