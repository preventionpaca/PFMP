/** Eucalyptus PFMP — v1.0.0-dev.86 — paramètres dynamiques de la convention PFMP. */
var EUC_PARAM_CONV_TABLE_='EUC_PARAMETRES_CONVENTION_PFMP';
function EUC_PARAM_CONV_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_PARAM_CONV_assurerTable_(){
  var t=EUC_PARAM_CONV_TABLE_,c=EUC_PARAM_CONV_col_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;});
  var cols=[c('Cle','Clé'),c('Valeur','Valeur'),c('Description','Description'),c('Ordre','Ordre','Int'),c('Actif','Actif','Bool')];
  if(!exists)EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});
  else{var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});}
  var rows=[];try{rows=EUC_IMPORT_lireRecords_(t);}catch(e){}
  var by={};rows.forEach(function(r){by[String(r.Cle||'')]=r;});
  var defs=[
    ['PROVISEUR','Stéphane DEVIN','Nom du chef d’établissement',10],['FONCTION_PROVISEUR','Proviseur','Fonction du chef d’établissement',20],
    ['ETABLISSEMENT_LP','Lycée Professionnel Les Eucalyptus','Libellé imprimé pour les classes LP',30],['ETABLISSEMENT_LGT','Lycée Général et Technologique Les Eucalyptus','Libellé imprimé pour les classes LGT/BTS',40],
    ['ADRESSE','7 avenue des Eucalyptus, 06200 NICE','Adresse de l’établissement',50],['TELEPHONE','04 92 29 30 65','Téléphone de l’établissement',60],['EMAIL','bfe@lycee-les-eucalyptus.org','Courriel PFMP',70]
  ],add=[];defs.forEach(function(d){if(!by[d[0]])add.push({fields:{Cle:d[0],Valeur:d[1],Description:d[2],Ordre:d[3],Actif:true}});});
  if(add.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/records',{records:add});
  return true;
}
function EUC_PARAM_CONV_lire_(){EUC_PARAM_CONV_assurerTable_();var o={};EUC_IMPORT_lireRecords_(EUC_PARAM_CONV_TABLE_).filter(function(r){return r.Actif!==false;}).forEach(function(r){o[String(r.Cle||'')]=String(r.Valeur||'');});return o;}
function EUC_PARAM_CONV_lister(){EUC_IMPORT_exigerAdminTexte_();EUC_PARAM_CONV_assurerTable_();return EUC_IMPORT_lireRecords_(EUC_PARAM_CONV_TABLE_).sort(function(a,b){return Number(a.Ordre||0)-Number(b.Ordre||0);});}
function EUC_PARAM_CONV_enregistrer(items){EUC_IMPORT_exigerAdminTexte_();EUC_PARAM_CONV_assurerTable_();items=items||[];var rows=EUC_IMPORT_lireRecords_(EUC_PARAM_CONV_TABLE_),by={};rows.forEach(function(r){by[String(r.Cle||'')]=r;});var patches=[];items.forEach(function(x){var r=by[String(x.cle||'')];if(r)patches.push({id:r.id,fields:{Valeur:String(x.valeur||'').trim()}});});if(patches.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_PARAM_CONV_TABLE_)+'/records',{records:patches});return {ok:true,misAJour:patches.length};}
function EUC_PARAM_CONV_etablissementPourClasse_(classeId){
  var etab='';try{var c=EUC_IMPORT_lireRecords_('Classes').filter(function(r){return r.id===Number(classeId);})[0];if(c)etab=String(c.Etab||c.Etablissement||'').toUpperCase();}catch(e){}
  var p=EUC_PARAM_CONV_lire_(),lgt=(etab.indexOf('LGT')>=0||etab.indexOf('LYCEE GENERAL')>=0||etab.indexOf('LYCÉE GÉNÉRAL')>=0);
  return {code:lgt?'LGT':'LP',libelle:lgt?(p.ETABLISSEMENT_LGT||'Lycée Général et Technologique Les Eucalyptus'):(p.ETABLISSEMENT_LP||'Lycée Professionnel Les Eucalyptus'),proviseur:p.PROVISEUR||'',fonctionProviseur:p.FONCTION_PROVISEUR||'Proviseur',adresse:p.ADRESSE||'',telephone:p.TELEPHONE||'',email:p.EMAIL||''};
}
