# Dictionnaire Grist proposé — non appliqué

Légende source : **publique** = API ; **manuelle** = utilisateur ; **système** = serveur. Toutes les colonnes sont sans impact sur l'existant tant que les nouvelles tables ne sont pas autorisées.

## `EUC_ENTREPRISES` — une ligne par SIRET

| ID / libellé | Type Grist | Requis | Source | Validation / doublon / référence |
|---|---|---:|---|---|
| `SIRET` / SIRET | Text | oui | publique | 14 chiffres, Luhn; unicité fonctionnelle |
| `SIREN` / SIREN | Text | oui | publique | 9 premiers chiffres du SIRET |
| `Raison_sociale` / Raison sociale | Text | oui | publique+manuelle | 250 car. |
| `Enseigne` / Enseigne | Text | non | publique+manuelle | 250 car. |
| `Est_siege` / Établissement siège | Bool | non | publique | booléen |
| `Etat` / État | Choice | oui | publique+manuelle | Actif, Fermé, Inconnu |
| `Forme_juridique` / Forme juridique | Text | non | publique | code/libellé selon audit |
| `Code_APE` / Code APE/NAF | Text | non | publique | format NAF |
| `Libelle_activite` / Activité | Text | non | publique+manuelle | 500 car. |
| `Date_creation` / Création établissement | Date | non | publique | date valide |
| `Complement_adresse` / Complément | Text | non | publique+manuelle | 250 car. |
| `Numero_voie` / Numéro et voie | Text | non | publique+manuelle | 250 car. |
| `Code_postal` / Code postal | Text | non | publique+manuelle | 5 chiffres ou cas étranger |
| `Commune` / Commune | Text | non | publique+manuelle | 150 car. |
| `Pays` / Pays | Text | non | publique+manuelle | France par défaut |
| `Adresse_complete` / Adresse complète | Text | non | publique+manuelle | 500 car. |
| `Telephone`, `Telephone_2` / Téléphones | Text | non | manuelle | format souple, non fourni par Sirene |
| `Courriel` / Courriel général | Text | non | manuelle | adresse valide |
| `Site_web` / Site | Text | non | manuelle | URL valide |
| `Accueil_eleves` / Accueil possible | Bool | non | manuelle | booléen |
| `Statut_relation` / Relation | Choice | non | manuelle | liste à valider |
| `Commentaire_interne` / Commentaire | Text | non | manuelle | 5000 car., accès restreint |
| `Premiere_relation`, `Derniere_relation` | Date | non | manuelle/système | chronologie cohérente |
| `Origine_creation`, `Auteur_creation` | Text | non | système | traçabilité |

## `EUC_CONTACTS_ENTREPRISES`

| ID / libellé | Type Grist | Requis | Source | Validation / doublon / référence |
|---|---|---:|---|---|
| `Entreprise` / Entreprise | Ref:`EUC_ENTREPRISES` | oui | manuelle | référence valide |
| `Civilite`, `Prenom`, `Nom`, `Fonction` | Text | nom oui | manuelle | doublon approché entreprise+courriel ou entreprise+nom+prénom |
| `Telephone_direct`, `Courriel_direct` | Text | non | manuelle | téléphone/courriel valide |
| `Type_contact`, `Origine_donnee` | Choice | non | manuelle | vocabulaires à valider |
| `Actif` / Contact actif | Bool | oui | manuelle | vrai par défaut |

## `EUC_RELATIONS_ENTREPRISES` (facultative)

| ID / libellé | Type Grist | Requis | Source | Validation / doublon / référence |
|---|---|---:|---|---|
| `Entreprise` / Entreprise | Ref:`EUC_ENTREPRISES` | oui | manuelle | référence valide |
| `Date_action` / Date | DateTime | oui | manuelle/système | date valide |
| `Type_action` / Type | Choice | oui | manuelle | contact, visite, accueil, retour, changement |
| `Commentaire`, `Auteur` | Text | non | manuelle/système | accès interne; doublon date+type+auteur à contrôler |

## Liens futurs documentés

PFMP/alternance, élèves/apprentis, enseignants, formations, visites et ordres de mission pourront référencer `EUC_ENTREPRISES`; tuteurs et interlocuteurs référenceront `EUC_CONTACTS_ENTREPRISES`. Aucun lien ne sera ajouté avant l'audit des tables réelles.
