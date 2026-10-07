import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideCheck, LucideUserCheck, LucideChevronLeft, LucideChevronRight, LucideInbox, LucideKeyRound, LucideLandPlot, LucideMail, LucideClock, LucideEllipsisVertical, LucideMessageSquare, LucidePhone, LucideSearch, LucideUserPlus, LucideX } from '@lucide/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ContactApiService, type ContactMessage } from '../../core/services/api/contact-api.service';
import { CrmApiService } from '../../core/services/api/crm-api.service';
import { SessionService } from '../../core/services/session.service';
import type { CommercialSummary } from '../../core/models/prospect.model';
import { NotificationService } from '../../shared/services/notification.service';
import { StatusChoiceDialog } from '../../shared/dialogs/status-choice-dialog';
import { RepondreDialog } from './repondre-dialog';

type Scope = 'all' | 'unread' | 'read';

/**
 * Demandes reçues depuis le formulaire de contact du site public (J1.2).
 * Chaque message est lu, puis converti en prospect CRM en un clic — la
 * demande devient alors une fiche suivie par un commercial.
 */
@Component({
  selector: 'app-contacts',
  imports: [DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, MatMenuModule, MatTooltipModule, LucideCheck, LucideUserCheck, LucideChevronLeft, LucideChevronRight, LucideClock, LucideEllipsisVertical, LucideInbox, LucideKeyRound, LucideLandPlot, LucideMail, LucideMessageSquare, LucidePhone, LucideSearch, LucideUserPlus, LucideX],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts implements OnInit {
  private readonly contactApi = inject(ContactApiService);
  private readonly crmApi = inject(CrmApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly session = inject(SessionService);

  protected readonly contacts = signal<ContactMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly scope = signal<Scope>('all');
  protected readonly search = signal('');
  protected readonly canConvert = this.session.hasPermission('crm:creer');
  protected readonly canReply = this.session.hasPermission('contact:modifier');
  protected readonly canSeeTerrain = this.session.hasPermission('terrains:consulter');
  protected readonly canSeeBien = this.session.hasPermission('locatif:consulter');
  protected readonly canSeeProspect = this.session.hasPermission('crm:consulter');
  private readonly isSupervisor = this.session.hasSupervisionScope('crm');

  protected readonly unreadCount = computed(() => this.contacts().filter((contact) => !contact.lu).length);
  protected readonly weekCount = computed(() => {
    const limit = Date.now() - 7 * 86_400_000;
    return this.contacts().filter((contact) => new Date(contact.createdAt).getTime() >= limit).length;
  });

  protected readonly previousWeekCount = computed(() => {
    const now = Date.now();
    return this.contacts().filter((contact) => {
      const time = new Date(contact.createdAt).getTime();
      return time >= now - 14 * 86_400_000 && time < now - 7 * 86_400_000;
    }).length;
  });
  protected readonly weekDelta = computed(() => this.weekCount() - this.previousWeekCount());

  protected readonly filtered = computed(() => {
    const scope = this.scope();
    const term = this.search().trim().toLowerCase();
    return this.contacts()
      .filter((contact) => (scope === 'unread' ? !contact.lu : scope === 'read' ? contact.lu : true))
      .filter((contact) => !term || `${contact.nom} ${contact.email ?? ''} ${contact.telephone ?? ''} ${contact.sujet ?? ''} ${contact.message}`.toLowerCase().includes(term));
  });

  protected readonly pageSizes = [10, 25, 50];
  protected readonly pageSize = signal(10);
  private readonly pageIndex = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  /** Page affichée, ramenée dans les bornes quand un filtre réduit la liste. */
  protected readonly currentPage = computed(() => Math.min(this.pageIndex(), this.totalPages() - 1));
  protected readonly paged = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly rangeStart = computed(() => (this.filtered().length === 0 ? 0 : this.currentPage() * this.pageSize() + 1));
  protected readonly rangeEnd = computed(() => Math.min(this.filtered().length, (this.currentPage() + 1) * this.pageSize()));

  protected readonly hasActiveFilters =computed(() => this.scope() !== 'all' || this.search().trim() !== '');

  ngOnInit(): void {
    this.load();
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
  }

  /** Teinte stable par personne, pour repérer un même expéditeur d'un coup d'œil. */
  protected avatarColor(name: string): string {
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
    return `hsl(${hash} 55% 42%)`;
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
    this.pageIndex.set(0);
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.pageIndex.set(0);
  }

  protected resetFilters(): void {
    this.scope.set('all');
    this.search.set('');
    this.pageIndex.set(0);
  }

  protected goToPage(index: number): void {
    this.pageIndex.set(Math.min(Math.max(0, index), this.totalPages() - 1));
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  /**
   * Répond au message. La réponse est enregistrée même si l'e-mail ne part pas :
   * l'équipe en est alors avertie pour joindre le client autrement.
   */
  protected repondre(contact: ContactMessage): void {
    RepondreDialog.open(this.dialog, { contact }).subscribe((reponse) => {
      if (!reponse) return;
      this.busyId.set(contact.id);
      this.contactApi.repondre(contact.id, reponse).subscribe({
        next: ({ contact: misAJour, emailEnvoye }) => {
          this.busyId.set(null);
          this.contacts.update((liste) =>
            liste.map((item) =>
              item.id === contact.id
                ? { ...item, lu: true, reponse: misAJour.reponse, reponduLe: misAJour.reponduLe }
                : item,
            ),
          );
          if (emailEnvoye) {
            this.notify.success('Réponse envoyée par e-mail et visible dans l’espace client');
          } else {
            this.notify.info('Réponse enregistrée et visible dans l’espace client, mais l’e-mail n’a pas pu partir : joignez le client autrement.');
          }
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.notify.error(error, 'Envoi de la réponse impossible');
        },
      });
    });
  }

  protected openTerrain(contact: ContactMessage): void {
    if (contact.terrain) void this.router.navigate(['/terrains', contact.terrain.id]);
  }

  protected openBien(contact: ContactMessage): void {
    if (contact.bienLocatif) void this.router.navigate(['/locatif/biens', contact.bienLocatif.id]);
  }

  protected openProspect(contact: ContactMessage): void {
    if (contact.prospect) void this.router.navigate(['/crm/prospects', contact.prospect.id]);
  }

  protected markAsRead(contact: ContactMessage): void {
    this.busyId.set(contact.id);
    this.contactApi.markRead(contact.id).subscribe({
      next: () => {
        this.contacts.update((list) => list.map((item) => (item.id === contact.id ? { ...item, lu: true } : item)));
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de marquer le message comme lu');
      },
    });
  }

  /** Crée (ou retrouve) le prospect à partir du message, puis ouvre sa fiche. */
  protected convertToProspect(contact: ContactMessage): void {
    if (!this.canConvert) return;
    const commercials$ = this.isSupervisor ? this.crmApi.getCommercials().pipe(catchError(() => of([] as CommercialSummary[]))) : of([] as CommercialSummary[]);
    commercials$.subscribe((commercials) => {
      if (commercials.length === 0) {
        this.doConvert(contact);
        return;
      }
      StatusChoiceDialog.open(this.dialog, {
        title: 'Créer le prospect',
        intro: `${contact.nom} devient un prospect suivi dans le CRM (son message est repris dans « Besoins »). Choisissez qui le rappelle.`,
        subject: `Message du ${new Date(contact.createdAt).toLocaleDateString('fr-FR')}`,
        current: '',
        choices: commercials.map((commercial) => ({ value: commercial.id, label: `${commercial.firstName} ${commercial.lastName}`, help: '', tone: 'primary' as const })),
        confirmLabel: 'Créer et affecter',
      }).subscribe((result) => {
        if (result) this.doConvert(contact, result.value);
      });
    });
  }

  private doConvert(contact: ContactMessage, commercialResponsableId?: string): void {
    this.busyId.set(contact.id);
    this.contactApi.convertToProspect(contact.id, commercialResponsableId).subscribe({
      next: (prospect) => {
        this.busyId.set(null);
        const result = prospect as { id?: string; commercialResponsableId?: string | null } | null;
        const me = this.session.user()?.id;
        // Prospect déjà suivi par un autre commercial : un commercial sans
        // périmètre global ne pourrait pas ouvrir sa fiche.
        if (!this.isSupervisor && result?.commercialResponsableId && result.commercialResponsableId !== me) {
          this.contacts.update((list) => list.map((item) => (item.id === contact.id ? { ...item, lu: true } : item)));
          this.notify.info('Ce contact correspond à un prospect déjà suivi par un autre commercial : demandez à votre responsable de vous l’affecter.');
          return;
        }
        this.notify.success('Prospect créé — planifiez le premier appel');
        if (result?.id) void this.router.navigate(['/crm/prospects', result.id]);
        else void this.router.navigate(['/crm/prospects']);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de créer le prospect');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.contactApi.findAll().subscribe({
      next: (data) => {
        this.contacts.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des demandes');
      },
    });
  }
}
