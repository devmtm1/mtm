import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideArrowLeft, LucideBanknote, LucideChevronLeft, LucideChevronRight, LucideCopy, LucidePercent, LucideReceipt, LucideTarget } from '@lucide/angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrmApiService } from '../../../core/services/api/crm-api.service';
import { ObjectifsApiService } from '../../../core/services/api/objectifs-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import { currentPeriode, type ObjectifCommercial, type ObjectifProgress, type UpsertObjectifPayload } from '../../../core/models/objectif.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ObjectifDialog, type ObjectifDialogData } from './objectif-dialog';

/** Une ligne : un commercial, son objectif du mois (ou aucun) et sa progression. */
interface ObjectifRow {
  commercial: CommercialSummary;
  objectif: ObjectifCommercial | null;
  progress: ObjectifProgress | null;
}

type Metric = 'ventes' | 'chiffreAffaires' | 'commissions';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function periodeLabel(periode: string): string {
  const [year, month] = periode.split('-').map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${year}`;
}

export function shiftPeriode(periode: string, delta: number): string {
  const [year, month] = periode.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return currentPeriode(date);
}

/**
 * Objectifs commerciaux mensuels (J1.6, section 12 CDC).
 * Manager : un tableau par commercial, cibles modifiables, totaux d'équipe,
 * reprise des cibles du mois précédent. Commercial : sa propre progression.
 */
@Component({
  selector: 'app-objectifs',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTooltipModule, MoneyPipe, LucideArrowLeft, LucideBanknote, LucideChevronLeft, LucideChevronRight, LucideCopy, LucidePercent, LucideReceipt, LucideTarget],
  templateUrl: './objectifs.html',
  styleUrl: './objectifs.scss',
})
export class Objectifs implements OnInit {
  private readonly objectifsApi = inject(ObjectifsApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly session = inject(SessionService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly canManage = this.session.hasPermission('ventes:administrer');
  protected readonly periode = new FormControl(currentPeriode(), { nonNullable: true });
  protected readonly periodeValue = signal(currentPeriode());
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly rows = signal<ObjectifRow[]>([]);

  protected readonly periodeLabel = computed(() => periodeLabel(this.periodeValue()));
  protected readonly isCurrentMonth = computed(() => this.periodeValue() === currentPeriode());
  protected readonly isFuture = computed(() => this.periodeValue() > currentPeriode());

  /** Part du mois écoulée (0–100), pour situer le réalisé par rapport au temps. */
  protected readonly monthElapsed = computed(() => {
    if (this.isFuture()) return 0;
    if (!this.isCurrentMonth()) return 100;
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round((now.getDate() / days) * 100);
  });

  protected readonly daysLeft = computed(() => {
    if (!this.isCurrentMonth()) return 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  });

  protected readonly withObjectif = computed(() => this.rows().filter((row) => row.progress?.objectif).length);

  /** Totaux de l'équipe — utiles au manager, sans intérêt pour un seul commercial. */
  protected readonly totals = computed(() => {
    const rows = this.rows();
    const sum = (pick: (row: ObjectifRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
    const cibleVentes = sum((row) => row.progress?.objectif?.cibleVentes ?? 0);
    const ventes = sum((row) => row.progress?.realise.ventes ?? 0);
    const cibleChiffreAffaires = sum((row) => Number(row.progress?.objectif?.cibleChiffreAffaires ?? 0));
    const chiffreAffaires = sum((row) => row.progress?.realise.chiffreAffaires ?? 0);
    const cibleCommissions = sum((row) => Number(row.progress?.objectif?.cibleCommissions ?? 0));
    const commissions = sum((row) => row.progress?.realise.commissions ?? 0);
    return {
      cibleVentes,
      ventes,
      tauxVentes: cibleVentes ? Math.round((ventes / cibleVentes) * 100) : null,
      cibleChiffreAffaires,
      chiffreAffaires,
      tauxChiffreAffaires: cibleChiffreAffaires ? Math.round((chiffreAffaires / cibleChiffreAffaires) * 100) : null,
      cibleCommissions,
      commissions,
      tauxCommissions: cibleCommissions ? Math.round((commissions / cibleCommissions) * 100) : null,
    };
  });

  ngOnInit(): void {
    this.periode.valueChanges.subscribe((value) => {
      if (/^\d{4}-\d{2}$/.test(value)) {
        this.periodeValue.set(value);
        this.load();
      }
    });
    this.load();
  }

  protected shift(delta: number): void {
    this.periode.setValue(shiftPeriode(this.periodeValue(), delta));
  }

  protected goToCurrentMonth(): void {
    this.periode.setValue(currentPeriode());
  }

  protected goBack(): void {
    void this.router.navigate(['/ventes']);
  }

  /** Borne l'affichage à 100 % : la barre ne déborde pas quand l'objectif est dépassé. */
  protected barValue(taux: number | null): number {
    return taux === null ? 0 : Math.min(100, taux);
  }

  /** Vert si atteint, bleu si en avance sur le temps écoulé, orange sinon. */
  protected tone(taux: number | null): 'success' | 'primary' | 'warning' {
    if (taux === null) return 'primary';
    if (taux >= 100) return 'success';
    return taux >= this.monthElapsed() ? 'primary' : 'warning';
  }

  protected reading(row: ObjectifRow, metric: Metric): string {
    const taux = row.progress?.taux[metric] ?? null;
    if (taux === null) return 'Pas de cible';
    if (taux >= 100) return 'Objectif atteint';
    if (this.isFuture()) return 'Mois à venir';
    if (!this.isCurrentMonth()) return 'Mois clos';
    return taux >= this.monthElapsed() ? 'Dans les temps' : 'En retard sur le rythme';
  }

  protected load(): void {
    const periode = this.periodeValue();
    this.loading.set(true);
    const commercials$ = this.canManage ? this.crmApi.getCommercials() : of([this.ownCommercialSummary()].filter((item): item is CommercialSummary => item !== null));
    forkJoin({
      commercials: commercials$,
      objectifs: this.objectifsApi.findAll(periode).pipe(catchError(() => of([] as ObjectifCommercial[]))),
    }).subscribe({
      next: ({ commercials, objectifs }) => {
        const progress$ = commercials.map((commercial) => this.objectifsApi.getProgress(commercial.id, periode).pipe(catchError(() => of(null))));
        if (progress$.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(progress$).subscribe((progressList) => {
          this.rows.set(
            commercials.map((commercial, index) => ({
              commercial,
              objectif: objectifs.find((item) => item.commercialId === commercial.id) ?? null,
              progress: progressList[index],
            })),
          );
          this.loading.set(false);
          this.busy.set(false);
        });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busy.set(false);
        this.notify.error(error, 'Impossible de charger les objectifs');
      },
    });
  }

  protected openDialog(row?: ObjectifRow): void {
    const data: ObjectifDialogData = {
      periode: this.periodeValue(),
      periodeLabel: this.periodeLabel(),
      commercials: this.rows().map((item) => item.commercial),
      existing: row?.objectif ?? null,
      commercialId: row?.commercial.id,
    };
    this.dialog
      .open(ObjectifDialog, { width: '540px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed()
      .subscribe((payload: UpsertObjectifPayload | undefined) => {
        if (!payload) return;
        this.busy.set(true);
        this.objectifsApi.upsert(payload).subscribe({
          next: () => {
            this.notify.success('Objectif enregistré');
            this.load();
          },
          error: (error: unknown) => {
            this.busy.set(false);
            this.notify.error(error, 'Impossible d’enregistrer l’objectif');
          },
        });
      });
  }

  protected remove(row: ObjectifRow): void {
    if (!row.objectif || !confirm(`Supprimer l’objectif de ${row.commercial.firstName} ${row.commercial.lastName} pour ${this.periodeLabel()} ?`)) return;
    this.busy.set(true);
    this.objectifsApi.remove(row.objectif.id).subscribe({
      next: () => {
        this.notify.success('Objectif supprimé');
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Impossible de supprimer l’objectif');
      },
    });
  }

  /** Reprend les cibles du mois précédent pour les commerciaux sans objectif ce mois-ci. */
  protected copyPreviousMonth(): void {
    const previous = shiftPeriode(this.periodeValue(), -1);
    const periode = this.periodeValue();
    this.busy.set(true);
    this.objectifsApi.findAll(previous).subscribe({
      next: (previousObjectifs) => {
        const missing = this.rows().filter((row) => !row.objectif);
        const payloads: UpsertObjectifPayload[] = missing
          .map((row) => previousObjectifs.find((item) => item.commercialId === row.commercial.id))
          .filter((item): item is ObjectifCommercial => !!item)
          .map((item) => ({
            commercialId: item.commercialId,
            periode,
            ...(item.cibleVentes !== null ? { cibleVentes: item.cibleVentes } : {}),
            ...(item.cibleChiffreAffaires !== null ? { cibleChiffreAffaires: Number(item.cibleChiffreAffaires) } : {}),
            ...(item.cibleCommissions !== null ? { cibleCommissions: Number(item.cibleCommissions) } : {}),
          }));
        if (payloads.length === 0) {
          this.busy.set(false);
          this.notify.info(`Aucun objectif à reprendre depuis ${periodeLabel(previous)}.`);
          return;
        }
        forkJoin(payloads.map((payload) => this.objectifsApi.upsert(payload))).subscribe({
          next: () => {
            this.notify.success(`${payloads.length} objectif${payloads.length > 1 ? 's' : ''} repris depuis ${periodeLabel(previous)}`);
            this.load();
          },
          error: (error: unknown) => {
            this.busy.set(false);
            this.notify.error(error, 'Impossible de reprendre les objectifs');
          },
        });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.notify.error(error, 'Impossible de lire le mois précédent');
      },
    });
  }

  private ownCommercialSummary(): CommercialSummary | null {
    const user = this.session.user();
    return user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null;
  }
}
