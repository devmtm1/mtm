import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucidePencil, LucideFileText, LucideMapPin, LucideImage } from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { TerrainDetail as TerrainDetailModel } from '../../../core/models/terrain.model';

@Component({
  selector: 'app-terrain-detail',
  imports: [MatButtonModule, LucideArrowLeft, LucidePencil, LucideFileText, LucideMapPin, LucideImage],
  templateUrl: './terrain-detail.html',
  styleUrl: './terrain-detail.scss',
})
export class TerrainDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly session = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);

  protected terrain: TerrainDetailModel | null = null;
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('terrains:modifier');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.api.findOne(id).subscribe({ next: (terrain) => { this.terrain = terrain; this.loading.set(false); }, error: () => { this.loading.set(false); this.snackBar.open('Terrain introuvable', 'Fermer', { duration: 4000 }); this.goBack(); } });
  }

  protected goBack(): void { this.router.navigate(['/terrains']); }
  protected edit(): void { if (this.terrain) this.router.navigate(['/terrains', this.terrain.id, 'modifier']); }
  protected formatMoney(value: number | string | null): string { return value === null ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`; }
  protected formatNumber(value: number | string | null): string { return value === null ? '—' : Number(value).toLocaleString('fr-FR'); }
}
