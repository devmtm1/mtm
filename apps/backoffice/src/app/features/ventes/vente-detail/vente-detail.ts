import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { VenteDetail, VenteEcheance } from '../../../core/models/vente.model';

@Component({
  selector: 'app-vente-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './vente-detail.html',
  styleUrl: './vente-detail.scss',
})
export class VenteDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(VentesApiService);
  private readonly session = inject(SessionService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly dossier = signal<VenteDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly echeances = signal<VenteEcheance[]>([]);
  protected readonly canValidate = this.session.hasPermission('ventes:valider');
  protected readonly canPay = this.session.hasPermission('ventes:payer');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.load(id);
  }

  protected load(id: string): void {
    this.loading.set(true);
    this.api.findOne(id).subscribe({
      next: (dossier) => {
        this.dossier.set(dossier);
        this.api.getEcheances(id).subscribe({
          next: (echeances) => {
            this.echeances.set(echeances);
            this.loading.set(false);
          },
          error: () => {
            this.echeances.set([]);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Dossier introuvable', 'Fermer', { duration: 4000 });
        this.goBack();
      },
    });
  }

  protected goBack(): void {
    void this.router.navigate(['/ventes']);
  }

  protected openDocumentsSearch(): void {
    const dossierId = this.dossier()?.id;
    if (!dossierId) return;
    void this.router.navigate(['/ventes', 'documents'], { queryParams: { dossierVenteId: dossierId } });
  }

  protected refresh(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.load(id);
    }
  }

  protected formatMoney(value: number | string | null): number {
    return Number(value ?? 0);
  }

  protected pendingPayment(): { id: string; montant: number | string; reference: string | null } | null {
    const dossier = this.dossier();
    if (!dossier?.paiements?.length) {
      return null;
    }

    return dossier.paiements.find((payment) => payment.statut === 'en_attente') ?? null;
  }

  protected validatePendingPayment(): void {
    const dossier = this.dossier();
    const payment = this.pendingPayment();

    if (!dossier || !payment) {
      this.snackBar.open('Aucun paiement en attente à valider.', 'Fermer', { duration: 3000 });
      return;
    }

    this.api.validatePayment(dossier.id, payment.id).subscribe({
      next: () => {
        this.snackBar.open('Paiement validé', 'Fermer', { duration: 3000 });
        this.refresh();
      },
      error: () => {
        this.snackBar.open('Impossible de valider ce paiement', 'Fermer', { duration: 4000 });
      },
    });
  }

  protected validateCommission(commissionId: string): void {
    const dossier = this.dossier();
    if (!dossier) return;

    this.api.validateCommission(dossier.id, commissionId).subscribe({
      next: () => {
        this.snackBar.open('Commission validée', 'Fermer', { duration: 3000 });
        this.refresh();
      },
      error: () => {
        this.snackBar.open('Impossible de valider cette commission', 'Fermer', { duration: 4000 });
      },
    });
  }

  protected payCommission(commissionId: string): void {
    const dossier = this.dossier();
    if (!dossier) return;

    this.api.payCommission(dossier.id, commissionId).subscribe({
      next: () => {
        this.snackBar.open('Commission payée', 'Fermer', { duration: 3000 });
        this.refresh();
      },
      error: () => {
        this.snackBar.open('Impossible de payer cette commission', 'Fermer', { duration: 4000 });
      },
    });
  }
}
