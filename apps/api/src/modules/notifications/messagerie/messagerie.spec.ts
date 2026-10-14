import { ConfigService } from '@nestjs/config';
import { FournisseurBrevo, numeroBrevo } from './fournisseur-brevo';
import { FournisseurPasserelle } from './fournisseur-passerelle';
import type { FournisseurMessagerie } from './fournisseur';
import { choisirFournisseur } from './registre';

const config = (env: Record<string, string | number | undefined>) =>
  ({ get: (cle: string) => env[cle] }) as unknown as ConfigService;

const reponse = (status: number, corps: unknown = {}) =>
  Promise.resolve(new Response(JSON.stringify(corps), { status }));

describe('fournisseur Brevo', () => {
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  const BREVO = {
    BREVO_API_KEY: 'xkeysib-secret',
    BREVO_SMS_SENDER: 'MTM',
    BREVO_WHATSAPP_SENDER: '+221 77 000 00 00',
  };

  it('formate le numéro comme Brevo l’attend : chiffres seuls', () => {
    expect(numeroBrevo('+221 77 123 45 67')).toBe('221771234567');
  });

  it('exige la clé d’API ET l’expéditeur du canal', () => {
    expect(
      new FournisseurBrevo(config({ BREVO_API_KEY: 'k' })).estConfigure('sms'),
    ).toBe(false);
    const sms = new FournisseurBrevo(
      config({ BREVO_API_KEY: 'k', BREVO_SMS_SENDER: 'MTM' }),
    );
    expect(sms.estConfigure('sms')).toBe(true);
    expect(sms.estConfigure('whatsapp')).toBe(false);
  });

  it('envoie un SMS par l’API transactionnelle', async () => {
    fetchMock.mockReturnValue(reponse(201, { messageId: 1 }));
    const erreur = await new FournisseurBrevo(config(BREVO)).envoyer({
      canal: 'sms',
      destinataire: '+221 77 123 45 67',
      texte: 'Relance en retard : Fall',
    });
    expect(erreur).toBeNull();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/transactionalSMS/send');
    expect(options.headers).toMatchObject({ 'api-key': 'xkeysib-secret' });
    expect(JSON.parse(options.body as string)).toMatchObject({
      sender: 'MTM',
      recipient: '221771234567',
      type: 'transactional',
      unicodeEnabled: false,
    });
  });

  it('active l’Unicode quand le SMS contient des accents', async () => {
    fetchMock.mockReturnValue(reponse(201));
    await new FournisseurBrevo(config(BREVO)).envoyer({
      canal: 'sms',
      destinataire: '+221771234567',
      texte: 'Réservation expirée',
    });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string).unicodeEnabled).toBe(true);
  });

  it('WhatsApp : texte libre sans modèle, modèle approuvé sinon', async () => {
    fetchMock.mockReturnValue(reponse(201));
    await new FournisseurBrevo(config(BREVO)).envoyer({
      canal: 'whatsapp',
      destinataire: '+221771234567',
      texte: 'Bonjour',
    });
    let [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/whatsapp/sendMessage');
    expect(JSON.parse(options.body as string)).toEqual({
      senderNumber: '221770000000',
      contactNumbers: ['221771234567'],
      text: 'Bonjour',
    });

    fetchMock.mockClear();
    fetchMock.mockReturnValue(reponse(201));
    await new FournisseurBrevo(
      config({ ...BREVO, BREVO_WHATSAPP_TEMPLATE_ID: 42 }),
    ).envoyer({
      canal: 'whatsapp',
      destinataire: '+221771234567',
      texte: 'ignoré : le modèle fixe le texte',
    });
    [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const corps = JSON.parse(options.body as string);
    expect(corps.templateId).toBe(42);
    expect(corps).not.toHaveProperty('text');
  });

  it('renvoie l’explication du refus de Brevo', async () => {
    fetchMock.mockReturnValue(
      reponse(400, { message: 'Sender not validated' }),
    );
    const erreur = await new FournisseurBrevo(config(BREVO)).envoyer({
      canal: 'sms',
      destinataire: '+221771234567',
      texte: 'x',
    });
    expect(erreur).toBe('Brevo a répondu 400 : Sender not validated');
  });
});

