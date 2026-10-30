import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucidePlus } from '@lucide/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import { SessionService } from '../../../core/services/session.service';
import type { ImmeubleResume } from '../../../core/models/locatif.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { TYPES_IMMEUBLE, nomPropre, simpleLabel } from '../locatif-status';
import { Pagination } from '../../../shared/components/pagination/pagination';

/** Propriétés en gestion : villas divisées, immeubles, résidences, avec l'occupation de leurs logements. */
@Component({
  selector: 'app-immeubles',
  imports: [
    Pagination,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MoneyPipe,
    LucidePlus,
  ],
  templateUrl: './immeubles.html',
  styleUrl: './immeubles.scss',
})
export class Immeubles implements OnInit {
  private readonly api = inject(LocatifApiService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  /** Squelette au premier chargement seulement : une recherche garde la liste affichée. */
  protected readonly premierChargement = signal(true);
  protected readonly immeubles = signal<ImmeubleResume[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);
  /** Le chargement a échoué : on le dit, au lieu d'afficher une liste vide trompeuse. */
  protected readonly erreurChargement = signal(false);
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));

  ngOnInit(): void {
    this.charger();
    this.recherche.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
        this.charger();
      });
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_IMMEUBLE, type);
  }

  protected proprietaire(immeuble: ImmeubleResume): string {
    return nomPropre(immeuble.proprietaire);
  }

  protected recharger(): void {
    this.charger();
  }

  protected ouvrir(immeuble: ImmeubleResume): void {
    void this.router.navigate(['/locatif/immeubles', immeuble.id]);
  }

  protected nouvelle(): void {
    void this.router.navigate(['/locatif/immeubles/nouveau']);
  }

  protected aller(page: number): void {
    this.page.set(page);
    this.charger();
  }

  protected changerTaille(taille: number): void {
    this.pageSize.set(taille);
    this.page.set(1);
    this.charger();
  }

  private charger(): void {
    this.api.findImmeubles({ search: this.recherche.value.trim(), page: this.page(), pageSize: this.pageSize() }).subscribe({
      next: (page) => {
        // Une page devenue vide (la dernière demande vient d'être traitée) : on revient à la dernière page qui existe.
        if (page.items.length === 0 && page.total > 0 && page.page > 1) {
          this.page.set(Math.ceil(page.total / page.pageSize));
          this.charger();
          return;
        }
        this.immeubles.set(page.items);
        this.page.set(page.page);
        this.total.set(page.total);
        this.erreurChargement.set(false);
        this.premierChargement.set(false);
      },
      error: (error: unknown) => {
        this.premierChargement.set(false);
        this.erreurChargement.set(true);
        this.notify.error(error, 'Impossible de charger les propriétés');
      },
    });
  }
}
