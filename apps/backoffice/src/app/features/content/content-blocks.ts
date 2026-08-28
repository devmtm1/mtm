import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideTrash2, LucidePlus } from '@lucide/angular';
import { ContentBlockApiService, type ContentBlock } from '../../core/services/api/content-block-api.service';
import { ContentEditorDialog } from './content-editor-dialog';

@Component({
  selector: 'app-content-blocks',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    FormsModule,
    LucidePencil,
    LucideTrash2,
    LucidePlus,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Contenus du site</h1>
          <p>Gérez les contenus textuels, témoignages et éléments du site public.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openEditor()">
          <svg lucidePlus aria-hidden="true"></svg>
          Nouveau contenu
        </button>
      </div>

      <table mat-table [dataSource]="blocks()" class="w-full">
        <ng-container matColumnDef="key">
          <th mat-header-cell *matHeaderCellDef>Clé</th>
          <td mat-cell *matCellDef="let b">{{ b.key }}</td>
        </ng-container>
        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef>Type</th>
          <td mat-cell *matCellDef="let b">{{ b.type }}</td>
        </ng-container>
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Titre</th>
          <td mat-cell *matCellDef="let b">{{ b.title || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="ordre">
          <th mat-header-cell *matHeaderCellDef>Ordre</th>
          <td mat-cell *matCellDef="let b">{{ b.ordre }}</td>
        </ng-container>
        <ng-container matColumnDef="isActive">
          <th mat-header-cell *matHeaderCellDef>Actif</th>
          <td mat-cell *matCellDef="let b">
            <span [class]="b.isActive ? 'badge-yes' : 'badge-no'">
              {{ b.isActive ? 'Oui' : 'Non' }}
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let b">
            <button mat-button (click)="openEditor(b)">
              <svg lucidePencil aria-hidden="true"></svg>
            </button>
            <button mat-button color="warn" (click)="remove(b)">
              <svg lucideTrash2 aria-hidden="true"></svg>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (!loading() && blocks().length === 0) {
        <p class="empty">
          Aucun contenu pour le moment.
        </p>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { font-size: 1.5rem; margin: 0; }
    .page-header p { color: #647489; font-size: 0.9rem; }
    table { border-spacing: 0; }
    th { padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
    .badge-yes { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
    .badge-no { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
    .empty { text-align: center; padding: 40px; color: #94a3b8; }
    button[mat-button] { padding: 4px 8px; }
  `],
})
export class ContentBlocks {
  private readonly api = inject(ContentBlockApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly blocks = signal<ContentBlock[]>([]);
  protected readonly displayedColumns = ['key', 'type', 'title', 'ordre', 'isActive', 'actions'];

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (data) => {
        this.blocks.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur de chargement', 'Fermer', { duration: 3000 });
      },
    });
  }

  openEditor(block?: ContentBlock): void {
    const ref = this.dialog.open(ContentEditorDialog, {
      width: '600px',
      data: block ?? null,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.created || result?.updated) {
        this.snackBar.open(
          result.created ? 'Contenu créé' : 'Contenu mis à jour',
          'Fermer',
          { duration: 2000 },
        );
        this.load();
      }
    });
  }

  remove(block: ContentBlock): void {
    if (!confirm(`Supprimer "${block.key}" ?`)) return;
    this.api.remove(block.key).subscribe({
      next: () => {
        this.snackBar.open('Contenu supprimé', 'Fermer', { duration: 2000 });
        this.load();
      },
      error: () => {
        this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
      },
    });
  }
}
