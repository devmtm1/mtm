# Patrimoine matériel

Registre de ce que MTM possède : mobilier, informatique, téléphonie, véhicules, outillage, électroménager… Ce n'est pas le catalogue des biens immobiliers vendus ou gérés pour les clients : c'est le **parc interne** de l'entreprise. Menu **Services → Matériel**.

## L'autocollant « MTM 0003 »

Chaque objet porte un autocollant avec son numéro. La fiche garde ce nombre (`numero`, entier, **unique et jamais réutilisé**) et l'affiche sous la forme « MTM 0003 ».

- **Objet déjà étiqueté** : on saisit son numéro à la création ; un numéro déjà pris est refusé.
- **Nouvel objet** : sans numéro, le suivant est attribué (le plus grand + 1) ; la page « Nouveau matériel » annonce « MTM 0005 » pour qu'on imprime l'autocollant.
- **Recherche** : « 3 », « 0003 », « MTM 0003 » et « mtm-3 » retrouvent la même fiche ; la recherche porte aussi sur la désignation, la marque, le modèle et le numéro de série.

## Ce que fait le module

- **Pages** : la liste du parc, la **fiche** de chaque objet (une page à part, ouverte d'un clic sur sa ligne), la page d'ajout et la page d'inventaire. Rien ne s'ouvre en fenêtre par-dessus la liste.
- **Fiche** : désignation, catégorie, marque, modèle, numéro de série, lieu de rangement, état (neuf, bon, usé, en panne), achat (date, prix, fournisseur), garantie, notes, photos et pièces (photo de l'objet, photo de l'autocollant, facture).
- **Confier** : un objet est confié à un collaborateur, à un chantier ou à une personne nommée (prestataire, visiteur). Un transfert est possible ; le **retour** enregistre l'état et le lieu de rangement. Chaque mouvement est dans l'historique de la fiche.
- **Entretiens** : prévus ou déjà faits (préventif, réparation, contrôle), avec prestataire et coût. Une réparation peut **immobiliser** l'objet (statut « en maintenance ») ; l'objet redevient utilisable quand l'entretien est terminé. La date du prochain entretien est recopiée sur la fiche.
- **Inventaire par lieu** (Matériel → Faire l'inventaire) : on choisit une pièce et on tape le numéro de chaque autocollant vu. Le rapport se met à jour à chaque saisie : à leur place, trouvés ailleurs, manquants (un objet confié ou en maintenance est signalé comme une absence normale), numéros sans fiche, objets sortis du parc retrouvés. À la fin, on peut ranger au lieu inventorié les objets trouvés ailleurs (tracé dans l'historique).
- **Sortie du parc** : vendu, réformé, perdu, volé ou donné, avec un **motif obligatoire**. Rien n'est supprimé : la fiche et son historique restent consultables, mais elle ne se modifie plus et n'apparaît plus dans la liste « en service ».
- **Tableau de bord** : objets en service, en panne, entretiens en retard, garanties qui se terminent dans le mois ; chaque chiffre ouvre la liste correspondante. Export Excel/PDF avec justification.
- **Rappels** : chaque matin à 08:00 (Africa/Dakar), le secrétariat et la Direction sont prévenus des entretiens prévus dans la semaine ou en retard, et des garanties qui se terminent dans les 30 jours. Un rappel par échéance, jamais répété.

## Droits

Ressource `materiel` : `consulter`, `creer`, `modifier` (confier, retour, entretiens, pièces, inventaire), `valider` (**sortie du parc**), `exporter`.

| Rôle | Droits |
| --- | --- |
| Direction | tous |
| Secrétaire | consulter, créer, modifier (pas de sortie du parc) |
| Administrateur | tous |

Le **prix d'achat**, le fournisseur et le coût des entretiens ne sont montrés qu'à qui peut modifier ; un simple lecteur voit le parc sans ces montants. Chaque création, modification, affectation, retour, entretien, dépôt de pièce, sortie et inventaire est inscrit au journal d'audit.

## Réglages

Paramètres → **Patrimoine matériel** : la liste des catégories (`materiel.categories`) et celle des lieux de rangement (`materiel.lieux`), une valeur par ligne. Valeurs proposées tant qu'elles ne sont pas réglées : catégories Mobilier, Informatique, Téléphonie, Véhicule, Outillage, Électroménager, Climatisation, Matériel de bureau, Autre ; lieux Direction, Accueil, Salle de réunion, Bureau commercial, Secrétariat, Dépôt. Un objet garde sa catégorie et son lieu même si on les retire de la liste.

## Mise en production

1. `prisma migrate deploy` (migration `20261124090000_materiel_patrimoine`) puis le seed (ressource `materiel` et droits des rôles Direction et Secrétaire).
2. Régler les catégories et les lieux dans Paramètres.
3. Saisir l'existant avec les numéros déjà collés ; faire un premier inventaire pièce par pièce pour repérer les objets étiquetés mais pas encore enregistrés (« numéros sans fiche »).

## Limites connues

- Pas d'amortissement comptable ni de valeur comptable résiduelle : on garde la date et le prix d'achat, qui permettront de le calculer plus tard selon les règles comptables de MTM.
- Pas de QR code ni de lecture par caméra : l'autocollant actuel est numéroté, la saisie se fait au clavier. Un QR peut s'ajouter plus tard sans changer les numéros.
- Pas d'import tableur : l'existant se saisit fiche par fiche.
- Les photos et pièces sont stockées sur Cloudinary (voir `docs/BACKUP.md`) ; le dépôt réel n'est pas vérifiable en local, comme pour les protocoles.
- Un objet confié à un chantier n'est pas imputé au budget du chantier.
