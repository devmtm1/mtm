import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucideFileText, LucidePencil, LucidePlus, LucideUser, LucideClock, LucideMapPin, LucideTrash, LucideUpload } from '@lucide/angular';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { MandatDetail as MandatDetailModel, MandatFinancialSummary, MandatLotItem } from '../../../core/models/mandat.model';
import { MandatHistoryDialog } from './mandat-history-dialog';
import { MandatLotDialog } from './mandat-lot-dialog';

@Component({
  selector: 'app-mandat-detail',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideArrowLeft, LucideFileText, LucidePencil, LucidePlus, LucideUser, LucideClock, LucideMapPin, LucideTrash, LucideUpload],
  templateUrl: './mandat-detail.html',
  styleUrl: './mandat-detail.scss',
})
export class MandatDetail implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly api: MandatsApiService = inject(MandatsApiService);
  private readonly session: SessionService = inject(SessionService);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly dialog: MatDialog = inject(MatDialog);

  protected mandat: MandatDetailModel | null = null;
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('mandats:modifier');
  protected readonly pendingDocuments = signal<{ file: File }[]>([]);
  protected readonly financial = signal<MandatFinancialSummary | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.api.findOne(id).subscribe({
      next: (mandat) => { this.mandat = mandat; this.loading.set(false); this.loadFinancial(id); },
      error: () => { this.loading.set(false); this.snackBar.open('Mandat introuvable', 'Fermer', { duration: 4000 }); this.goBack(); },
    });
  }

  private loadFinancial(id: string): void {
    this.api.getFinancialSummary(id).subscribe({
      next: (summary) => this.financial.set(summary),
      error: () => {
        // Silently ignore financial summary load failure
      },
    });
  }

  protected goBack(): void { this.router.navigate(['/mandats']); }
  protected edit(): void { if (this.mandat) this.router.navigate(['/mandats', this.mandat.id, 'modifier']); }

  protected lotsParStatut(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const lot of this.mandat?.lots ?? []) {
      counts[lot.statutLot] = (counts[lot.statutLot] || 0) + 1;
    }
    return counts;
  }

  protected restrictionsJson(): string {
    return this.mandat?.restrictionsContractuelles ? JSON.stringify(this.mandat.restrictionsContractuelles, null, 2) : '—';
  }

  protected formatMoney(value: number | string | null): string { return value === null ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`; }
  protected formatNumber(value: number | string | null): string { return value === null ? '—' : Number(value).toLocaleString('fr-FR'); }
  protected formatLocation(lot: MandatLotItem): string { return [lot.terrain.commune, lot.terrain.region].filter((value): value is string => Boolean(value)).join(', ') || 'Localisation non renseignée'; }
  protected scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected openHistory(): void {
    if (!this.mandat) return;
    this.dialog.open(MandatHistoryDialog, {
      width: '600px',
      maxWidth: 'calc(100vw - 32px)',
      data: { mandatId: this.mandat.id },
    });
  }

  protected openAddLot(): void {
    if (!this.mandat) return;
    this.dialog.open(MandatLotDialog, {
      width: '500px',
      maxWidth: 'calc(100vw - 32px)',
      data: { mandatId: this.mandat.id },
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.api.addLot(this.mandat!.id, result).subscribe({
          next: () => { this.snackBar.open('Lot ajouté', 'Fermer', { duration: 3000 }); this.api.findOne(this.mandat!.id).subscribe((m) => { this.mandat = m; }); },
          error: () => this.snackBar.open('Erreur lors de l’ajout du lot', 'Fermer', { duration: 4000 }),
        });
      }
    });
  }

  protected editLot(lot: MandatLotItem): void {
    if (!this.mandat) return;
    this.dialog.open(MandatLotDialog, {
      width: '500px',
      maxWidth: 'calc(100vw - 32px)',
      data: { mandatId: this.mandat.id, lot },
    }).afterClosed().subscribe((result) => {
      if (result && lot.id) {
        this.api.updateLot(this.mandat!.id, lot.id, result).subscribe({
          next: () => { this.snackBar.open('Lot mis à jour', 'Fermer', { duration: 3000 }); this.api.findOne(this.mandat!.id).subscribe((m) => { this.mandat = m; }); },
          error: () => this.snackBar.open('Erreur lors de la mise à jour du lot', 'Fermer', { duration: 4000 }),
        });
      }
    });
  }

  protected selectDocument(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.mandat) return;
    this.pendingDocuments.update((docs) => [...docs, { file }]);
    this.api.addDocument(this.mandat.id, file, 'contrat').subscribe({
      next: () => {
        this.pendingDocuments.update((docs) => docs.filter((d) => d.file !== file));
        this.snackBar.open('Document ajouté', 'Fermer', { duration: 3000 });
        this.api.findOne(this.mandat!.id).subscribe((m) => { this.mandat = m; });
      },
      error: () => {
        this.pendingDocuments.update((docs) => docs.filter((d) => d.file !== file));
        this.snackBar.open('Impossible d’ajouter le document', 'Fermer', { duration: 4000 });
      },
    });
  }

  protected removeDocument(documentId: string): void {
    if (!this.mandat) return;
    this.api.removeDocument(this.mandat.id, documentId).subscribe({
      next: () => { this.snackBar.open('Document supprimé', 'Fermer', { duration: 3000 }); this.api.findOne(this.mandat!.id).subscribe((m) => { this.mandat = m; }); },
      error: () => this.snackBar.open('Impossible de supprimer le document', 'Fermer', { duration: 4000 }),
    });
  }
}
