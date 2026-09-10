import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { LucidePencil, LucidePlus, LucideTrash2, LucideUpload } from '@lucide/angular';
import { ShowcaseApiService, type ShowcaseItem } from '../../../core/services/api/showcase-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ShowcaseEditorDialog } from './showcase-editor-dialog';

const CATEGORY_LABELS: Record<string, string> = {
  realisation: 'Réalisation',
  projet_a_venir: 'Projet à venir',
};

@Component({
  selector: 'app-showcase-items',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatTableModule, LucidePencil, LucidePlus, LucideTrash2, LucideUpload],
  templateUrl: './showcase-items.html',
  styleUrl: './showcase-items.scss',
})
export class ShowcaseItems {
  private readonly api = inject(ShowcaseApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly loading = signal(true);
  protected readonly items = signal<ShowcaseItem[]>([]);
  protected readonly categoryFilter = signal<string | null>(null);
  protected readonly displayedColumns = ['image', 'category', 'title', 'location', 'date', 'ordre', 'isActive', 'actions'];

  protected readonly filtered = computed(() => {
    const category = this.categoryFilter();
    const all = this.items();
    return category ? all.filter((item) => item.category === category) : all;
  });

  constructor() {
    this.load();
  }

  protected label(category: string): string {
    return CATEGORY_LABELS[category] ?? category;
  }

  protected setFilter(category: string | null): void {
    this.categoryFilter.set(category);
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAllAdmin().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erreur de chargement', 'Fermer', { duration: 3000 }); },
    });
  }

  protected openEditor(item?: ShowcaseItem): void {
    const ref = this.dialog.open(ShowcaseEditorDialog, { width: '560px', data: item ?? null });
    ref.afterClosed().subscribe((result) => {
      if (result?.created || result?.updated) {
        this.snackBar.open(result.created ? 'Élément créé' : 'Élément mis à jour', 'Fermer', { duration: 2500 });
        this.load();
      }
    });
  }

  protected selectImage(event: Event, item: ShowcaseItem): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.api.uploadImage(item.id, file).subscribe({
      next: () => { this.snackBar.open('Image mise à jour', 'Fermer', { duration: 2500 }); this.load(); },
      error: () => this.snackBar.open('Impossible d’envoyer l’image', 'Fermer', { duration: 4000 }),
    });
  }

  protected publish(item: ShowcaseItem): void {
    this.api.publish(item.id, !item.isActive).subscribe({
      next: () => { this.snackBar.open(item.isActive ? 'Élément dépublié' : 'Élément publié', 'Fermer', { duration: 2500 }); this.load(); },
      error: () => this.snackBar.open('Permission de publication insuffisante', 'Fermer', { duration: 3000 }),
    });
  }

  protected remove(item: ShowcaseItem): void {
    if (!confirm(`Supprimer "${item.title}" ?`)) return;
    this.api.remove(item.id).subscribe({
      next: () => { this.snackBar.open('Élément supprimé', 'Fermer', { duration: 2500 }); this.load(); },
      error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 }),
    });
  }
}
