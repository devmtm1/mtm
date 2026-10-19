import { LucideCreditCard, LucideScale, LucideTrendingUp, LucideWallet } from '@lucide/angular';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';
import { type BlocDu } from '../../core/services/api/finances-api.service';
import { type TableauDirection, TresorerieApiService } from '../../core/services/api/tresorerie-api.service';
import { SessionService } from '../../core/services/session.service';
import { donutLibelles, revenuDepensesChart } from '../../shared/charts/mtm-charts';
import { NotificationService } from '../../shared/services/notification.service';
import { MODES_PAIEMENT, dateFr } from './finances-outils';
import {
  ACTIVITES,
  fcfa,
  presets,
  repartitionRevenu,
  comparaisonDite,
  variationDite,
  type PeriodePreset,
} from './finances-utils';

/**
 * Pilotage financier (J3.1, section 18) : ce que MTM a encaissé, ce qu'elle a
 * réellement gagné, ce qu'elle a dépensé, et ce qu'il reste à encaisser.
 *
 * Les encaissements sont l'argent reçu — y compris les loyers, qui reviennent
 * aux propriétaires, et le prix d'un bien vendu. Le revenu est ce qui reste à
 * MTM : marge des ventes, commission de gestion, règlement des prestations.
 */
@Component({
  selector: 'app-tableau-financier',
  standalone: true,
  imports: [
    LucideCreditCard,
    LucideScale,
    LucideTrendingUp,
    LucideWallet,
    RouterLink,
    MatButtonModule,
    NgxEchartsDirective,
  ],
  templateUrl: './tableau-financier.html',
  styleUrl: './tableau-financier.scss',
})
export class TableauFinancierPage implements OnInit {
  private readonly api = inject(TresorerieApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canValidate = this.session.hasPermission('finances:valider');

  /** Filtres de la Direction : une activité, un moyen de paiement. */
  protected readonly activiteFiltre = signal('');
  protected readonly modeFiltre = signal('');
  protected readonly activites = ACTIVITES;
  protected readonly modes = MODES_PAIEMENT;

  protected readonly periodes = presets();
  protected readonly choix = signal<PeriodePreset>(this.periodes[0]);
  protected readonly loading = signal(true);
  protected readonly donnees = signal<TableauDirection | null>(null);

  protected readonly graphiqueMensuel = computed(() => {
    const serie = this.donnees()?.serie ?? [];
    return serie.some((p) => p.revenu > 0 || p.depenses > 0) ? revenuDepensesChart(serie) : null;
  });

  protected readonly graphiqueRepartition = computed(() => {
    const parts = repartitionRevenu(this.donnees()?.parActivite ?? []);
    return parts.length > 0 ? donutLibelles(parts) : null;
  });

  protected readonly blocsDus = computed(() => {
    const aEncaisser = this.donnees()?.aEncaisser;
    if (!aEncaisser) return [];
    return [
      { titre: 'Loyers impayés', bloc: aEncaisser.loyers },
      { titre: 'Échéances de vente en retard', bloc: aEncaisser.ventes },
      { titre: 'Missions à solder', bloc: aEncaisser.missions },
    ] satisfies { titre: string; bloc: BlocDu }[];
  });

  ngOnInit(): void {
    this.charger();
  }

  protected choisir(periode: PeriodePreset): void {
    this.choix.set(periode);
    this.charger();
  }

  protected fcfa = fcfa;
  protected dateFr = dateFr;

  protected filtrer(activite: string, mode: string): void {
    this.activiteFiltre.set(activite);
    this.modeFiltre.set(mode);
    this.charger();
  }

  /** Les gestes sensibles du journal d'audit, dits en clair. */
  protected geste(action: string): string {
    return (
      {
        'finances.suppression_refusee': 'Tentative de suppression refusée',
        'finances.mois_rouvert': 'Mois clôturé rouvert',
        'finances.ecart_caisse': 'Écart de caisse déclaré',
        'finances.autorisation_distance': 'Paiement autorisé à distance',
        'finances.avance_proprietaire_autorisee': 'Avance au propriétaire autorisée',
      } as Record<string, string>
    )[action] ?? action;
  }

  /** Y a-t-il quelque chose à signaler à la Direction ? */
  protected pointsDAttention(d: TableauDirection): number {
    return (
      d.aAutoriser +
      d.depensesSansJustificatif.nombre +
      d.ecartsCaisse.nombre +
      d.joursNonClotures.length +
      d.rapprochement.lignesNonRapprochees +
      d.reversements.enAttente.nombre +
      d.remboursements.enRetard +
      d.anomaliesAudit.nombre
    );
  }
  protected variation = variationDite;
  protected comparaison = comparaisonDite;

  protected tendance(actuel: number, precedent: number): 'hausse' | 'baisse' | 'stable' {
    if (actuel === precedent) return 'stable';
    return actuel > precedent ? 'hausse' : 'baisse';
  }

  protected date(valeur: string | null): string {
    return valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '';
  }

  private charger(): void {
    this.loading.set(true);
    const { du, au } = this.choix();
    this.api
      .direction({ du, au, activite: this.activiteFiltre() || undefined, mode: this.modeFiltre() || undefined })
      .subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger le tableau financier');
      },
    });
  }
}
