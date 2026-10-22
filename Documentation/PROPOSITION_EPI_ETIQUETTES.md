# Proposition — EPI (essayage, étiquettes fournisseur, fiches de remise) et étiquettes / badges d'événement

Statut : validée le 23 octobre 2026 (tables autorisées). Lot 1 livré (DEV620) : réglages, vagues, essayage, élèves hors Pronote, table `EUC_ADMINISTRATIFS`.
Décisions : identification par nom et prénom saisis à l'ouverture de la page (pas de contrôle d'accès supplémentaire) ; les imports Excel sont mémorisés dans une table ; les étiquettes déjà produites sont filtrables pour ne pas les refaire.

## Besoins exprimés

- Chaque classe reçoit une **tenue** (combinaison, blouson + pantalon, blouse
  blanche, blouson sans manches l'été…) et des **chaussures de sécurité**.
- L'**essayage** se fait en salle d'essayage par les professeurs, l'utilisateur
  ou Sabine. Aujourd'hui, ils saisissent dans un Google Sheet partagé.
- On saisit **une taille par pièce** (pas de longueur : les ourlets sont à la
  charge des jeunes) et la pointure.
- Les commandes se font **par vague** (« Vague 2 »).
- Le **fournisseur** reçoit un fichier image par élève, imprimé par sa machine
  sur une étiquette pré-imprimée au logo du lycée, puis collée sur le vêtement.
  Le format actuel est :
  - un JPEG par élève à 144 dpi (« Groupe 1_01.jpg ») ;
  - étiquette de 9,50 × 4,85 cm ;
  - contenu : NOM (gras), Prénom (gras), formation (« BTS CPRP »), promotion
    (« 2026-2028 ») ;
  - la taille ne figure pas sur l'étiquette.
- La **fiche de remise** (émargement) se fait par classe, en PDF : date de remise,
  élèves, pièces et tailles, case signature.
- Il faut pouvoir saisir des **élèves absents de Pronote** (passerelle, dossier en
  cours) et les rattacher plus tard.
- Les **badges et étiquettes d'événement** (concours, manifestations) sont
  imprimés au lycée.
  - Le format dépend de la pochette : par exemple 9,95 × 6,99 cm, 2 × 4 par A4,
    avec une image de fond.
  - Les champs sont placés librement, avec police, taille, gras, italique,
    souligné et alignement, comme dans Labeljoy ou JotForm.
  - Les personnes viennent de plusieurs sources : élèves, partenaires
    (professionnels), professeurs, administratifs, et un classeur Excel au format
    fourni.
- L'**identification** reste basique : au démarrage du poste, la personne saisit
  ses nom et prénom pour accéder à la page. Chaque saisie d'essayage enregistre
  ce nom.

## Écrans (nouvelle carte « EPI et étiquettes » de l'Administration)

1. **Réglages EPI**
   - Pièces et leurs grilles de tailles :
     - combinaison 1 à 4 ;
     - blouson S à XXL ;
     - pantalon ;
     - blouse 1 à 5 ;
     - blouson sans manches ;
     - chaussures (pointures).
   - Tenues, chacune avec sa liste de pièces.
   - Association classe → tenue, par année. Une variante (« été ») est possible
     par vague.
2. **Essayage par classe** (page proche du Google Sheet)
   - Le choix de la classe et de la vague affiche les élèves (Pronote) avec une
     colonne de taille par pièce de la tenue, en liste déroulante.
   - Le professeur d'essayage se choisit dans une liste, avec « appliquer à toute
     la classe ».
   - « Ajouter un élève hors Pronote » ouvre une fiche provisoire (nom, prénom,
     classe ou formation). Elle se rattache plus tard au vrai dossier, quand
     l'élève apparaît dans Pronote.
   - Au premier accès sur un poste, la page demande « Votre nom et prénom »,
     retenu sur ce poste. Chaque saisie porte ce nom et la date.
3. **Étiquettes fournisseur**
   - Choix de la vague, éventuellement des classes, avec un aperçu de la planche.
   - Export en un fichier ZIP : un JPEG 144 dpi par élève, 9,50 × 4,85 cm, nommé
     dans l'ordre (classe, nom).
   - Le modèle d'étiquette EPI se règle dans l'éditeur de modèles (écran 5).
4. **Fiche de remise**
   - PDF par classe et vague, avec la date de remise, les colonnes Élève, Pièces
     et tailles, Signature.
   - Ensuite, on coche « remis » par élève ou pour toute la classe.
5. **Modèles d'étiquettes et badges**
   - Format de planche : page A4, colonnes, rangées, marges, espacements et
     taille de l'étiquette (repris de la fenêtre « Mise en page » de Labeljoy).
   - Image de fond.
   - Zones de texte placées à la souris, chacune avec : champ (Nom, Prénom,
     Organisme, Fonction, Rôle, Classe, Formation, Promotion, texte libre),
     police, taille, gras, italique, souligné, alignement et couleur.
   - Sortie : PDF A4 à imprimer (badges), ou ZIP de JPEG (fournisseur).
6. **Listes d'événement**
   - Un événement (nom, date, modèle) et ses participants, puisés dans :
     - les élèves (par classe) ;
     - les partenaires et contacts des entreprises ;
     - les professeurs ;
     - les administratifs ;
     - un classeur Excel collé ou importé.
   - Colonnes du classeur : **Nom ; Prénom ; Organisme ; Fonction ; Rôle ;
     Classe ; Libre 1 ; Libre 2**.

## Tables Grist (nouvelles, préfixe `EUC_EPI_` / `EUC_ETQ_`)

| Table | Contenu |
|---|---|
| `EUC_EPI_PIECES` | Code, Libellé, Tailles (liste ordonnée), Ordre, Actif |
| `EUC_EPI_TENUES` | Code, Libellé, Pièces (codes), Actif |
| `EUC_EPI_CLASSES_TENUES` | Année, Classe (réf. Classes), Tenue, Variante |
| `EUC_EPI_VAGUES` | Année, Numéro, Libellé, Date de commande, Statut |
| `EUC_EPI_ESSAYAGES` | Année, Vague, Élève (réf.) ou provisoire (Nom, Prénom, Classe / formation), Tenue, Tailles (par pièce), Saisi par, Date, Remis le, Statut |
| `EUC_ETQ_MODELES` | Nom, Usage (EPI / badge / étiquette), Format de planche, Zones, Image de fond |
| `EUC_ETQ_EVENEMENTS` | Nom, Date, Modèle, Actif |
| `EUC_ETQ_PARTICIPANTS` | Événement, Source (élève, partenaire, professeur, administratif, import), Réf. ou Nom / Prénom / Organisme / Fonction / Rôle / Classe / Libre 1 / Libre 2 |

Les élèves, classes, professeurs et contacts d'entreprises existent déjà
(`EUC_ELEVES_PFMP`, `Classes`, `EUC_PROFESSEURS_PFMP`,
`EUC_CONTACTS_ENTREPRISES`) : ils sont lus, jamais modifiés. Les administratifs
restent à localiser (table ou import Excel). Les seules nouvelles données
personnelles sont les tailles et les élèves provisoires.

## Ordre des lots

1. **Réglages, essayage par classe, élèves provisoires, identification du poste.**
2. **Étiquettes fournisseur** : modèle EPI par défaut, export ZIP de JPEG 144 dpi
   par vague.
3. **Fiche de remise** en PDF et statut « remis ».
4. **Éditeur de modèles et badges d'événement** : sources et import Excel.

## Points à confirmer

- L'accès des professeurs à la page d'essayage passe par leur compte Google du
  lycée, comme le suivi des enseignants. La saisie du nom et prénom sert à
  savoir *qui* saisit, pas à contrôler l'accès.
- Il faut l'autorisation de créer les tables ci-dessus dans le Grist de
  production.
- Où se trouve la liste des administratifs (table existante, ou import Excel) ?
