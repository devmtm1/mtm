import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideArrowLeft, LucideKeyRound, LucideMail, LucidePencil, LucidePhone } from '@lucide/angular';
import { LocatifApiService } from '../../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../../core/services/session.service';
import type { Locataire, LocataireBail } from '../../../../core/models/locatif.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { BAIL_STATUTS, BAIL_STATUTS_TERMINES, help as bailHelp, label as bailLabel, pillClass as bailPill } from '../../locatif-status';
import { LocataireDialog } from '../locataire-dialog';
import { ClientAccountDialog } from '../../../../shared/dialogs/client-account-dialog';

/**
 * Fiche locataire (J2.1) : coordonnées et historique complet de ses baux,
 * tous biens confondus.
 */
@Component({
  selector: 'app-locataire-detail',
  imports: [
    MoneyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucideArrowLeft,
    LucideKeyRound,
    LucideMail,
    LucidePencil,
    LucidePhone,
  ],
  templateUrl: './locataire-detail.html',
  styleUrl: './locataire-detail.scss',
})
export class LocataireDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(LocatifApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly locataire = signal<Locataire | null>(null);
  protected readonly baux = signal<LocataireBail[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly canModify = this.session.hasPermission('locatif:modifier');
  protected readonly canSeeBien = this.session.hasPermission('locatif:consulter');
  protected readonly canCreateClient = this.session.hasPermission('clients:creer');

  protected readonly bauxActifs = computed(
    () => (this.baux() ?? []).filter((bail) => !BAIL_STATUTS_TERMINES.includes(bail.statut)).length,
  );

  private id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.goBack();
      return;
    }
    this.load(this.id);
  }

  protected goBack(): void {
    void this.router.navigate(['/locatif/locataires']);
  }

  protected openBien(bail: LocataireBail): void {
    void this.router.navigate(['/locatif/biens', bail.bienLocatif.id]);
  }

  protected bailLabel(value: string): string {
    return bailLabel(BAIL_STATUTS, value);
  }

  protected bailHelp(value: string): string {
    return bailHelp(BAIL_STATUTS, value);
  }

  protected bailPill(value: string): string {
    return bailPill(BAIL_STATUTS, value);
  }

  protected edit(): void {
    const current = this.locataire();
    if (!current || !this.id) return;
    LocataireDialog.open(this.dialog, { locataire: current }).subscribe((updated) => {
      if (!updated || !this.id) return;
      this.notify.success('Locataire mis à jour');
      this.load(this.id);
    });
  }

  protected openCreateClientAccount(): void {
    const current = this.locataire();
    if (!current?.email || !this.canCreateClient) return;
    ClientAccountDialog.open(this.dialog, {
      email: current.email,
      name: `${current.firstName} ${current.lastName}`,
      scopeDescription: 'suivre son bail, ses échéances, ses quittances et ses paiements',
      create: (password) => this.api.createLocataireClientAccount(current.id, password),
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.findLocataire(id).subscribe({
      next: (locataire) => {
        this.locataire.set(locataire);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Locataire introuvable');
        this.goBack();
      },
    });
    this.api.findLocataireBaux(id).subscribe({
      next: (baux) => this.baux.set(baux),
      error: () => this.baux.set([]),
    });
  }
}
