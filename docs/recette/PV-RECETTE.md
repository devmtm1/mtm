# Procès-verbaux de recette — MTM Immobilier

Exigence : sections 30, 31 et 32 du cahier des charges — « procès-verbal ou
fiche de recette par module », « recette métier par MTM sur des scénarios
réels ou représentatifs », « aucune fonctionnalité critique ne doit être
considérée comme terminée sans critère d'acceptation validé ».

## Comment lire et utiliser ce document

- Chaque jalon a sa fiche. Les **critères d'acceptation** viennent du planning
  d'exécution ; les **preuves automatisées** sont les tests du dépôt qui les
  couvrent (relancés à chaque envoi de code par la CI).
- Une preuve automatisée **ne remplace pas** la recette métier : seule MTM peut
  dire que le parcours correspond à son activité. Les cases « Recette MTM »
  sont donc **volontairement vides** : elles se cochent lors de la démonstration,
  sur des cas réels, et la fiche se signe.
- Un jalon ne passe en « Validé » qu'avec les deux signatures. Toute anomalie
  relevée pendant la recette est inscrite dans « Anomalies et réserves », avec
  sa décision (corrigée avant validation, ou acceptée comme réserve datée).
- Vérifier les preuves : `npm run test --workspace=apps/api`,
  `npm run test:e2e --workspace=apps/api`, puis `npm run check:csp`.

## État de validation

| Jalon | Périmètre | Preuves automatisées | Validation MTM |
| --- | --- | --- | --- |
| J0.1 | Socle, sécurité, rôles, audit | oui | à signer |
| J1.1 | Biens (terrains et villas) | oui | à signer |
| J1.2 | Site public | partielle | à signer |
| J1.3 | Cartographie de base | non (visuel) | à signer |
| J1.4 | Mandats et portefeuille | oui | à signer |
| J1.5 | CRM | oui | à signer |
| J1.6 | Ventes, paiements, commissions, GED de base, espace client | oui | à signer |
| J2.1 | Gestion locative | oui | à signer |
| J2.2 | Démarches et vérification foncière | oui | à signer |
| J2.3 | Construction et suivi de chantier | oui | à signer |
| J2.4 | Agenda, tâches, notifications | partielle (notifications, GED) | à signer quand le jalon est terminé |

Réserve générale (tous jalons) : le **paiement en ligne** par un prestataire
(Wave, Orange Money, carte) n'est pas implémenté ; il est reporté à une décision
de MTM et ne figure pas dans les critères ci-dessous.

---

## J0.1 — Socle technique et sécurité de base

**Critères d'acceptation**

1. Un administrateur se connecte avec une session sécurisée.
2. Il crée un utilisateur, lui attribue un rôle et des permissions.
3. La double authentification s'active et se teste sur un compte sensible.
4. L'action apparaît dans le journal d'audit avec ancien et nouveau contexte.
5. Une sauvegarde de test se restaure sans perte de données critiques.
6. Un utilisateur sans permission ne peut ni exporter ni modifier les données sensibles.
7. Aucun secret n'est présent dans le dépôt.

