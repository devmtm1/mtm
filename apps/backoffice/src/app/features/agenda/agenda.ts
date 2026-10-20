import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import {
  LucideAlarmClock,
  LucideArrowRight,
  LucideCalendarDays,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClipboardCheck,
  LucideMapPin,
  LucidePlus,
} from '@lucide/angular';
import { AgendaApiService, type ItemAgenda } from '../../core/services/api/agenda-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { EvenementDialog } from './evenement-dialog';
import {
  FAMILLES,
  NOMS_JOURS,
  ajouterJours,
  cleDate,
  cleJour,
  debutDeSemaine,
  familleDe,
  grilleMois,
  grouperParJour,
  heureDebutDite,
  heureDite,
  libelleType,
  periodeDeGrille,
  titreMois,
  type Famille,
  type JourGrille,
} from './agenda-utils';

type Vue = 'mois' | 'semaine' | 'liste';

/** Combien d'éléments une case du mois montre avant « + n autres ». */
const PAR_CASE = 3;

/**
 * Agenda partagé et individuel (section 21) : événements saisis et échéances
 * des autres modules (tâches, visites, mandats, jalons, séjours, loyers,
 * ventes) réunis sur un calendrier. « Mon agenda » ou l'agenda de l'équipe.
 */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    LucideAlarmClock,
    LucideArrowRight,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClipboardCheck,
    LucideMapPin,
    LucidePlus,
  ],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda implements OnInit {
  private readonly api = inject(AgendaApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly canCreate = this.session.hasPermission('agenda:creer');

  protected readonly vue = signal<Vue>('mois');
  protected readonly scope = signal<'moi' | 'equipe'>('moi');
  protected readonly reference = signal(new Date());
  protected readonly loading = signal(true);
  protected readonly items = signal<ItemAgenda[]>([]);
  protected readonly masquees = signal<Set<Famille>>(new Set());
  protected readonly jourChoisi = signal<string | null>(cleDate(new Date()));
  protected readonly selection = signal<ItemAgenda | null>(null);

  protected readonly familles = FAMILLES;
  protected readonly joursSemaine = NOMS_JOURS;
  protected readonly parCase = PAR_CASE;

  protected readonly semaines = computed(() => grilleMois(this.reference()));
  protected readonly joursDeLaSemaine = computed(() => {
    const debut = debutDeSemaine(this.reference());
    return Array.from({ length: 7 }, (_, i) => {
      const date = ajouterJours(debut, i);
      return { date, cle: cleDate(date), aujourdhui: cleDate(date) === cleDate(new Date()) };
    });
  });
  protected readonly titre = computed(() => {
    if (this.vue() === 'semaine') {
      const jours = this.joursDeLaSemaine();
      const format = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      return `${format(jours[0].date)} – ${format(jours[6].date)} ${jours[6].date.getFullYear()}`;
    }
    if (this.vue() === 'liste') return 'Les 30 prochains jours';
    return titreMois(this.reference());
  });

  /** Éléments visibles : ceux des familles non masquées, regroupés par jour. */
  protected readonly parJour = computed(() =>
    grouperParJour(this.items().filter((item) => !this.masquees().has(familleDe(item)))),
  );

  protected readonly joursListe = computed(() =>
    [...this.parJour().entries()].sort(([a], [b]) => a.localeCompare(b)),
  );

  protected readonly elementsDuJour = computed(() => {
    const cle = this.jourChoisi();
    return cle ? (this.parJour().get(cle) ?? []) : [];
  });

  /** « Vue rapide » : combien d'éléments de chaque famille dans la période affichée (les familles masquées comptent zéro). */
  protected readonly statistiques = computed(() => {
    const visibles = this.items().filter((item) => !this.masquees().has(familleDe(item)));
    return FAMILLES.map((f) => ({
      code: f.code,
      label: f.label,
      nombre: visibles.filter((item) => familleDe(item) === f.code).length,
    }));
  });

  /** Les cinq prochains éléments à partir de maintenant, dans la période chargée. */
  protected readonly prochains = computed(() => {
    const maintenant = Date.now();
    const aujourdhui = cleDate(new Date());
    return this.items()
      .filter((item) => !this.masquees().has(familleDe(item)))
      .filter((item) => (item.journeeEntiere ? cleJour(item) >= aujourdhui : new Date(item.debut).getTime() >= maintenant))
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.charger();
  }

  protected changerVue(vue: Vue): void {
    this.vue.set(vue);
    this.charger();
  }

  protected changerScope(scope: 'moi' | 'equipe'): void {
    this.scope.set(scope);
    this.charger();
  }

  protected naviguer(sens: -1 | 0 | 1): void {
    const ref = this.reference();
    if (sens === 0) {
      this.reference.set(new Date());
      this.jourChoisi.set(cleDate(new Date()));
    } else if (this.vue() === 'mois') {
      this.reference.set(new Date(ref.getFullYear(), ref.getMonth() + sens, 1));
    } else {
      this.reference.set(ajouterJours(ref, sens * (this.vue() === 'semaine' ? 7 : 30)));
    }
    this.charger();
  }

  protected basculerFamille(famille: Famille): void {
    this.masquees.update((ensemble) => {
      const suivant = new Set(ensemble);
      if (suivant.has(famille)) suivant.delete(famille);
      else suivant.add(famille);
      return suivant;
    });
  }

  protected choisirJour(cle: string): void {
    this.jourChoisi.set(cle);
    this.selection.set(null);
  }

  protected nouveau(jour?: Date): void {
    EvenementDialog.open(this.dialog, { jour: jour ?? this.reference() }).subscribe((change) => change && this.charger());
  }

  protected choisir(item: ItemAgenda, evenement?: Event): void {
    evenement?.stopPropagation();
    this.selection.set(item);
  }

  protected modifier(item: ItemAgenda): void {
    EvenementDialog.open(this.dialog, { existant: item }).subscribe((change) => {
      if (change) {
        this.selection.set(null);
        this.charger();
      }
    });
  }

  protected famille = familleDe;
  protected heureDebut = heureDebutDite;

  /** « 12 » dans le mois ; « 28 sept. » pour un jour d'un mois voisin, pour qu'on ne le prenne pas pour un jour du mois. */
  protected etiquetteJour(jour: JourGrille): string {
    if (jour.dansLeMois) return String(jour.date.getDate());
    return jour.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  protected libelleFamille(item: ItemAgenda): string {
    return FAMILLES.find((f) => f.code === familleDe(item))?.label.replace(/s$/, '') ?? '';
  }

  /** « Jeudi 2 oct. » ou « Aujourd'hui ». */
  protected dateCourte(item: ItemAgenda): string {
    const cle = cleJour(item);
    if (cle === cleDate(new Date())) return 'Aujourd’hui';
    const [a, m, j] = cle.split('-').map(Number);
    const texte = new Date(a, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  /** Ouvre un « prochain événement » : on se place sur son jour et on affiche son détail. */
  protected aller(item: ItemAgenda): void {
    this.jourChoisi.set(cleJour(item));
    this.selection.set(item);
  }

  protected libelleType = libelleType;
  protected heure = heureDite;
  protected cleItem = cleJour;

  protected dateLongue(cle: string): string {
    const [a, m, j] = cle.split('-').map(Number);
    const texte = new Date(a, m - 1, j).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  protected parseJour(cle: string): Date {
    const [a, m, j] = cle.split('-').map(Number);
    return new Date(a, m - 1, j);
  }

  protected elementsDe(cle: string): ItemAgenda[] {
    return this.parJour().get(cle) ?? [];
  }

  protected routeLien(item: ItemAgenda): { chemin: string[]; query?: Record<string, string> } | null {
    if (!item.lien) return null;
    const [chemin, requete] = item.lien.split('?');
    return {
      chemin: chemin
        .split('/')
        .filter(Boolean)
        .map((partie, i) => (i === 0 ? `/${partie}` : partie)),
      query: requete ? Object.fromEntries(new URLSearchParams(requete).entries()) : undefined,
    };
  }

  private fenetre(): { du: Date; au: Date } {
    if (this.vue() === 'semaine') {
      const debut = debutDeSemaine(this.reference());
      return { du: debut, au: ajouterJours(debut, 7) };
    }
    if (this.vue() === 'liste') {
      const debut = new Date(this.reference().getFullYear(), this.reference().getMonth(), this.reference().getDate());
      return { du: debut, au: ajouterJours(debut, 30) };
    }
    return periodeDeGrille(this.semaines());
  }

  private charger(): void {
    this.loading.set(true);
    const { du, au } = this.fenetre();
    this.api.flux(du, au, this.scope()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
        this.ouvrirDemande(items);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger l’agenda');
      },
    });
  }

  /** Une notification « /agenda?evenement=… » ouvre l'événement demandé, une fois. */
  private ouvrirDemande(items: ItemAgenda[]): void {
    const id = this.route.snapshot.queryParamMap.get('evenement');
    if (!id) return;
    const trouve = items.find((item) => item.id === id);
    if (trouve) {
      this.selection.set(trouve);
      this.jourChoisi.set(cleJour(trouve));
    }
    void this.router.navigate([], { queryParams: { evenement: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
