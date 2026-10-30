import {
  LucideCreditCard,
  LucideListChecks,
  LucideTrendingUp,
  LucideWallet,
} from '@lucide/angular';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs';
import {
  type JournalPage,
  type LigneJournal,
  FinancesApiService,
} from '../../core/services/api/finances-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ExportFinancesDialog } from './export-dialog';
import { ACTIVITES, NATURES, fcfa, libelleActivite, presets } from './finances-utils';
import { Pagination } from '../../shared/components/pagination/pagination';

/** Journal financier : tous les mouvements d'argent de la période, d'où qu'ils viennent. */
@Component({
  selector: 'app-journal-financier',
  standalone: true,
  imports: [
    Pagination,
    LucideCreditCard,
    LucideListChecks,
    LucideTrendingUp,
    LucideWallet,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './journal.html',
  styleUrl: './journal.scss',
})
export class JournalFinancier implements OnInit {
  private readonly api = inject(FinancesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly peutExporter = this.session.hasPermission('finances:exporter');

  protected readonly periodes = presets();
  protected readonly du = new FormControl(this.periodes[0].du, { nonNullable: true });
  protected readonly au = new FormControl(this.periodes[0].au, { nonNullable: true });
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly activite = signal('');
  protected readonly sens = signal('');
  protected readonly page = signal(1);

  protected readonly loading = signal(true);
  protected readonly journal = signal<JournalPage | null>(null);
  protected readonly activites = ACTIVITES;
  ngOnInit(): void {
    this.recherche.valueChanges.pipe(debounceTime(300)).subscribe(() => this.recharger());
    this.charger();
  }

  protected appliquerPreset(code: string): void {
    const p = this.periodes.find((periode) => periode.code === code);
    if (!p) return;
    this.du.setValue(p.du);
    this.au.setValue(p.au);
    this.recharger();
  }

  protected recharger(): void {
    this.page.set(1);
    this.charger();
  }

  protected filtrer(champ: 'activite' | 'sens', valeur: string): void {
    this[champ].set(valeur);
    this.recharger();
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected exporter(): void {
    ExportFinancesDialog.open(this.dialog, { du: this.du.value, au: this.au.value }).subscribe();
  }

  protected route(ligne: LigneJournal): string[] | null {
    if (!ligne.lien) return null;
    return ligne.lien
      .split('/')
      .filter(Boolean)
      .map((partie, index) => (index === 0 ? `/${partie}` : partie));
  }

  protected fcfa = fcfa;
  protected nature = (code: string) => NATURES[code] ?? code;
  protected libelleActivite = libelleActivite;

  protected date(valeur: string): string {
    return new Date(valeur).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }

  private charger(): void {
    if (!this.chargementInitialFait) this.loading.set(true);
    this.api
      .journal({
        du: this.du.value,
        au: this.au.value,
        activite: this.activite(),
        sens: this.sens(),
        search: this.recherche.value.trim(),
        page: this.page(),
        pageSize: 50,
      })
      .subscribe({
        next: (journal) => {
          this.journal.set(journal);
          this.finChargement();
        },
        error: (error: unknown) => {
          this.finChargement();
          this.notify.error(error, 'Impossible de charger le journal');
        },
      });
  }

  /** Le squelette ne s'affiche qu'au premier chargement : ensuite l'écran se met à jour en place, sans clignoter ni remonter. */
  private chargementInitialFait = false;

  private finChargement(): void {
    this.loading.set(false);
    this.chargementInitialFait = true;
  }
}
