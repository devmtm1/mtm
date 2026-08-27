# Procedure de reprise apres incident

Cette procedure couvre la reprise du socle Phase 0. Les valeurs secretes ne
 doivent jamais etre inscrites dans ce document : elles sont gerees par
l'environnement d'execution ou le gestionnaire de secrets de l'hebergeur.

## 1. Detection et gel

1. Confirmer l'incident depuis `/api/health` et les logs de l'API.
2. Identifier l'heure de debut, les services touches et le dernier backup valide.
3. Si une compromission est suspectee, suspendre les comptes concernes,
   revoquer les sessions et faire tourner les secrets JWT et Cloudinary.
4. Conserver les logs et l'identifiant de l'incident avant toute suppression.

## 2. Restauration de la base

1. Choisir le dump valide le plus recent dans le stockage de backup.
2. Restaurer dans une base temporaire avec `apps/api/scripts/restore.sh`.
3. Executer `apps/api/scripts/test-backup-restore.sh` ou une verification
   equivalente sur la base temporaire.
4. Valider le nombre de tables, les migrations et les donnees critiques.
5. Basculer l'API vers la base restauree uniquement apres validation MTM.
6. Conserver la base compromise en lecture seule pour l'analyse si necessaire.

## 3. Remise en service

1. Verifier les variables `DATABASE_URL`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `CORS_ORIGIN` et `API_PORT` dans l'environnement cible.
2. Executer les migrations, le build et les tests API.
3. Verifier `/api/health`, la connexion administrateur, le changement de mot de
   passe, le 2FA et une lecture audit.
4. Verifier que le back-office utilise l'URL API de production attendue.
5. Surveiller les erreurs et les performances pendant la reprise.

## 4. Acces et propriete

Les acces au depot, a l'hebergeur, a PostgreSQL, aux secrets, aux backups et a
la messagerie de notification doivent appartenir a MTM. Chaque acces doit etre
individuel, limite au besoin et retire au depart d'un intervenant.

Le compte administrateur seed doit changer son mot de passe provisoire a la
premiere connexion. Les secrets presents dans un poste de developpement doivent
etre consideres comme locaux et tournes avant la production.

## 5. Retour arriere

Avant chaque deploiement important :

- executer une sauvegarde ;
- noter le commit deploye et la migration courante ;
- verifier que le dump est lisible ;
- conserver l'image ou le build precedent ;
- definir la decision et le responsable du retour arriere.

Un retour arriere applicatif ne doit pas appliquer automatiquement une migration
irreversible. Pour une migration destructive, restaurer d'abord une copie de la
base et obtenir une validation MTM.

## 6. Post-incident

Documenter la cause, la chronologie, les donnees affectees, les actions prises,
les secrets tournes, le backup utilise et les mesures preventives. Faire valider
le rapport par MTM et ajouter un test ou une alerte lorsque cela est pertinent.
