import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucideIdCard, LucidePencil, LucideTrash2 } from '@lucide/angular';
import { ProprietairesApiService, type ProprietaireDetail as ProprietaireDetailModel } from '../../../core/services/api/proprietaires-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { SessionService } from '../../../core/services/session.service';
import { ProprietaireDialog } from '../../terrains/proprietaire-dialog';
import type { ProprietaireSummary, TerrainListItem } from '../../../core/models/terrain.model';
import type { MandatListItem } from '../../../core/models/mandat.model';

@Component({
  selector: 'app-proprietaire-detail',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideArrowLeft, LucideIdCard, LucidePencil, LucideTrash2],
  templateUrl: './proprietaire-detail.html',
  styleUrl: './proprietaire-detail.scss',
})
export class ProprietaireDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProprietairesApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly mandatsApi = inject(MandatsApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly proprietaire = signal<ProprietaireDetailModel | null>(null);
  protected readonly terrains = signal<TerrainListItem[]>([]);
  protected readonly mandats = signal<MandatListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly canModify = computed(() => this.session.hasPermission('proprietaires:modifier'));
  protected readonly canDelete = computed(() => this.session.hasPermission('proprietaires:supprimer'));

  private id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) { this.goBack(); return; }
    this.load(this.id);
  }

  protected goBack(): void { this.router.navigate(['/proprietaires']); }
  protected openTerrain(id: string): void { this.router.navigate(['/terrains', id]); }
  protected openMandat(id: string): void { this.router.navigate(['/mandats', id]); }

  protected formatMoney(value: number | string | null | undefined): string {
    return value === null || value === undefined ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`;
  }

  protected edit(): void {
    const current = this.proprietaire();
    if (!current || !this.id) return;
    const ref = this.dialog.open(ProprietaireDialog, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: { proprietaire: current as ProprietaireSummary },
    });
    ref.afterClosed().subscribe((payload: Omit<ProprietaireSummary, 'id'> | undefined) => {
      if (!payload || !this.id) return;
      this.api.update(this.id, payload).subscribe({
        next: () => { this.snackBar.open('Propriétaire mis à jour', 'Fermer', { duration: 3000 }); this.load(this.id!); },
        error: () => this.snackBar.open('Impossible de mettre à jour le propriétaire', 'Fermer', { duration: 4000 }),
      });
    });
  }

  protected remove(): void {
    if (!this.id) return;
    if (!confirm('Supprimer ce propriétaire ? Cette action est irréversible.')) return;
    this.api.remove(this.id).subscribe({
      next: () => { this.snackBar.open('Propriétaire supprimé', 'Fermer', { duration: 3000 }); this.goBack(); },
      error: () => this.snackBar.open('Impossible de supprimer ce propriétaire (des terrains ou mandats y sont peut-être rattachés)', 'Fermer', { duration: 5000 }),
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (proprietaire) => { this.proprietaire.set(proprietaire); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Propriétaire introuvable', 'Fermer', { duration: 4000 }); this.goBack(); },
    });
    this.terrainsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
      next: (page) => this.terrains.set(page.items),
      error: () => this.snackBar.open('Impossible de charger les terrains liés', 'Fermer', { duration: 4000 }),
    });
    this.mandatsApi.findAll({ proprietaireId: id, pageSize: 100 }).subscribe({
      next: (page) => this.mandats.set(page.items),
      error: () => this.snackBar.open('Impossible de charger les mandats liés', 'Fermer', { duration: 4000 }),
    });
  }
}
