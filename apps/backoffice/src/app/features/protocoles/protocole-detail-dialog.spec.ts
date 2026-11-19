import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ProtocoleDetailDialog } from './protocole-detail-dialog';
import {
  ProtocolesApiService,
  type OptionsProtocoles,
  type ProtocoleDetail,
} from '../../core/services/api/protocoles-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

const OPTIONS: OptionsProtocoles = {
  statuts: [
    { valeur: 'a_preparer', libelle: 'À préparer' },
    { valeur: 'prepare_a_verifier', libelle: 'Préparé – à vérifier' },
    { valeur: 'envoye', libelle: 'Envoyé au client' },
    { valeur: 'en_attente_signature', libelle: 'En attente de signature' },
    { valeur: 'signe_client', libelle: 'Signé par le client' },
    { valeur: 'signe_mtm', libelle: 'Signé par MTM' },
    { valeur: 'a_valider_direction', libelle: 'À valider par la Direction' },
    { valeur: 'valide', libelle: 'Validé / clôturé' },
    { valeur: 'a_corriger', libelle: 'À corriger' },
    { valeur: 'annule', libelle: 'Annulé' },
  ],
  types: ['protocole_accord'],
  moyensEnvoi: ['email', 'whatsapp'],
  transitions: {
    a_preparer: ['prepare_a_verifier', 'annule'],
    prepare_a_verifier: ['envoye', 'a_preparer', 'a_corriger', 'annule'],
    envoye: ['en_attente_signature', 'signe_client', 'a_corriger', 'annule'],
    en_attente_signature: ['signe_client', 'a_corriger', 'annule'],
    signe_client: ['signe_mtm', 'a_valider_direction', 'a_corriger'],
    signe_mtm: ['a_valider_direction', 'a_corriger'],
    a_valider_direction: ['valide', 'a_corriger'],
    valide: [],
    a_corriger: ['a_preparer', 'annule'],
    annule: [],
  },
};

function detail(surcharge: Partial<ProtocoleDetail> = {}): ProtocoleDetail {
  return {
    id: 'p-1',
    type: 'protocole_accord',
    titre: null,
    statut: 'envoye',
    libelleStatut: 'Envoyé au client',
    dateEnvoi: '2026-11-10',
    moyenEnvoi: 'email',
    dateReceptionSignee: null,
    dateSignatureMtm: null,
    motif: null,
    enRetard: false,
    creeLe: '2026-11-01',
    modifieLe: '2026-11-10',
    documentPrepare: { id: 'd1', titre: 'Protocole', type: 'protocole', version: 1, ajouteLe: '2026-11-02', url: 'https://x.test/d1' },
    documentSigne: null,
    dossier: {
      id: 'dv-1',
      reference: 'VTE-0001',
      statut: 'reserve',
      client: 'Awa Diop',
      telephone: null,
      bien: 'Terrain Saly',
      responsable: null,
      montantConvenu: 10_000_000,
      montantEncaisse: 2_000_000,
      soldeRestant: 8_000_000,
      paiementsEnregistres: 1,
    },
    historique: [{ id: 'h1', de: null, vers: 'a_preparer', libelle: 'À préparer', note: 'Protocole créé', par: 'Marie', le: '2026-11-01T09:00:00Z' }],
    ...surcharge,
  };
}

/** Les membres internes du composant que les tests lisent ou pilotent. */
interface Interne {
  form: { controls: { statut: { setValue(valeur: string): void }; motif: { setValue(valeur: string): void } } };
  suivants(): { valeur: string }[];
  blocage(): string | null;
  valider(): void;
}

