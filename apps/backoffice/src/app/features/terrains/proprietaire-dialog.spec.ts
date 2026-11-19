import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { creerProprietaireAvecPiece, type ProprietaireDialogResult } from './proprietaire-dialog';
import type { ProprietaireSummary } from '../../core/models/terrain.model';

const cree = { id: 'p1', firstName: 'Awa', lastName: 'Diop' } as ProprietaireSummary;
const payload = { firstName: 'Awa', lastName: 'Diop' } as Omit<ProprietaireSummary, 'id'>;
const resultat = (fichierPiece: File | null): ProprietaireDialogResult => ({ payload, fichierPiece, retirerPiece: false });

describe('creerProprietaireAvecPiece', () => {
  it('envoie à l’API les champs à plat de la fiche, jamais l’enveloppe du dialogue', () => {
    const creer = vi.fn((payloadEnvoye: Omit<ProprietaireSummary, 'id'>) => of({ ...cree, firstName: payloadEnvoye.firstName }));
    const api = { enregistrerPiece: vi.fn(() => of(null)) };
    const notify = { error: vi.fn() };
    creerProprietaireAvecPiece(creer, api as never, resultat(null), notify as never).subscribe();
    expect(creer).toHaveBeenCalledWith(payload);
    expect(Object.keys(creer.mock.calls[0][0] as object)).not.toContain('payload');
    expect(Object.keys(creer.mock.calls[0][0] as object)).not.toContain('fichierPiece');
  });

  it('envoie la copie de la pièce jointe au propriétaire créé', () => {
    const fichier = new File(['%PDF'], 'cni.pdf', { type: 'application/pdf' });
    const api = { enregistrerPiece: vi.fn(() => of(null)) };
    let obtenu: ProprietaireSummary | undefined;
    creerProprietaireAvecPiece(() => of(cree), api as never, resultat(fichier), { error: vi.fn() } as never).subscribe((p) => (obtenu = p));
    expect(api.enregistrerPiece).toHaveBeenCalledWith('p1', fichier, false);
    expect(obtenu).toEqual(cree);
  });

  it('garde la fiche créée si la pièce ne part pas, et prévient', () => {
    const api = { enregistrerPiece: vi.fn(() => throwError(() => new Error('réseau'))) };
    const notify = { error: vi.fn() };
    let obtenu: ProprietaireSummary | undefined;
    creerProprietaireAvecPiece(() => of(cree), api as never, resultat(new File(['x'], 'x.pdf')), notify as never).subscribe((p) => (obtenu = p));
    expect(obtenu).toEqual(cree);
    expect(notify.error).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('copie de la pièce'));
  });
});
