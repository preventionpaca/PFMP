# Classement des fonctions historiques dupliquées

Analyse reproductible par `node tests/analyze-duplicates.js`. Elle porte sur les déclarations globales réelles des fichiers `.js` et `.gs`; aucun code historique n'a été modifié ou supprimé.

## Doublons stricts — 6

- `EDT_archiverVersionEDT_V24`
- `EDT_col_`
- `EDT_initialiserVuesExemples_V24_`
- `EDT_reconstruireLibelles_V24`
- `EDT_v24FillIfEmpty_`
- `fusionnerNiveauxCAL_`

Les corps normalisés sont identiques. Les cinq noms `EDT_*` proviennent d'installateurs versionnés distincts et peuvent être des copies volontaires, mais restent techniquement des redéfinitions globales. `fusionnerNiveauxCAL_` est redéclarée à l'identique dans `Code.js`.

## Doublons divergents — 25

- `appliquerFormuleTotalAnnuelALT_`
- `breakApartSafe_`
- `calculerStyleJourALT_`
- `EDT_applyActions_`
- `EDT_clearTable_`
- `EDT_getExistingColumns_`
- `EDT_getExistingTables_`
- `EDT_getRecords_`
- `EDT_gristGet_`
- `EDT_journaliser_`
- `EDT_markUpdate_`
- `EDT_ref_`
- `estTypeEvenementALT_`
- `estTypeFondSaisieALT_`
- `finaliserHabillageCALHebdo_`
- `fusionnerCellulesIdentiquesColonne_`
- `fusionnerIdentiquesSurLigne_`
- `fusionnerValeurSurLigne_`
- `gristApplyActions_`
- `mettreAJourHorodatageActualisationALT_`
- `prioriteVisuellePeriodeALT_`
- `trouverPeriodeFondSaisiePourDateFormation_`
- `trouverPeriodePourDateFormation_`
- `trouverPeriodesPourFeuilleALT_`
- `typesVariablesPlanning_`

Leurs corps diffèrent. Plusieurs ressemblent à des révisions successives ou à des utilitaires embarqués dans différents modules, mais aucune règle explicite ne permet d'établir de manière fiable laquelle doit gagner dans l'espace global Apps Script.

## Surcharges volontaires ou faux doublons — 0 confirmé

Aucun faux doublon lexical n'a été compté : les 31 noms correspondent tous à plusieurs déclarations globales exécutables. En l'absence d'un mécanisme explicite de surcharge en JavaScript Apps Script, aucune redéfinition divergente n'est classée comme volontaire sans preuve supplémentaire. Les cinq copies identiques contenues dans des installateurs versionnés sont signalées ci-dessus comme probablement intentionnelles, sans les soustraire du classement strict.
