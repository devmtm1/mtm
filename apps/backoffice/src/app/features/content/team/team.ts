import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideEye, LucideEyeOff, LucideImageOff, LucidePencil, LucidePlus, LucideTrash2, LucideUpload, LucideUsers } from '@lucide/angular';
import { TeamApiService, type TeamKind, type TeamMember } from '../../../core/services/api/team-api.service';
import { SessionService } from '../../../core/services/session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TeamEditorDialog } from './team-editor-dialog';

/**
 * Page « Notre équipe » du site public : mot du directeur, photo de groupe et
 * un portrait par collaborateur. Chaque contenu n'apparaît sur le site qu'une
 * fois publié ; sans photo, le site affiche les initiales.
 */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [NgTemplateOutlet, MatButtonModule, MatTooltipModule, LucideEye, LucideEyeOff, LucideImageOff, LucidePencil, LucidePlus, LucideTrash2, LucideUpload, LucideUsers],
  templateUrl: './team.html',
  styleUrl: './team.scss',
})
export class Team implements OnInit {
  private readonly api = inject(TeamApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly canCreate = this.session.hasPermission('content:creer');
  protected readonly canModify = this.session.hasPermission('content:modifier');
  protected readonly canPublish = this.session.hasPermission('content:publier');
  protected readonly canDelete = this.session.hasPermission('content:supprimer');

  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly items = signal<TeamMember[]>([]);

  protected readonly directeur = computed(() => this.items().find((m) => m.kind === 'directeur') ?? null);
  protected readonly groupe = computed(() => this.items().find((m) => m.kind === 'groupe') ?? null);
  protected readonly membres = computed(() => this.items().filter((m) => m.kind === 'membre').sort((a, b) => a.ordre - b.ordre));
  protected readonly withoutImage = computed(() => this.items().filter((m) => !m.imageUrl));
  protected readonly unpublished = computed(() => this.items().filter((m) => !m.isActive));

  ngOnInit(): void {
    this.load();
  }

  protected initiales(nom: string): string {
    const mots = nom.trim().split(/\s+/).filter(Boolean);
    return (mots.length > 1 ? [mots[0], mots[mots.length - 1]] : mots)
      .map((mot) => mot.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  protected openEditor(kind: TeamKind, existing?: TeamMember): void {
    const nextOrder = this.membres().reduce((max, m) => Math.max(max, m.ordre + 1), 1);
    TeamEditorDialog.open(this.dialog, { kind, existing: existing ?? null, nextOrder }).subscribe((saved) => saved && this.load());
  }

  protected selectImage(event: Event, member: TeamMember): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busyId.set(member.id);
    this.api.uploadImage(member.id, file).subscribe({
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

  protected togglePublish(member: TeamMember): void {
    if (!this.canPublish) return;
    this.busyId.set(member.id);
    this.api.publish(member.id, !member.isActive).subscribe({
      next: () => {
        this.notify.success(member.isActive ? 'Retiré du site' : 'Publié sur le site');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de changer la publication');
      },
    });
  }

  protected remove(member: TeamMember): void {
    if (!this.canDelete || !confirm(`Supprimer « ${member.nom} » de la page Équipe ? Sa photo sera perdue.`)) return;
    this.busyId.set(member.id);
    this.api.remove(member.id).subscribe({
      next: () => {
        this.notify.success('Supprimé');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.notify.error(error, 'Impossible de supprimer');
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
        this.notify.error(error, 'Erreur lors du chargement de l’équipe');
      },
    });
  }
}
