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

### SMS et WhatsApp : un fournisseur au choix, interchangeable

L'application **ne dépend d'aucun prestataire**. Elle demande d'envoyer un message sur un canal ; le **fournisseur désigné par la configuration** s'en charge. Les écrans, les règles de notification et les données sont les mêmes quel que soit le prestataire : **changer de fournisseur ne demande ni code, ni migration, ni intervention sur les données** — seulement des variables d'environnement.

**Choisir le fournisseur de chaque canal** (indépendamment pour le SMS et pour WhatsApp) :

| Variable | Valeurs | Effet |
| --- | --- | --- |
| `SMS_PROVIDER` | `brevo`, `passerelle`, `none` | fournisseur des SMS |
| `WHATSAPP_PROVIDER` | `brevo`, `passerelle`, `none` | fournisseur de WhatsApp |

- Variable **absente** : le premier fournisseur complètement configuré est utilisé (pratique quand un seul est branché).
- `none` : le canal est **éteint**, même si un fournisseur est prêt.
- Nom **inconnu** ou identifiants **incomplets** : le canal reste **inactif** (l'erreur est écrite une fois dans le journal du serveur). L'application n'envoie **jamais** chez un autre prestataire que celui qu'on a désigné.

**Fournisseurs livrés**

*`brevo`* — déjà utilisé pour les e-mails (qui, eux, passent par un SMTP quelconque) :

| Variable | Rôle |
| --- | --- |
| `BREVO_API_KEY` | clé d'API **v3** (« xkeysib-… »), à créer dans Brevo › *SMTP et API* › *Clés API*. **Ce n'est pas la clé SMTP.** |
| `BREVO_SMS_SENDER` | nom d'expéditeur des SMS : 11 caractères alphanumériques au plus (15 chiffres si numérique), accepté par Brevo et par les opérateurs du pays |
| `BREVO_WHATSAPP_SENDER` | numéro WhatsApp Business relié à Brevo |
| `BREVO_WHATSAPP_TEMPLATE_ID` | facultatif mais **conseillé** : modèle approuvé par WhatsApp |

SMS : `POST /v3/transactionalSMS/send` (Unicode activé dès qu'il y a des accents : 70 caractères par segment au lieu de 160 ; chaque SMS consomme du solde Brevo). WhatsApp : `POST /v3/whatsapp/sendMessage` ; WhatsApp impose un **modèle approuvé** pour écrire à quelqu'un qui n'a pas écrit depuis moins de 24 h (le contenu d'un modèle est fixe) ; sans modèle, le texte libre n'est accepté que dans une conversation ouverte.

*`passerelle`* — l'adaptateur **universel** : une passerelle HTTP à vous (`SMS_WEBHOOK_URL`, `WHATSAPP_WEBHOOK_URL`, jetons facultatifs `SMS_WEBHOOK_TOKEN`, `WHATSAPP_WEBHOOK_TOKEN`) qui reçoit `POST { "canal": "sms" | "whatsapp", "to": "+221771234567", "text": "…" }` et répond 2xx. Un petit relais vers n'importe quel prestataire (Orange, Twilio, Infobip, WhatsApp Cloud API…) suffit, **sans toucher à l'application**.

**Passer d'un fournisseur à un autre** : renseigner les identifiants du nouveau, changer `SMS_PROVIDER` (et/ou `WHATSAPP_PROVIDER`), redémarrer. On peut garder l'ancien configuré pour revenir en arrière en une variable.

**Ajouter un fournisseur dans le code** (quand un relais ne suffit pas) : écrire une classe qui respecte l'interface `FournisseurMessagerie` (`apps/api/src/modules/notifications/messagerie/fournisseur.ts` : un `nom`, `estConfigure(canal)`, `envoyer(message)`), puis l'inscrire dans `messagerie/registre.ts`. Rien d'autre ne change.

**Ce qui ne dépend pas du fournisseur**
- Le numéro de chaque personne se saisit dans **Mes notifications** (format international) ; chaque adaptateur le met au format que son prestataire attend.
- Chaque envoi est consigné (table `envois_canal`) : canal, **fournisseur qui l'a porté**, numéro masqué, réussi ou en échec, et l'explication du refus.
- Un message n'est envoyé qu'aux personnes qui ont donné leur numéro et demandé ce canal.

## Parcours des dossiers (Administration › Parcours des dossiers)

Étapes des ventes (et leurs passages autorisés), du pipeline commercial et des chantiers. On peut **ajouter** des étapes, les **ordonner** et autoriser des **passages supplémentaires** entre étapes de vente. Les étapes et passages d'origine ne se retirent pas : le calcul des soldes, la réception d'un chantier ou la conclusion d'une vente s'y appuient. Une étape ajoutée ne peut être retirée tant que des dossiers s'y trouvent. Ces paramètres ne se modifient plus à la main dans la page Paramètres.

## Permissions

`taches:*`, `agenda:*`, `messages:consulter|creer`, `notifications:administrer`. Tous les rôles internes ont consulter, créer et modifier sur les tâches et l'agenda, et messages ; l'encadrement (direction, manager, responsable commercial) a `administrer` ; la direction règle les notifications. À rejouer sur chaque environnement avec le seed (`npm run seed`), qui est idempotent.

## Déploiement

Migration `20261013090000_agenda_taches_messages` (tables `taches`, `taches_historique`, `evenements_agenda`, `evenements_participants`, `messages_dossier`, `envois_canal`, et colonnes de préférences sur `users`). Puis seed pour les nouvelles permissions. Migration `20261015090000_envois_canal_fournisseur` : colonne facultative `fournisseur` du journal des envois (les envois déjà consignés n'en ont pas).
