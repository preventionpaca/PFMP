/** EDT V2.0 - Fonctions TRM. Toutes les fonctions sont préfixées EDT_. */

function EDT_recalculerTRM() {
  EDT_normaliserCreneauxEDT();
  EDT_calculerSyntheseTRM();
  EDT_markUpdate_();
  EDT_journaliser_('RECALCUL_TRM_V20', 'TRM_Synthese', 'Recalcul du contrôle TRM.');
}
