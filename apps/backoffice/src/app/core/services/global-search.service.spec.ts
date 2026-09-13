import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GlobalSearchService } from './global-search.service';
import { SessionService } from './session.service';
import { TerrainsApiService } from './api/terrains-api.service';
import { CrmApiService } from './api/crm-api.service';
import { MandatsApiService } from './api/mandats-api.service';
import { VentesApiService } from './api/ventes-api.service';

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;
  const permissions = new Set<string>();
  const terrainsApi = { findAll: vi.fn() };
  const crmApi = { findAll: vi.fn() };
  const mandatsApi = { findAll: vi.fn() };
  const ventesApi = { findAll: vi.fn() };

  beforeEach(() => {
    permissions.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GlobalSearchService,
        { provide: SessionService, useValue: { hasPermission: (p: string) => permissions.has(p) } },
        { provide: TerrainsApiService, useValue: terrainsApi },
        { provide: CrmApiService, useValue: crmApi },
        { provide: MandatsApiService, useValue: mandatsApi },
        { provide: VentesApiService, useValue: ventesApi },
      ],
    });
    service = TestBed.inject(GlobalSearchService);
  });

  it('ne cherche rien sous deux caractères', async () => {
    permissions.add('terrains:consulter');
    const results = await new Promise((resolve) => service.search('a').subscribe(resolve));
    expect(results).toEqual([]);
    expect(terrainsApi.findAll).not.toHaveBeenCalled();
  });

  it('n’interroge que les modules autorisés et ignore une source en erreur', async () => {
    permissions.add('terrains:consulter');
    permissions.add('ventes:consulter');
    terrainsApi.findAll.mockReturnValue(
      of({ items: [{ id: 't1', referenceInterne: 'T-1', nom: 'Lac Rose', commune: 'Bambilor', region: 'Dakar', statutCommercial: 'Disponible' }] }),
    );
    ventesApi.findAll.mockReturnValue(throwError(() => new Error('panne')));

    const results = await new Promise<{ kind: string; route: string[] }[]>((resolve) =>
      service.search('lac').subscribe(resolve),
    );

    expect(crmApi.findAll).not.toHaveBeenCalled();
    expect(mandatsApi.findAll).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: 'terrain', route: ['/terrains', 't1'] });
  });

  it('filtre les dossiers de vente côté client sur la référence et le prospect', async () => {
    permissions.add('ventes:consulter');
    ventesApi.findAll.mockReturnValue(
      of([
        { id: 'v1', referenceInterne: 'DV-1', statut: 'en_cours', prospect: { nom: 'Diop', prenom: 'Awa' }, terrain: null },
        { id: 'v2', referenceInterne: 'DV-2', statut: 'en_cours', prospect: { nom: 'Ndiaye', prenom: null }, terrain: null },
      ]),
    );

    const results = await new Promise<{ id: string }[]>((resolve) => service.search('diop').subscribe(resolve));

    expect(results.map((r) => r.id)).toEqual(['v1']);
  });
});
