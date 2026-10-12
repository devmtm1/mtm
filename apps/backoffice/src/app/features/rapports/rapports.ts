import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  type DefinitionRapport,
  type RapportDonnees,
  PilotageApiService,
} from '../../core/services/api/pilotage-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { presets } from '../finances/finances-utils';
import { ExportRapportDialog } from './export-rapport-dialog';
import { alignement, formaterCellule } from './rapports-utils';

/**
 * Rapports (section 23) : on choisit un rapport, une période (et une région
 * quand le rapport s'y prête), on le lit à l'écran, puis on l'exporte en PDF
 * ou en Excel — avec un motif consigné dans le journal d'audit.
 */
@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './rapports.html',
  styleUrl: './rapports.scss',
})
export class Rapports implements OnInit {
  private readonly api = inject(PilotageApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutExporter = this.session.hasPermission('rapports:exporter');

  protected readonly periodes = presets();
  protected readonly du = new FormControl(this.periodes[1].du, { nonNullable: true });
  protected readonly au = new FormControl(this.periodes[1].au, { nonNullable: true });
  protected readonly region = new FormControl('', { nonNullable: true });

  protected readonly catalogue = signal<DefinitionRapport[]>([]);
  protected readonly choisi = signal<DefinitionRapport | null>(null);
  protected readonly apercu = signal<RapportDonnees | null>(null);
  protected readonly loading = signal(false);
  protected readonly avecRegion = computed(() => this.choisi()?.filtres.includes('region') ?? false);

  ngOnInit(): void {
    this.api.catalogue().subscribe({
      next: (liste) => this.catalogue.set(liste),
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger la liste des rapports'),
    });
  }

  protected choisir(rapport: DefinitionRapport): void {
    this.choisi.set(rapport);
    this.apercu.set(null);
    this.generer();
  }

  protected appliquerPreset(code: string): void {
    const p = this.periodes.find((periode) => periode.code === code);
    if (!p) return;
    this.du.setValue(p.du);
    this.au.setValue(p.au);
    this.generer();
  }

  protected generer(): void {
    const rapport = this.choisi();
    if (!rapport) return;
    this.loading.set(true);
    this.api
      .apercu(rapport.code, {
        du: this.du.value,
        au: this.au.value,
        region: this.region.value.trim() || undefined,
      })
      .subscribe({
        next: (donnees) => {
          this.apercu.set(donnees);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.notify.error(error, 'Impossible de générer le rapport');
        },
      });
  }

  protected exporter(): void {
    const rapport = this.choisi();
    if (!rapport) return;
    ExportRapportDialog.open(this.dialog, {
      code: rapport.code,
      titre: rapport.titre,
      du: this.du.value,
      au: this.au.value,
      region: this.region.value.trim() || undefined,
      parPeriode: rapport.parPeriode,
    }).subscribe();
  }

  protected formater = formaterCellule;
  protected aligne = (type: Parameters<typeof alignement>[0]) => alignement(type) === 'droite';
}
