---
id: gestion-locative
titre: La gestion locative
groupe: metier
resume: Biens loués, baux, loyers et quittances, impayés, locations à la nuit, résiliations.
roles: commercial responsable_commercial gestion_locative direction administrateur
---

La **gestion locative** suit les biens que les propriétaires confient à MTM pour la location : **baux, loyers, cautions, impayés, séjours à la nuit, résiliations**. **La location est portée par les commerciaux** : chacun crée et suit **ses propres biens** (fiche, bail, séjours, locataires, loyers) et ne voit que ceux-là ; le responsable de la gestion locative, le manager et la direction voient tout le portefeuille. La **publication sur le site**, la **validation** (résiliations, versements) et les **sorties d’argent** (restitution de caution) restent à la gestion locative. La ligne **Gestion locative** du menu (rubrique *Location et services*) ouvre un écran à **onglets** : *Biens en gestion*, *Locataires*, *Séjours à la nuit*, *Résiliations*, *Relances d’impayés*.

## Les biens locatifs

![Liste des biens locatifs](img/loc-01-biens.png)

- Les **tuiles** : biens en gestion, biens **en retard de loyer** (avec le montant à recouvrer), **relances à envoyer**, **encaissé ce mois**.
- Les **pastilles** filtrent d’un clic : *Loués*, *Disponibles*, *Sans responsable*, *Loyers en retard*, *Impayés prolongés*.
- La colonne **Paiement** dit d’un coup d’œil si le loyer est **à jour** ou **en retard**.
- Cliquez sur une ligne pour ouvrir la fiche.

### Créer un bien locatif

1. **Biens en gestion › Nouveau bien.**
2. Choisissez le **propriétaire** (créez-le d’abord s’il n’existe pas), le **type** (appartement, villa…), l’**adresse**, la **commune** et la **région**.
3. Pour une location **au mois**, laissez le mode par défaut ; pour une location **à la nuit**, voir plus bas.
4. **Enregistrer** : le bien reçoit une référence lisible (« L-2026-0001 ») et le statut *Disponible*.

![Nouveau bien locatif](img/loc-08-nouveau-bien.png)

### La fiche du bien

![Fiche d’un bien locatif](img/loc-02-fiche-bien.png)

- **Les chiffres du haut** : loyer mensuel, **encaissé**, **reste dû** (en rouge s’il y a des échéances non soldées), **caution détenue**.
- Les pastilles du titre : **Loué** / **Disponible**, **En retard**.
- **Annonce sur le site** : tant qu’un bien est **publié et disponible**, les visiteurs le voient sur la page « Locations ». Pour publier, il faut un **loyer affiché** et **au moins une photo**. Dès qu’un bail est créé, le bien **disparaît tout seul** du site.
- **Photos et vidéos** : jusqu’à 20 (JPEG, PNG, WebP, vidéo MP4 ; 10 Mo maximum chacune). La première photo sert de couverture.
- Le **menu ⌄** à droite du bouton principal : mouvement de caution, incident ou demande, demande de résiliation, états des lieux d’entrée et de sortie, préavis de départ, clôture du bail, changement de locataire, résiliation sans préavis, **relevé de gestion**, suppression.

## Les locataires

**Gestion locative › Locataires** : les personnes qui louent un bien géré par MTM. Depuis une fiche, retrouvez **l’historique complet de ses baux**. **Nouveau locataire** : nom, prénom, téléphone, e-mail.

![Locataires](img/loc-03-locataires.png)

## Créer un bail

Dans la fiche d’un bien **disponible**, **Créer un bail** :

1. Choisissez le **locataire**.
2. Le **loyer mensuel**, le **jour d’échéance** (le 5 de chaque mois, par exemple) et la **date de début**.
3. La **caution** : montant et date de versement. Une caution encaissée à la signature est notée « versée ».
4. **Enregistrer.**

L’application **génère les douze échéances mensuelles** et passe le bien à **Loué**.

## Encaisser un loyer

Dans la fiche du bien, **Encaisser un loyer** :

1. Choisissez l’**échéance** concernée.
2. Le **montant**, le **mode de paiement** (virement, espèces, mobile money…) et la **référence**.
3. **Enregistrer** : le paiement est **à valider**.
4. Une personne habilitée **valide** le paiement : l’échéance passe à *payée* et le « reste dû » baisse.

