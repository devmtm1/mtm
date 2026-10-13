# Tableaux de bord et rapports (J3.2)

Section 23 du cahier des charges : tableaux de bord direction, manager et commercial, et rapports exportables en PDF et en Excel.

## Les trois tableaux de bord

Le tableau de bord (page d'accueil) s'ouvre sur la vue la plus haute que vos droits permettent ; un sélecteur change de vue, et le dernier choix est retenu sur l'appareil.

| Vue | Qui | Contenu |
| --- | --- | --- |
| **Direction** (`rapports:administrer`) | direction, administrateur | Encaissements, revenu de MTM, ventes conclues et résultat avec comparaison à la période précédente de même durée ; alertes (dossiers bloqués, mandats à échéance, impayés prolongés, chantiers en alerte, commissions et saisies à valider) ; tendances sur 12 mois ; activité commerciale et conversion ; revenu par activité ; locations (occupation, recouvrement des loyers, séjours) ; démarches ; chantiers ; meilleurs commerciaux |
| **Équipe** (`rapports:consulter`) | manager, responsable commercial, direction, comptabilité | Activité de chaque commercial (prospects actifs, relances en retard, visites, ventes, chiffre d'affaires, commissions, tâches en retard), atteinte des objectifs, dossiers bloqués. Un clic sur un nom ouvre le tableau de ce commercial |
| **Mon activité** (`crm:consulter`) | chaque collaborateur | Mes prospects et mon pipeline, mes relances (en retard, du jour), mes visites à venir, mes ventes du mois, mon objectif, mes commissions (estimées, à payer, payées), mes tâches, mon agenda du jour |
| **Vue générale** | tous | L'état de chaque module, comme avant |

Un commercial ne voit que ses propres chiffres ; l'encadrement peut ouvrir le tableau d'un commercial.

### Dossiers bloqués

Un dossier encore ouvert dont plus rien ne bouge depuis un délai. Un « mouvement » est une modification du dossier, mais aussi un paiement, une étape, une journée de chantier, une relance : ce qui avance par ses pièces n'est pas signalé comme bloqué.

| Dossier | Bloqué quand… | Délai par défaut |
| --- | --- | --- |
| Vente | ni modification, ni paiement, ni réservation, ni document | 15 jours |
| Mission | ni modification, ni étape, ni règlement | 10 jours |
| Chantier en cours | aucune journée saisie ni modification | 7 jours |
| Prospect actif | aucune activité ni visite, ni modification | 14 jours |
| Tâche | échéance dépassée de plus de… | 3 jours |

Réglage : **Administration › Pilotage et rapports** (cinq champs, 1 à 365 jours) ; la valeur est conservée dans le paramètre `pilotage.seuilsBlocage`, par exemple `{"vente":15,"mission":10,"chantier":7,"prospect":14,"tache":3}`. Les nombres de jours doivent être entiers, de 1 à 365 ; une clé absente garde son défaut.

## Rapports (menu Rapports)

On choisit un rapport, une période (raccourcis : mois, mois précédent, trimestre, année, 12 mois) et, pour certains, une région. Le rapport s'affiche à l'écran, puis s'exporte.

| Rapport | Contenu |
| --- | --- |
| Ventes par période | une ligne par vente conclue, total, détail par mois (filtrable par région) |
| Ventes par zone | par région et par commune : ventes, chiffre d'affaires, prix moyen, superficie vendue |
| Performance des commerciaux | prospects créés, visites, ventes, chiffre d'affaires, commissions, objectif et atteinte |
| Terrains disponibles et vendus | par statut et par région, liste des biens disponibles (photo du jour) |
| Loyers et impayés | attendu, encaissé et recouvrement par bien ; impayés à ce jour avec jours de retard |
| Rentabilité par activité | encaissements, revenu, dépenses, résultat et marge, par activité et par mois |
| Activité des démarches | missions ouvertes, rapports rendus, décisions, délai moyen, règlements |

- **PDF** : en-tête avec logo et mentions légales de MTM (Identité de l'entreprise), indicateurs clés, tableaux paginés avec leur ligne de titres, numéro de page.
- **Excel** : un onglet de synthèse puis un onglet par tableau, avec de vrais nombres, dates et pourcentages ; les cellules qui commencent par `=`, `+`, `-` ou `@` sont neutralisées.
- Les chiffres sont les mêmes à l'écran, en PDF et en Excel : ils viennent du même calcul.
- Un rapport est limité à 500 lignes de détail (le rapport le dit) : réduire la période pour tout voir.

### Export tracé

Permission `rapports:exporter` (direction, manager, comptabilité). Le motif est obligatoire et consigné dans le journal d'audit avec le rapport, la période et le format.

### Envoi automatique par e-mail

Chaque matin à 7 h (heure UTC, soit Dakar), si le jour correspond, les rapports choisis sont envoyés en pièces jointes (PDF et/ou Excel) aux destinataires, pour la **dernière période complète** : la semaine écoulée (lundi→dimanche) tous les lundis, ou le mois précédent le 1er du mois. Un envoi n'a lieu qu'une fois par période (consigné dans le journal d'audit, action `rapport.envoi_auto`) ; si aucun e-mail ne part (SMTP indisponible), rien n'est consigné et le passage du lendemain n'est pas rattrapé : relancer à la main ou attendre la période suivante.

Réglage : **Administration › Pilotage et rapports** (permission `rapports:administrer`) : interrupteur, fréquence, rapports, formats, destinataires, bouton **« M’envoyer un essai »** (un exemplaire à la seule personne connectée, sans compter comme l'envoi de la période), état de la messagerie et derniers envois. La valeur est conservée dans le paramètre `pilotage.envoiAutomatique`, désactivé par défaut :

```json
{"actif":true,"frequence":"hebdomadaire","rapports":["rentabilite_activite","ventes_periode"],"formats":["pdf"],"destinataires":["direction@mtm.sn"]}
```

`frequence` : `hebdomadaire` ou `mensuelle`. `formats` : `pdf`, `xlsx`. Codes de rapports : ceux du tableau ci-dessus (`ventes_periode`, `ventes_zone`, `performance_commerciaux`, `terrains_etat`, `loyers_impayes`, `rentabilite_activite`, `activite_demarches`). Actif exige au moins un rapport et un destinataire ; une valeur invalide est refusée à l'enregistrement. Nécessite la configuration SMTP.

## Définitions à connaître

- **Vente conclue** : dossier au statut « soldé », comptée à sa **date de vente** (posée au moment du solde).
- **Objectif atteint** (vue Équipe et Mon activité) : dossiers engagés du mois (réservés, en paiement ou soldés) ; **ventes soldées** (rapport de performance) : dossiers soldés sur la période. Les deux se lisent avec leur libellé.
- **Revenu, encaissements** : voir `docs/FINANCES.md`.

## Permissions

`rapports:consulter`, `rapports:exporter`, `rapports:administrer` (nouvelles). À rejouer avec le seed, qui crée aussi les réglages `finances.*`, `pilotage.seuilsBlocage` et `notifications.documentManquantJours` : la page Paramètres n'accepte que des clés en minuscules, elle ne pourrait pas les créer à la main.

## Limites connues

- Les chiffres d'équipe couvrent les rôles « commercial » et « responsable commercial ».
- Pas de prévisions : le cahier précise que les analyses avancées peuvent venir progressivement.
