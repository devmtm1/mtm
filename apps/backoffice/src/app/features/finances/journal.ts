import {
  LucideCreditCard,
  LucideListChecks,
  LucideTrendingUp,
  LucideWallet,
} from '@lucide/angular';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

/** Journal financier : tous les mouvements d'argent de la période, d'où qu'ils viennent. */
@Component({
  selector: 'app-journal-financier',
  standalone: true,
  imports: [
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
  protected readonly du = new FormControl(this.periodes[1].du, { nonNullable: true });
  protected readonly au = new FormControl(this.periodes[1].au, { nonNullable: true });
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly activite = signal('');
  protected readonly sens = signal('');
  protected readonly page = signal(1);

  protected readonly loading = signal(true);
  protected readonly journal = signal<JournalPage | null>(null);
  protected readonly activites = ACTIVITES;
  protected readonly pages = computed(() => {
    const j = this.journal();
    return j ? Math.max(1, Math.ceil(j.total / j.pageSize)) : 1;
  });

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
    this.loading.set(true);
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
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.notify.error(error, 'Impossible de charger le journal');
        },
      });
  }
}
