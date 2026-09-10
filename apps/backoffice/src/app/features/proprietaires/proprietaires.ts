import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideIdCard, LucidePlus, LucideSearch } from '@lucide/angular';
import { ProprietairesApiService } from '../../core/services/api/proprietaires-api.service';
import { SessionService } from '../../core/services/session.service';
import { ProprietaireDialog } from '../terrains/proprietaire-dialog';
import type { ProprietaireSummary } from '../../core/models/terrain.model';

@Component({
  selector: 'app-proprietaires',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogModule, LucideIdCard, LucidePlus, LucideSearch],
  templateUrl: './proprietaires.html',
  styleUrl: './proprietaires.scss',
})
export class Proprietaires implements OnInit {
  private readonly api = inject(ProprietairesApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly proprietaires = signal<ProprietaireSummary[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly canCreate = computed(() => this.session.hasPermission('proprietaires:creer'));

  protected readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.proprietaires();
    return this.proprietaires().filter((proprietaire) =>
      `${proprietaire.firstName} ${proprietaire.lastName}`.toLowerCase().includes(term) ||
      (proprietaire.email ?? '').toLowerCase().includes(term) ||
      (proprietaire.phone ?? '').toLowerCase().includes(term),
    );
  });

  ngOnInit(): void { this.load(); }

  protected openDetail(id: string): void { this.router.navigate(['/proprietaires', id]); }

  protected openCreate(): void {
    const ref = this.dialog.open(ProprietaireDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)' });
    ref.afterClosed().subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
      if (!payload) return;
      this.api.create(payload).subscribe({
        next: () => { this.snackBar.open('Propriétaire créé', 'Fermer', { duration: 3000 }); this.load(); },
        error: () => this.snackBar.open('Impossible de créer le propriétaire', 'Fermer', { duration: 4000 }),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (items) => { this.proprietaires.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erreur lors du chargement des propriétaires', 'Fermer', { duration: 4000 }); },
    });
  }
}
