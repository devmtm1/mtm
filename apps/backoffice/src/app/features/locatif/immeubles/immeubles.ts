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

/** Propriétés en gestion : villas divisées, immeubles, résidences, avec l'occupation de leurs logements. */
@Component({
  selector: 'app-immeubles',
  imports: [
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
  /** Le chargement a échoué : on le dit, au lieu d'afficher une liste vide trompeuse. */
  protected readonly erreurChargement = signal(false);
  protected readonly recherche = new FormControl('', { nonNullable: true });
  protected readonly canCreate = computed(() => this.session.hasPermission('locatif:creer'));

  ngOnInit(): void {
    this.charger();
    this.recherche.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.charger());
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

  private charger(): void {
    this.api.findImmeubles({ search: this.recherche.value.trim(), pageSize: 100 }).subscribe({
      next: (page) => {
        this.immeubles.set(page.items);
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