describe('fournisseur passerelle HTTP', () => {
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('poste { canal, to, text } avec le jeton', async () => {
    fetchMock.mockReturnValue(reponse(200));
    const f = new FournisseurPasserelle(
      config({
        SMS_WEBHOOK_URL: 'https://passerelle.test/sms',
        SMS_WEBHOOK_TOKEN: 'jeton',
      }),
    );
    expect(f.estConfigure('sms')).toBe(true);
    expect(f.estConfigure('whatsapp')).toBe(false);
    expect(
      await f.envoyer({
        canal: 'sms',
        destinataire: '+221771234567',
        texte: 'x',
      }),
    ).toBeNull();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://passerelle.test/sms');
    expect(options.headers).toMatchObject({ Authorization: 'Bearer jeton' });
    expect(JSON.parse(options.body as string)).toEqual({
      canal: 'sms',
      to: '+221771234567',
      text: 'x',
    });
  });

  it('signale le refus de la passerelle', async () => {
    fetchMock.mockReturnValue(reponse(502));
    const f = new FournisseurPasserelle(
      config({ SMS_WEBHOOK_URL: 'https://p.test/sms' }),
    );
    expect(
      await f.envoyer({ canal: 'sms', destinataire: '+1', texte: 'x' }),
    ).toBe('La passerelle a répondu 502');
  });
});

describe('choix du fournisseur d’un canal', () => {
  const faux = (nom: string, configures: boolean): FournisseurMessagerie => ({
    nom,
    estConfigure: () => configures,
    envoyer: () => Promise.resolve(null),
  });
  const registre = [
    faux('alpha', true),
    faux('beta', true),
    faux('gamma', false),
  ];

  it('prend le premier fournisseur configuré quand rien n’est imposé', () => {
    const choix = choisirFournisseur('sms', config({}), registre);
    expect(choix.fournisseur?.nom).toBe('alpha');
    expect(choix.raison).toBe('automatique');
  });

  it('obéit à SMS_PROVIDER, sans casse', () => {
    const choix = choisirFournisseur(
      'sms',
      config({ SMS_PROVIDER: ' Beta ' }),
      registre,
    );
    expect(choix.fournisseur?.nom).toBe('beta');
    expect(choix.raison).toBe('choisi');
  });

  it('chaque canal a son propre fournisseur', () => {
    const env = { SMS_PROVIDER: 'alpha', WHATSAPP_PROVIDER: 'beta' };
    expect(
      choisirFournisseur('sms', config(env), registre).fournisseur?.nom,
    ).toBe('alpha');
    expect(
      choisirFournisseur('whatsapp', config(env), registre).fournisseur?.nom,
    ).toBe('beta');
  });

  it('éteint le canal avec none, même si un fournisseur est prêt', () => {
    for (const valeur of ['none', 'aucun', 'off']) {
      expect(
        choisirFournisseur('sms', config({ SMS_PROVIDER: valeur }), registre),
      ).toEqual({
        fournisseur: null,
        raison: 'desactive',
      });
    }
  });

  it('ne bascule jamais en silence chez un autre fournisseur', () => {
    expect(
      choisirFournisseur('sms', config({ SMS_PROVIDER: 'inconnu' }), registre),
    ).toEqual({
      fournisseur: null,
      raison: 'inconnu',
    });
    expect(
      choisirFournisseur('sms', config({ SMS_PROVIDER: 'gamma' }), registre),
    ).toEqual({
      fournisseur: null,
      raison: 'non_configure',
    });
  });

  it('reste inactif quand aucun fournisseur n’est configuré', () => {
    expect(choisirFournisseur('sms', config({}), [faux('a', false)])).toEqual({
      fournisseur: null,
      raison: 'aucun',
    });
  });
});
