import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import { ProprietaireDialog, type ProprietaireDialogResult } from './proprietaire-dialog';
import { SessionService } from '../../core/services/session.service';

function monter(droits: string[], roles: string[] = []) {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: MatDialogRef, useValue: { close } },
      { provide: MAT_DIALOG_DATA, useValue: null },
      { provide: SessionService, useValue: { hasPermission: (p: string) => droits.includes(p), hasRole: (r: string) => roles.includes(r) } },
    ],
  });
  const fixture = TestBed.createComponent(ProprietaireDialog);
  fixture.detectChanges();
  return { fixture, close, racine: fixture.nativeElement as HTMLElement };
}

function saisir(racine: HTMLElement, nom: string, valeur: string) {
  const champ = racine.querySelector<HTMLInputElement>(`input[formcontrolname="${nom}"]`);
  expect(champ, nom).not.toBeNull();
  champ!.value = valeur;
  champ!.dispatchEvent(new Event('input'));
}

describe('ProprietaireDialog — création', () => {
  /** Ouvre la section facultative « état civil et pièce d'identité », repliée par défaut à la création. */
  function deplier(fixture: ReturnType<typeof monter>['fixture'], racine: HTMLElement) {
    racine.querySelector<HTMLButtonElement>('.details-bascule')!.click();
    fixture.detectChanges();
  }

  it('à la création, seul l’essentiel est visible : l’état civil et la pièce se déplient à la demande', () => {
    const { fixture, racine } = monter(['proprietaires:creer']);
    expect(racine.querySelector('input[formcontrolname="numeroPiece"]')).toBeNull();
    expect(racine.querySelector('input[formcontrolname="firstName"]')).not.toBeNull();
    expect(racine.querySelector('input[formcontrolname="phone"]')).not.toBeNull();
    deplier(fixture, racine);
    expect(racine.querySelector('input[formcontrolname="numeroPiece"]')).not.toBeNull();
  });

  it('un commercial (sans « modifier un propriétaire ») ne voit pas le champ PDF, mais peut saisir la pièce', () => {
    const { fixture, racine } = monter(['proprietaires:consulter', 'proprietaires:creer']);
    deplier(fixture, racine);
    expect(racine.querySelector('input[type="file"]')).toBeNull();
    expect(racine.querySelector('input[formcontrolname="numeroPiece"]')).not.toBeNull();
  });

  it('qui a le droit de modifier voit le champ PDF', () => {
    const { fixture, racine } = monter(['proprietaires:creer', 'proprietaires:modifier']);
    deplier(fixture, racine);
    expect(racine.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('renvoie la fiche dans « payload », jamais à plat : les formulaires qui l’appellent doivent le lire ainsi', () => {
    const { racine, close } = monter(['proprietaires:creer']);
    saisir(racine, 'firstName', 'Awa');
    saisir(racine, 'lastName', 'Diop');
    racine.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(close).toHaveBeenCalledTimes(1);
    const resultat = close.mock.calls[0][0] as ProprietaireDialogResult;
    expect(Object.keys(resultat).sort()).toEqual(['fichierPiece', 'payload', 'retirerPiece']);
    expect(resultat.payload.firstName).toBe('Awa');
    expect(resultat.payload.lastName).toBe('Diop');
    // Sans droit de modifier : aucune pièce jointe, aucun retrait.
    expect(resultat.fichierPiece).toBeNull();
    expect(resultat.retirerPiece).toBe(false);
  });

  it('refuse d’envoyer une fiche sans prénom ni nom', () => {
    const { racine, close } = monter(['proprietaires:creer']);
    racine.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(close).not.toHaveBeenCalled();
  });
});
