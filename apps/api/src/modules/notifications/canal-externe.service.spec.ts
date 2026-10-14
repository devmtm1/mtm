import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CanalExterneService, masquer } from './canal-externe.service';
import type {
  FournisseurMessagerie,
  MessageExterne,
} from './messagerie/fournisseur';

/**
 * Le service ne connaît aucun prestataire : on le prouve avec des fournisseurs
 * factices. Brancher ou changer un prestataire réel ne demande aucune
 * modification de ce service.
 */
describe('CanalExterneService', () => {
  let creer: jest.Mock;

  const faux = (
    nom: string,
    resultat: string | null | Error = null,
  ): FournisseurMessagerie & { recus: MessageExterne[] } => {
    const recus: MessageExterne[] = [];
    return {
      nom,
      recus,
      estConfigure: () => true,
      envoyer: (message) => {
        recus.push(message);
        return resultat instanceof Error
          ? Promise.reject(resultat)
          : Promise.resolve(resultat);
      },
    };
  };

  const service = (
    env: Record<string, string | undefined>,
    fournisseurs: FournisseurMessagerie[],
  ) =>
    new CanalExterneService(
      { get: (cle: string) => env[cle] } as unknown as ConfigService,
      { envoiCanal: { create: creer } } as unknown as PrismaService,
      fournisseurs,
    );

  const envoi = {
    canal: 'sms' as const,
    destinataire: '+221 77 123 45 67',
    texte: 'Bonjour',
    notificationId: 'n1',
  };

  beforeEach(() => {
    creer = jest.fn().mockResolvedValue({});
  });

  it('confie le message au fournisseur choisi et consigne son nom', async () => {
    const a = faux('alpha');
    expect(await service({}, [a]).envoyer(envoi)).toBe(true);
    expect(a.recus).toEqual([
      { canal: 'sms', destinataire: '+221 77 123 45 67', texte: 'Bonjour' },
    ]);
    expect(creer).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canal: 'sms',
        fournisseur: 'alpha',
        statut: 'envoye',
        destinataire: '+22177••••67',
        notificationId: 'n1',
      }),
    });
  });

  it('change de prestataire en changeant seulement la configuration', async () => {
    const a = faux('alpha');
    const b = faux('beta');
    await service({ SMS_PROVIDER: 'alpha' }, [a, b]).envoyer(envoi);
    await service({ SMS_PROVIDER: 'beta' }, [a, b]).envoyer(envoi);
    expect(a.recus).toHaveLength(1);
    expect(b.recus).toHaveLength(1);
    expect(creer.mock.calls.map((c) => c[0].data.fournisseur)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('reste inactif et n’envoie rien sans fournisseur', async () => {
    const a = faux('alpha');
    const s = service({ SMS_PROVIDER: 'none' }, [a]);
    expect(s.etat()).toEqual({ sms: false, whatsapp: true });
    expect(await s.envoyer(envoi)).toBe(false);
    expect(a.recus).toHaveLength(0);
    expect(creer).not.toHaveBeenCalled();
  });

  it('ne part jamais chez un autre fournisseur quand celui qu’on a désigné est inconnu', async () => {
    const a = faux('alpha');
    const s = service({ SMS_PROVIDER: 'inconnu' }, [a]);
    expect(s.fournisseur('sms')).toBeNull();
    expect(await s.envoyer(envoi)).toBe(false);
    expect(a.recus).toHaveLength(0);
  });

  it('expose le fournisseur de chaque canal', () => {
    const s = service({ WHATSAPP_PROVIDER: 'beta' }, [
      faux('alpha'),
      faux('beta'),
    ]);
    expect(s.fournisseur('sms')).toBe('alpha');
    expect(s.fournisseur('whatsapp')).toBe('beta');
  });

  it('consigne le refus du fournisseur sans jamais lever', async () => {
    expect(
      await service({}, [faux('alpha', 'Solde épuisé')]).envoyer(envoi),
    ).toBe(false);
    expect(creer).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fournisseur: 'alpha',
        statut: 'echec',
        erreur: 'Solde épuisé',
      }),
    });
  });

  it('traite une exception du fournisseur comme un refus', async () => {
    expect(
      await service({}, [faux('alpha', new Error('timeout'))]).envoyer(envoi),
    ).toBe(false);
    expect(creer).toHaveBeenCalledWith({
      data: expect.objectContaining({ statut: 'echec', erreur: 'timeout' }),
    });
  });

  it('masque le numéro dans le journal', () => {
    expect(masquer('+221771234567')).toBe('+22177••••67');
    expect(masquer('1234')).toBe('••••');
  });
});
