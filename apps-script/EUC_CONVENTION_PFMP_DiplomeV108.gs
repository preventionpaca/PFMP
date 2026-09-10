/** Eucalyptus PFMP — v1.0.0-dev.108 — résolution stricte du diplôme imprimé. */
function EUC_CONVENTION_diplomeStrictV108_(classeId){
  var rows=EUC_IMPORT_lireRecords_('EUC_CLASSES_DIPLOMES_PFMP').filter(function(r){return r.Actif!==false;});
  var id=Number(classeId||0),matches=rows.filter(function(r){var v=r.Classe!==undefined?r.Classe:(r.Classe_Grist!==undefined?r.Classe_Grist:(r.Classe_ID!==undefined?r.Classe_ID:r.Classe_id));return Number(EUC_PFMP_ref_(v))===id;});
  if(!matches.length)throw new Error('Diplôme non configuré pour la classe Grist '+id+' dans EUC_CLASSES_DIPLOMES_PFMP.');
  var r=matches[0],txt=String(r.Intitule_diplome||r.Intitule||r.Diplome||r.Diplome_imprime||r.Libelle||'').trim();
  if(!txt)throw new Error('Intitulé du diplôme vide pour la classe Grist '+id+'.');
  return txt;
}
