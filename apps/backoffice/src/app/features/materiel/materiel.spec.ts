import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MaterielFichePage } from './materiel-fiche';
import { MaterielNouveauPage } from './materiel-nouveau';
import { InventaireMaterielPage } from './inventaire';
import {
  MaterielApiService,
  type MaterielDetail,
  type OptionsMateriel,
  type RapportInventaire,
} from '../../core/services/api/materiel-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

const OPTIONS: OptionsMateriel = {
  categories: ['Mobilier', 'Informatique'],
  lieux: ['Accueil', 'Direction'],
  etats: [
    { valeur: 'neuf', libelle: 'Neuf' },
    { valeur: 'bon', libelle: 'Bon état' },
    { valeur: 'usage', libelle: 'Usé' },
    { valeur: 'en_panne', libelle: 'En panne' },
  ],
  statuts: [
    { valeur: 'disponible', libelle: 'Disponible' },
    { valeur: 'affecte', libelle: 'Confié' },
    { valeur: 'en_maintenance', libelle: 'En maintenance' },
    { valeur: 'sorti', libelle: 'Sorti du parc' },
  ],
  typesSortie: [{ valeur: 'reforme', libelle: 'Réformé' }],
  typesEntretien: ['preventif', 'reparation', 'controle'],
  prochainNumero: 5,
};

function fiche(surcharge: Partial<MaterielDetail> = {}): MaterielDetail {
  return {
    id: 'm-1',
    numero: 3,
    reference: 'MTM 0003',
    designation: 'Table de réunion',
    categorie: 'Mobilier',
    marque: null,
    modele: null,
    numeroSerie: null,
    dateAchat: null,
    prixAchat: null,
    fournisseur: null,
    garantieJusqua: null,
    garantieActive: false,
    etat: 'bon',
    libelleEtat: 'Bon état',
    statut: 'disponible',
    libelleStatut: 'Disponible',
    lieu: 'Accueil',
    affectation: null,
    affecteLe: null,
    prochainEntretien: null,
    entretienEnRetard: false,
    notes: null,
    sortie: null,
    creeLe: '2026-11-01T00:00:00Z',
    modifieLe: '2026-11-01T00:00:00Z',
    historique: [
      {
        id: 'h1',
        type: 'creation',
        resume: 'Ajouté au parc sous le numéro MTM 0003',
        note: null,
        par: 'Awa Diop',
        le: '2026-11-01T00:00:00Z',
      },
    ],
    entretiens: [],
    fichiers: [],
    ...surcharge,
  };
}

