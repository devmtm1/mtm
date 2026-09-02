import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideX, LucidePlus } from '@lucide/angular';
import { MandatsApiService } from '../../../core/services/api/mandats-api.service';
import { TerrainsApiService } from '../../../core/services/api/terrains-api.service';

@Component({
  selector: 'app-mandat-lot-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideX, LucidePlus],
  templateUrl: './mandat-lot-dialog.html',
  styleUrl: './mandat-lot-dialog.scss',
})
export class MandatLotDialog {
  private readonly api = inject(MandatsApiService);
  private readonly terrainsApi = inject(TerrainsApiService);
  private readonly dialogRef = inject(MatDialogRef<MandatLotDialog>);
  private readonly fb = inject(FormBuilder);
  protected readonly dialogData = inject<{ mandatId: string; lot?: LotItem }>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly terrains = signal<TerrainSelectItem[]>([]);
  protected readonly isEdit = computed(() => !!this.dialogData.lot);

  protected readonly form = this.fb.nonNullable.group({
    terrainId: ['', Validators.required],
    statutLot: ['Confie'],
  });

  constructor() {
    this.loadTerrains();
    if (this.dialogData.lot) {
      this.form.patchValue({
        terrainId: this.dialogData.lot.terrain.id,
        statutLot: this.dialogData.lot.statutLot,
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.dialogRef.close(value);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private loadTerrains(): void {
    this.terrainsApi.findAll({ pageSize: 200 }).subscribe({
      next: (page) => {
        this.terrains.set(
          page.items.map((t) => ({
            id: t.id,
            label: `${t.referenceInterne} — ${t.nom}`,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}

interface TerrainSelectItem {
  id: string;
  label: string;
}

interface LotItem {
  id: string;
  statutLot: string;
  dateAttribution: string;
  terrain: {
    id: string;
    referenceInterne: string;
    nom: string;
    commune: string | null;
    region: string | null;
    superficie: number | string | null;
    prixPublic: number | string | null;
    statutCommercial: string;
  };
}
