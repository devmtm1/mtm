import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { LucideTrash2, LucideWallet } from '@lucide/angular';
import { MenuActions, type GroupeMenu } from './menu-actions';

function creer(groupes: GroupeMenu[], libelle?: string) {
  const fixture = TestBed.createComponent(MenuActions);
  fixture.componentRef.setInput('groupes', groupes);
  if (libelle) fixture.componentRef.setInput('libelle', libelle);
  fixture.detectChanges();
  return fixture;
}

describe('MenuActions', () => {
  it('n’affiche aucun bouton quand il n’y a aucune action', () => {
    const fixture = creer([{ titre: 'Vide', actions: [false, null, undefined] }]);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('ignore les actions absentes et les groupes qui en sont vides', () => {
    const fixture = creer([
      { titre: 'Absent', actions: [false] },
      { titre: 'Présent', actions: [{ libelle: 'Encaisser', icone: LucideWallet, action: () => undefined }] },
    ]);
    const composant = fixture.componentInstance as unknown as { groupesVisibles: () => { titre?: string }[] };
    expect(composant.groupesVisibles().map((groupe) => groupe.titre)).toEqual(['Présent']);
  });

  it('affiche le texte du bouton, « Plus » par défaut', () => {
    const action = { libelle: 'Supprimer', icone: LucideTrash2, danger: true, action: vi.fn() };
    expect(creer([{ actions: [action] }]).nativeElement.querySelector('button')?.textContent).toContain('Plus');
    expect(creer([{ actions: [action] }], 'Actions').nativeElement.querySelector('button')?.textContent).toContain('Actions');
  });
});
