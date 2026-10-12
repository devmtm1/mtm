import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { describeE2e } from './helpers/e2e-database';
import { MailService } from '../src/common/mail/mail.service';
import { EnvoiAutomatiqueService } from '../src/modules/pilotage/envoi-automatique.service';

/** J3.2 — envoi automatique des rapports à la direction. */
describeE2e('Pilotage : envoi automatique des rapports (e2e)', () => {
  let context: E2eContext;
  let service: EnvoiAutomatiqueService;
  let envoi: jest.SpyInstance;

  // Un lundi, et un premier du mois.
  const lundi = new Date('2026-10-12T07:00:00.000Z');
  const mardi = new Date('2026-10-13T07:00:00.000Z');
  const premier = new Date('2026-11-01T07:00:00.000Z');

  const config = (surcharge: Record<string, unknown> = {}) => ({
    actif: true,
    frequence: 'hebdomadaire',
    rapports: ['rentabilite_activite', 'ventes_periode'],
    formats: ['pdf', 'xlsx'],
    destinataires: ['direction@mtm.test', 'DG@mtm.test'],
    ...surcharge,
  });

  const regler = (valeur: unknown) =>
    context.prisma.systemSetting.upsert({
      where: { key: 'pilotage.envoiAutomatique' },
      update: { value: valeur as object },
      create: {
        key: 'pilotage.envoiAutomatique',
        value: valeur as object,
        isSensitive: false,
      },
    });

  beforeAll(async () => {
    context = await createE2eApp();
    service = context.app.get(EnvoiAutomatiqueService);
    envoi = jest.spyOn(context.app.get(MailService), 'send');
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    envoi.mockReset().mockResolvedValue(true);
    await context.prisma.auditLog.deleteMany({
      where: { action: 'rapport.envoi_auto' },
    });
  });

  it('n’envoie rien tant que le réglage est absent ou inactif', async () => {
    await context.prisma.systemSetting.deleteMany({
      where: { key: 'pilotage.envoiAutomatique' },
    });
    expect((await service.executer(lundi)).raison).toBe('inactif');
    await regler(config({ actif: false }));
    expect((await service.executer(lundi)).raison).toBe('inactif');
    expect(envoi).not.toHaveBeenCalled();
  });

  it('un réglage abîmé désactive l’envoi au lieu de le fausser', async () => {
    await regler({ actif: true, destinataires: 'pas une liste' });
    expect((await service.executer(lundi)).raison).toBe('inactif');
    expect(envoi).not.toHaveBeenCalled();
  });

  it('n’envoie que le jour prévu', async () => {
    await regler(config());
    expect((await service.executer(mardi)).raison).toBe('hors_jour');
    await regler(config({ frequence: 'mensuelle' }));
    expect((await service.executer(lundi)).raison).toBe('hors_jour');
    expect(envoi).not.toHaveBeenCalled();
  });

  it('joint les rapports PDF et Excel de la semaine écoulée à chaque destinataire', async () => {
    await regler(config());
    const bilan = await service.executer(lundi);
    expect(bilan).toMatchObject({
      envoye: true,
      rapports: 2,
      destinataires: 2,
    });
    expect(envoi).toHaveBeenCalledTimes(2);
    const message = envoi.mock.calls[0][0] as {
      to: string;
      subject: string;
      attachments: { filename: string; content: Buffer; contentType: string }[];
    };
    expect(message.to).toBe('direction@mtm.test');
    expect(envoi.mock.calls[1][0].to).toBe('dg@mtm.test');
    expect(message.subject).toContain('2026-10-05 au 2026-10-11');
    expect(message.attachments).toHaveLength(4);
    const pdf = message.attachments.find((p) => p.filename.endsWith('.pdf'));
    expect(pdf?.content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf?.filename).toContain('_2026-10-05_2026-10-11');
    const xlsx = message.attachments.find((p) => p.filename.endsWith('.xlsx'));
    expect(xlsx?.content.subarray(0, 2).toString()).toBe('PK');
  });

  it('ne renvoie pas deux fois la même période', async () => {
    await regler(config({ formats: ['pdf'] }));
    expect((await service.executer(lundi)).envoye).toBe(true);
    const second = await service.executer(lundi);
    expect(second).toMatchObject({ envoye: false, raison: 'deja_envoye' });
    expect(envoi).toHaveBeenCalledTimes(2);
    const traces = await context.prisma.auditLog.count({
      where: { action: 'rapport.envoi_auto' },
    });
    expect(traces).toBe(1);
  });

  it('envoie le mois précédent le premier du mois', async () => {
    await regler(config({ frequence: 'mensuelle', formats: ['pdf'] }));
    expect((await service.executer(premier)).envoye).toBe(true);
    expect(envoi.mock.calls[0][0].subject).toContain(
      '2026-10-01 au 2026-10-31',
    );
  });

  it('si aucun e-mail ne part, rien n’est consigné et on réessaiera', async () => {
    await regler(config({ formats: ['pdf'] }));
    envoi.mockResolvedValue(false);
    expect((await service.executer(lundi)).raison).toBe('mail_indisponible');
    envoi.mockResolvedValue(true);
    expect((await service.executer(lundi)).envoye).toBe(true);
  });
});
