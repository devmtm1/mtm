import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { VentePaiementDialog } from './vente-paiement-dialog';
import { VenteReservationDialog } from './vente-reservation-dialog';
import type {
  DossierVenteListItem,
  ReservationRequestItem,
  VenteDashboardStats,
} from '../../core/models/vente.model';

@Component({
  selector: 'app-ventes',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatCardModule],
  templateUrl: './ventes.html',
  styleUrl: './ventes.scss',
})
export class Ventes implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly dossiers = signal<DossierVenteListItem[]>([]);
  protected readonly reservationRequests = signal<ReservationRequestItem[]>([]);
  protected readonly dashboardStats = signal<VenteDashboardStats | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (dossiers) => {
        this.dossiers.set(dossiers);
        this.api.findReservationRequests().subscribe({
          next: (requests) => {
            this.reservationRequests.set(requests);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
        this.api.getDashboardStats().subscribe({
          next: (stats) => this.dashboardStats.set(stats),
          error: () => this.dashboardStats.set(null),
        });
      },
      error: () => {
        this.loading.set(false);
        this.dashboardStats.set(null);
        this.snackBar.open('Impossible de charger les dossiers de vente', 'Fermer', { duration: 4000 });
      },
    });
  }

  protected reserve(dossier: DossierVenteListItem): void {
    this.dialog
      .open(VenteReservationDialog, {
        width: '420px',
        maxWidth: '90vw',
        data: { dossierLabel: dossier.referenceInterne || dossier.prospect.nom },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.api.createReservation(dossier.id, result).subscribe({
          next: () => {
            this.snackBar.open('Réservation enregistrée', 'Fermer', { duration: 3000 });
            this.load();
          },
          error: () => this.snackBar.open('Impossible d’enregistrer la réservation', 'Fermer', { duration: 4000 }),
        });
      });
  }

  protected pay(dossier: DossierVenteListItem): void {
    this.dialog
      .open(VentePaiementDialog, {
        width: '420px',
        maxWidth: '90vw',
        data: { dossierLabel: dossier.referenceInterne || dossier.prospect.nom },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.api.createPaiement(dossier.id, { ...result, mode: 'virement' }).subscribe({
          next: () => {
            this.snackBar.open('Paiement enregistré', 'Fermer', { duration: 3000 });
            this.load();
          },
          error: () => this.snackBar.open('Impossible d’enregistrer le paiement', 'Fermer', { duration: 4000 }),
        });
      });
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/ventes', id]);
  }

  protected openDocuments(): void {
    void this.router.navigate(['/ventes/documents']);
  }

  protected validatePendingPayment(dossier: DossierVenteListItem): void {
    const pendingPayment = dossier.paiements?.find((payment) => payment.statut === 'en_attente');

    if (!pendingPayment) {
      this.snackBar.open('Aucun paiement en attente à valider.', 'Fermer', { duration: 3000 });
      return;
    }

    this.api.validatePayment(dossier.id, pendingPayment.id).subscribe({
      next: () => {
        this.snackBar.open('Paiement validé', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Impossible de valider le paiement', 'Fermer', { duration: 4000 }),
    });
  }

  protected convertRequest(request: ReservationRequestItem): void {
    const prixVente = Number(window.prompt('Prix de vente prévisionnel (FCFA, facultatif)', '0'));
    const payload = Number.isFinite(prixVente) && prixVente > 0 ? { prixVente } : {};
    this.api.convertReservationRequest(request.id, payload).subscribe({
      next: () => {
        this.snackBar.open('Dossier de vente créé depuis la demande', 'Fermer', { duration: 3500 });
        this.load();
      },
      error: () => this.snackBar.open('Impossible de convertir la demande', 'Fermer', { duration: 4000 }),
    });
  }

  protected formatMoney(value: number | string | null): number {
    return Number(value ?? 0);
  }

  protected goToProspects(): void {
    void this.router.navigate(['/crm/prospects']);
  }
}
