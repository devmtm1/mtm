import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationsFeedService } from './notifications-feed.service';
import { SessionService } from './session.service';
import { MandatsApiService } from './api/mandats-api.service';
import { CrmApiService } from './api/crm-api.service';
import { ContactApiService } from './api/contact-api.service';
import { VentesApiService } from './api/ventes-api.service';

describe('NotificationsFeedService', () => {
  const permissions = new Set<string>();
  const mandatsApi = { getExpirants: vi.fn() };
  const crmApi = { getUpcomingTasks: vi.fn() };
  const contactApi = { findAll: vi.fn() };
  const ventesApi = { findReservationRequests: vi.fn() };
  let service: NotificationsFeedService;

  beforeEach(() => {
    permissions.clear();
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        NotificationsFeedService,
        { provide: SessionService, useValue: { hasPermission: (p: string) => permissions.has(p) } },
        { provide: MandatsApiService, useValue: mandatsApi },
        { provide: CrmApiService, useValue: crmApi },
        { provide: ContactApiService, useValue: contactApi },
        { provide: VentesApiService, useValue: ventesApi },
      ],
    });
    service = TestBed.inject(NotificationsFeedService);
  });

  it('renvoie un fil vide sans permission', async () => {
    const items = await new Promise((resolve) => service.load().subscribe(resolve));
    expect(items).toEqual([]);
    expect(mandatsApi.getExpirants).not.toHaveBeenCalled();
  });

  it('signale un mandat expirant sous 7 jours en rouge et une tâche en retard', async () => {
    permissions.add('mandats:consulter');
    permissions.add('crm:consulter');
    const inFiveDays = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    mandatsApi.getExpirants.mockReturnValue(
      of([{ id: 'm1', referenceInterne: 'MDT-1', dateFin: inFiveDays, proprietaire: { lastName: 'Sow', firstName: 'Ali' } }]),
    );
    crmApi.getUpcomingTasks.mockReturnValue(
      of([
        { id: 'a1', titre: 'Relancer', dateEcheance: yesterday, prospect: { id: 'p1', nom: 'Diop', prenom: null } },
        { id: 'a2', titre: 'Plus tard', dateEcheance: new Date(Date.now() + 10 * 86_400_000).toISOString(), prospect: { id: 'p2', nom: 'Fall', prenom: null } },
      ]),
    );

    const items = await new Promise<{ id: string; severity: string; route: string[] }[]>((resolve) =>
      service.load().subscribe(resolve),
    );

    expect(items.map((item) => item.id)).toEqual(['mandat-m1', 'task-a1']);
    expect(items[0]).toMatchObject({ severity: 'danger', route: ['/mandats', 'm1'] });
    expect(items[1]).toMatchObject({ severity: 'danger', route: ['/crm/prospects', 'p1'] });
  });
});
