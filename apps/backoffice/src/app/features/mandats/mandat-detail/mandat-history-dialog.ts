import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideX } from '@lucide/angular';
import { MandatsApiService, AuditHistoryItem } from '../../../core/services/api/mandats-api.service';

@Component({
  selector: 'app-mandat-history-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideX],
  templateUrl: './mandat-history-dialog.html',
  styleUrl: './mandat-history-dialog.scss',
})
export class MandatHistoryDialog {
  private readonly api = inject(MandatsApiService);
  private readonly dialogRef = inject(MatDialogRef<MandatHistoryDialog>);
  protected readonly dialogData = inject<{ mandatId: string }>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly history = signal<AuditHistoryItem[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.api.getHistory(this.dialogData.mandatId).subscribe({
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
      'mandat.created': 'Création du mandat',
      'mandat.updated': 'Modification du mandat',
      'mandat.deleted': 'Suppression du mandat',
      'mandat.lot.created': 'Ajout d’un lot',
      'mandat.lot.updated': 'Modification d’un lot',
      'mandat.lot.deleted': 'Suppression d’un lot',
      'mandat.document.created': 'Ajout d’un document',
      'mandat.document.deleted': 'Suppression d’un document',
    };
    return labels[action] ?? action;
  }
}
