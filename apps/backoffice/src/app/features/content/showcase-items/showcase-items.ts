import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucideImage, LucideImageOff, LucideMapPin, LucidePencil, LucidePlus, LucideTrash2, LucideUpload } from '@lucide/angular';
import { ShowcaseApiService, type ShowcaseItem } from '../../../core/services/api/showcase-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ShowcaseEditorDialog } from './showcase-editor-dialog';

export type ShowcaseCategory = 'realisation' | 'projet_a_venir';

export const SHOWCASE_CATEGORIES: { value: ShowcaseCategory; label: string; help: string }[] = [
  { value: 'realisation', label: 'Réalisations', help: 'Projets terminés qui montrent le savoir-faire de MTM (page d’accueil et page « Nos réalisations »).' },
  { value: 'projet_a_venir', label: 'Projets à venir', help: 'Lotissements et programmes annoncés pour susciter l’intérêt (page d’accueil et page « Projets à venir »).' },
];

/**
 * Portfolio illustré du site public : réalisations et projets à venir (J1.5).
 * Chaque élément est une carte (photo, titre, lieu, date, description) ; il
 * n'apparaît sur le site qu'une fois publié, et une photo est vivement
 * conseillée car la carte du site l'affiche en grand.
 */
@Component({
  selector: 'app-showcase-items',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucideImage, LucideImageOff, LucideMapPin, LucidePencil, LucidePlus, LucideTrash2, LucideUpload],
  templateUrl: './showcase-items.html',
  styleUrl: './showcase-items.scss',
})
export class ShowcaseItems implements OnInit {
  private readonly api = inject(ShowcaseApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly categories = SHOWCASE_CATEGORIES;
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly items = signal<ShowcaseItem[]>([]);
  protected readonly categoryFilter = signal<ShowcaseCategory | null>(null);

  protected readonly visibleCategories = computed(() => {
    const filter = this.categoryFilter();
    return this.categories.filter((category) => !filter || category.value === filter);
  });

  protected readonly publishedCount = computed(() => this.items().filter((item) => item.isActive).length);
  protected readonly withoutImage = computed(() => this.items().filter((item) => !item.imageUrl));
  protected readonly unpublished = computed(() => this.items().filter((item) => !item.isActive));

  ngOnInit(): void {
    this.load();
  }

  protected itemsOf(category: ShowcaseCategory): ShowcaseItem[] {
    return this.items()
      .filter((item) => item.category === category)
      .sort((a, b) => a.ordre - b.ordre || a.title.localeCompare(b.title, 'fr'));
  }

  protected countOf(category: ShowcaseCategory): number {
    return this.items().filter((item) => item.category === category).length;
  }

  protected setFilter(category: ShowcaseCategory | null): void {
    this.categoryFilter.set(category);
  }

  protected openEditor(item?: ShowcaseItem, category?: ShowcaseCategory): void {
    const nextOrder = this.items().reduce((max, current) => Math.max(max, current.ordre + 1), 1);
    ShowcaseEditorDialog.open(this.dialog, { existing: item ?? null, category: category ?? item?.category ?? 'realisation', nextOrder }).subscribe((saved) => saved && this.load());
  }

  protected selectImage(event: Event, item: ShowcaseItem): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busyId.set(item.id);
    this.api.uploadImage(item.id, file).subscribe({
      next: () => {
        this.notify.success('Photo mise à jour');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible d’envoyer la photo (image JPG, PNG ou WebP attendue)');
      },
    });
  }

  protected togglePublish(item: ShowcaseItem): void {
    if (!this.canPublish) return;
    this.busyId.set(item.id);
    this.api.publish(item.id, !item.isActive).subscribe({
      next: () => {
        this.notify.success(item.isActive ? 'Retiré du site' : 'Publié sur le site');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected remove(item: ShowcaseItem): void {
    if (!this.canDelete || !confirm(`Supprimer « ${item.title} » du portfolio ? Sa photo sera perdue.`)) return;
    this.busyId.set(item.id);
    this.api.remove(item.id).subscribe({
      next: () => {
        this.notify.success('Élément supprimé');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de supprimer cet élément');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAllAdmin().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busyId.set(null);
        this.notify.error(error, 'Erreur lors du chargement du portfolio');
      },
    });
  }
}
