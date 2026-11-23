import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProtocoleNouveauDialog } from './protocole-nouveau-dialog';
import { ProtocolesApiService } from '../../core/services/api/protocoles-api.service';
import { VentesApiService } from '../../core/services/api/ventes-api.service';
import { NotificationService } from '../../shared/services/notification.service';

describe('ProtocoleNouveauDialog', () => {
  const creer = vi.fn(() => of({ id: 'p-9' }));
  const dossiersPossibles = vi.fn(() =>
    of([{ id: 'b-1', libelle: 'B-1 — Moussa Ndiaye · Almadies' }]),
  );
  const close = vi.fn();

  function ouvrir() {
    TestBed.configureTestingModule({
      imports: [ProtocoleNouveauDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { dossierVenteId: null } },
        { provide: MatDialogRef, useValue: { close } },
        { provide: ProtocolesApiService, useValue: { creer, dossiersPossibles } },
        {
          provide: VentesApiService,
          useValue: {
            findAll: () =>
              of([
                {
                  id: 'v-1',
                  referenceInterne: 'VTE-1',
                  statut: 'reserve',
                  prospect: { prenom: 'Awa', nom: 'Diop' },
                  terrain: null,
                },
              ]),
          },
        },
        { provide: NotificationService, useValue: { error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ProtocoleNouveauDialog);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => vi.clearAllMocks());

  it('crée un protocole de vente par défaut', () => {
    const fixture = ouvrir();
    const composant = fixture.componentInstance as unknown as {
      form: { patchValue: (v: object) => void };
      creer: () => void;
    };
    composant.form.patchValue({ dossierId: 'v-1' });
    composant.creer();
    expect(creer).toHaveBeenCalledWith(expect.objectContaining({ dossierVenteId: 'v-1' }));
    expect(close).toHaveBeenCalledWith('p-9');
  });

  it('rattache le protocole à un bail choisi, sans envoyer de dossier de vente', () => {
    const fixture = ouvrir();
    const composant = fixture.componentInstance as unknown as {
      form: { patchValue: (v: object) => void };
      creer: () => void;
    };
    composant.form.patchValue({ typeDossier: 'bail' });
    expect(dossiersPossibles).toHaveBeenCalledWith('bail');
    composant.form.patchValue({ dossierId: 'b-1' });
    composant.creer();
    const envoye = (creer.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(envoye['bailLocatifId']).toBe('b-1');
    expect(envoye['dossierVenteId']).toBeUndefined();
  });

  it('refuse de créer sans dossier choisi', () => {
    const fixture = ouvrir();
    (fixture.componentInstance as unknown as { creer: () => void }).creer();
    expect(creer).not.toHaveBeenCalled();
  });
});
