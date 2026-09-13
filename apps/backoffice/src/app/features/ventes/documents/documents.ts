import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowLeft, LucideExternalLink, LucideFileText, LucideSearch, LucideX } from '@lucide/angular';
import { debounceTime } from 'rxjs/operators';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { LabelPipe } from '../../../shared/pipes/label.pipe';
import type { VenteDocumentSearchItem, VenteOptions } from '../../../core/models/vente.model';

/**
 * GED des ventes (J1.6) : retrouver un document — contrat, reçu, facture,
 * justificatif — parmi tous les dossiers, ou ceux d'un dossier, d'un
 * client ou d'un terrain précis (contexte passé dans l'URL).
 */
@Component({
  selector: 'app-vente-documents',
  standalone: true,
  imports: [LabelPipe, DatePipe, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideArrowLeft, LucideExternalLink, LucideFileText, LucideSearch, LucideX],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class VenteDocumentsPage implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly documents = signal<VenteDocumentSearchItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly options = signal<VenteOptions | null>(null);
  protected readonly filters = this.formBuilder.nonNullable.group({ search: '', type: '', dateFrom: '', dateTo: '' });
  private readonly search = signal('');

  protected readonly context = signal<{ dossierVenteId: string | null; prospectId: string | null; terrainId: string | null }>({ dossierVenteId: null, prospectId: null, terrainId: null });
  protected readonly hasContext = computed(() => !!(this.context().dossierVenteId || this.context().prospectId || this.context().terrainId));

  /** Recherche texte locale (titre) sur les résultats renvoyés par l'API. */
  protected readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.documents().filter((document) => `${document.title ?? ''} ${document.type}`.toLowerCase().includes(term)) : this.documents();
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.context.set({ dossierVenteId: params.get('dossierVenteId'), prospectId: params.get('prospectId'), terrainId: params.get('terrainId') });
    this.api.getOptions().subscribe({ next: (options) => this.options.set(options), error: () => this.options.set(null) });
    this.load();
    this.filters.controls.search.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.search.set(value));
    this.filters.controls.type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.filters.controls.dateFrom.valueChanges.pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.filters.controls.dateTo.valueChanges.pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  protected clearContext(): void {
    this.context.set({ dossierVenteId: null, prospectId: null, terrainId: null });
    void this.router.navigate(['/ventes/documents']);
    this.load();
  }

  protected resetFilters(): void {
    this.filters.reset({ search: '', type: '', dateFrom: '', dateTo: '' });
    this.search.set('');
  }

  protected openDossier(document: VenteDocumentSearchItem): void {
    void this.router.navigate(['/ventes', document.dossierVenteId]);
  }

  protected goBack(): void {
    void this.router.navigate(['/ventes']);
  }

  protected load(): void {
    this.loading.set(true);
    const value = this.filters.getRawValue();
    const context = this.context();
    this.api
      .searchDocuments({
        dossierVenteId: context.dossierVenteId ?? undefined,
        prospectId: context.prospectId ?? undefined,
        terrainId: context.terrainId ?? undefined,
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
          this.documents.set([]);
          this.loading.set(false);
        },
      });
  }
}
