import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideX } from '@lucide/angular';
import { TerrainsApiService, AuditHistoryItem } from '../../core/services/api/terrains-api.service';

@Component({
  selector: 'app-terrain-history-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideX],
  templateUrl: './terrain-history-dialog.html',
  styleUrl: './terrain-history-dialog.scss',
})
export class TerrainHistoryDialog {
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly dialogRef = inject(MatDialogRef<TerrainHistoryDialog>);
  protected readonly dialogData = inject<{ terrainId: string }>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly history = signal<AuditHistoryItem[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

   constructor() {
    this.terrainsApi.getHistory(this.dialogData.terrainId).subscribe({
      next: (response: { items: AuditHistoryItem[] }) => {
        this.history.set(response.items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger l’historique.');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  protected formatAction(action: string): string {
    const labels: Record<string, string> = {
      'terrain.created': 'Création du terrain',
      'terrain.updated': 'Modification du terrain',
      'terrain.statutJuridique.updated': 'Changement de statut juridique',
      'terrain.niveauVerification.updated': 'Changement de niveau de vérification',
      'terrain.statutCommercial.updated': 'Changement de statut commercial',
      'terrain.media.created': 'Ajout d’un média',
      'terrain.media.deleted': 'Suppression d’un média',
      'terrain.document.created': 'Ajout d’un document',
      'terrain.document.deleted': 'Suppression d’un document',
    };
    return labels[action] ?? action;
  }
}
