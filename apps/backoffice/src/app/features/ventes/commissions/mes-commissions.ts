import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LucideBanknote, LucideCircleCheck, LucideHourglass, LucideDownload } from '@lucide/angular';
import { type MaCommission, type MesCommissions, VentesApiService } from '../../../core/services/api/ventes-api.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { COMMISSION_STATUS, DOSSIER_STATUS, help, label, pillClass } from '../ventes-status';

/**
 * Mes commissions : chaque commission de la personne connectée, sur quelle
 * vente, et où elle en est (estimée → validée → payée). Jusqu'ici, un commercial
 * n'en voyait que trois totaux sur son tableau de bord.
 */
import { Pagination } from '../../../shared/components/pagination/pagination';
import { pageDe } from '../../../core/utils/pagination';
import { ExportListeDialog } from '../../../shared/dialogs/export-liste-dialog';
import { isoJour, sourceDepuisLignes } from '../../../shared/utils/export-lignes';
@Component({
  selector: 'app-mes-commissions',
  standalone: true,
  imports: [LucideDownload, Pagination, MoneyPipe, LucideBanknote, LucideCircleCheck, LucideHourglass],
  templateUrl: './mes-commissions.html',
  styleUrl: './mes-commissions.scss',
})
export class MesCommissionsComponent implements OnInit {
  private readonly api = inject(VentesApiService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly peutExporterListe = computed(() => this.session.hasPermission('ventes:exporter'));
  protected readonly loading = signal(true);
  protected readonly donnees = signal<MesCommissions | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly commissionsPage = computed(() => pageDe(this.donnees()?.items ?? [], this.page(), this.pageSize()));

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.page.set(1);
  }

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

  /** Exporte mes commissions en Excel ou en PDF. */
  protected exporterListe(): void {
    ExportListeDialog.open(
      this.dialog,
      sourceDepuisLignes<MaCommission>(
        { module: 'ventes', titre: 'Mes commissions' },
        [
          { libelle: 'Dossier', valeur: (c) => c.dossier.reference },
          { libelle: 'Client', valeur: (c) => c.dossier.client },
          { libelle: 'Bien', valeur: (c) => c.dossier.bien },
          { libelle: 'État du dossier', valeur: (c) => this.dossierLabel(c) },
          { libelle: 'Commission', valeur: (c) => this.statutLabel(c) },
          { libelle: 'Estimée (FCFA)', type: 'montant', valeur: (c) => c.montantEstime },
          { libelle: 'Montant retenu (FCFA)', type: 'montant', valeur: (c) => this.montant(c) },
          { libelle: 'Créée le', type: 'date', valeur: (c) => isoJour(c.creeeLe) },
        ],
        this.donnees()?.items ?? [],
      ),
    ).subscribe();
  }
}
