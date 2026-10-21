// Données fictives de l'environnement de captures, créées par l'API elle-même (donc avec ses
// règles : numérotation, statuts, notifications). Aucun client, montant ou pièce réels.
import { authenticator } from 'otplib';
import { COMPTES, MOT_DE_PASSE, MOT_DE_PASSE_PROVISOIRE } from './comptes.mjs';
import { MOT_DE_PASSE_ADMIN_INITIAL } from './environnement.mjs';

export class ClientApi {
  constructor(urlApi) {
    this.urlApi = urlApi;
    this.jeton = null;
  }

  async appeler(methode, chemin, corps, { jeton = this.jeton, ok = [200, 201, 204] } = {}) {
    const reponse = await fetch(`${this.urlApi}${chemin}`, {
      method: methode,
      headers: {
        'content-type': 'application/json',
        ...(jeton ? { authorization: `Bearer ${jeton}` } : {}),
      },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const texte = await reponse.text();
    let json = null;
    try {
      json = texte ? JSON.parse(texte) : null;
    } catch {
      json = texte;
    }
    if (!ok.includes(reponse.status)) {
      throw new Error(`${methode} ${chemin} → ${reponse.status} ${typeof json === 'string' ? json : JSON.stringify(json)}`);
    }
    return json;
  }

  get(chemin, options) {
    return this.appeler('GET', chemin, undefined, options);
  }

  post(chemin, corps, options) {
    return this.appeler('POST', chemin, corps, options);
  }

  patch(chemin, corps, options) {
    return this.appeler('PATCH', chemin, corps, options);
  }

  async connecter(email, motDePasse, codeTotp) {
    const resultat = await this.post('/auth/login', { email, password: motDePasse, ...(codeTotp ? { twoFactorCode: codeTotp } : {}) }, { jeton: null });
    this.jeton = resultat.accessToken;
    return resultat;
  }
}

/** Crée l'administrateur « prêt à servir » : mot de passe changé, double authentification active. */
export async function preparerAdministrateur(urlApi) {
  const api = new ClientApi(urlApi);
  const admin = COMPTES.administrateur;
  await api.connecter(admin.email, MOT_DE_PASSE_ADMIN_INITIAL);
  await api.post('/auth/change-password', { currentPassword: MOT_DE_PASSE_ADMIN_INITIAL, newPassword: MOT_DE_PASSE });
  await api.connecter(admin.email, MOT_DE_PASSE);
  const installation = await api.post('/auth/2fa/setup');
  // L'API renvoie l'adresse otpauth:// du QR code : le secret en est un paramètre.
  const secret = new URL(installation.otpauthUrl).searchParams.get('secret');
  if (!secret) throw new Error('2FA : secret introuvable dans la réponse de /auth/2fa/setup');
  await api.post('/auth/2fa/confirm', { code: authenticator.generate(secret) });
  await api.connecter(admin.email, MOT_DE_PASSE, authenticator.generate(secret));
  return { api, secretTotp: secret };
}

async function identifiantsRoles(api) {
  const roles = await api.get('/roles');
  const liste = Array.isArray(roles) ? roles : (roles.items ?? roles.data ?? []);
  return Object.fromEntries(liste.map((role) => [role.name, role.id]));
}

/** Les comptes de chaque métier : créés par l'administrateur, mot de passe déjà changé. */
export async function creerUtilisateurs(urlApi, adminApi) {
  const roles = await identifiantsRoles(adminApi);
  const clients = {};
  for (const [cle, compte] of Object.entries(COMPTES)) {
    if (cle === 'administrateur') continue;
    if (!roles[compte.role]) throw new Error(`Rôle introuvable : ${compte.role}`);
    await adminApi.post('/users', {
      email: compte.email,
      password: MOT_DE_PASSE_PROVISOIRE,
      firstName: compte.prenom,
      lastName: compte.nom,
      roleId: roles[compte.role],
    });
    const api = new ClientApi(urlApi);
    await api.connecter(compte.email, MOT_DE_PASSE_PROVISOIRE);
    await api.post('/auth/change-password', { currentPassword: MOT_DE_PASSE_PROVISOIRE, newPassword: MOT_DE_PASSE });
    await api.connecter(compte.email, MOT_DE_PASSE);
    const moi = await api.get('/auth/me');
    clients[cle] = { api, id: moi.id };
  }
  return clients;
}
