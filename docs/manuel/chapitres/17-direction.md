---
id: direction
titre: La direction : chiffres et rapports
groupe: metier
resume: Le tableau de bord de direction, les sept rapports PDF et Excel, l’envoi automatique par e-mail.
roles: direction responsable_commercial comptabilite administrateur
---

Ce chapitre s’adresse à la **direction** et à celles et ceux qui consultent les chiffres de l’entreprise : responsables, comptabilité. Pour la partie commerciale, voir *Piloter l’équipe commerciale* ; pour l’argent, *Comptabilité et finances*.

## Le tableau de bord de direction

À la connexion, la direction arrive sur l’**Accueil**. Les onglets **Direction**, **Équipe** et **Mon activité** sont à côté ; le dernier choix est retenu sur l’appareil.

![Tableau de bord de direction](img/dir-01-tableau-direction.png)

- **Période** : *Ce mois-ci*, *Mois précédent*, *Ce trimestre*, *Cette année*, *12 derniers mois*. Chaque chiffre est **comparé à la période précédente de même durée**.
- **Les quatre tuiles** : **Encaissements**, **Revenu de MTM**, **Ventes conclues**, **Résultat**.
- **À surveiller** (six alertes cliquables) :

| Alerte | Sens |
| --- | --- |
| **Dossiers bloqués** | Dossiers ouverts qui n’ont plus bougé depuis un délai (voir la vue Équipe) |
| **Mandats à échéance** | Mandats qui se terminent sous 30 jours : à renouveler ou clore |
| **Impayés de loyer prolongés** | Plus de 30 jours de retard |
| **Chantiers en alerte** | En retard ou hors budget |
| **Commissions à valider** | Estimées, en attente d’un valideur |
| **Saisies financières à valider** | Elles ne comptent pas encore dans les totaux |

- Plus bas : **revenu et dépenses sur 12 mois**, **ventes conclues par mois**, activité commerciale et **taux de conversion**, **revenu par activité**, **locations** (occupation, recouvrement des loyers, séjours), **démarches**, **chantiers**, **meilleurs commerciaux**.

> **Définitions** — Une **vente conclue** est un dossier au statut « soldé », comptée à sa **date de vente**. Les définitions d’encaissements et de revenu sont détaillées dans le chapitre *Comptabilité et finances*.

## Les rapports

**Rapports** (menu principal) : sept rapports, à lire à l’écran puis à **exporter**.

![Les rapports](img/dir-02-rapports.png)

| Rapport | Contenu |
| --- | --- |
| **Ventes par période** | Une ligne par vente conclue, total, détail par mois (filtrable par région) |
| **Ventes par zone** | Par région et par commune : ventes, chiffre d’affaires, prix moyen, superficie vendue |
| **Performance des commerciaux** | Prospects créés, visites, ventes, chiffre d’affaires, commissions, objectif et atteinte |
| **Terrains disponibles et vendus** | Par statut et par région, liste des biens disponibles (photo du jour) |
| **Loyers et impayés** | Attendu, encaissé et recouvrement par bien ; impayés à ce jour avec jours de retard |
| **Rentabilité par activité** | Encaissements, revenu, dépenses, résultat et marge, par activité et par mois |
| **Activité des démarches** | Missions ouvertes, rapports rendus, décisions, délai moyen, règlements |

### Lire un rapport

1. **Cliquez sur la carte** du rapport voulu.
2. Choisissez la **période** (champs *Du* et *Au*, ou un **raccourci** : mois, mois précédent, trimestre, année, 12 mois) et, pour certains rapports, une **région**.
3. **Actualiser** : le rapport s’affiche à l’écran avec ses chiffres clés et ses tableaux.

![Un rapport à l’écran](img/dir-03-rapport-ventes.png)

> Un rapport est **limité à 500 lignes de détail** (il le dit) : réduisez la période pour tout voir. Les chiffres sont **les mêmes** à l’écran, en PDF et en Excel : ils viennent du même calcul.

### Exporter en PDF ou en Excel

**Exporter (PDF ou Excel)** :

![Export d’un rapport](img/dir-06-export-rapport.png)

- **Document PDF** : mis en page avec le **logo et les mentions légales de MTM**, prêt à imprimer ; tableaux paginés avec leur ligne de titres, numéro de page.
- **Classeur Excel** : un onglet de synthèse puis **un onglet par tableau**, avec de vrais nombres, dates et pourcentages pour trier et totaliser.
- **Motif de l’export obligatoire** : il est consigné dans l’**historique des actions** avec le rapport, la période et le format.

### L’envoi automatique par e-mail

MTM peut recevoir des rapports **sans les ouvrir** : chaque matin à 7 h (heure de Dakar), si le jour correspond, les rapports choisis partent en **pièces jointes** (PDF et/ou Excel) vers les destinataires, pour la **dernière période complète** :

- **hebdomadaire** : la semaine écoulée (lundi → dimanche), envoyée **chaque lundi** ;
- **mensuelle** : le mois précédent, envoyé **le 1er du mois**.

Un envoi n’a lieu **qu’une fois par période**. Il est **désactivé par défaut**. La direction et les administrateurs le règlent dans **Administration › Alertes et rapports automatiques** : un formulaire (activer, fréquence, rapports, formats, destinataires), un bouton **« M’envoyer un essai »** qui envoie un exemplaire à votre seule adresse, l’état de la messagerie du serveur et la liste des **derniers envois**.

## L’historique des actions

Pour savoir **qui a fait quoi, quand** (création, modification, export, validation, connexion…), la direction consulte **Administration › Historique des actions**.

![Historique des actions](img/dir-05-audit.png)

- Filtres : recherche, période, module, élément.
- Chaque ligne s’ouvre pour montrer l’**avant / après**, le **motif** éventuel et l’adresse de connexion.
- L’**export** du journal demande lui-même un motif, consigné.

## Les chiffres financiers

La rubrique **Pilotage et finances** donne à la direction la vue d’ensemble : tableau de bord financier, journal, saisies, clôtures.

![Tableau de bord financier](img/dir-04-finances.png)

La direction a tous les droits sur les finances (consulter, saisir, valider, exporter, **clôturer et rouvrir un mois**). Les règles (deux regards, mois clôturé) sont décrites dans *Comptabilité et finances*.

## Une routine de pilotage

- **Chaque lundi** : lisez les six alertes **À surveiller**, puis le rapport **Rentabilité par activité**.
- **Chaque mois** : exportez *Ventes par période* et *Performance des commerciaux* ; vérifiez la **clôture** avec la comptabilité.
- **Chaque trimestre** : comparez les tendances sur 12 mois et revoyez les **objectifs** de l’équipe.
