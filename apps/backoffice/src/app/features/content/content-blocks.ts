import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucideFileText, LucideMessageSquareQuote, LucideNewspaper, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ContentBlockApiService, type ContentBlock } from '../../core/services/api/content-block-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ContentEditorDialog } from './content-editor-dialog';
import { NEWS_KEY_PATTERN, SITE_CONTENT_SECTIONS, TESTIMONIAL_TYPE, slotByKey, type ContentSlot } from './site-content-catalog';

interface NewsGroup {
  index: number;
  title?: ContentBlock;
  tag?: ContentBlock;
  excerpt?: ContentBlock;
  isActive: boolean;
}

/**
 * Contenus du site public, présentés par page et par emplacement (J1.5).
 * L'utilisateur voit « Titre principal de la page d'accueil » avec sa valeur
 * actuelle, pas une clé technique : chaque emplacement se modifie en un clic
 * et revient au texte par défaut du site si on le vide.
 */
@Component({
  selector: 'app-content-blocks',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucideFileText, LucideMessageSquareQuote, LucideNewspaper, LucidePencil, LucidePlus, LucideTrash2],
  templateUrl: './content-blocks.html',
  styleUrl: './content-blocks.scss',
})
export class ContentBlocks implements OnInit {
  private readonly api = inject(ContentBlockApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');
  protected readonly canEdit = this.canCreate || this.canModify;

  protected readonly sections = SITE_CONTENT_SECTIONS;
  protected readonly loading = signal(true);
  protected readonly busyKey = signal<string | null>(null);
  protected readonly blocks = signal<ContentBlock[]>([]);

  private readonly byKey = computed(() => new Map(this.blocks().map((block) => [block.key, block])));

  protected readonly testimonials = computed(() => this.blocks().filter((block) => block.type === TESTIMONIAL_TYPE).sort((a, b) => a.ordre - b.ordre));

  protected readonly news = computed<NewsGroup[]>(() => {
    const groups = new Map<number, NewsGroup>();
    for (const block of this.blocks()) {
      const match = NEWS_KEY_PATTERN.exec(block.key);
      if (!match) continue;
      const index = Number(match[1]);
      const group = groups.get(index) ?? { index, isActive: false };
      group[match[2] as 'title' | 'tag' | 'excerpt'] = block;
      groups.set(index, group);
    }
    return [...groups.values()].map((group) => ({ ...group, isActive: !!(group.title ?? group.excerpt ?? group.tag)?.isActive })).sort((a, b) => a.index - b.index);
  });

  /** Blocs que ni le catalogue ni les témoignages/actualités ne couvrent. */
  protected readonly others = computed(() => this.blocks().filter((block) => block.type !== TESTIMONIAL_TYPE && !NEWS_KEY_PATTERN.test(block.key) && !slotByKey(block.key)));

  protected readonly filledCount = computed(() => this.sections.reduce((sum, section) => sum + section.slots.filter((slot) => this.byKey().has(slot.key)).length, 0));
  protected readonly slotCount = this.sections.reduce((sum, section) => sum + section.slots.length, 0);
  protected readonly unpublishedCount = computed(() => this.blocks().filter((block) => !block.isActive).length);

  ngOnInit(): void {
    this.load();
  }

  protected blockFor(slot: ContentSlot): ContentBlock | undefined {
    return this.byKey().get(slot.key);
  }

  /** Aperçu court ; les listes (une entrée par ligne) gardent leurs sauts de ligne. */
  protected preview(block: ContentBlock | undefined, max = 160, keepLines = false): string {
    if (!block) return '';
    if (keepLines) {
      const lines = block.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const shown = lines.slice(0, 4).map((line) => (line.length > max ? `${line.slice(0, max)}…` : line));
      return lines.length > 4 ? `${shown.join('\n')}\n… et ${lines.length - 4} de plus` : shown.join('\n');
    }
    const text = block.content.replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  protected editSlot(slot: ContentSlot): void {
    if (!this.canEdit) return;
    ContentEditorDialog.open(this.dialog, { kind: 'slot', slot, existing: this.blockFor(slot) ?? null }).subscribe((saved) => saved && this.load());
  }

  protected editTestimonial(existing?: ContentBlock): void {
    if (!this.canEdit) return;
    const nextOrder = this.testimonials().reduce((max, item) => Math.max(max, item.ordre + 1), 1);
    ContentEditorDialog.open(this.dialog, { kind: 'testimonial', existing: existing ?? null, nextOrder }).subscribe((saved) => saved && this.load());
  }

  protected editNews(group?: NewsGroup): void {
    if (!this.canEdit) return;
    const nextNewsIndex = this.news().reduce((max, item) => Math.max(max, item.index + 1), 1);
    ContentEditorDialog.open(this.dialog, { kind: 'news', news: group, nextNewsIndex }).subscribe((saved) => saved && this.load());
  }

  protected editCustom(existing?: ContentBlock): void {
    if (!this.canEdit) return;
    ContentEditorDialog.open(this.dialog, { kind: 'custom', existing: existing ?? null }).subscribe((saved) => saved && this.load());
  }

  protected togglePublish(block: ContentBlock): void {
    if (!this.canPublish) return;
    this.busyKey.set(block.key);
    this.api.publish(block.key, !block.isActive).subscribe({
      next: () => {
        this.notify.success(block.isActive ? 'Contenu masqué du site' : 'Contenu publié sur le site');
        this.load();
      },
      error: (error: unknown) => {
        this.busyKey.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected toggleNewsPublish(group: NewsGroup): void {
    if (!this.canPublish) return;
    const targets = [group.title, group.tag, group.excerpt].filter((block): block is ContentBlock => !!block);
    const isActive = !group.isActive;
    this.busyKey.set(`news.${group.index}`);
    const next = (remaining: ContentBlock[]): void => {
      const [first, ...rest] = remaining;
      if (!first) {
        this.notify.success(isActive ? 'Actualité publiée' : 'Actualité masquée du site');
        this.load();
        return;
      }
      this.api.publish(first.key, isActive).subscribe({
        next: () => next(rest),
        error: (error: unknown) => {
          this.busyKey.set(null);
          this.notify.error(error, 'Impossible de changer la publication');
          this.load();
        },
      });
    };
    next(targets);
  }

  protected remove(block: ContentBlock, label: string): void {
    if (!this.canDelete || !confirm(`Supprimer « ${label} » ? Le site reviendra à son affichage par défaut.`)) return;
    this.busyKey.set(block.key);
    this.api.remove(block.key).subscribe({
      next: () => {
        this.notify.success('Contenu supprimé');
        this.load();
      },
      error: (error: unknown) => {
        this.busyKey.set(null);
        this.notify.error(error, 'Impossible de supprimer ce contenu');
      },
    });
  }

  protected removeNews(group: NewsGroup): void {
    if (!this.canDelete || !confirm(`Supprimer l’actualité « ${group.title?.content ?? group.index} » ?`)) return;
    const targets = [group.title, group.tag, group.excerpt].filter((block): block is ContentBlock => !!block);
    this.busyKey.set(`news.${group.index}`);
    const next = (remaining: ContentBlock[]): void => {
      const [first, ...rest] = remaining;
      if (!first) {
        this.notify.success('Actualité supprimée');
        this.load();
        return;
      }
      this.api.remove(first.key).subscribe({
        next: () => next(rest),
        error: (error: unknown) => {
          this.busyKey.set(null);
          this.notify.error(error, 'Impossible de supprimer cette actualité');
          this.load();
        },
      });
    };
    next(targets);
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAllAdmin().subscribe({
      next: (data) => {
        this.blocks.set(data);
        this.loading.set(false);
        this.busyKey.set(null);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.busyKey.set(null);
        this.notify.error(error, 'Erreur lors du chargement des contenus');
      },
    });
  }
}
