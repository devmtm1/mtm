---
id: chantiers
titre: Les chantiers
groupe: metier
resume: Suivre un chantier de la préparation à la réception : planning, journal, budget, dépenses, rapports au client.
roles: chantiers direction administrateur comptabilite
---

Le module **Chantiers** suit les projets de **construction** de MTM, **de la préparation à la réception** : planning, journal quotidien, budget par poste, dépenses, prestataires, pièces et rapports d’avancement pour le client.

![Liste des chantiers](img/cons-01-chantiers.png)

- Les **tuiles** : chantiers actifs (avancement moyen), **en retard**, **budget dépassé**, **dépensé** sur le total devisé.
- Les **pastilles** : *Chantiers actifs*, *En retard*, *Budget dépassé*, *Sans responsable*, *À réceptionner*.
- La **barre d’avancement** passe en **orange** dès qu’un chantier prend du retard ou dépasse son budget.

## Les demandes de devis du site

La page **Construction** du site public comporte un formulaire **« Demander un devis »** : le visiteur indique la nature du projet (villa ou maison, immeuble, rénovation ou extension, aménagement), s'il possède déjà un terrain, la commune, un budget indicatif (facultatif) et des précisions.

- La demande arrive dans **Demandes du site** avec la pastille orange **Devis construction** et un résumé du projet.
- Les personnes qui gèrent la construction reçoivent une **notification** (« Demande de devis de construction »), et la personne est ajoutée au **CRM** comme prospect.
- Un conseiller **rappelle le demandeur** ; si le projet démarre, il crée ensuite le chantier (voir ci-dessous).
- Le budget indicatif n'engage à rien et le devis n'est jamais chiffré en ligne.

## Créer un chantier

1. **Chantiers › Nouveau chantier.**
2. Choisissez le **client**, l’**intitulé du chantier** (« Villa R+1 à Ngaparou ») et la **nature de l’ouvrage** : *Villa*, *Immeuble*, *Local commercial*, *Clôture*, *Rénovation*, *Viabilisation* ou *Autre*. Un **terrain** du catalogue peut être lié.
3. Décrivez le **programme** (« quatre chambres, séjour, cuisine, deux salles d’eau »), l’adresse, la commune et la région, la **surface bâtie** et le nombre de **niveaux**.
4. Renseignez le **montant du devis** signé, le **budget prévu** (le budget travaux interne, à ne pas confondre avec le devis) et les **dates de début et de fin prévues**.
5. Cochez **« Poser le déroulé type des travaux »** : l’application crée le **déroulé type** (fondations, élévation, toiture, second œuvre, finitions…) et évite neuf saisies.

![Nouveau chantier](img/cons-03-nouveau-chantier.png)

> La **fin prévue** ne peut pas précéder le début. Le type de projet doit être dans la liste.

## La fiche du chantier

![Fiche d’un chantier](img/cons-02-fiche-chantier.png)

**Les chiffres du haut** :

| Chiffre | Sens |
| --- | --- |
| **Avancement** | Calculé à partir des étapes : une étape terminée compte pour 100 %, les étapes les plus lourdes comptent davantage. |
| **Le client paie** | Le montant du devis signé. |
| **Déjà dépensé** | Les dépenses **validées** sur le budget travaux. |
| **Marge** | Ce qui reste à l’entreprise si rien d’autre n’est dépensé (devis − budget dépensé). |

**Statuts** : *En préparation* (devis, budget et planning se mettent en place), *En cours* (le journal se tient au quotidien), *Suspendu* (motif conservé), *Réceptionné* (travaux achevés), *Clôturé* (dossier soldé), *Abandonné*. Le bouton **Faire avancer le chantier** (menu ⌄) change le statut.

## Le journal de chantier

Bloc **Journal de chantier** : ce qui s’est passé sur place, **jour par jour**.

1. **+ Journée** (ou le bouton **Saisir la journée** en haut).
2. La **date**, l’**étape (jalon)** concernée, les **intervenants** et l’**effectif**, la **météo**, l’**avancement** constaté (en %), les **observations**.
3. Cochez **« Visible par le client »** pour le faire figurer dans son espace.
4. Ajoutez des **photos** de la journée.

- L’**avancement** saisi **remonte à l’étape concernée** et au chantier.
- Une journée qui **signale un problème** reste **ouverte** jusqu’à ce qu’on la solde : le chantier est alors « en retard » ou « en alerte ».

## Le planning des travaux

Bloc **Planning des travaux** : chaque **barre** est une étape, placée sur sa période ; le trait vertical marque aujourd’hui.

- **+ Étape** ajoute une étape ; **renseignez les dates de début et de fin** : sans elles, le planning ne peut pas se dessiner et aucun retard ne sera détecté.
- États d’une étape : *À venir*, *En cours*, *Terminé*, *Bloqué* (une décision est attendue), *Annulé*.

## Le budget et les dépenses

- **Budget par poste** : ajoutez des postes (gros œuvre, électricité, plomberie…) avec leur **montant prévu**. Sans budget prévisionnel chiffré, aucun dépassement ne peut être détecté.
- **Dépenses** : **+ Dépense** saisit une dépense (poste, montant, fournisseur, justificatif). Elle est **validée par la comptabilité** : une dépense ne pèse sur le budget **qu’une fois contrôlée**.
- Le chantier passe **« budget dépassé »** quand les dépenses validées dépassent le prévu.

> La comptabilité reprend automatiquement les **dépenses de chantier validées** dans le journal financier : inutile de les ressaisir.

## Les prestataires et les pièces

- **Prestataires** : les entreprises engagées (maçonnerie, électricité…) avec leur contact et leur engagement.
- **Pièces** : plans, autorisations, photos, procès-verbaux. **Seules les pièces publiées apparaissent dans l’espace du client.**

## Le rapport d’avancement

Menu ⌄ › **Générer le rapport d’avancement** : un PDF lisible par le client dans son espace une fois publié. Il **ne montre jamais le budget interne** de MTM (marge, coûts).

## Une routine

- **Chaque soir** : saisissez la **journée** (effectif, avancement, observations, photos).
- **Chaque semaine** : relisez le **planning**, mettez à jour les étapes bloquées, **faites le point budget**.
- **Chaque mois** : générez et **publiez le rapport d’avancement** pour le client.
- **À la réception** : passez le chantier à *Réceptionné*, puis *Clôturé* une fois tout soldé.