**Preuves automatisées** : `test/critical-path.e2e-spec.ts` (1 à 4),
`test/postgres.e2e-spec.ts`, `src/modules/auth/*.spec.ts` (verrouillage,
double authentification, codes de secours), `src/modules/users/users.service.spec.ts`
(pas d'élévation de privilèges, dernier administrateur protégé),
`src/modules/auth/route-access.spec.ts` (aucune route sans déclaration d'accès),
`apps/api/scripts/test-backup-restore.sh` et le workflow
`.github/workflows/backup-production.yml` (5).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Création d'un vrai compte et attribution d'un rôle | ☐ | |
| Activation de la double authentification sur un téléphone réel | ☐ | |
| Restauration d'une sauvegarde de production dans une base de test | ☐ | |

**Anomalies et réserves** : sauvegarde de production externe à configurer
(secrets du workflow) ; dépôt à transférer à une organisation MTM.

---

## J1.1 — Biens (terrains et villas)

**Critères** : un commercial crée une fiche complète et la fait évoluer avec
traçabilité ; les modifications de prix d'acquisition, de marge, de commission
ou de propriétaire exigent une justification ; ces montants restent invisibles
à qui n'y a pas droit.

**Preuves** : `test/terrains.e2e-spec.ts` (justification obligatoire, montants
masqués, audit avec vraies valeurs), `terrains.service.spec.ts`,
`src/modules/rbac/access-scopes.spec.ts` (périmètre par commercial).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Saisie de 3 biens réels (un terrain, une villa, un bien en régularisation) | ☐ | |
| Modification d'un prix avec justification, puis lecture du journal | ☐ | |
| Connexion d'un commercial : il ne voit que ses biens | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.2 — Site public

**Critères** : site consultable, connecté aux vraies données, **sans fuite
d'information interne** ; contenus administrables ; responsive.

**Preuves** : `test/public-cache.e2e-spec.ts`, `terrains-public.service.spec.ts`
(projection publique), tests du site (`apps/public-web`, 62 tests), contrôle de
la politique de sécurité du contenu (`npm run check:csp`), pages légales.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Parcours sur téléphone : accueil, catalogue, fiche, demande de visite | ☐ | |
| Vérification qu'aucun prix d'acquisition ni marge n'apparaît (fiche, code source, réponse de l'API) | ☐ | |
| Modification d'un contenu du site depuis le back-office | ☐ | |
| Relecture des mentions légales et de la politique de confidentialité par un juriste ; renseignement du NINEA, du RCCM et du directeur de publication | ☐ | |

**Anomalies et réserves** : NINEA, RCCM, directeur de publication et durées de
conservation à renseigner (« à compléter par MTM » sur les pages légales).

---

## J1.3 — Cartographie de base

**Critères** : les biens sont localisables sur la fiche publique et en
back-office ; plan et vue satellite.

**Preuves** : aucune automatisée (rendu cartographique). Les bulles de carte
sont construites en texte, pas en HTML (`map-popup.spec.ts`).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un bien avec coordonnées GPS apparaît au bon endroit (plan et satellite) | ☐ | |
| Points d'intérêt et itinéraire sur une fiche | ☐ | |

**Anomalies et réserves** : plans géoréférencés et délimitation de parcelles
prévus au jalon J3.3.

---

## J1.4 — Mandats et portefeuille propriétaire

**Critères** : un mandat complet est créé, suivi, rattaché à ses lots ;
alertes avant échéance ; restrictions contractuelles enregistrées.

**Preuves** : `test/mandats.e2e-spec.ts`, `mandats-*.spec.ts`, `cron.service.spec.ts`
(alerte d'échéance, une par jour, notification et e-mail au commercial).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Saisie d'un mandat réel de deux ans avec ses lots | ☐ | |
| Réception de l'alerte d'échéance (cloche et e-mail) sur un mandat proche de sa fin | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.5 — CRM prospects et clients

**Critères** : un commercial gère son pipeline de bout en bout ; vue personnelle
et vue manager ; vue 360° du client.

**Preuves** : `test/crm.e2e-spec.ts`, `crm*.spec.ts`, `access-scopes.spec.ts`
(un commercial ne voit pas les prospects d'un autre).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Parcours d'un prospect réel du premier contact à la vente | ☐ | |
| Vue manager : tous les prospects de l'équipe | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J1.6 — Ventes, réservations, paiements, commissions, GED de base, espace client

**Critères** : de la fiche prospect à la commission payée, avec traçabilité
complète et sans exposition de données internes ; documents générables ;
espace client sécurisé.

**Preuves** : `test/ventes.e2e-spec.ts` (réservation, paiement, validation,
**refus**, **contre-passation**, annulation avec paiements, documents privés
restant privés, notifications), `ventes-*.spec.ts`, `client-portal.service.spec.ts`,
`test/ged.e2e-spec.ts` (recherche documentaire cloisonnée).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Vente complète d'un terrain réel, jusqu'au paiement de la commission | ☐ | |
| Refus d'un paiement dont le virement est introuvable | ☐ | |
| Contre-passation d'un paiement avec remboursement | ☐ | |
| Document déposé « non public » : absent de l'espace client | ☐ | |
| Décision sur la validation des paiements par une autre personne (paramètre `paiements.validationParUnAutre`) | ☐ | |
| Règles de remboursement de l'acompte à l'annulation, à transcrire dans les conditions de réservation | ☐ | |

**Anomalies et réserves** : **paiement en ligne non implémenté** (décision MTM
en attente) ; les règles de remboursement relèvent de la politique commerciale
de MTM.

---

## J2.1 — Gestion locative

**Critères** : un bail est suivi de la mise en location à la sortie du
locataire ; loyers, caution, relances ; espaces propriétaire et locataire.

**Preuves** : `test/locatif.e2e-spec.ts`, `src/modules/locatif/*.spec.ts`,
notification quotidienne des relances à envoyer.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un bail réel de la signature à la sortie, avec restitution de caution | ☐ | |
| Relance de loyer en retard : calendrier et modèles validés | ☐ | |
| Espace locataire et espace propriétaire : lecture des quittances et des loyers | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J2.2 — Démarches et vérification foncière

**Critères** : une mission est suivie de la demande au rapport final envoyé au
client ; tarifs configurables ; traçabilité des vérifications.

**Preuves** : `test/demarches.e2e-spec.ts`, `src/modules/demarches/*.spec.ts`.

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Une mission réelle de vérification, rapport PDF consulté par le client | ☐ | |
| Tarifs de vérification validés par la direction | ☐ | |

**Anomalies et réserves** : aucune connue.

---

## J2.3 — Construction et suivi de chantier

**Critères** : un chantier est suivi avec journal, planning et alertes de retard
ou de dépassement budgétaire ; espace client.

**Preuves** : `test/construction.e2e-spec.ts`, `src/modules/construction/*.spec.ts`,
notification d'alerte de chantier (cloche et e-mail).

| Recette MTM | Fait | Date |
| --- | --- | --- |
| Un chantier réel : budget, jalons, journal avec photos | ☐ | |
| Alerte de retard reçue par le responsable | ☐ | |

**Anomalies et réserves** : vue de type Gantt non réalisée (« si possible »
dans le cahier des charges).

---

## Modèle de fiche de signature (à reproduire pour chaque jalon)

```
Jalon :                         Date de la démonstration :
Participants MTM :              Participants développement :

Critères d'acceptation vérifiés :     ☐ tous   ☐ avec réserves (voir ci-dessous)
Anomalies relevées :
  1. …  → décision : ☐ corrigée avant validation  ☐ réserve acceptée, à corriger avant le …

Décision :   ☐ Jalon validé     ☐ Jalon refusé (nouvelle recette le …)

Pour MTM Immobilier                         Pour le développeur
Nom / fonction :                            Nom :
Date / signature :                          Date / signature :
```
