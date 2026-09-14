import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideCheck, LucideInbox, LucideLandPlot, LucideMail, LucideMailOpen, LucidePhone, LucideSearch, LucideUserPlus, LucideX } from '@lucide/angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ContactApiService, type ContactMessage } from '../../core/services/api/contact-api.service';
import { CrmApiService } from '../../core/services/api/crm-api.service';
import { SessionService } from '../../core/services/session.service';
import type { CommercialSummary } from '../../core/models/prospect.model';
import { NotificationService } from '../../shared/services/notification.service';
import { StatusChoiceDialog } from '../../shared/dialogs/status-choice-dialog';

type Scope = 'all' | 'unread' | 'read';

/**
 * Demandes reçues depuis le formulaire de contact du site public (J1.2).
 * Chaque message est lu, puis converti en prospect CRM en un clic — la
 * demande devient alors une fiche suivie par un commercial.
 */
@Component({
  selector: 'app-contacts',
  imports: [DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, MatTooltipModule, LucideCheck, LucideInbox, LucideLandPlot, LucideMail, LucideMailOpen, LucidePhone, LucideSearch, LucideUserPlus, LucideX],
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
  protected readonly canSeeTerrain = this.session.hasPermission('terrains:consulter');
  private readonly isSupervisor = this.session.hasSupervisionScope('crm');

  protected readonly unreadCount = computed(() => this.contacts().filter((contact) => !contact.lu).length);
  protected readonly weekCount = computed(() => {
    const limit = Date.now() - 7 * 86_400_000;
    return this.contacts().filter((contact) => new Date(contact.createdAt).getTime() >= limit).length;
  });

  protected readonly filtered = computed(() => {
    const scope = this.scope();
    const term = this.search().trim().toLowerCase();
    return this.contacts()
      .filter((contact) => (scope === 'unread' ? !contact.lu : scope === 'read' ? contact.lu : true))
      .filter((contact) => !term || `${contact.nom} ${contact.email ?? ''} ${contact.telephone ?? ''} ${contact.sujet ?? ''} ${contact.message}`.toLowerCase().includes(term));
  });

  protected readonly hasActiveFilters = computed(() => this.scope() !== 'all' || this.search().trim() !== '');

  ngOnInit(): void {
    this.load();
  }

  protected setScope(scope: Scope): void {
    this.scope.set(scope);
  }

  protected resetFilters(): void {
    this.scope.set('all');
    this.search.set('');
  }

  protected openTerrain(contact: ContactMessage): void {
    if (contact.terrain) void this.router.navigate(['/terrains', contact.terrain.id]);
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
