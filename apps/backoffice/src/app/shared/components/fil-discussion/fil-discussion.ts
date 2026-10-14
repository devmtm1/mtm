import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  type FilDossier,
  type MessageDossier,
  type TypeDossier,
  MessagesApiService,
} from '../../../core/services/api/messages-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../services/notification.service';

/**
 * Fil de discussion d'un dossier (section 22) : notes internes entre
 * collègues et messages au client, avec l'historique. Visible de qui peut
 * ouvrir le dossier ; un message au client apparaît dans son espace.
 */
@Component({
  selector: 'app-fil-discussion',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  templateUrl: './fil-discussion.html',
  styleUrl: './fil-discussion.scss',
})
export class FilDiscussion implements OnInit {
  private readonly api = inject(MessagesApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  readonly type = input.required<TypeDossier>();
  readonly dossierId = input.required<string>();

  protected readonly peutLire = this.session.hasPermission('messages:consulter');
  protected readonly peutEcrire = this.session.hasPermission('messages:creer');

  protected readonly fil = signal<FilDossier | null>(null);
  protected readonly loading = signal(true);
  protected readonly envoi = signal(false);
  protected readonly messages = computed(() => this.fil()?.items ?? []);

  protected readonly texte = new FormControl('', { nonNullable: true });
  protected readonly auClient = new FormControl(false, { nonNullable: true });

  ngOnInit(): void {
    if (this.peutLire) this.charger();
    else this.loading.set(false);
  }

  protected envoyer(): void {
    const corps = this.texte.value.trim();
    if (!corps || this.envoi()) return;
    this.envoi.set(true);
    this.api.poster(this.type(), this.dossierId(), corps, this.auClient.value).subscribe({
      next: (message) => {
        this.fil.update((fil) => (fil ? { ...fil, items: [...fil.items, message] } : fil));
        this.texte.reset('');
        this.auClient.reset(false);
        this.envoi.set(false);
        this.notify.success(message.visibleClient ? 'Message envoyé au client' : 'Note ajoutée au dossier');
      },
      error: (error: unknown) => {
        this.envoi.set(false);
        this.notify.error(error, 'Message non envoyé');
      },
    });
  }

  protected nom(message: MessageDossier): string {
    return [message.auteur.firstName, message.auteur.lastName].filter(Boolean).join(' ');
  }

  protected date(valeur: string): string {
    return new Date(valeur).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected nature(message: MessageDossier): string {
    if (message.deClient) return 'Message du client';
    return message.visibleClient ? 'Envoyé au client' : 'Note interne';
  }

  private charger(): void {
    this.api.fil(this.type(), this.dossierId()).subscribe({
      next: (fil) => {
        this.fil.set(fil);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger les échanges');
      },
    });
  }
}
