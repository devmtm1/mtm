import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideBanknote, LucideCircleCheck, LucideHourglass } from '@lucide/angular';
import { type MaCommission, type MesCommissions, VentesApiService } from '../../../core/services/api/ventes-api.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { COMMISSION_STATUS, DOSSIER_STATUS, help, label, pillClass } from '../ventes-status';

/**
 * Mes commissions : chaque commission de la personne connectée, sur quelle
 * vente, et où elle en est (estimée → validée → payée). Jusqu'ici, un commercial
 * n'en voyait que trois totaux sur son tableau de bord.
 */
@Component({
  selector: 'app-mes-commissions',
  standalone: true,
  imports: [MoneyPipe, LucideBanknote, LucideCircleCheck, LucideHourglass],
  templateUrl: './mes-commissions.html',
  styleUrl: './mes-commissions.scss',
})
export class MesCommissionsComponent implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly donnees = signal<MesCommissions | null>(null);

  protected readonly statutLabel = (commission: MaCommission) => label(COMMISSION_STATUS, commission.statut);
  protected readonly statutPill = (commission: MaCommission) => pillClass(COMMISSION_STATUS, commission.statut);
  protected readonly statutAide = (commission: MaCommission) => help(COMMISSION_STATUS, commission.statut);
  protected readonly dossierLabel = (commission: MaCommission) => label(DOSSIER_STATUS, commission.dossier.statut);

  ngOnInit(): void {
    this.api.mesCommissions().subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger vos commissions');
      },
    });
  }

  /** Le montant qui compte pour ce statut : payé, sinon validé, sinon estimé. */
  protected montant(commission: MaCommission): number {
    return commission.montantPaye ?? commission.montantValide ?? commission.montantEstime;
  }

  protected ouvrir(commission: MaCommission): void {
    void this.router.navigate(['/ventes', commission.dossier.id]);
  }
}
