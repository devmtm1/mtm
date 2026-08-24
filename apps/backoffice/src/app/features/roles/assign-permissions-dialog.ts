import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PermissionsApiService } from '../../core/services/api/permissions-api.service';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { Permission, RoleListItem } from '../../core/models/role.model';

export interface AssignPermissionsDialogData {
  role: RoleListItem;
}

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

@Component({
  selector: 'app-assign-permissions-dialog',
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  templateUrl: './assign-permissions-dialog.html',
  styleUrl: './assign-permissions-dialog.scss',
})
export class AssignPermissionsDialog implements OnInit {
  private readonly permissionsApi = inject(PermissionsApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly dialogRef = inject(MatDialogRef<AssignPermissionsDialog>);
  protected readonly data = inject<AssignPermissionsDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly groups = signal<PermissionGroup[]>([]);
  protected readonly selected = new Set<string>();

  ngOnInit(): void {
    for (const rp of this.data.role.permissions) {
      this.selected.add(rp.permission.name);
    }

    this.permissionsApi.findAll().subscribe({
      next: (permissions) => {
        const byResource = new Map<string, Permission[]>();
        for (const p of permissions) {
          const list = byResource.get(p.resource) ?? [];
          list.push(p);
          byResource.set(p.resource, list);
        }
        this.groups.set(
          Array.from(byResource.entries())
            .map(([resource, perms]) => ({ resource, permissions: perms }))
            .sort((a, b) => a.resource.localeCompare(b.resource)),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isChecked(permissionName: string): boolean {
    return this.selected.has(permissionName);
  }

  toggle(permissionName: string): void {
    if (this.selected.has(permissionName)) {
      this.selected.delete(permissionName);
    } else {
      this.selected.add(permissionName);
    }
  }

  save(): void {
    this.saving.set(true);

    const originalNames = new Set(
      this.data.role.permissions.map((rp) => rp.permission.name),
    );
    const toAdd = Array.from(this.selected).filter((name) => !originalNames.has(name));
    const toRemove = this.data.role.permissions.filter(
      (rp) => !this.selected.has(rp.permission.name),
    );

    const operations: Observable<unknown>[] = [];
    if (toAdd.length > 0) {
      operations.push(this.rolesApi.assignPermissions(this.data.role.id, toAdd));
    }
    for (const rp of toRemove) {
      operations.push(
        this.rolesApi.removePermission(this.data.role.id, rp.permission.id),
      );
    }

    if (operations.length === 0) {
      this.saving.set(false);
      this.dialogRef.close(false);
      return;
    }

    forkJoin(operations).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
