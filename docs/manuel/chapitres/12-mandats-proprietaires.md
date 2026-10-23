---
id: mandats-proprietaires
titre: Mandats, propriétaires et biens
groupe: metier
resume: Enregistrer les propriétaires, signer et suivre les mandats, tenir les fiches de biens à jour.
roles: commercial responsable_commercial direction administrateur
---

Ce chapitre couvre la rubrique **Biens** : **Biens à vendre**, **Mandats**, **Propriétaires**. Le travail d’un commercial sur les biens est détaillé dans *Le travail du commercial* ; ici, le côté **gestion du portefeuille**.

## Les propriétaires

**Immobilier › Propriétaires** : les personnes qui confient leurs terrains à MTM.

![Liste des propriétaires](img/imm-03-proprietaires.png)

- Les **tuiles** : nombre de propriétaires, biens confiés, mandats signés, propriétaires **sans bien** (« enregistrés mais rien de confié : à relancer »).
- **Nouveau propriétaire** : nom, prénom, téléphone, e-mail, notes. Un **matricule** (par exemple *PRO-2026-0004*) est attribué automatiquement : c’est lui qui permet de reconnaître le propriétaire.
- L’œil ouvre la **fiche** : ses terrains et ses mandats, avec la possibilité d’en créer de nouveaux.

> Créez le propriétaire **avant** le bien ou le mandat : ils s’y rattachent.

> **Confidentialité** — Le **téléphone** et l’**e-mail** des propriétaires ne sont visibles que par l’**administrateur** (dans la liste, la fiche, les biens et les mandats). Tous les autres rôles voient le reste de la fiche et reconnaissent le propriétaire à son **matricule** ; ils peuvent saisir les coordonnées à la création, sans pouvoir les relire ni les modifier. Cela évite que les coordonnées soient utilisées en dehors du travail.

## Les mandats

Un **mandat** est l’autorisation donnée par un propriétaire de vendre (ou de gérer) ses biens. **Immobilier › Mandats** les liste.

![Liste des mandats](img/imm-01-mandats.png)

### Créer un mandat

1. **Mandats › Nouveau mandat.**
2. Choisissez le **propriétaire** et le **type** : *Vente*, *Location* ou *Gestion*.
3. Renseignez les **dates de début et de fin**, l’**exclusivité** (un bien ne peut pas être sous deux mandats exclusifs actifs en même temps), le prix et les conditions, l’**alerte avant échéance** (30 jours par défaut).
4. **Enregistrer**, puis **rattachez les biens** (voir plus bas).

### La fiche du mandat

![Fiche d’un mandat](img/imm-02-fiche-mandat.png)

- Le bandeau orange **« À faire sur ce mandat »** rappelle ce qui manque (par exemple *Joindre le contrat signé*).
- Les tuiles : **lots confiés** (disponibles, réservés, vendus), **chiffre d’affaires** des lots vendus, **commissions estimées**, **reste à commercialiser**.
- **Biens confiés (lots)** : les biens que le mandat autorise MTM à commercialiser, avec leur avancement. **Rattacher un terrain** ajoute un lot ; la corbeille le retire.
- **Documents** : le contrat signé, les avenants, les preuves de signature. **Joignez au minimum le contrat signé.**
- **Changer le statut** : *Brouillon*, *Actif*, *Expiré*, *Résilié* ou *Clôturé*.

> **Important** — Un mandat qui approche de sa fin déclenche une **notification** (30 jours avant, par défaut) et apparaît dans l’alerte « Mandats à échéance » du tableau de bord de la direction. **Renouvelez ou clôturez-le à temps** : un bien sans mandat valide ne doit pas être proposé.

## Les biens

**Immobilier › Biens à vendre** : terrains, villas et appartements.

### Créer un bien

1. **Biens à vendre › Nouveau bien.**
2. Renseignez au minimum la **localité** et le **titre juridique** (titre foncier, bail, délibération…), puis le **propriétaire**, la **superficie** et les **prix** : prix d’acquisition (interne) et **prix public**.
3. Désignez le **commercial responsable** : seul lui (et l’encadrement) verra le bien dans le back-office.
4. Ajoutez des **photos** et la **position GPS**.
5. Choisissez le **statut commercial** : *Brouillon* (non publié), *Disponible* (publié sur le site), *Réservé*, *Vendu* ou *Suspendu*.

> Seuls les biens **Disponibles** apparaissent sur le **site public**. Un bien réservé ou vendu en disparaît tout seul.

Le **prix d’acquisition** et la **marge** sont internes : ils ne sont visibles que des rôles autorisés (direction, manager, comptabilité) et servent au calcul du **revenu de MTM** (voir *Comptabilité et finances*). Renseignez-les : un bien vendu sans marge compte pour zéro dans les chiffres.

### Importer des biens depuis un tableur

Pour reprendre un fichier Excel ou Google Sheets (« Bd terrains MTM IMMO ») **sans tout saisir à la main** :

![Import de biens](img/adm-08-import-biens.png)

1. **Biens à vendre › Importer depuis Excel** (réservé à ceux qui peuvent créer des biens).
2. Déposez le fichier **.xlsx** ou **.csv** (5 Mo et 5 000 lignes au maximum). Un classeur à plusieurs onglets propose de choisir l’onglet.
3. **Aperçu** : biens à créer, déjà présents, lignes refusées avec la raison. **Rien n’est écrit à ce stade.**
4. **Importer N biens** pour confirmer. Les biens arrivent en **Brouillon** : relisez-les avant de les publier.

Les colonnes se reconnaissent à leur titre (matricule, localité, titre juridique, prix, propriétaire, téléphone, surface…) ; seules **LOCALITE** et **TITRE JURIDIQUE** sont indispensables. L’import ne touche jamais à un bien déjà présent et chaque import est consigné dans l’historique des actions.

## Les bonnes habitudes

- **Un propriétaire, un mandat, un bien** : créez dans cet ordre.
- **Photographiez** chaque bien et placez-le sur la carte (GPS) : c’est ce qui fait réagir les acheteurs.
- Gardez le **statut commercial** à jour : un bien vendu encore « Disponible » trompe les clients.
- Surveillez les **fiches à compléter** (tuiles de la liste) : sans photo ou sans GPS, elles se vendent moins bien.
