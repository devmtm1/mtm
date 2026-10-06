# Transfert du dépôt à MTM Immobilier

Exigence : section 28 du cahier des charges — « le développeur ne doit pas
conserver un accès exclusif à l'hébergement, au dépôt de code, aux comptes
cloud, aux bases de données, aux clés d'API ou aux comptes administrateurs.
MTM doit être propriétaire ou administrateur principal de ces ressources. »

Aujourd'hui le dépôt est sur un compte GitHub personnel
(`github.com/devmtm1/mtm`). Cette opération ne peut être faite que par
quelqu'un qui administre à la fois le compte actuel et celui de MTM : elle ne se
fait pas depuis le code.

## 1. Le dépôt

1. MTM crée une **organisation GitHub** (ex. `mtm-immobilier`), avec au moins
   deux propriétaires (la direction et une seconde personne de confiance).
2. Sur le dépôt actuel : *Settings → General → Danger Zone → Transfer ownership*
   vers l'organisation. Les branches, l'historique et les workflows suivent.
3. Dans l'organisation, protéger `main` : fusion par demande de tirage
   uniquement, CI obligatoire (jobs `API`, `Back-office`, `Public website`),
   interdiction de pousser directement.
4. Le développeur devient *membre* avec le rôle « Maintain », pas propriétaire.

## 2. Les services connectés au dépôt

À reconnecter à l'organisation après le transfert : Render (trois services),
Cloudflare Pages (deux projets), et les secrets GitHub Actions (voir
`docs/BACKUP.md`).

## 3. Les autres ressources — tableau de contrôle

| Ressource | Propriétaire attendu | Vérifié par MTM |
| --- | --- | --- |
| Organisation GitHub | MTM (≥ 2 propriétaires) | ☐ |
| Compte Render | MTM | ☐ |
| Projets Neon (test et production) | MTM | ☐ |
| Compte Cloudflare (Pages, domaine) | MTM | ☐ |
| Compte Cloudinary | MTM | ☐ |
| Compte Brevo (e-mails) | MTM | ☐ |
| Stockage des sauvegardes | MTM | ☐ |
| Nom de domaine | MTM | ☐ |
| Phrase de passe des sauvegardes, secrets JWT, clés d'API | coffre de mots de passe de MTM | ☐ |
| Compte administrateur de la plateforme | un compte MTM (pas celui du développeur) | ☐ |

Après le transfert : changer le mot de passe du compte administrateur de la
plateforme, régénérer les secrets JWT (les sessions sont alors invalidées) et
retirer au développeur tout accès propriétaire.
