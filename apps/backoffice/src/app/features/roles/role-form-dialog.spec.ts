import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { RoleFormDialog } from './role-form-dialog';
import { RolesApiService } from '../../core/services/api/roles-api.service';
import type { RoleListItem } from '../../core/models/role.model';
import { NotificationService } from '../../shared/services/notification.service';

const permission = (name: string) => ({ permission: { id: name, name, resource: name.split(':')[0], action: name.split(':')[1], description: null } }) as RoleListItem['permissions'][number];
const modele = { id: 'r-commercial', name: 'commercial', description: null, isSystem: true, permissions: [permission('crm:consulter'), permission('crm:creer')] } as RoleListItem;

function monter(modeles: RoleListItem[]) {
  const api = {
    create: vi.fn(() => of({ id: 'r-nouveau', name: 'stagiaire', description: null, isSystem: false, permissions: [] } as RoleListItem)),
    assignPermissions: vi.fn(() => of({ success: true })),
    update: vi.fn(),
  };
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: RolesApiService, useValue: api },
      { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: MatDialogRef, useValue: { close } },
      { provide: MAT_DIALOG_DATA, useValue: { modeles } },
    ],
  });
  const fixture = TestBed.createComponent(RoleFormDialog);
  fixture.detectChanges();
  return { fixture, api, close, composant: fixture.componentInstance as unknown as { form: { patchValue(v: object): void }; submit(): void } };
}

describe('RoleFormDialog — partir d’un rôle existant', () => {
  it('copie les droits du rôle choisi sur le nouveau rôle', () => {
    const { api, close, composant, fixture } = monter([modele]);
    composant.form.patchValue({ name: 'stagiaire', description: 'Stagiaire commercial', modele: 'r-commercial' });
    fixture.detectChanges();
    composant.submit();
    expect(api.create).toHaveBeenCalledWith({ name: 'stagiaire', description: 'Stagiaire commercial' });
    expect(api.assignPermissions).toHaveBeenCalledWith('r-nouveau', ['crm:consulter', 'crm:creer']);
    expect(close).toHaveBeenCalledWith(true);
  });

  it('sans modèle, le rôle est créé vide : aucune permission n’est attribuée', () => {
    const { api, composant } = monter([modele]);
    composant.form.patchValue({ name: 'vide', modele: '' });
    composant.submit();
    expect(api.create).toHaveBeenCalled();
    expect(api.assignPermissions).not.toHaveBeenCalled();
  });

  it('n’affiche pas le choix de modèle quand aucun rôle n’est proposé', () => {
    const { fixture } = monter([]);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Partir des droits de');
  });
});