function monter(protocole: ProtocoleDetail, permissions: string[]) {
  const api = {
    options: vi.fn().mockReturnValue(of(OPTIONS)),
    detail: vi.fn().mockReturnValue(of(protocole)),
    changerStatut: vi.fn().mockReturnValue(of(protocole)),
    deposerDocument: vi.fn().mockReturnValue(of(protocole)),
  };
  TestBed.configureTestingModule({
    imports: [ProtocoleDetailDialog],
    providers: [
      provideNoopAnimations(),
      { provide: ProtocolesApiService, useValue: api },
      { provide: SessionService, useValue: { hasPermission: (nom: string) => permissions.includes(nom) } },
      { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn().mockReturnValue('erreur') } },
      { provide: MAT_DIALOG_DATA, useValue: { id: 'p-1' } },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(ProtocoleDetailDialog);
  fixture.detectChanges();
  return { fixture, api, instance: fixture.componentInstance as unknown as Interne };
}

describe('ProtocoleDetailDialog', () => {
  it('affiche le dossier, le statut et l’historique', () => {
    const { fixture } = monter(detail(), ['protocoles:consulter', 'protocoles:modifier']);
    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('VTE-0001');
    expect(texte).toContain('Awa Diop');
    expect(texte).toContain('Envoyé au client');
    expect(texte).toContain('Protocole créé');
  });

  it('avertit qu’un paiement ne remplace pas la signature quand le protocole n’est pas signé', () => {
    const { fixture } = monter(detail(), ['protocoles:consulter']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('un paiement ne remplace pas la signature');
  });

  it('ne propose que les étapes permises depuis « envoyé »', () => {
    const { instance } = monter(detail(), ['protocoles:consulter', 'protocoles:modifier']);
    const valeurs = (instance.suivants()).map((statut) => statut.valeur);
    expect(valeurs).toEqual(['en_attente_signature', 'signe_client', 'a_corriger', 'annule']);
  });

  it('« signé par le client » reste bloqué tant que la copie signée n’est pas déposée', () => {
    const { fixture, instance } = monter(detail(), ['protocoles:consulter', 'protocoles:modifier']);
    instance.form.controls.statut.setValue('signe_client');
    fixture.detectChanges();
    expect(instance.blocage()).toMatch(/copie signée/);
    const bouton = fixture.debugElement.queryAll(By.css('button')).find((b) => (b.nativeElement as HTMLElement).textContent?.includes('Enregistrer'));
    expect((bouton?.nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('« signé par le client » devient possible avec la copie signée et sa date', () => {
    const { fixture, instance } = monter(
      detail({ documentSigne: { id: 'd2', titre: 'Signé', type: 'protocole_signe', version: 1, ajouteLe: '2026-11-12', url: 'https://x.test/d2' } }),
      ['protocoles:consulter', 'protocoles:modifier'],
    );
    instance.form.controls.statut.setValue('signe_client');
    fixture.detectChanges();
    expect(instance.blocage()).toBeNull();
  });

  it('exige un motif pour une correction ou une annulation', () => {
    const { instance } = monter(detail(), ['protocoles:consulter', 'protocoles:modifier']);
    instance.form.controls.statut.setValue('a_corriger');
    expect(instance.blocage()).toMatch(/motif/);
    instance.form.controls.motif.setValue('Date erronée');
    expect(instance.blocage()).toBeNull();
  });

  it('« validé » n’est proposé qu’à la Direction', () => {
    const aValider = detail({ statut: 'a_valider_direction', libelleStatut: 'À valider par la Direction' });
    const secretaire = monter(aValider, ['protocoles:consulter', 'protocoles:modifier']);
    expect((secretaire.instance.suivants()).map((s) => s.valeur)).toEqual(['a_corriger']);
    TestBed.resetTestingModule();
    const direction = monter(aValider, ['protocoles:consulter', 'protocoles:modifier', 'protocoles:valider']);
    expect((direction.instance.suivants()).map((s) => s.valeur)).toEqual(['valide', 'a_corriger']);
  });

  it('en lecture seule (sans « modifier »), aucune action n’est proposée', () => {
    const { fixture } = monter(detail(), ['protocoles:consulter']);
    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).not.toContain('Passer à l’étape suivante');
    expect(fixture.debugElement.queryAll(By.css('input[type=file]')).length).toBe(0);
  });

  it('enregistre le changement et envoie les champs de l’étape', () => {
    const { fixture, api, instance } = monter(detail(), ['protocoles:consulter', 'protocoles:modifier']);
    instance.form.controls.statut.setValue('en_attente_signature');
    fixture.detectChanges();
    instance.valider();
    expect(api.changerStatut).toHaveBeenCalledWith('p-1', expect.objectContaining({ statut: 'en_attente_signature' }));
  });

  it('affiche une erreur claire quand le protocole ne se charge pas', () => {
    TestBed.resetTestingModule();
    const api = { options: vi.fn().mockReturnValue(of(OPTIONS)), detail: vi.fn().mockReturnValue(throwError(() => new Error('x'))) };
    TestBed.configureTestingModule({
      imports: [ProtocoleDetailDialog],
      providers: [
        provideNoopAnimations(),
        { provide: ProtocolesApiService, useValue: api },
        { provide: SessionService, useValue: { hasPermission: () => true } },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: { id: 'p-1' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ProtocoleDetailDialog);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ne se charge pas');
  });
});
