import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideChevronLeft, LucideChevronRight, LucideCode, LucideInfo, LucideLock, LucidePencil, LucidePlus, LucideSearch, LucideSettings, LucideSlidersHorizontal, LucideTrash2 } from '@lucide/angular';
import { SessionService } from '../../core/services/session.service';
import { SettingsApiService } from '../../core/services/api/settings-api.service';
import type { SettingListItem } from '../../core/models/setting.model';
import { NotificationService } from '../../shared/services/notification.service';
import { SettingFormDialog } from './setting-form-dialog';
import { SETTING_GROUPS, inferKind, settingSlotByKey, type SettingSlot } from './settings-catalog';

/**
 * Paramètres de l'application (Phase 0), présentés par module avec un
 * libellé et une aide. Les listes (statuts, types…) alimentent les menus
 * déroulants des fiches ; les nombres fixent des règles (durée de blocage,
 * commission…). Les valeurs sensibles sont masquées sans le droit
 * « administrer ».
 */
@Component({
  selector: 'app-settings',
  imports: [MatButtonModule, MatTooltipModule, LucideChevronLeft, LucideChevronRight, LucideCode, LucideInfo, LucideLock, LucidePencil, LucidePlus, LucideSearch, LucideSettings, LucideSlidersHorizontal, LucideTrash2],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('settings:creer');
  protected readonly canModify = this.session.hasPermission('settings:modifier');
  protected readonly canDelete = this.session.hasPermission('settings:supprimer');
  protected readonly canAdminister = this.session.hasPermission('settings:administrer');

  protected readonly groups = SETTING_GROUPS;
  protected readonly loading = signal(true);
  protected readonly settings = signal<SettingListItem[]>([]);

  private readonly byKey = computed(() => new Map(this.settings().map((setting) => [setting.key, setting])));

  protected readonly others = computed(() => this.settings().filter((setting) => !settingSlotByKey(setting.key)));
  protected readonly sensitiveCount = computed(() => this.settings().filter((setting) => setting.isSensitive).length);
  protected readonly slotCount = this.groups.reduce((sum, group) => sum + group.slots.length, 0);
  protected readonly missing = computed(() => this.groups.flatMap((group) => group.slots).filter((slot) => !this.byKey().has(slot.key)));

  protected readonly activeId = signal<string>(this.groups[0]?.id ?? 'others');
  protected readonly search = signal('');
  protected readonly searching = computed(() => this.search().trim() !== '');

  /** Sans recherche : la catégorie choisie ; avec recherche : tous les paramètres qui correspondent. */
  protected readonly visibleGroups = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.groups.filter((group) => group.id === this.activeId());
    return this.groups
      .map((group) => ({
        ...group,
        slots: group.slots.filter((slot) => `${slot.label} ${slot.help} ${slot.key}`.toLowerCase().includes(term)),
      }))
      .filter((group) => group.slots.length > 0);
  });

  protected readonly visibleOthers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.activeId() === 'others' ? this.others() : [];
    return this.others().filter((setting) => `${setting.key} ${setting.description ?? ''}`.toLowerCase().includes(term));
  });

  protected readonly pageSizes = [10, 25, 50];
  protected readonly pageSize = signal(10);
  private readonly pageIndex = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visibleOthers().length / this.pageSize())));
  /** Page affichée, ramenée dans les bornes quand une recherche réduit la liste. */
  protected readonly currentPage = computed(() => Math.min(this.pageIndex(), this.totalPages() - 1));
  protected readonly pagedOthers = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.visibleOthers().slice(start, start + this.pageSize());
  });
  protected readonly rangeStart = computed(() => (this.visibleOthers().length === 0 ? 0 : this.currentPage() * this.pageSize() + 1));
  protected readonly rangeEnd = computed(() => Math.min(this.visibleOthers().length, (this.currentPage() + 1) * this.pageSize()));

  protected select(id: string): void {
    this.activeId.set(id);
    this.search.set('');
    this.pageIndex.set(0);
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.pageIndex.set(0);
  }

  protected goToPage(index: number): void {
    this.pageIndex.set(Math.min(Math.max(0, index), this.totalPages() - 1));
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  /** Paramètres du catalogue déjà enregistrés dans la catégorie. */
  protected configuredCount(group: { slots: SettingSlot[] }): number {
    return group.slots.filter((slot) => this.byKey().has(slot.key)).length;
  }

  ngOnInit(): void {
    this.load();
  }

  protected settingFor(slot: SettingSlot): SettingListItem | undefined {
    return this.byKey().get(slot.key);
  }

  /** Valeur lisible : liste → puces, nombre → avec unité, objet → « N règles ». */
  protected display(setting: SettingListItem | undefined, slot?: SettingSlot): { kind: 'masked' | 'list' | 'text'; items?: string[]; text?: string } {
    if (!setting) return { kind: 'text', text: 'Non défini : l’application utilise sa valeur par défaut.' };
    if (setting.redacted) return { kind: 'masked' };
    const value = setting.value;
    const kind = slot?.kind ?? inferKind(value);
    if (kind === 'list' && Array.isArray(value)) return { kind: 'list', items: value.map((item) => String(item)) };
    if (kind === 'number') return { kind: 'text', text: `${value}${slot?.unit ? ' ' + slot.unit : ''}` };
    if (kind === 'text') return { kind: 'text', text: String(value) };
    if (Array.isArray(value)) return { kind: 'text', text: `${value.length} règle${value.length > 1 ? 's' : ''} configurée${value.length > 1 ? 's' : ''}` };
    if (value && typeof value === 'object') return { kind: 'text', text: `${Object.keys(value).length} entrée${Object.keys(value).length > 1 ? 's' : ''}` };
    return { kind: 'text', text: String(value) };
  }

  protected edit(slot: SettingSlot | undefined, setting: SettingListItem | undefined): void {
    if (!this.canModify && !(this.canCreate && !setting)) return;
    if (setting?.redacted) {
      this.notify.error(null, 'Valeur sensible : seul un administrateur peut la modifier.');
      return;
    }
    SettingFormDialog.open(this.dialog, { slot, setting }).subscribe((saved) => saved && this.load());
  }

  protected createCustom(): void {
    if (!this.canCreate) return;
    SettingFormDialog.open(this.dialog, {}).subscribe((saved) => saved && this.load());
  }

  protected remove(setting: SettingListItem): void {
    if (!this.canDelete || !confirm(`Supprimer le paramètre « ${setting.key} » ? L’application reviendra à sa valeur par défaut. Cette action est tracée.`)) return;
    this.settingsApi.remove(setting.key).subscribe({
      next: () => {
        this.notify.success('Paramètre supprimé');
        this.load();
      },
      error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.settingsApi.findAll().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des paramètres');
      },
    });
  }
}
