# Agenda, tâches, messages et notifications (J2.4)

Sections 21 et 22 du cahier des charges. Mode d'emploi pour les équipes et notes pour l'exploitation.

## Tâches (menu Tâches)

- Une tâche a un responsable, une priorité (basse, moyenne, haute, urgente), une date limite et un statut (à faire, en cours, terminée, annulée). Elle garde son **historique** : création, réassignation, changements de statut, de priorité ou d'échéance, commentaires.
- Elle peut être **rattachée à un dossier** (prospect, vente, mandat, mission, bail, chantier, bien) depuis la fiche du dossier, bloc « Tâches et rendez-vous ». On ne rattache que ce qu'on a le droit d'ouvrir.
- Chacun voit ses tâches et celles qu'il a confiées. L'encadrement (permission `taches:administrer`) voit et réassigne celles de toute l'équipe.
- La personne à qui l'on confie une tâche est prévenue. Une tâche en retard prévient son responsable **et** celui qui l'a confiée, une fois par jour. Une échéance à moins de 24 h est signalée une fois.

## Agenda (menu Agenda)

- Vues mois, semaine et liste ; « Mon agenda » ou l'agenda de l'équipe.
- Événements : rendez-vous, visite, appel, vérification, réunion, échéance. Participants invités, lieu, rappel (15 min, 1 h, 1 jour avant), visibilité « toute l'équipe » ou « moi et les participants » (un événement privé n'existe pas pour les autres).
- Sont ajoutés en lecture seule, dans le périmètre de chacun : tâches à rendre, visites suivies par le CRM, fins de mandat, jalons de chantier, arrivées et départs de séjours, loyers à échéance, échéances de paiement et fins de réservation des ventes.
- La période affichée ne dépasse pas 62 jours.

## Échanges par dossier

- Sur chaque fiche (prospect, vente, mandat, mission, chantier, bien) : un fil avec l'historique. Un message est une **note interne** (jamais lue par le client) ou un **message au client** (case « Envoyer aussi au client », pour les ventes, missions, chantiers et baux).
- Côté client, dans l'espace personnel : « Échanges avec MTM » sur ses dossiers, ses vérifications, son chantier et son bail. Il lit uniquement ce qui lui est destiné et peut répondre (5 messages par minute au plus).
- Les droits sont ceux du dossier : un collègue hors périmètre ne voit rien, un client ne voit que les siens.

## Notifications

- **Règles** (Administration › Règles de notification, permission `notifications:administrer`) : pour chaque événement, actif ou non, qui est prévenu (groupe de destinataires), et par quels canaux. Réglages stockés dans le paramètre `notifications.regles` ; les valeurs d'origine s'appliquent tant qu'aucune règle n'est enregistrée.
- **Préférences personnelles** (Mes notifications) : e-mail, SMS, WhatsApp et numéro de téléphone de chacun.
- Événements : nouveau prospect, nouveau message du site, nouveau dossier de vente, paiement à valider, réservation expirée, **document manquant** (contrat absent d'un dossier réservé depuis plus de `notifications.documentManquantJours` jours, 7 par défaut), mandat proche de l'échéance, impayés de loyer, demande de location ou de séjour, demande de résiliation, nouvelle mission, nouveau chantier, chantier en retard ou hors budget, tâche assignée, tâche en retard, tâche à rendre, rappel de rendez-vous, invitation, relance CRM en retard, message sur un dossier, réponse de MTM au client.
- L'e-mail ne part que si la règle le veut **et** que la personne ne l'a pas coupé.

### SMS et WhatsApp

Le choix du prestataire appartient à MTM. Tant qu'aucune passerelle n'est renseignée, ces canaux sont inactifs et rien ne part. Pour les activer, renseigner sur le serveur :

| Variable | Rôle |
| --- | --- |
| `SMS_WEBHOOK_URL` | adresse qui reçoit les SMS |
| `SMS_WEBHOOK_TOKEN` | jeton envoyé en `Authorization: Bearer …` (facultatif) |
| `WHATSAPP_WEBHOOK_URL` | adresse qui reçoit les messages WhatsApp |
| `WHATSAPP_WEBHOOK_TOKEN` | jeton (facultatif) |

La passerelle reçoit `POST` avec un corps JSON `{ "canal": "sms" | "whatsapp", "to": "+221771234567", "text": "…" }` et répond 2xx si elle accepte le message. Un petit relais vers le prestataire retenu (Orange, Twilio, WhatsApp Business…) suffit. Chaque envoi est consigné (table `envois_canal`), avec le numéro masqué, réussi ou en échec. Un message n'est envoyé qu'aux personnes qui ont donné leur numéro et demandé ce canal.

## Parcours des dossiers (Administration › Parcours des dossiers)

Étapes des ventes (et leurs passages autorisés), du pipeline commercial et des chantiers. On peut **ajouter** des étapes, les **ordonner** et autoriser des **passages supplémentaires** entre étapes de vente. Les étapes et passages d'origine ne se retirent pas : le calcul des soldes, la réception d'un chantier ou la conclusion d'une vente s'y appuient. Une étape ajoutée ne peut être retirée tant que des dossiers s'y trouvent. Ces paramètres ne se modifient plus à la main dans la page Paramètres.

## Permissions

`taches:*`, `agenda:*`, `messages:consulter|creer`, `notifications:administrer`. Tous les rôles internes ont consulter, créer et modifier sur les tâches et l'agenda, et messages ; l'encadrement (direction, manager, responsable commercial) a `administrer` ; la direction règle les notifications. À rejouer sur chaque environnement avec le seed (`npm run seed`), qui est idempotent.

## Déploiement

Migration `20261013090000_agenda_taches_messages` (tables `taches`, `taches_historique`, `evenements_agenda`, `evenements_participants`, `messages_dossier`, `envois_canal`, et colonnes de préférences sur `users`). Puis seed pour les nouvelles permissions.
