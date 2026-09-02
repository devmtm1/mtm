import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucidePlus, LucideUpload } from '@lucide/angular';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ActiviteDialog } from '../activite-dialog/activite-dialog';
import { CRM_LABELS } from '../activite-dialog/activite-dialog';
import type { ProspectDetail, ProspectTimeline } from '../../../core/models/prospect.model';

@Component({
  selector: 'app-prospect-360',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucidePlus, LucideUpload],
  templateUrl: './prospect-360.html',
  styleUrl: './prospect-360.scss',
})
export class Prospect360 implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected prospect: ProspectDetail | null = null;
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('crm:modifier');
  protected readonly pipelineStages = signal<string[]>([]);
  protected readonly timeline = signal<ProspectTimeline | null>(null);

  protected get activites() { return this.prospect?.activites ?? []; }
  protected get documents() { return this.prospect?.documents ?? []; }
  protected get dossiers() { return this.prospect?.dossiers ?? []; }
  protected get upcoming() { return this.timeline()?.upcoming ?? []; }
  protected get overdue() { return this.timeline()?.overdue ?? []; }
  protected get audits() { return this.timeline()?.audits ?? []; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.loadProspect(id);
    this.loadTimeline(id);
    this.loadOptions();
  }

  protected goBack(): void { this.router.navigate(['/crm/prospects']); }
  protected edit(): void { if (this.prospect) this.router.navigate(['/crm/prospects', this.prospect.id, 'modifier']); }
  protected formatMoney(value: number | string | null | undefined): string {
    return value === null || value === undefined ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`;
  }
  protected label(value: string): string {
    return CRM_LABELS[value] ?? value;
  }

  protected openActivity(): void {
    if (!this.prospect) return;
    this.dialog.open(ActiviteDialog, { width: '500px', maxWidth: 'calc(100vw - 32px)', data: { mode: 'add', prospectId: this.prospect.id } }).afterClosed().subscribe((result) => {
      if (!result || result.mode !== 'add') return;
      this.api.addActivite(this.prospect!.id, result.payload).subscribe({
        next: () => { this.snack.open('Activité ajoutée', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); this.loadTimeline(this.prospect!.id); },
        error: () => this.snack.open('Erreur', 'Fermer', { duration: 4000 }),
      });
    });
  }

  protected uploadDoc(): void {
    if (!this.prospect) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*,.doc,.docx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      this.api.addDocument(this.prospect!.id, file, 'document').subscribe({
        next: () => { this.snack.open('Document ajouté', 'Fermer', { duration: 3000 }); this.loadProspect(this.prospect!.id); },
        error: () => this.snack.open('Impossible d’ajouter le document', 'Fermer', { duration: 4000 }),
      });
    };
    input.click();
  }

  private loadProspect(id: string): void {
    this.loading.set(true);
    this.api.find360(id).subscribe({
      next: (data) => {
        this.prospect = data.prospect;
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snack.open('Prospect introuvable', 'Fermer', { duration: 4000 }); this.goBack(); },
    });
  }

  private loadTimeline(id: string): void {
    this.api.getTimeline(id).subscribe({
      next: (tl) => this.timeline.set(tl),
      error: () => this.snack.open('Impossible de charger la timeline', 'Fermer', { duration: 4000 }),
    });
  }

  private loadOptions(): void {
    this.api.getOptions().subscribe({
      next: (options) => this.pipelineStages.set(options.pipelineStages),
      error: () => this.snack.open('Impossible de charger les options', 'Fermer', { duration: 4000 }),
    });
  }
}
