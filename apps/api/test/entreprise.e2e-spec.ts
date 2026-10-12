import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, type E2eContext } from './helpers/e2e-app';
import { createCloudinaryMock } from './helpers/cloudinary-mock';
import { describeE2e } from './helpers/e2e-database';
import { LOGO_PAR_DEFAUT_BASE64 } from '../src/common/pdf/logo-defaut';

/**
 * Identité de l'entreprise : NINEA, RCCM, capital et logo se règlent depuis le
 * back-office et se retrouvent sur les documents générés.
 */
describeE2e('Identité de l’entreprise (e2e)', () => {
  let app: INestApplication;
  let context: E2eContext;
  let tokenAdmin: string;
  let tokenLecteur: string;
  let tokenSansDroit: string;
  const cloudinary = createCloudinaryMock('mtm-e2e/entreprise/logo', 'image');
  const JPEG = Buffer.from(LOGO_PAR_DEFAUT_BASE64, 'base64');
  const PASSWORD = 'MotDePasse-Solide-2026';

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    expect(response.status).toBe(201);
    return response.body.accessToken as string;
  };

  const profil = (token: string) =>
    request(app.getHttpServer())
      .get('/api/entreprise/profil')
      .set('Authorization', `Bearer ${token}`);

  const enregistrer = (token: string, corps: Record<string, unknown>) =>
    request(app.getHttpServer())
      .put('/api/entreprise/profil')
      .set('Authorization', `Bearer ${token}`)
      .send(corps);

  beforeAll(async () => {
    context = await createE2eApp({ cloudinary });
    app = context.app;
    const { data } = context;
    const admin = await data.seedRoleWithPermissions('admin_entreprise', [
      'settings:consulter',
      'settings:modifier',
    ]);
    const lecteur = await data.seedRoleWithPermissions('lecteur_parametres', [
      'settings:consulter',
    ]);
    const sansDroit = await data.seedRoleWithPermissions('stagiaire', [
      'contact:consulter',
    ]);
    for (const [email, role] of [
      ['admin@mtm.sn', admin],
      ['lecteur@mtm.sn', lecteur],
      ['stagiaire@mtm.sn', sansDroit],
    ] as const) {
      const user = await data.seedUser({ email, password: PASSWORD });
      await data.linkUserRole(user.id, role.id);
    }
    tokenAdmin = await login('admin@mtm.sn');
    tokenLecteur = await login('lecteur@mtm.sn');
    tokenSansDroit = await login('stagiaire@mtm.sn');
  });

  afterAll(async () => {
    await context.close();
  });

  it('refuse l’accès sans le droit de consulter les paramètres', async () => {
    expect((await profil(tokenSansDroit)).status).toBe(403);
    expect(
      (await request(app.getHttpServer()).get('/api/entreprise/profil')).status,
    ).toBe(401);
  });

  it('propose des valeurs par défaut tant que rien n’est saisi', async () => {
    const response = await profil(tokenLecteur);
    expect(response.status).toBe(200);
    expect(response.body.valeurs.ninea).toBe('');
    expect(response.body.parDefaut.nomCommercial).toBe('MTM Immobilier');
    expect(response.body.logoPersonnalise).toBe(false);
    expect(response.body.logoUrl).toBeNull();
  });

  it('un lecteur ne peut rien modifier', async () => {
    expect((await enregistrer(tokenLecteur, { ninea: '1' })).status).toBe(403);
    const logo = await request(app.getHttpServer())
      .post('/api/entreprise/logo')
      .set('Authorization', `Bearer ${tokenLecteur}`)
      .attach('file', JPEG, {
        filename: 'logo.jpg',
        contentType: 'image/jpeg',
      });
    expect(logo.status).toBe(403);
  });

  it('enregistre le NINEA, le RCCM et le capital, puis les efface en les vidant', async () => {
    const response = await enregistrer(tokenAdmin, {
      raisonSociale: 'MTM Immobilier SARL',
      formeJuridique: 'SARL',
      capital: '1 000 000 FCFA',
      ninea: '009876543 2G2',
      rccm: 'SN DKR 2024 B 1234',
    });
    expect(response.status).toBe(200);
    expect(response.body.valeurs).toMatchObject({
      raisonSociale: 'MTM Immobilier SARL',
      ninea: '009876543 2G2',
      rccm: 'SN DKR 2024 B 1234',
    });
    // Un champ absent de la requête n'est pas touché.
    const suite = await enregistrer(tokenAdmin, { rccm: '' });
    expect(suite.body.valeurs.rccm).toBe('');
    expect(suite.body.valeurs.ninea).toBe('009876543 2G2');
  });

  it('refuse des valeurs trop longues', async () => {
    expect(
      (await enregistrer(tokenAdmin, { ninea: 'x'.repeat(500) })).status,
    ).toBe(400);
  });

  it('téléverse puis retire le logo', async () => {
    const ajout = await request(app.getHttpServer())
      .post('/api/entreprise/logo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('file', JPEG, {
        filename: 'logo.jpg',
        contentType: 'image/jpeg',
      });
    expect(ajout.status).toBe(201);
    expect(ajout.body.logoPersonnalise).toBe(true);
    expect(ajout.body.logoUrl).toContain('cloudinary.test');

    const retrait = await request(app.getHttpServer())
      .delete('/api/entreprise/logo')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(retrait.status).toBe(200);
    expect(retrait.body.logoPersonnalise).toBe(false);
    expect(cloudinary.destroy).toHaveBeenCalled();
  });

  it('refuse un fichier qui n’est pas une image', async () => {
    const reponse = await request(app.getHttpServer())
      .post('/api/entreprise/logo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'logo.pdf',
        contentType: 'application/pdf',
      });
    expect(reponse.status).toBe(400);
    const sans = await request(app.getHttpServer())
      .post('/api/entreprise/logo')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(sans.status).toBe(400);
  });

  it('génère un aperçu PDF qui porte les mentions légales saisies', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/entreprise/apercu')
      .set('Authorization', `Bearer ${tokenLecteur}`)
      .buffer(true)
      .parse((res, done) => {
        const morceaux: Buffer[] = [];
        res.on('data', (m: Buffer) => morceaux.push(m));
        res.on('end', () => done(null, Buffer.concat(morceaux)));
      });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    const pdf = response.body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const texte = pdf.toString('latin1');
    expect(texte).toContain('NINEA');
    expect(texte).toContain('/Subtype /Image');
  });
});
