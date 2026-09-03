import { Component, OnDestroy, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideArrowLeft, LucidePencil, LucideFileText, LucideMapPin, LucideImage, LucideClock, LucideExternalLink } from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import { SessionService } from '../../../core/services/session.service';
import { TerrainHistoryDialog } from '../terrain-history-dialog';
import type { TerrainDetail as TerrainDetailModel } from '../../../core/models/terrain.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-terrain-detail',
  imports: [DatePipe, MatButtonModule, MatDialogModule, LucideArrowLeft, LucidePencil, LucideFileText, LucideMapPin, LucideImage, LucideClock, LucideExternalLink],
  templateUrl: './terrain-detail.html',
  styleUrl: './terrain-detail.scss',
})
export class TerrainDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TerrainsApiService);
  private readonly session = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected terrain: TerrainDetailModel | null = null;
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('terrains:modifier');
  protected mapUrl: string | null = null;

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.goBack(); return; }
    this.api.findOne(id).subscribe({ next: (terrain) => { this.terrain = terrain; this.loading.set(false); this.prepareMap(); }, error: () => { this.loading.set(false); this.snackBar.open('Terrain introuvable', 'Fermer', { duration: 4000 }); this.goBack(); } });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private prepareMap(): void {
    const terrain = this.terrain;
    if (!terrain) return;
    const lat = Number(terrain.latitude);
    const lng = Number(terrain.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { this.mapUrl = null; return; }
    this.mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
    setTimeout(() => this.renderMap(lat, lng), 0);
  }

  private renderMap(lat: number, lng: number): void {
    if (!this.mapContainer?.nativeElement || this.map) return;
    const map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      className: 'mtm-map-pin',
      html: '<span class="mtm-map-pin-dot" style="--pin-color:#e2603f"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>${this.terrain?.nom ?? ''}</strong>`);
    this.map = map;
  }

  protected goBack(): void { this.router.navigate(['/terrains']); }
  protected edit(): void { if (this.terrain) this.router.navigate(['/terrains', this.terrain.id, 'modifier']); }
  protected openHistory(): void {
    if (!this.terrain) return;
    this.dialog.open(TerrainHistoryDialog, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      data: { terrainId: this.terrain.id },
    });
  }
  protected formatMoney(value: number | string | null): string { return value === null ? '—' : `${Number(value).toLocaleString('fr-FR')} FCFA`; }
  protected formatNumber(value: number | string | null): string { return value === null ? '—' : Number(value).toLocaleString('fr-FR'); }
  protected primaryImage(): string | null { return this.terrain?.medias.find((media) => media.resourceType === 'image' && media.secureUrl)?.secureUrl ?? null; }
  protected isImage(resourceType: string): boolean { return resourceType === 'image'; }
  protected scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected uploadAsset(event: Event, kind: 'media' | 'documents'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.terrain) return;
    this.api.upload(this.terrain.id, kind, file, kind === 'media' ? 'photo' : 'document').subscribe({
      next: () => {
        this.snackBar.open('Fichier ajouté', 'Fermer', { duration: 3000 });
        this.api.findOne(this.terrain!.id).subscribe((terrain) => { this.terrain = terrain; });
      },
      error: () => this.snackBar.open('Impossible d’ajouter le fichier', 'Fermer', { duration: 4000 }),
    });
  }
}
