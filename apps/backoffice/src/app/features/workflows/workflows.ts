import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideArrowDown, LucideArrowUp, LucideLock, LucideX } from '@lucide/angular';
import { type Workflow, WorkflowsApiService } from '../../core/services/api/workflows-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { codeDepuisNom, humaniserCode } from '../../shared/utils/humaniser';
import { STATUTS_CHANTIER } from '../construction/chantier-status';
import { PIPELINE } from '../crm/crm-status';
import { DOSSIER_STATUS } from '../ventes/ventes-status';

/** Un parcours en cours de modification dans l'écran. */
export interface ParcoursEdite {
  base: Workflow;
  statuts: string[];
  transitions: Record<string, string[]>;
  nouveau: FormControl<string>;
  modifie: boolean;
  enregistrement: boolean;
}

const LIBELLES_PAR_MODULE: Record<string, Record<string, { label: string }>> = {
  ventes: DOSSIER_STATUS,
  crm: PIPELINE,
  construction: STATUTS_CHANTIER,
};

/**
 * Parcours des dossiers (section 21 : « étapes configurables selon le module »).
 * On ajoute des étapes, on les ordonne, on autorise de nouveaux passages ; les
 * étapes d'origine ne se retirent pas, le système s'en sert pour calculer
 * les soldes, réceptionner un chantier ou conclure une vente.
 */
@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideArrowDown,
    LucideArrowUp,
    LucideLock,
    LucideX,
  ],
  templateUrl: './workflows.html',
  styleUrl: './workflows.scss',
})
export class Workflows implements OnInit {
  private readonly api = inject(WorkflowsApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canModify = this.session.hasPermission('settings:modifier');
  protected readonly loading = signal(true);
  protected readonly parcours = signal<ParcoursEdite[]>([]);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (liste) => {
        this.parcours.set(liste.map((workflow) => this.editer(workflow)));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les parcours');
      },
    });
  }

  protected libelle(p: ParcoursEdite, code: string): string {
    return LIBELLES_PAR_MODULE[p.base.module]?.[code]?.label ?? humaniserCode(code);
  }

  protected protegee(p: ParcoursEdite, code: string): boolean {
    return p.base.obligatoires.includes(code);
  }

  protected dossiers(p: ParcoursEdite, code: string): number {
    return p.base.compte[code] ?? 0;
  }

  /** Une étape ajoutée se retire tant qu'aucun dossier ne s'y trouve. */
  protected retirable(p: ParcoursEdite, code: string): boolean {
    return this.canModify && !this.protegee(p, code) && this.dossiers(p, code) === 0;
  }

  protected deplacer(p: ParcoursEdite, index: number, sens: -1 | 1): void {
    const cible = index + sens;
    if (cible < 0 || cible >= p.statuts.length) return;
    const statuts = [...p.statuts];
    [statuts[index], statuts[cible]] = [statuts[cible], statuts[index]];
    this.mettreAJour(p, { statuts });
  }

  protected ajouter(p: ParcoursEdite): void {
    const nom = p.nouveau.value.trim();
    if (!nom) return;
    const code = codeDepuisNom(nom);
    if (code.length < 2) {
      this.notify.info('Ce nom est trop court : utilisez au moins deux lettres.');
      return;
    }
    if (p.statuts.includes(code)) {
      this.notify.info('Cette étape existe déjà.');
      return;
    }
    // Une nouvelle étape s'insère avant les sorties de fin de parcours qui se terminent la liste.
    this.mettreAJour(p, {
      statuts: [...p.statuts, code],
      transitions: { ...p.transitions, [code]: [] },
    });
    p.nouveau.reset('');
  }

  protected retirer(p: ParcoursEdite, code: string): void {
    const transitions: Record<string, string[]> = {};
    for (const [depuis, cibles] of Object.entries(p.transitions)) {
      if (depuis !== code) transitions[depuis] = cibles.filter((cible) => cible !== code);
    }
    this.mettreAJour(p, { statuts: p.statuts.filter((s) => s !== code), transitions });
  }

  /** Passages d'une étape : les passages d'origine restent cochés et verrouillés. */
  protected passages(p: ParcoursEdite, code: string): string[] {
    return p.transitions[code] ?? [];
  }

  protected passageProtege(p: ParcoursEdite, depuis: string, vers: string): boolean {
    return p.base.transitionsObligatoires?.[depuis]?.includes(vers) ?? false;
  }

  protected changerPassages(p: ParcoursEdite, depuis: string, valeur: string[]): void {
    // Un passage verrouillé ne peut pas être décoché, même par un clic malheureux.
    const imposes = p.base.transitionsObligatoires?.[depuis] ?? [];
    const complet = [...new Set([...valeur, ...imposes])];
    this.mettreAJour(p, { transitions: { ...p.transitions, [depuis]: complet } });
  }

  protected enregistrer(p: ParcoursEdite): void {
    p.enregistrement = true;
    this.refresh();
    this.api
      .save(p.base.module, {
        statuts: p.statuts,
        ...(p.base.transitions ? { transitions: p.transitions } : {}),
      })
      .subscribe({
        next: (workflow) => {
          this.remplacer(p, this.editer(workflow));
          this.notify.success(`Parcours « ${workflow.libelle} » enregistré`);
        },
        error: (error: unknown) => {
          p.enregistrement = false;
          this.refresh();
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  protected annuler(p: ParcoursEdite): void {
    this.remplacer(p, this.editer(p.base));
  }

  private editer(workflow: Workflow): ParcoursEdite {
    return {
      base: workflow,
      statuts: [...workflow.statuts],
      transitions: workflow.transitions
        ? Object.fromEntries(Object.entries(workflow.transitions).map(([depuis, cibles]) => [depuis, [...cibles]]))
        : {},
      nouveau: new FormControl('', { nonNullable: true }),
      modifie: false,
      enregistrement: false,
    };
  }

  private mettreAJour(p: ParcoursEdite, changements: Partial<Pick<ParcoursEdite, 'statuts' | 'transitions'>>): void {
    Object.assign(p, changements, { modifie: true });
    this.refresh();
  }

  private remplacer(ancien: ParcoursEdite, nouveau: ParcoursEdite): void {
    this.parcours.update((liste) => liste.map((p) => (p === ancien ? nouveau : p)));
  }

  /** Les parcours sont des objets modifiés sur place : on relance l'affichage. */
  private refresh(): void {
    this.parcours.update((liste) => [...liste]);
  }
}
