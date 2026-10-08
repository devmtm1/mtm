import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  LucideArrowLeft,
  LucideCircleCheck,
  LucideFileSpreadsheet,
  LucideTriangleAlert,
  LucideUpload,
} from '@lucide/angular';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';
import type {
  TerrainImportOptions,
  TerrainImportPreview,
  TerrainImportResult,
} from '../../../core/models/terrain.model';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Import d'un tableur de biens (.xlsx ou .csv), pour ne plus saisir les fiches
 * une à une. Deux temps : un aperçu qui contrôle le fichier sans rien écrire,
 * puis la confirmation. Le même fichier est renvoyé aux deux étapes : le
 * serveur ne garde rien entre elles.
 */
@Component({
  selector: 'app-terrain-import',
  imports: [
    MoneyPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    LucideArrowLeft,
    LucideCircleCheck,
    LucideFileSpreadsheet,
    LucideTriangleAlert,
    LucideUpload,
  ],
  templateUrl: './terrain-import.html',
  styleUrl: './terrain-import.scss',
})
export class TerrainImport {
  private readonly api = inject(TerrainsApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);

  protected readonly file = signal<File | null>(null);
  protected readonly preview = signal<TerrainImportPreview | null>(null);
  protected readonly result = signal<TerrainImportResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly importing = signal(false);
  protected readonly feuille = signal<string | undefined>(undefined);
  protected readonly archives = signal(false);
  protected readonly publierDisponibles = signal(false);
  protected readonly dragging = signal(false);

  protected readonly canPublish =
    this.session.hasPermission('terrains:publier') ||
    this.session.hasRole('administrateur') ||
    this.session.hasRole('direction');

  protected readonly peutImporter = computed(() => {
    const p = this.preview();
    return !!p && p.aCreer > 0 && !this.loading() && !this.importing();
  });

  private options(): TerrainImportOptions {
    return {
      feuille: this.feuille(),
      archives: this.archives(),
      publierDisponibles: this.publierDisponibles(),
    };
  }

  protected goBack(): void {
    void this.router.navigate(['/terrains']);
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.choose(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.choose(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected reset(): void {
    this.file.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.feuille.set(undefined);
    this.archives.set(false);
    this.publierDisponibles.set(false);
  }

  protected changeSheet(feuille: string): void {
    this.feuille.set(feuille);
    // L'onglet ARCHIVES est repris déjà archivé : on le propose d'office.
    this.archives.set(/archive/i.test(feuille));
    this.runPreview();
  }

  protected toggleArchives(value: boolean): void {
    this.archives.set(value);
    this.runPreview();
  }

  protected togglePublier(value: boolean): void {
    this.publierDisponibles.set(value);
    this.runPreview();
  }

  protected confirm(): void {
    const file = this.file();
    if (!file || !this.peutImporter()) return;
    this.importing.set(true);
    this.api.importTerrains(file, this.options()).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.result.set(result);
        this.notify.success(
          result.crees > 1 ? `${result.crees} biens importés` : `${result.crees} bien importé`,
        );
      },
      error: (error: unknown) => {
        this.importing.set(false);
        this.notify.error(error, 'L’import a échoué : rien n’a été créé');
      },
    });
  }

  protected viewList(): void {
    void this.router.navigate(['/terrains']);
  }

  private choose(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.csv')) {
      this.notify.info(
        name.endsWith('.xls')
          ? 'Le format .xls n’est pas pris en charge : enregistrez le fichier en .xlsx dans Excel.'
          : 'Déposez un fichier Excel (.xlsx) ou CSV (.csv).',
      );
      return;
    }
    if (file.size > TAILLE_MAX) {
      this.notify.info('Ce fichier dépasse 5 Mo : scindez-le en plusieurs imports.');
      return;
    }
    this.reset();
    this.file.set(file);
    this.runPreview();
  }

  private runPreview(): void {
    const file = this.file();
    if (!file) return;
    this.loading.set(true);
    this.api.previewImport(file, this.options()).subscribe({
      next: (preview) => {
        this.loading.set(false);
        this.preview.set(preview);
        this.feuille.set(preview.feuille);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.preview.set(null);
        this.notify.error(error, 'Impossible de lire ce fichier');
      },
    });
  }
}
