import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsLeft,
  LucideChevronsRight,
  LucideExternalLink,
  LucideFile,
  LucideFileSpreadsheet,
  LucideFileText,
  LucideFileType,
  LucideFolderOpen,
  LucideImage,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { debounceTime } from 'rxjs/operators';
import {
  GedApiService,
  type GedDocument,
  type GedOrigine,
} from '../../core/services/api/ged-api.service';
import { natureFichier, pagesAffichees, type GedFichier } from './documents-utils';

/** Libellé de chaque origine : le module qui porte le document. */
export const GED_ORIGINE_LABELS: Record<GedOrigine, string> = {
  terrain: 'Biens',
  mandat: 'Mandats',
  vente: 'Ventes',
  crm: 'Prospects',
  demarche: 'Vérifications',
  locatif: 'Gestion locative',
  chantier: 'Chantiers',
};

/** Tailles de page proposées (le serveur accepte jusqu'à 100). */
export const TAILLES_PAGE = [10, 25, 50, 100];

/**
 * GED (section 17 CDC) : retrouver un document — titre, contrat, plan,
 * rapport, quittance — parmi ceux de tous les modules, avec les mêmes
 * restrictions d'accès que dans chaque module. La recherche porte sur le titre,
 * le type et la référence de l'objet qui porte le document, pas sur le
 * contenu des fichiers.
 */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronsLeft,
    LucideChevronsRight,
    LucideExternalLink,
    LucideFile,
    LucideFileSpreadsheet,
    LucideFileText,
    LucideFileType,
    LucideFolderOpen,
    LucideImage,
    LucideSearch,
    LucideX,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class DocumentsPage implements OnInit {
  private readonly api = inject(GedApiService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly documents = signal<GedDocument[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly tailles = TAILLES_PAGE;
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly origines = signal<GedOrigine[]>([]);
  protected readonly filters = this.formBuilder.nonNullable.group({
    q: '',
    origine: '',
    type: '',
    depuis: '',
    jusqua: '',
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pages = computed(() => pagesAffichees(this.page(), this.pageCount()));
  protected readonly premier = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly dernier = computed(() =>
    Math.min(this.total(), this.page() * this.pageSize()),
  );
  protected readonly originOptions = computed(() =>
    this.origines().map((origine) => ({ value: origine, label: GED_ORIGINE_LABELS[origine] })),
  );

  ngOnInit(): void {
    this.load();
    const controls = this.filters.controls;
    controls.q.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    controls.type.valueChanges
      .pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    controls.origine.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    controls.depuis.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
    controls.jusqua.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.search());
  }

  protected originLabel(origine: GedOrigine): string {
    return GED_ORIGINE_LABELS[origine];
  }

  protected reset(): void {
    this.filters.reset({ q: '', origine: '', type: '', depuis: '', jusqua: '' });
  }

  protected openParent(document: GedDocument): void {
    void this.router.navigateByUrl(document.lien);
  }

  protected nature(document: GedDocument): GedFichier {
    return natureFichier(document.url);
  }

  protected goTo(page: number): void {
    const cible = Math.min(Math.max(1, page), this.pageCount());
    if (cible === this.page()) return;
    this.page.set(cible);
    this.load();
  }

  protected changePageSize(taille: number): void {
    this.pageSize.set(taille);
    this.search();
  }

  /** Toute modification de filtre repart de la première page. */
  private search(): void {
    this.page.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.failed.set(false);
    const value = this.filters.getRawValue();
    this.api
      .search({
        q: value.q.trim() || undefined,
        origines: value.origine ? [value.origine as GedOrigine] : undefined,
        type: value.type.trim() || undefined,
        depuis: value.depuis || undefined,
        jusqua: value.jusqua || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (result) => {
          this.documents.set(result.items);
          this.total.set(result.total);
          this.origines.set(result.origines);
          this.loading.set(false);
        },
        error: () => {
          this.documents.set([]);
          this.total.set(0);
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }
}