describe('Fiche d’un matériel (page)', () => {
  function monter(materiel: MaterielDetail, permissions: string[]) {
    const api = {
      options: vi.fn().mockReturnValue(of(OPTIONS)),
      detail: vi.fn().mockReturnValue(of(materiel)),
      destinataires: vi
        .fn()
        .mockReturnValue(of({ collaborateurs: [{ id: 'u1', nom: 'Awa Diop' }], chantiers: [] })),
      affecter: vi.fn().mockReturnValue(of({ ...materiel, statut: 'affecte' })),
    };
    TestBed.configureTestingModule({
      imports: [MaterielFichePage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'm-1' } } } },
        { provide: MaterielApiService, useValue: api },
        {
          provide: SessionService,
          useValue: { hasPermission: (nom: string) => permissions.includes(nom) },
        },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(MaterielFichePage);
    fixture.detectChanges();
    return { fixture, api, page: fixture.nativeElement as HTMLElement };
  }
  const texteBoutons = (page: HTMLElement) =>
    Array.from(page.querySelectorAll('button, a.mat-mdc-button-base')).map((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const gestes = (page: HTMLElement) =>
    Array.from(page.querySelectorAll('.detail-header__actions button')).map((b) =>
      b.textContent?.trim(),
    );

  it('est une page, avec le numéro de l’autocollant en titre et le retour au parc', () => {
    const { page } = monter(fiche(), ['materiel:consulter']);
    expect(page.querySelector('.detail-page')).not.toBeNull();
    expect(page.querySelector('h1')?.textContent).toContain('MTM 0003');
    expect(page.querySelector('h1')?.textContent).toContain('Table de réunion');
    expect(page.querySelector('.eyebrow')?.textContent).toContain('Fiche du matériel');
    expect(page.querySelector('a.back-link')?.getAttribute('href')).toBe('/materiel');
  });

  it('montre les informations et l’historique', () => {
    const { page } = monter(fiche(), ['materiel:consulter']);
    expect(page.textContent).toContain('Mobilier');
    expect(page.textContent).toContain('Ajouté au parc sous le numéro MTM 0003');
  });

  it('n’offre aucune action à qui ne peut que consulter', () => {
    const { page } = monter(fiche(), ['materiel:consulter']);
    expect(page.querySelector('.detail-header__actions')).toBeNull();
    expect(page.querySelector('[aria-label="Entretiens"] button')).toBeNull();
  });

  it('met en avant une seule action principale : confier un objet disponible', () => {
    const { page } = monter(fiche(), ['materiel:consulter', 'materiel:modifier']);
    expect(page.querySelector('.detail-note')?.textContent).toContain('Disponible');
    expect(gestes(page)).toEqual(['Confier à…', 'Modifier']);
    expect(page.querySelectorAll('.detail-header__actions .mat-mdc-unelevated-button').length).toBe(
      1,
    );
    expect(texteBoutons(page)).toContain('Ajouter');
  });

  it('ne propose la sortie du parc qu’à la Direction', () => {
    const sans = monter(fiche(), ['materiel:consulter', 'materiel:modifier']);
    expect(gestes(sans.page)).not.toContain('Sortir du parc');
    TestBed.resetTestingModule();
    const avec = monter(fiche(), ['materiel:consulter', 'materiel:modifier', 'materiel:valider']);
    expect(gestes(avec.page)).toContain('Sortir du parc');
  });

  it('propose le retour pour un objet confié, rien pour un objet en maintenance, et plus rien une fois sorti du parc', () => {
    const confie = monter(
      fiche({
        statut: 'affecte',
        libelleStatut: 'Confié',
        affectation: { type: 'libre', id: null, libelle: 'Prestataire Sow' },
      }),
      ['materiel:modifier'],
    );
    expect(confie.page.querySelector('.detail-note')?.textContent).toContain(
      'Confié à Prestataire Sow',
    );
    expect(gestes(confie.page)).toEqual(['Enregistrer le retour', 'Transférer', 'Modifier']);
    TestBed.resetTestingModule();
    const maintenance = monter(
      fiche({ statut: 'en_maintenance', libelleStatut: 'En maintenance' }),
      ['materiel:modifier'],
    );
    expect(gestes(maintenance.page)).toEqual(['Modifier']);
    expect(maintenance.page.querySelector('.detail-note')?.textContent).toContain(
      'Terminez l’entretien',
    );
    TestBed.resetTestingModule();
    const sorti = monter(
      fiche({
        statut: 'sorti',
        libelleStatut: 'Sorti du parc',
        sortie: {
          type: 'reforme',
          libelle: 'Réformé',
          motif: 'Hors d’usage',
          le: '2026-11-20T00:00:00Z',
        },
      }),
      ['materiel:modifier', 'materiel:valider'],
    );
    expect(sorti.page.querySelector('.detail-header__actions')).toBeNull();
    expect(sorti.page.textContent).toContain('Hors d’usage');
  });

  it('ne mélange plus un prix sans date d’achat', () => {
    const { page } = monter(fiche({ prixAchat: 18_500_000, dateAchat: null }), [
      'materiel:modifier',
    ]);
    expect(page.textContent).not.toContain('— ·');
  });

  it('confie l’objet à un collaborateur choisi', () => {
    const { fixture, api } = monter(fiche(), ['materiel:modifier']);
    const interne = fixture.componentInstance as unknown as {
      ouvrir(a: string): void;
      formConfier: { patchValue(v: object): void };
      confier(): void;
    };
    interne.ouvrir('confier');
    interne.formConfier.patchValue({ cible: 'collaborateur', userId: 'u1' });
    interne.confier();
    expect(api.affecter).toHaveBeenCalledWith('m-1', expect.objectContaining({ userId: 'u1' }));
  });
});

describe('Nouveau matériel', () => {
  function ouvrir() {
    const api = {
      options: vi.fn().mockReturnValue(of(OPTIONS)),
      creer: vi.fn().mockReturnValue(of(fiche())),
    };
    TestBed.configureTestingModule({
      imports: [MaterielNouveauPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MaterielApiService, useValue: api },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(MaterielNouveauPage);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    const interne = fixture.componentInstance as unknown as {
      form: { patchValue(v: object): void; invalid: boolean };
      creer(): void;
    };
    return { fixture, api, navigate, interne };
  }

  it('annonce le prochain numéro à écrire sur l’autocollant', () => {
    const { fixture } = ouvrir();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('MTM 0005');
  });

  it('refuse de créer sans désignation ni catégorie', () => {
    const { api, interne } = ouvrir();
    interne.creer();
    expect(api.creer).not.toHaveBeenCalled();
  });

  it('laisse le numéro vide pour l’attribution automatique', () => {
    const { api, navigate, interne } = ouvrir();
    interne.form.patchValue({ designation: 'Chaise', categorie: 'Mobilier' });
    interne.creer();
    expect(
      (api.creer.mock.calls[0] as unknown as [Record<string, unknown>])[0]['numero'],
    ).toBeUndefined();
    // L'ajout ouvre la fiche de l'objet, sur sa page.
    expect(navigate).toHaveBeenCalledWith(['/materiel', 'm-1']);
  });

  it('envoie le numéro de l’autocollant déjà collé', () => {
    const { api, interne } = ouvrir();
    interne.form.patchValue({ designation: 'Table', categorie: 'Mobilier', numero: 3 });
    interne.creer();
    expect((api.creer.mock.calls[0] as unknown as [Record<string, unknown>])[0]['numero']).toBe(3);
  });
});

describe('Inventaire', () => {
  const rapport = (surcharge: Partial<RapportInventaire> = {}): RapportInventaire => ({
    id: 'i-1',
    lieu: 'Accueil',
    statut: 'en_cours',
    commenceLe: '2026-11-24T08:00:00Z',
    termineLe: null,
    aSaisir: 2,
    conformes: [{ id: 'm-1', numero: 3, reference: 'MTM 0003', designation: 'Table' }],
    deplaces: [],
    manquants: [
      {
        id: 'm-2',
        numero: 4,
        reference: 'MTM 0004',
        designation: 'Chaise',
        statut: 'disponible',
        explique: false,
      },
    ],
    inconnus: [{ numero: 9999, reference: 'MTM 9999' }],
    sortisRetrouves: [],
    ...surcharge,
  });

  function monter() {
    const api = {
      options: vi.fn().mockReturnValue(of(OPTIONS)),
      inventaires: vi.fn().mockReturnValue(of([])),
      ouvrirInventaire: vi.fn().mockReturnValue(of(rapport())),
      rapportInventaire: vi.fn().mockReturnValue(of(rapport())),
      saisirNumero: vi
        .fn()
        .mockReturnValue(
          of({ numero: 3, reference: 'MTM 0003', connu: true, designation: 'Table' }),
        ),
      terminerInventaire: vi.fn().mockReturnValue(of(rapport({ statut: 'termine' }))),
    };
    TestBed.configureTestingModule({
      imports: [InventaireMaterielPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MaterielApiService, useValue: api },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(InventaireMaterielPage);
    fixture.detectChanges();
    const interne = fixture.componentInstance as unknown as {
      formLieu: { patchValue(v: object): void };
      formNumero: { patchValue(v: object): void };
      commencer(): void;
      saisir(): void;
      terminer(): void;
    };
    return { fixture, api, interne, page: fixture.nativeElement as HTMLElement };
  }

  it('commence par le choix d’un lieu', () => {
    const { api, interne, page } = monter();
    expect(page.textContent).toContain('Choisissez le lieu à parcourir');
    interne.formLieu.patchValue({ lieu: 'Accueil' });
    interne.commencer();
    expect(api.ouvrirInventaire).toHaveBeenCalledWith('Accueil');
  });

  it('affiche ce qui est à sa place, ce qui manque et les numéros inconnus, et se met à jour à chaque saisie', () => {
    const { fixture, api, interne, page } = monter();
    interne.formLieu.patchValue({ lieu: 'Accueil' });
    interne.commencer();
    fixture.detectChanges();
    expect(page.querySelector('.resume')?.textContent).toContain('restent à trouver');
    expect(page.textContent).toContain('MTM 0004');
    expect(page.textContent).toContain('MTM 9999');
    interne.formNumero.patchValue({ numero: 'MTM 0003' });
    interne.saisir();
    fixture.detectChanges();
    expect(api.saisirNumero).toHaveBeenCalledWith('i-1', 'MTM 0003');
    expect(api.rapportInventaire).toHaveBeenCalledWith('i-1');
    expect(page.querySelector('.retour')?.textContent).toContain('MTM 0003 — Table');
  });

  it('ne parle de « manquants » qu’une fois l’inventaire terminé', () => {
    const { fixture, api, interne, page } = monter();
    interne.formLieu.patchValue({ lieu: 'Accueil' });
    interne.commencer();
    fixture.detectChanges();
    expect(page.querySelector('.resume')?.textContent).not.toContain('manquant');
    expect(page.textContent).toContain('Restent à trouver');
    interne.terminer();
    fixture.detectChanges();
    expect(api.terminerInventaire).toHaveBeenCalled();
    expect(page.querySelector('.resume')?.textContent).toContain('manquant');
  });

  it('range à leur lieu les objets trouvés ailleurs seulement s’il y en a', () => {
    const { fixture, api, interne } = monter();
    interne.formLieu.patchValue({ lieu: 'Accueil' });
    interne.commencer();
    fixture.detectChanges();
    interne.terminer();
    expect(api.terminerInventaire).toHaveBeenCalledWith('i-1', false);
  });
});
