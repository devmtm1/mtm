import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideKeyRound, LucideLock, LucideShield, LucideShieldPlus, LucideTrash2, LucideUsers } from '@lucide/angular';
import { SessionService } from '../../core/services/session.service';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { RoleListItem } from '../../core/models/role.model';
import { NotificationService } from '../../shared/services/notification.service';
import { permissionActionLabel, resourceLabel, roleHelp, roleLabel, SENSITIVE_ROLES } from '../admin/admin-labels';
import { RoleFormDialog } from './role-form-dialog';
import { AssignPermissionsDialog } from './assign-permissions-dialog';

interface ModuleSummary {
  resource: string;
  label: string;
  actions: string[];
  full: boolean;
}

/** Ordre d'affichage des modules dans le résumé d'un rôle. */
const RESOURCE_ORDER = ['terrains', 'proprietaires', 'mandats', 'crm', 'ventes', 'contact', 'content', 'clients', 'users', 'roles', 'settings', 'audit'];

/**
 * Rôles & permissions (Phase 0, section 24 CDC). Un rôle regroupe des
 * permissions « module : action » ; chaque utilisateur a un rôle. Les rôles
 * système sont livrés avec l'application et ne peuvent pas être supprimés,
 * mais leurs permissions restent ajustables par un administrateur.
 */
@Component({
  selector: 'app-roles',
  imports: [MatButtonModule, MatTooltipModule, LucideKeyRound, LucideLock, LucideShield, LucideShieldPlus, LucideTrash2, LucideUsers],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  private readonly rolesApi = inject(RolesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);

  protected readonly loading = signal(true);
  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly canCreate = this.session.hasPermission('roles:creer');
  protected readonly canModify = this.session.hasPermission('roles:modifier');
  protected readonly canDelete = this.session.hasPermission('roles:supprimer');
  protected readonly canAdminister = this.session.hasPermission('roles:administrer');
  protected readonly roleLabel = roleLabel;
  protected readonly roleHelp = roleHelp;

  protected readonly sorted = computed(() =>
    // Rôles du back-office d'abord (les plus utilisés en tête), « client » à la fin.
    [...this.roles()].sort((a, b) => Number(a.name === 'client') - Number(b.name === 'client') || (b._count?.users ?? 0) - (a._count?.users ?? 0) || roleLabel(a.name).localeCompare(roleLabel(b.name), 'fr')),
  );
  protected readonly usersCount = computed(() => this.roles().reduce((sum, role) => sum + (role._count?.users ?? 0), 0));
  protected readonly unusedRoles = computed(() => this.roles().filter((role) => (role._count?.users ?? 0) === 0 && role.name !== 'client'));
  protected readonly emptyRoles = computed(() => this.roles().filter((role) => role.permissions.length === 0 && role.name !== 'client'));

  ngOnInit(): void {
    this.load();
  }

  protected isSensitive(role: RoleListItem): boolean {
    return SENSITIVE_ROLES.has(role.name);
  }

  /** Résumé lisible des permissions d'un rôle, module par module. */
  protected modules(role: RoleListItem): ModuleSummary[] {
    const byResource = new Map<string, string[]>();
    for (const { permission } of role.permissions) {
      const list = byResource.get(permission.resource) ?? [];
      list.push(permission.action);
      byResource.set(permission.resource, list);
    }
    return [...byResource.entries()]
      .map(([resource, actions]) => ({
        resource,
        label: resourceLabel(resource),
        actions: actions.map(permissionActionLabel),
        full: actions.includes('administrer'),
      }))
      .sort((a, b) => {
        const ia = RESOURCE_ORDER.indexOf(a.resource);
        const ib = RESOURCE_ORDER.indexOf(b.resource);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }

  protected openCreateDialog(): void {
    RoleFormDialog.open(this.dialog, {}).subscribe((saved) => saved && this.load());
  }

  protected openEditDialog(role: RoleListItem): void {
    if (!this.canModify) return;
    RoleFormDialog.open(this.dialog, { role }).subscribe((saved) => saved && this.load());
  }

  protected openPermissionsDialog(role: RoleListItem): void {
    if (!this.canAdminister) return;
    const ref = this.dialog.open(AssignPermissionsDialog, { width: '720px', maxWidth: 'calc(100vw - 32px)', data: { role } });
    ref.afterClosed().subscribe((changed: boolean | undefined) => {
      if (changed) {
        this.notify.success('Permissions mises à jour : effectives à la prochaine connexion des utilisateurs concernés');
        this.load();
      }
    });
  }

  protected remove(role: RoleListItem): void {
    if (!this.canDelete || role.isSystem) return;
    const users = role._count?.users ?? 0;
    if (users > 0) {
      this.notify.error(null, `Impossible : ${users} compte${users > 1 ? 's ont' : ' a'} encore ce rôle. Changez leur rôle d’abord.`);
      return;
    }
    if (!confirm(`Supprimer le rôle « ${roleLabel(role.name)} » ? Cette action est tracée.`)) return;
    this.rolesApi.remove(role.id).subscribe({
      next: () => {
        this.notify.success('Rôle supprimé');
        this.load();
      },
      error: (error: unknown) => this.notify.error(error, 'Suppression impossible'),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.rolesApi.findAll().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Erreur lors du chargement des rôles');
      },
    });
  }
}
