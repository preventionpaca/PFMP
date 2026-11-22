/**
 * DEV708 — Tester un SIRET ou un NIS (administration).
 *
 * Page de contrôle sans élève : un SIRET français, un NIS de Monaco ou le nom d'une entreprise de Monaco donne
 * exactement le résultat du formulaire « Déclarer mon entreprise » (mêmes recherches : EUC_ENT_rechercherSiret,
 * annuaire officiel depuis le navigateur, EUC_DEV603_traiterApi, question DEV707 de l'établissement d'accueil,
 * EUC_DEV668_verifierNis, EUC_DEV646_rechercherMonacoParNom, EUC_DEV667_rechercherRci / ficheRci).
 * Aucune écriture : ni convention, ni dépôt, ni entreprise.
 */
function EUC_DEV708_afficher(e) {
  EUC_IMPORT_exigerAdminTexte_();
  var t = HtmlService.createTemplateFromFile('Test_Siret_DEV708');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  return t.evaluate().setTitle('Tester un SIRET ou un NIS').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