Sur la ligne d’une échéance payée, le bouton **Quittance** produit le PDF à l’en-tête de MTM, à remettre au locataire.

> **Attention** — Enregistrez chaque versement le **jour même**, avec sa référence. C’est ce qui permet de justifier le loyer encaissé au propriétaire et à la comptabilité.

## Les relances d’impayés

**Gestion locative › Relances d’impayés** liste les rappels à envoyer pour les loyers en retard.

- Les relances sont **proposées automatiquement** selon un calendrier (paliers), **une seule fois par échéance et par palier**.
- Vous les **envoyez** depuis la liste (bouton **Envoyer**, par e-mail), et l’envoi est consigné.
- Le tableau de bord de la direction signale les **impayés prolongés** (plus de 30 jours de retard).

## Les locations à la nuit (type Airbnb)

### Mettre un bien à la nuit

1. **Biens en gestion › Nouveau bien** (ou la fiche d’un bien existant › *Annonce*).
2. **Mode de location : « Location à la nuit »**.
3. Renseignez le **prix de la nuit**, les **frais de ménage** (une fois par séjour), la **caution**, la **durée minimale**, la **capacité** et les **heures d’arrivée et de départ**.
4. Ajoutez des photos puis **publiez** : le bien apparaît sur la page « Locations » avec son prix par nuit.

Un bien à la nuit n’a **pas de bail** : **Nouveau séjour** remplace « Créer un bail ». Un bien ne change de mode que s’il n’a ni bail en cours ni séjour à venir.

### Le déroulé d’un séjour

![Séjours](img/loc-04-sejours.png)

| Étape | Ce qui se passe |
| --- | --- |
| **Demande** | Reçue du site (ou saisie par MTM). N’occupe pas le calendrier. MTM est notifié. |
| **Confirmé** | Les nuits sont réservées : aucun autre séjour ne peut les prendre. |
| **En cours** | Le voyageur est arrivé : état des lieux d’entrée. |
| **Terminé** | Le voyageur est parti : état des lieux de sortie, restitution de la caution. |
| **Annulé** | Motif obligatoire ; les nuits sont libérées. |

- Les **tuiles** comptent les demandes à traiter, les arrivées sous 7 jours, les séjours en cours et les cautions à rendre.
- Le **prix est figé à la réservation** : changer le tarif ensuite ne modifie pas les séjours déjà enregistrés.
- Les **règlements** (acompte, solde) se saisissent dans le séjour ; le reste à payer se calcule seul et un règlement ne peut pas dépasser ce reste.
- La **caution** est reçue puis **restituée**, avec une éventuelle **retenue toujours justifiée**.

![Fiche d’un séjour](img/loc-05-fiche-sejour.png)

Les **états des lieux** d’entrée et de sortie se font **pièce par pièce** (bon état, usure normale, dégradé, hors service), avec compteurs d’eau et d’électricité, clés remises et **photos**. La fiche compare la sortie à l’entrée : c’est le **justificatif d’une retenue** sur la caution.

> Sur le site, le visiteur voit les nuits déjà prises, choisit ses dates et envoie une **demande** : **aucun paiement en ligne**, MTM confirme les nuits et recontacte le voyageur.

## Les demandes de résiliation

Le locataire dépose sa demande depuis son espace (date de départ souhaitée, motif). MTM peut aussi **enregistrer une demande reçue par téléphone, WhatsApp ou courrier** (fiche du bien › menu ⌄ › *Demande de résiliation*).

![Demandes de résiliation](img/loc-07-resiliations.png)

- **Accepter** ouvre le **préavis** du bail à la date de départ retenue (par défaut la plus tardive entre le souhait du locataire et la demande + **30 jours** de préavis, réglable dans Paramètres).
- **Refuser** exige d’**expliquer pourquoi**.
- Le locataire est **prévenu dans son espace** dans les deux cas.

## Le relevé de gestion

Fiche du bien › menu ⌄ › **Relevé de gestion** (réservé à ceux qui peuvent publier) : le relevé est **publié dans l’espace du propriétaire**.

## Une routine

- **Chaque jour** : validez les paiements en attente, traitez les **demandes de séjour** et de **résiliation**.
- **Début de mois** : regardez les **loyers en retard** et lancez les **relances**.
- **Avant chaque arrivée** (séjours) : confirmez l’heure, préparez l’**état des lieux d’entrée**.
