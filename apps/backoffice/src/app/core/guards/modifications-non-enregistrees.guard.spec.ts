import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';
import { AvecModifications, modificationsNonEnregistreesGuard } from './modifications-non-enregistrees.guard';

function lancer(ecran: AvecModifications, reponse = true): { resultat: unknown; ask: ReturnType<typeof vi.fn> } {
  const ask = vi.fn(() => of(reponse));
  TestBed.configureTestingModule({ providers: [{ provide: ConfirmService, useValue: { ask } }] });
  const resultat = TestBed.runInInjectionContext(() =>
    modificationsNonEnregistreesGuard(ecran, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot),
  );
  return { resultat, ask };
}

describe('modificationsNonEnregistreesGuard', () => {
  it('laisse partir sans question quand rien n’a été saisi', () => {
    const { resultat, ask } = lancer({ aDesModifications: () => false });
    expect(resultat).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it('demande confirmation quand la saisie n’est pas enregistrée', () => {
    const { resultat, ask } = lancer({ aDesModifications: () => true });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0]).toMatchObject({ title: 'Quitter sans enregistrer ?', cancelLabel: 'Continuer la saisie' });
    let reponse: boolean | undefined;
    (resultat as Observable<boolean>).subscribe((valeur) => (reponse = valeur));
    expect(reponse).toBe(true);
  });

  it('retient la personne qui choisit de continuer la saisie', () => {
    const { resultat } = lancer({ aDesModifications: () => true }, false);
    let reponse: boolean | undefined;
    (resultat as Observable<boolean>).subscribe((valeur) => (reponse = valeur));
    expect(reponse).toBe(false);
  });
});
