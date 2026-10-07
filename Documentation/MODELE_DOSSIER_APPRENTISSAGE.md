# Modèle modifiable du dossier d’apprentissage

## Principe

Le document Word fourni par le métier est le modèle maître. Il conserve les huit
pages dans l’ordre suivant : dossier de candidature, fiche de renseignements,
informations utiles et positionnement pédagogique.

Le fichier préparé s’appelle `dossier_apprentissage_modele_editable.docx`. Il
reste modifiable dans Word. Pour l’utiliser dans Eucalyptus PFMP :

1. déposer le DOCX dans Google Drive ;
2. l’ouvrir avec Google Docs et l’enregistrer comme document Google Docs ;
3. dans `Administration PFMP → Dossier de demande d’apprentissage → Gérer les
   modèles Google Docs`, saisir un nom et coller le lien du document ;
4. le sélectionner comme modèle par défaut si nécessaire.

À chaque génération, l’application copie temporairement le Google Docs,
remplace les balises, exporte la copie en PDF puis place la copie temporaire à
la corbeille. Le modèle maître n’est jamais modifié.

## Règles d’édition

- Une balise peut être déplacée dans Word ou Google Docs.
- Son nom et ses doubles accolades doivent rester inchangés.
- La balise doit être saisie d’un seul tenant, sans changement de police ou de
  style à l’intérieur.
- La pagination utilise les champs natifs `PAGE` et `NUMPAGES`. Il ne faut pas
  les remplacer par `{{PAGE_COURANTE}}` ou `{{NB_PAGES}}`.
- `{{DATE_HEURE_IMPRESSION}}` est remplacé au moment de la génération et figure
  sur les huit pages.
- Une balise reconnue sans donnée disponible est remplacée par une valeur vide ;
  aucune information n’est inventée.

## Contrôles automatiques

Lors de l’ajout d’un modèle, l’application refuse :

- un PDF ou un fichier qui n’est pas un Google Docs ;
- l’absence de `{{ELEVE_NOM}}` ou `{{ELEVE_PRENOM}}` ;
- une balise inconnue ;
- les anciennes balises de pagination textuelles.

Après fusion, la génération est interrompue si une balise résiduelle demeure.
Cela évite de remettre un dossier portant encore des textes `{{...}}`.

## Familles de balises du modèle validé

- Élève : identité, naissance, nationalité, coordonnées, INE, NIR, situation et
  formation.
- Responsables légaux : identité, adresse, coordonnées et profession pour deux
  responsables.
- Scolarité : dernier établissement, dernière classe et dernier diplôme.
- Entreprise : raison sociale, enseigne, adresse, SIRET, coordonnées, statut,
  convention collective, OPCO et contacts.
- Maître d’apprentissage et contact RH.
- Contrat, rémunération et avantages.
- Formation et positionnement pédagogique.
- Ancien apprentissage, internat et origine de candidature.

Le modèle validé contient `135` balises de fusion distinctes après remplacement
des deux anciennes balises de pagination par les vrais champs Word.
