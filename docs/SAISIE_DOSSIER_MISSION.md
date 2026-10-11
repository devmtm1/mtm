# Enregistrer un dossier de mission (vérification foncière)

Exemple suivi : le dossier d'Alassane Sow (Bambilor, octobre 2026) — visite du site, facture de 250 000 FCFA réglée en deux transferts Wave.

> Les dossiers réels se saisissent en **production**, jamais sur l'environnement de test. Le dossier source (factures, rapports, photos) reste hors du dépôt : le dossier `test reel/` est ignoré par git.

## 1. Le client (CRM → Prospects → Nouveau)

- Nom, prénom, téléphone (cocher « WhatsApp » si besoin), ville de résidence.
- **Identité** (date et lieu de naissance, type et numéro de pièce) : visible uniquement avec la permission `crm:identite` (direction, encadrement commercial, responsable des démarches, administrateur). La facture et le rapport affichent la date et le lieu de naissance, et le **type** de pièce — jamais son numéro.

## 2. La mission (Démarches → Nouvelle mission)

- Type : « Vérification foncière ».
- Localisation : « Commune de Bambilor, à proximité de la VDN 3 Dakar–Saint-Louis » ; commune Bambilor ; région Dakar.
- Date de la demande, responsable.
- **Pièces fournies** : les documents montrés sur place (protocole avec la commune, délibération globale du site).
- La référence est attribuée seule : `MTM-VF-001/2026`.

## 3. Le prix (étape « Étude de faisabilité et facturation »)

- Montant convenu : 250 000.

## 4. La visite (étape « Vérification physique » → Ajouter un constat)

- Date et heure de la visite, accès, environnement, conformité apparente.
- **Personnes présentes** : « Le négociateur et le promoteur du site ».
- Observations : distance à la VDN 3, eau et électricité à 100 m, secteur habité.
- Photos : « Ajouter une photo » sur le constat (elles partent en annexe du rapport, 12 au plus).

## 5. Les règlements (bloc « Règlements et facture »)

Un enregistrement par transfert :

| Date | Envoyé | Frais | Net | Transaction |
|---|---|---|---|---|
| 02/10/2026 17:08 | 150 000 | 1 485 | 148 515 | T_EEYDM5J7P7OEM-S2T |
| 03/10/2026 19:36 | 50 000 | 500 | 49 500 | T_TLEMB7J7OH35ZGZX |

Le solde (50 000) et le statut « Partiellement réglé » se calculent seuls, sur le montant **envoyé** ; les frais restent à part. Une même transaction ne peut être saisie qu'une fois. Le client est prévenu dans son espace.

## 6. La facture

« Générer la facture » produit le PDF `MTM-FAC-VF-001/2026` (client, prestation, règlements, solde, références de transaction, signatures). Après un nouveau règlement, « Régénérer la facture » met la situation à jour **sans changer le numéro ni la date**. Elle n'est visible du client que si vous la publiez.

## 7. Le rapport

Étape « Rapport » : décision (`à compléter` tant que la vérification administrative n'est pas faite), conclusion, réserves, recommandation, puis « Générer le rapport ». Le PDF reprend le constat, les personnes présentes, la facturation avec le solde, et l'annexe photographique.

## Numérotation configurable

Paramètres → « Missions, factures & références » :

- `MTM-{code}-{seq:3}/{annee}` : `{code}` = famille de prestation (VF vérification, DA démarche, PT prestation technique), `{seq:3}` = rang dans l'année sur 3 chiffres, `{annee}` = année.
- Numéro de facture : `MTM-FAC-{code}-{seq:3}/{annee}`.
- Un format sans `{seq}` est refusé. Changer le format ne modifie pas les références déjà attribuées.
