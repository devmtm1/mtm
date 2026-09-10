import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideArrowLeft, LucideSearch } from '@lucide/angular';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import type { VenteDocumentSearchItem } from '../../../core/models/vente.model';

@Component({
  selector: 'app-vente-documents',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, LucideArrowLeft, LucideSearch],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class VenteDocumentsPage implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly documents = signal<VenteDocumentSearchItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly filters = this.formBuilder.nonNullable.group({ type: [''], dateFrom: [''], dateTo: [''] });

  protected dossierVenteId: string | null = null;
  protected prospectId: string | null = null;
  protected terrainId: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.dossierVenteId = params.get('dossierVenteId');
    this.prospectId = params.get('prospectId');
    this.terrainId = params.get('terrainId');
    this.load();
  }

  protected get hasContext(): boolean {
    return !!(this.dossierVenteId || this.prospectId || this.terrainId);
  }

  protected applyFilters(): void {
    this.load();
  }

  protected clearContext(): void {
    this.dossierVenteId = null;
    this.prospectId = null;
    this.terrainId = null;
    void this.router.navigate(['/ventes/documents']);
    this.load();
  }

  protected goBack(): void {
    this.router.navigate(['/ventes']);
  }

  protected load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    this.api
      .searchDocuments({
        dossierVenteId: this.dossierVenteId ?? undefined,
        prospectId: this.prospectId ?? undefined,
        terrainId: this.terrainId ?? undefined,
        type: value.type || undefined,
        dateFrom: value.dateFrom || undefined,
        dateTo: value.dateTo || undefined,
      })
      .subscribe({
        next: (documents) => {
          this.documents.set(documents);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
