import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service';
import type { MailService } from '../../common/mail/mail.service';
import { CanalExterneService, masquer } from './canal-externe.service';
import { NotificationsService } from './notifications.service';

function creer(
  regles: Record<string, unknown> | null,
  utilisateur: Record<string, unknown> = {},
) {
  const prisma = {
    notification: {
      create: jest.fn().mockResolvedValue({
        id: 'n1',
        user: {
          email: 'a@mtm.sn',
          telephone: '+221771234567',
          notificationsEmail: true,
          notificationsSms: true,
          notificationsWhatsapp: false,
          ...utilisateur,
        },
      }),
    },
    systemSetting: {
      findUnique: jest
        .fn()
        .mockResolvedValue(regles ? { value: regles } : null),
    },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u9' }]) },
  };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue('https://admin.mtm.test') };
  const canaux = {
    estConfigure: jest.fn().mockReturnValue(true),
    envoyer: jest.fn().mockResolvedValue(true),
  };
  const service = new NotificationsService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
    canaux as unknown as CanalExterneService,
  );
  return { service, prisma, mail, canaux };
}

const input = {
  type: 'tache_en_retard',
  titre: 'Tâche en retard',
  email: true,
};

describe('règles de notification', () => {
  it('une règle désactivée empêche toute création', async () => {
    const { service, prisma } = creer({ tache_en_retard: { actif: false } });
    expect(await service.notifier(['u1'], input)).toBe(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('la règle commande l’e-mail, quoi qu’ait demandé l’appelant', async () => {
    const coupe = creer({ tache_en_retard: { email: false } });
    await coupe.service.notifier(['u1'], input);
    expect(coupe.mail.send).not.toHaveBeenCalled();

    const force = creer({ tache_en_retard: { email: true } });
    await force.service.notifier(['u1'], { ...input, email: false });
    expect(force.mail.send).toHaveBeenCalledTimes(1);
  });

  it('sans règle, le comportement d’origine est conservé', async () => {
    const { service, mail } = creer(null);
    expect(await service.notifier(['u1'], input)).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('chacun peut couper l’e-mail pour lui-même', async () => {
    const { service, mail } = creer(null, { notificationsEmail: false });
    await service.notifier(['u1'], input);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('SMS : seulement si la règle le veut, l’utilisateur l’a demandé et la passerelle existe', async () => {
    const voulu = creer({ tache_en_retard: { sms: true } });
    await voulu.service.notifier(['u1'], input);
    expect(voulu.canaux.envoyer).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'sms', destinataire: '+221771234567' }),
    );

    const pasDemande = creer(
      { tache_en_retard: { sms: true } },
      { notificationsSms: false },
    );
    await pasDemande.service.notifier(['u1'], input);
    expect(pasDemande.canaux.envoyer).not.toHaveBeenCalled();

    const sansRegle = creer(null);
    await sansRegle.service.notifier(['u1'], input);
    expect(sansRegle.canaux.envoyer).not.toHaveBeenCalled();

    const sansNumero = creer(
      { tache_en_retard: { sms: true } },
      { telephone: null },
    );
    await sansNumero.service.notifier(['u1'], input);
    expect(sansNumero.canaux.envoyer).not.toHaveBeenCalled();
  });

  it('la règle remplace la permission des destinataires', async () => {
    const { service, prisma } = creer({
      nouveau_prospect: { permission: 'crm:modifier' },
    });
    await service.notifierPermission('crm:administrer', {
      type: 'nouveau_prospect',
      titre: 'Nouveau prospect',
    });
    expect(JSON.stringify(prisma.user.findMany.mock.calls[0][0])).toContain(
      'crm:modifier',
    );
    expect(JSON.stringify(prisma.user.findMany.mock.calls[0][0])).not.toContain(
      'crm:administrer',
    );
  });

  it('une lecture de règles impossible ne bloque aucune notification', async () => {
    const { service, prisma } = creer(null);
    prisma.systemSetting.findUnique.mockRejectedValue(
      new Error('base absente'),
    );
    expect(await service.notifier(['u1'], input)).toBe(1);
  });

  it('alerter ne lève jamais, même si la base échoue', async () => {
    const { service, prisma } = creer(null);
    prisma.user.findMany.mockRejectedValue(new Error('panne'));
    await expect(
      service.alerter('crm:administrer', { type: 'x', titre: 'y' }),
    ).resolves.toBe(0);
  });
});

describe('CanalExterneService', () => {
  function canal(env: Record<string, string>) {
    const prisma = { envoiCanal: { create: jest.fn().mockResolvedValue({}) } };
    const config = { get: (cle: string) => env[cle] };
    return {
      service: new CanalExterneService(
        config as unknown as ConfigService,
        prisma as unknown as PrismaService,
      ),
      prisma,
    };
  }

  afterEach(() => jest.restoreAllMocks());

  it('est inactif tant qu’aucune passerelle n’est renseignée', async () => {
    const { service, prisma } = canal({});
    expect(service.etat()).toEqual({ sms: false, whatsapp: false });
    expect(
      await service.envoyer({
        canal: 'sms',
        destinataire: '+221771234567',
        texte: 'x',
      }),
    ).toBe(false);
    expect(prisma.envoiCanal.create).not.toHaveBeenCalled();
  });

  it('poste le message à la passerelle et consigne l’envoi avec un numéro masqué', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const { service, prisma } = canal({
      SMS_WEBHOOK_URL: 'https://passerelle.test/sms',
      SMS_WEBHOOK_TOKEN: 'jeton',
    });
    const ok = await service.envoyer({
      canal: 'sms',
      destinataire: '+221 77 123 45 67',
      texte: 'Bonjour',
      notificationId: 'n1',
    });
    expect(ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://passerelle.test/sms');
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer jeton',
    });
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({
      canal: 'sms',
      to: '+221 77 123 45 67',
      text: 'Bonjour',
    });
    expect(prisma.envoiCanal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        statut: 'envoye',
        destinataire: '+22177••••67',
      }),
    });
  });

  it('consigne l’échec sans lever d’erreur', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('no', { status: 502 }));
    const { service, prisma } = canal({
      WHATSAPP_WEBHOOK_URL: 'https://p.test/wa',
    });
    expect(
      await service.envoyer({
        canal: 'whatsapp',
        destinataire: '+221771234567',
        texte: 'x',
      }),
    ).toBe(false);
    expect(prisma.envoiCanal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        statut: 'echec',
        erreur: expect.stringContaining('502'),
      }),
    });

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('réseau coupé'));
    expect(
      await service.envoyer({
        canal: 'whatsapp',
        destinataire: '+221771234567',
        texte: 'x',
      }),
    ).toBe(false);
  });

  it('masque un numéro', () => {
    expect(masquer('+221 77 123 45 67')).toBe('+22177••••67');
    expect(masquer('123')).toBe('••••');
  });
});
