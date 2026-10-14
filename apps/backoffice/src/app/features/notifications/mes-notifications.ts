import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  type NotificationsPage,
  type PreferencesNotification,
  NotificationsApiService,
  type ServerNotification,
} from '../../core/services/api/notifications-api.service';
import { routeDeLien } from '../../core/services/notifications-feed.service';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * Mes notifications : l'historique de ce qui m'a été signalé, et mes canaux
 * (e-mail, SMS, WhatsApp). Chacun règle les siens ; les événements eux-mêmes
 * se règlent dans Administration › Règles de notification.
 */
@Component({
  selector: 'app-mes-notifications',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  templateUrl: './mes-notifications.html',
  styleUrl: './mes-notifications.scss',
})
export class MesNotifications implements OnInit {
  private readonly api = inject(NotificationsApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly loading = signal(true);
  protected readonly page = signal<NotificationsPage>({ items: [], nonLues: 0 });
  protected readonly preferences = signal<PreferencesNotification | null>(null);
  protected readonly enregistrement = signal(false);

  protected readonly form = this.fb.group({
    email: [true],
    sms: [false],
    whatsapp: [false],
    telephone: [''],
  });

  ngOnInit(): void {
    this.api.list({ limite: 60 }).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les notifications');
      },
    });
    this.api.preferences().subscribe({
      next: (preferences) => this.appliquer(preferences),
      error: (error: unknown) => this.notify.error(error, 'Impossible de charger vos préférences'),
    });
  }

  protected ouvrir(notification: ServerNotification): void {
    if (!notification.readAt) {
      this.api.markRead(notification.id).subscribe({ error: () => undefined });
      this.page.update((page) => ({
        nonLues: Math.max(0, page.nonLues - 1),
        items: page.items.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      }));
    }
    const { route, queryParams } = routeDeLien(notification.lien);
    if (notification.lien) void this.router.navigate(route, queryParams ? { queryParams } : undefined);
  }

  protected toutLu(): void {
    this.api.markAllRead().subscribe({
      next: () => {
        this.page.update((page) => ({
          nonLues: 0,
          items: page.items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
        }));
      },
      error: (error: unknown) => this.notify.error(error, 'Action impossible'),
    });
  }

  protected enregistrer(): void {
    this.enregistrement.set(true);
    const v = this.form.getRawValue();
    this.api
      .savePreferences({
        email: v.email,
        sms: v.sms,
        whatsapp: v.whatsapp,
        telephone: v.telephone.trim(),
      })
      .subscribe({
        next: (preferences) => {
          this.appliquer(preferences);
          this.enregistrement.set(false);
          this.notify.success('Préférences enregistrées');
        },
        error: (error: unknown) => {
          this.enregistrement.set(false);
          this.notify.error(error, 'Enregistrement impossible');
        },
      });
  }

  protected date(valeur: string): string {
    return new Date(valeur).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  private appliquer(preferences: PreferencesNotification): void {
    this.preferences.set(preferences);
    this.form.reset({
      email: preferences.email,
      sms: preferences.sms,
      whatsapp: preferences.whatsapp,
      telephone: preferences.telephone,
    });
  }
}
