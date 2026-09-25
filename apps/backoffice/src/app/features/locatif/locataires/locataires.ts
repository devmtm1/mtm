import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { LucideKeyRound, LucidePlus, LucideSearch, LucideUserX } from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mtmGridTheme } from '../../../core/ag-grid.config';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { Locataire } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { SITUATIONS_PAIEMENT, capitaliserNom, label, pillClass } from '../locatif-status';
import { LocataireDialog } from './locataire-dialog';

/**
 * Fiches locataires (J2.1) : indépendantes des baux, elles se créent d'abord
 * ici (ou à la volée pendant la création d'un bail), puis se rattachent à un
 * ou plusieurs biens au fil du temps.
 */
@Component({
  selector: 'app-locataires',
  imports: [
    AgGridAngular,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    LucideKeyRound,
    LucidePlus,
    LucideSearch,
    LucideUserX,
  ],
  templateUrl: './locataires.html',
  styleUrl: './locataires.scss',
})
export class Locataires implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly theme = mtmGridTheme;
  protected readonly loading = signal(true);
  protected readonly locataires = signal<Locataire[]>([]);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));
  protected readonly hasActiveFilters = computed(() => this.search.value.trim() !== '');

  protected readonly stats = computed(() => {
    const list = this.locataires();
    return {
      total: list.length,
      sansBail: list.filter((item) => (item._count?.baux ?? 0) === 0).length,
    };
  });

  protected readonly columnDefs: ColDef<Locataire>[] = [
    {
      headerName: 'Locataire',
      flex: 1.4,
      minWidth: 190,
      sortable: true,
      // Nom avant prénom pour que le tri suive l'ordre d'un répertoire.
      valueGetter: (p) => (p.data ? `${p.data.lastName} ${p.data.firstName}` : ''),
      cellRenderer: (p: ICellRendererParams<Locataire>) =>
        this.cellulePrincipale(
          capitaliserNom(p.value as string),
          p.data?.phone ?? 'Téléphone non renseigné',
        ),
    },
    {
      field: 'email',
      headerName: 'E-mail',
      flex: 1.2,
      minWidth: 170,
      valueFormatter: (p) => (p.value as string) || '—',
      cellClass: (p) => (p.value ? '' : 'cell-muted'),
    },
    {
      // Sans cette colonne, il fallait ouvrir chaque fiche pour savoir qui
      // habite où.
      headerName: 'Bien occupé',
      flex: 1.5,
      minWidth: 190,
      valueGetter: (p) => p.data?.baux?.[0]?.bienLocatif?.adresse ?? '',
      cellRenderer: (p: ICellRendererParams<Locataire>) => {
        const bail = p.data?.baux?.[0];
        if (!bail) return this.cellulePrincipale('—', 'Aucun bail en cours');
        return this.cellulePrincipale(
          bail.bienLocatif.adresse,
          [bail.bienLocatif.commune, bail.referenceInterne].filter(Boolean).join(' · '),
        );
      },
    },
    {
      headerName: 'Paiement',
      flex: 0.8,
      minWidth: 120,
      valueGetter: (p) => p.data?.baux?.[0]?.situationPaiement ?? null,
      cellRenderer: (p: ICellRendererParams<Locataire>) => {
        const valeur = p.value as string | null;
        if (!valeur) return '—';
        const span = document.createElement('span');
        span.className = pillClass(SITUATIONS_PAIEMENT, valeur);
        span.textContent = label(SITUATIONS_PAIEMENT, valeur);
        span.title = SITUATIONS_PAIEMENT[valeur]?.help ?? '';
        return span;
      },
    },
    {
      headerName: 'Baux',
      flex: 0.5,
      minWidth: 80,
      type: 'rightAligned',
      sortable: true,
      valueGetter: (p) => p.data?._count?.baux ?? 0,
    },
    {
      headerName: '',
      colId: 'actions',
      width: 72,
      minWidth: 72,
      pinned: 'right',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<Locataire>) => {
        if (!params.data) return '';
        const id = params.data.id;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'grid-icon-btn';
        button.title = 'Ouvrir la fiche';
        button.setAttribute('aria-label', 'Ouvrir la fiche');
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.5 8.18 7.4 5 12 5s8.5 3.18 9.94 6.65a1 1 0 0 1 0 .7C20.5 15.82 16.6 19 12 19s-8.5-3.18-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>';
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.openDetail(id);
        });
        return button;
      },
    },
  ];

  /** Valeur principale et sa précision en dessous, dans une seule cellule. */
  private cellulePrincipale(principal: string, secondaire: string): HTMLElement {
    const bloc = document.createElement('div');
    bloc.className = 'cell-stack';
    const titre = document.createElement('span');
    titre.className = 'cell-strong';
    titre.textContent = principal;
    bloc.appendChild(titre);
    if (secondaire) {
      const detail = document.createElement('small');
      detail.className = 'cell-muted';
      detail.textContent = secondaire;
      bloc.appendChild(detail);
    }
    return bloc;
  }

  ngOnInit(): void {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/locatif/locataires', id]);
  }

  protected resetFilters(): void {
    this.search.setValue('');
  }

  protected openCreate(): void {
    LocataireDialog.open(this.dialog).subscribe((created) => {
      if (!created) return;
      this.notify.success('Locataire créé');
      this.openDetail(created.id);
    });
  }

  private load(): void {
    this.loading.set(true);
    const term = this.search.value.trim();
    this.api.findLocataires(term || undefined).subscribe({
      next: (items) => {
        this.locataires.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des locataires');
      },
    });
  }
}
