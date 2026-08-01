# Import des élèves Pronote pour PFMP V1 — conception locale

Pronote reste la source officielle de la composition des classes. Le mécanisme préparé accepte un export CSV UTF-8 avec séparateur point-virgule ou virgule et guillemets CSV.

## Format minimal attendu

Colonnes obligatoires : `Nom`, `Prénom`, `Classe`. Colonnes fortement recommandées : `Identifiant Pronote`, `Date de naissance`, `Année scolaire`, `Groupe`, `Actif`. La date est acceptée sous forme `jj/mm/aaaa` ou ISO. L’INE n’est ni demandé ni importé tant que sa nécessité et son cadre d’utilisation ne sont pas validés.

Le parseur reconnaît aussi `Date de sortie`, `Date fin de scolarité` ou `Fin de scolarité`, ainsi que `Motif de sortie` et `Date d’entrée`. Aucun export Pronote réel n’a été fourni dans ce lot : la disponibilité et l’intitulé exacts de ces colonnes ne peuvent donc pas être confirmés. Une date importée crée `SORTIE_A_CONFIRMER`, jamais une sortie définitive automatique.

Ne doivent pas être exportés : coordonnées familiales, adresse, téléphone, courriel personnel, responsables légaux, données médicales ou financières.

Chaque import conserve date, source `PRONOTE_CSV_CONTROLE`, année et clé de rapprochement. Le prototype parse et valide en mémoire uniquement : aucune table et aucune ligne Grist ne sont créées.

## Table proposée

Le schéma exact proposé est conservé dans `proposals/euc-eleves-pfmp-schema-v1.json`. Il contient 34 colonnes, dont `Identifiant_Pronote`, `Identifiant_import`, les références `Classe` (Ref:Classes), `Annee_scolaire` (Ref:Annees_Scolaires) et `Soumission_PFMP` (Ref:EUC_SOUMISSIONS_PFMP), les données de rapprochement, les statuts de scolarité, la confirmation humaine des sorties et la traçabilité des imports. Il ne contient pas d’INE.

Entre deux imports, une fiche absente est conservée avec `Present_dernier_import=false` et `SORTIE_A_CONFIRMER`. Elle n’est jamais supprimée ni exclue automatiquement des attentes de stage.

La table historique `Eleves` ne suffit pas actuellement : son schéma connu ne comporte ni identifiant Pronote, ni date de naissance, ni année scolaire structurée. Une relecture Grist actuelle reste obligatoire avant création.
