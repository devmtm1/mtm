---
id: verifications
titre: Les vérifications et démarches
groupe: metier
resume: Vérifier un terrain pour un client, suivre les démarches administratives, facturer et rendre le rapport.
roles: verifications commercial direction administrateur
---

Le module **Vérifications et démarches** (menu principal) suit les **missions** confiées par des clients — souvent depuis l’étranger — pour **vérifier un terrain avant d’acheter** : visite sur place, consultation des administrations, puis rapport. Il suit aussi les **démarches** administratives (mutation, bail, autorisation de construire…) et les **prestations techniques** (plans).

![Liste des missions](img/dem-01-missions.png)

- Les **tuiles** : missions suivies, **échéances dépassées**, **encaissé** sur le total facturé.
- **Où en sont les missions** : le nombre de missions par étape ; cliquez pour filtrer.
- Les **pastilles** : *Missions en cours*, *Échéance dépassée*, *Sans responsable*, *Rapport à rédiger*.
- **Exporter** produit un fichier de la liste (un motif est demandé et conservé).

> Un **commercial** peut demander une vérification pour son client (depuis la fiche du prospect : **Demander une vérification**). Le suivi de la mission revient ensuite au service des démarches.

## Créer une mission

1. **Nouvelle mission** (ou *Demander une vérification* depuis une fiche prospect).
2. Choisissez le **client demandeur** (un prospect existant), la **nature de la vérification**, l’**urgence**, un **bien du catalogue** (facultatif), la **localisation décrite par le client**, la commune et la région (latitude et longitude si vous les avez).
3. Notez l’**objectif du client**, l’**échéance promise**, le **budget annoncé** si le client en a donné un, (« Vérifier le terrain avant tout envoi de fonds depuis la France ») et les **pièces fournies** (copie du titre foncier transmise par le vendeur…). Exemple d’objectif : « Vérifier le terrain avant tout envoi de fonds depuis la France ».
4. **Enregistrer.**

![Nouvelle mission](img/dem-03-nouvelle-mission.png)

La **référence** est attribuée seule : `MTM-VF-001/2026` (famille de prestation, rang dans l’année, année). Les formats de numérotation se règlent dans *Paramètres › Missions, factures & références*.

Natures de mission : *Vérification foncière*, *Vérification physique*, *Vérification administrative*, *Accompagnement à l’achat*, *Démarche administrative* (dépôt de mutation, de bail, d’autorisation de construire, retrait de document), *Prestation technique* (plan architectural, plan de géomètre) ou *Autre*.

Urgence : *Normale*, *Urgente*, *Très urgente*.

## Suivre une mission : les étapes

![Fiche d’une mission](img/dem-02-fiche-mission.png)

Le bouton en haut à droite (« **Passer à Étude de faisabilité** ») fait avancer la mission d’**une étape**. Pour une vérification, les étapes sont :

| Étape | Ce qu’on y fait |
| --- | --- |
| **Demande reçue** | Enregistrer la demande du client et les pièces fournies. |
| **Étude de faisabilité** | Évaluer la faisabilité (*favorable*, *défavorable*, *à compléter*), convenir du **montant** avec le client, frais d’étude. |
| **Vérification physique** | Visiter le site et **ajouter un constat** : date et heure, accès, environnement, conformité apparente, **personnes présentes**, observations, **photos** (12 au plus, elles partent en annexe du rapport). |
| **Vérification administrative** | Consulter mairie, service des Domaines, cadastre ; noter la conformité (*conforme*, *écart mineur*, *écart majeur*, *non vérifiable*). |
| **Rapport** | Rendre la **décision**, la conclusion, les réserves et la recommandation, puis **générer le rapport** (PDF). |

Une démarche administrative suit les étapes : *Constitution du dossier*, *Dépôt*, *Suivi administration*, *Retrait*. Une prestation technique : *Devis*, *Production*, *Livraison*. La mission se termine à **Clôturée** (ou **Abandonnée**, avec un motif).

> L’**échéance promise** au client alimente l’alerte « échéance dépassée » : renseignez-la dès la prise de commande.

## Facturer et encaisser

Dans le bloc **Règlements et facture** de la mission :

1. **Montant convenu** : saisi à l’étape *Étude de faisabilité*.
2. Chaque règlement du client se saisit **à part** : date, **montant envoyé**, **frais** de transfert (Wave, Orange Money, banque), **référence de la transaction**. Le **net** et le **solde** se calculent seuls ; une même transaction ne peut être saisie **qu’une seule fois**.
3. **Générer la facture** : PDF `MTM-FAC-VF-001/2026` (client, prestation, règlements, solde, références de transaction). Après un nouveau règlement, **Régénérer la facture** met la situation à jour **sans changer le numéro ni la date**.
4. La facture n’est **visible du client** que si vous la **publiez**.

Le solde et le statut (« Partiellement réglé ») se calculent sur le montant **envoyé** ; les frais restent à part. Le client est **prévenu dans son espace** à chaque règlement.

## Le rapport

À l’étape **Rapport** :

- **Décision** : *favorable*, *défavorable* ou *à compléter* (tant que la vérification administrative n’est pas faite).
- **Conclusion**, **réserves**, **recommandation**.
- **Générer le rapport** : le PDF reprend le constat, les personnes présentes, la facturation avec le solde et l’**annexe photographique**.
- Comme la facture, il n’est visible du client qu’une fois **publié**.

## Les données d’identité du client

La date et le lieu de naissance, le **type** de pièce d’identité apparaissent sur la facture et le rapport ; le **numéro** de la pièce n’y figure **jamais**. Ces informations ne sont visibles qu’avec la permission « identité » (direction, encadrement commercial, responsable des démarches, administrateur).

## Les bonnes habitudes

- **Enregistrez le constat le jour de la visite**, photos à l’appui.
- **Saisissez chaque règlement** dès réception, avec la référence de transaction.
- **Ne publiez le rapport** qu’après relecture : le client le recevra tel quel.
- Une mission **sans responsable** n’avance pas : affectez-la tout de suite.
