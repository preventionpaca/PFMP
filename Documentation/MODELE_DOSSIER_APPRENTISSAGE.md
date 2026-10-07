# Modèle modifiable du dossier d’apprentissage

## Principe

Le document Word fourni par le métier est le modèle maître. Il conserve les huit
pages dans l’ordre suivant : dossier de candidature, fiche de renseignements,
informations utiles et positionnement pédagogique.

Le fichier préparé s’appelle `dossier_apprentissage_modele_balises_pdf.docx`. Il
reste modifiable dans Word. Pour l’utiliser dans Eucalyptus PFMP :

1. modifier le DOCX dans Word ;
2. l’exporter en PDF en conservant le texte ;
3. dans `Administration PFMP → Dossier de demande d’apprentissage → Gérer les
   modèles PDF`, saisir un nom et choisir le PDF ;
4. le sélectionner comme modèle par défaut si nécessaire.

À chaque génération, l’application localise les balises dans le PDF enregistré,
les masque visuellement et écrit les valeurs à leur place. Le modèle maître
n’est jamais modifié.

## Règles d’édition

- Une balise peut être déplacée dans Word.
- Son nom et ses doubles accolades doivent rester inchangés.
- La balise doit être saisie d’un seul tenant, sans changement de police ou de
  style à l’intérieur.
- La pagination utilise `{{PAGE_COURANTE}}` et `{{NB_PAGES}}` dans le PDF.
- `{{DATE_HEURE_IMPRESSION}}` est remplacé au moment de la génération et figure
  sur les huit pages.
- Une balise reconnue sans donnée disponible est remplacée par une valeur vide ;
  aucune information n’est inventée.

## Contrôles automatiques

Lors de l’ajout ou de l’utilisation d’un modèle, l’application refuse :

- un fichier qui n’est pas un vrai PDF ou dépasse 8 Mo ;
- un PDF qui ne contient pas exactement huit pages ;
- l’absence de `{{ELEVE_NOM}}` ou `{{ELEVE_PRENOM}}` ;
- un PDF dans lequel moins de cent balises sont reconnues.

La liste exhaustive et les sept alias courts obligatoires sont documentés dans
`Documentation/BALISES_DOSSIER_APPRENTISSAGE.md`.

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

Le modèle validé contient `137` balises distinctes, toutes reconnues dans le PDF
exporté.
