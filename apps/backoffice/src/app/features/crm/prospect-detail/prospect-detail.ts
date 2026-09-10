import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucidePencil, LucidePlus, LucideClock } from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ActiviteDialog } from '../activite-dialog/activite-dialog';
import { ClientAccountDialog } from '../client-account-dialog/client-account-dialog';
import { SalesDossierDialog } from '../sales-dossier-dialog/sales-dossier-dialog';
import type { ProspectDetail as ProspectDetailModel } from '../../../core/models/prospect.model';

@Component({
  selector: 'app-prospect-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideArrowLeft, LucidePencil, LucidePlus, LucideClock],
  templateUrl: './prospect-detail.html',
  styleUrl: './prospect-detail.scss',
})
export class ProspectDetail implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly api = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected prospect: ProspectDetailModel | null = null;
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('crm:modifier');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');
  protected readonly canCreateSale = this.session.hasPermission('ventes:creer');
  protected readonly pipelineStages = signal<string[]>([]);
  protected readonly transitioning = signal(false);

  protected get activites() { return this.prospect?.activites ?? []; }
  protected get documents() { return this.prospect?.documents ?? []; }
  protected get dossiers() { return this.prospect?.dossiers ?? []; }
  protected currentStageIndex(): number {
    return this.pipelineStages().indexOf(this.prospect?.statutPipeline ?? '');
  }
  protected nextStages(): string[] {
    const idx = this.currentStageIndex();
    return idx >= 0 && idx < this.pipelineStages().length - 1 ? this.pipelineStages().slice(idx + 1) : [];
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.loadProspect(id);
    this.loadOptions();
  }

  protected goBack(): void { this.router.navigate(['/crm/prospects']); }
  protected openVue360(): void { if (this.prospect) this.router.navigate(['/crm/prospects', this.prospect.id, '360']); }
  protected edit(): void { if (this.prospect) this.router.navigate(['/crm/prospects', this.prospect.id, 'modifier']); }

  protected formatMoney(value: number | string | null | undefined): string {
    return value === null || value === undefined ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`;
  }

  protected scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected openHistory(): void {
    if (!this.prospect) return;
    this.dialog.open(ActiviteDialog, { width: '600px', maxWidth: 'calc(100vw - 32px)', data: { mode: 'history', prospectId: this.prospect.id } });
  }

  protected openAddActivite(): void {
    if (!this.prospect) return;
    this.dialog.open(ActiviteDialog, { width: '500px', maxWidth: 'calc(100vw - 32px)', data: { mode: 'add', prospectId: this.prospect.id } }).afterClosed().subscribe((result) => {
      if (!result || result.mode !== 'add') return;
      this.api.addActivite(this.prospect!.id, result.payload).subscribe({
        next: () => { this.snackBar.open('Activité ajoutée', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); },
        error: () => this.snackBar.open('Erreur lors de l’ajout', 'Fermer', { duration: 4000 }),
      });
    });
  }

  protected openCreateClientAccount(): void {
    if (!this.prospect?.email || !this.canCreateClient) return;
    this.dialog.open(ClientAccountDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        prospectId: this.prospect.id,
        email: this.prospect.email,
        name: `${this.prospect.prenom ?? ''} ${this.prospect.nom}`.trim(),
      },
    });
  }

  protected openCreateSalesDossier(): void {
    if (!this.prospect || !this.canCreateSale) return;
    this.dialog.open(SalesDossierDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        prospectId: this.prospect.id,
        prospectName: `${this.prospect.prenom ?? ''} ${this.prospect.nom}`.trim(),
      },
    }).afterClosed().subscribe((created) => {
      if (!created || !this.prospect) return;
      this.snackBar.open('Dossier de vente créé', 'Fermer', { duration: 3000 });
      this.loadProspect(this.prospect.id);
    });
  }

  protected openEditActivite(activiteId: string): void {
    if (!this.prospect) return;
    const activite = this.prospect.activites.find((a) => a.id === activiteId);
    if (!activite) return;
    this.dialog.open(ActiviteDialog, { width: '500px', maxWidth: 'calc(100vw - 32px)', data: { mode: 'edit', prospectId: this.prospect.id, activite } }).afterClosed().subscribe((result) => {
      if (!result || result.mode !== 'edit') return;
      this.api.updateActivite(this.prospect!.id, activiteId, result.payload).subscribe({
        next: () => { this.snackBar.open('Activité mise à jour', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); },
        error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 4000 }),
      });
    });
  }

  protected transitionPipeline(stage: string): void {
    if (!this.prospect || this.transitioning()) return;
    let justification: string | undefined;
    if (stage === 'perdu') {
      const input = window.prompt('Justification obligatoire pour marquer ce prospect comme perdu :')?.trim();
      if (!input || input.length < 3) {
        if (input !== null) this.snackBar.open('Justification obligatoire (3 caractères minimum)', 'Fermer', { duration: 4000 });
        return;
      }
      justification = input;
    }
    this.transitioning.set(true);
    this.api.transitionPipeline(this.prospect.id, stage, justification).subscribe({
      next: () => {
        this.snackBar.open('Pipeline mis à jour', 'Fermer', { duration: 3000 });
        this.loadProspect(this.prospect!.id);
        this.transitioning.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message;
        this.snackBar.open(Array.isArray(message) ? message.join(' ') : (typeof message === 'string' && message.trim() ? message : 'Erreur'), 'Fermer', { duration: 4000 });
        this.transitioning.set(false);
      },
    });
  }

  protected uploadDocument(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.prospect) return;
    this.api.addDocument(this.prospect.id, file, 'autre').subscribe({
      next: () => { this.snackBar.open('Document ajouté', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); },
      error: (error: { error?: { message?: string | string[] }; message?: string }) => {
        const message = error.error?.message ?? error.message;
        const detail = Array.isArray(message) ? message.join(', ') : message;
        this.snackBar.open(detail || 'Impossible d’ajouter le document', 'Fermer', { duration: 5000 });
      },
    });
  }

  protected removeDocument(documentId: string): void {
    if (!this.prospect) return;
    this.api.removeDocument(this.prospect.id, documentId).subscribe({
      next: () => { this.snackBar.open('Document supprimé', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); },
      error: () => { this.snackBar.open('Impossible de supprimer le document', 'Fermer', { duration: 4000 }); },
    });
  }

  private loadProspect(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (prospect) => {
        this.prospect = prospect;
        this.loading.set(false);
        this.changeDetector.markForCheck();
      },
      error: () => { this.loading.set(false); this.snackBar.open('Prospect introuvable', 'Fermer', { duration: 4000 }); this.goBack(); },
    });
  }

  private loadOptions(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.pipelineStages.set(options.pipelineStages),
      error: () => this.snackBar.open('Impossible de charger les options', 'Fermer', { duration: 4000 }),
    });
  }
}
