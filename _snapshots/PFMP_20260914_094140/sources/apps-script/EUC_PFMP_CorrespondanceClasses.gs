/** Eucalyptus PFMP — v1.0.0-dev.62 — correspondances Pronote persistables dans Grist. */
var EUC_CORRESPONDANCE_CLASSES_TABLE_='EUC_CORRESPONDANCE_CLASSES_PRONOTE';
function EUC_CORRESPONDANCE_colonne_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_CORRESPONDANCE_schemaPropose(){
  return {table:EUC_CORRESPONDANCE_CLASSES_TABLE_,mode:'PERSISTANCE_EXPLICITE',colonnes:[
    {id:'Annee_scolaire',type:'Text',obligatoire:true},{id:'Source_Pronote',type:'Text',obligatoire:true},{id:'Nom_classe_Pronote',type:'Text',obligatoire:true},{id:'Classe_Grist',type:'Ref:Classes',obligatoire:false},{id:'Classe_Grist_nom',type:'Text',obligatoire:false},{id:'Exclure_import',type:'Bool',obligatoire:true,defaut:false},{id:'Actif',type:'Bool',obligatoire:true,defaut:true},{id:'Date_creation',type:'DateTime',obligatoire:false},{id:'Date_modification',type:'DateTime',obligatoire:false},{id:'Auteur',type:'Text',obligatoire:false},{id:'Commentaire',type:'Text',obligatoire:false}],cleUnique:['Annee_scolaire','Source_Pronote','Nom_classe_Pronote'],regle:'Une classe Pronote est définie par année et source : elle peut pointer vers une classe Grist ou être explicitement exclue.'};
}
function EUC_CORRESPONDANCE_assurerTable_(){
  var t=EUC_CORRESPONDANCE_CLASSES_TABLE_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;}),c=EUC_CORRESPONDANCE_colonne_;
  var cols=[c('Annee_scolaire','Année scolaire'),c('Source_Pronote','Source Pronote'),c('Nom_classe_Pronote','Nom classe Pronote'),c('Classe_Grist','Classe Grist','Ref:Classes'),c('Classe_Grist_nom','Classe Grist nom'),c('Exclure_import','Exclure de l’import','Bool'),c('Actif','Actif','Bool'),c('Date_creation','Date création','DateTime'),c('Date_modification','Date modification','DateTime'),c('Auteur','Auteur'),c('Commentaire','Commentaire')];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});return {tableCreee:true,colonnesCreees:cols.map(function(x){return x.id;})};}
  var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});return {tableCreee:false,colonnesCreees:missing.map(function(x){return x.id;})};
}
function EUC_CORRESPONDANCE_controlerMappingsProvisoires(mappings){
  EUC_IMPORT_exigerAdminTexte_();mappings=mappings||{};var classes=EUC_IMPORT_chargerClassesCamin_(),ids={};classes.filter(function(c){return c.actif;}).forEach(function(c){ids[String(c.id)]=true;ids[String(c.nom).toUpperCase()]=true;});var erreurs=[];Object.keys(mappings).forEach(function(k){var v=String(mappings[k]||'').trim();if(!k.trim())erreurs.push('Nom Pronote vide');else if(!v||(!ids[v]&&!ids[v.toUpperCase()]))erreurs.push(k+' → classe Grist inconnue');});return {valide:erreurs.length===0,erreurs:erreurs,nombre:Object.keys(mappings).length,ecriture:false};
}
function EUC_CORRESPONDANCE_enregistrerChoix(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var annee=String(payload.annee||'').trim(),source=EUC_IMPORT_normaliserSourcePronote_(payload.sourcePronote||''),mappings=payload.correspondances||{},exclusions=payload.classesExclues||[];
  if(!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Année scolaire invalide.');if(!source)throw new Error('Source Pronote obligatoire.');
  var check=EUC_CORRESPONDANCE_controlerMappingsProvisoires(mappings);if(!check.valide)throw new Error(check.erreurs.join(' ; '));
  EUC_CORRESPONDANCE_assurerTable_();
  var classes=EUC_IMPORT_chargerClassesCamin_(),byId={},byNom={};classes.forEach(function(c){byId[String(c.id)]=c;byNom[String(c.nom).toUpperCase()]=c;});
  var allNames={},excluded={};Object.keys(mappings).forEach(function(n){allNames[n]=true;});exclusions.forEach(function(n){allNames[n]=true;excluded[String(n).toUpperCase()]=true;});
  var existing=EUC_IMPORT_lireRecords_(EUC_CORRESPONDANCE_CLASSES_TABLE_),byKey={};existing.forEach(function(r){byKey[[String(r.Annee_scolaire||''),EUC_IMPORT_normaliserSourcePronote_(r.Source_Pronote||''),String(r.Nom_classe_Pronote||'').trim().toUpperCase()].join('|')]=r;});
  var posts=[],patches=[],now=new Date().toISOString();Object.keys(allNames).forEach(function(n){var key=[annee,source,String(n).trim().toUpperCase()].join('|'),old=byKey[key],isEx=!!excluded[String(n).toUpperCase()],c=isEx?null:(byId[String(mappings[n])]||byNom[String(mappings[n]||'').toUpperCase()]),fields={Annee_scolaire:annee,Source_Pronote:source,Nom_classe_Pronote:n,Classe_Grist:isEx?0:(c?c.id:0),Classe_Grist_nom:isEx?'':(c?c.nom:''),Exclure_import:isEx,Actif:true,Date_modification:now,Auteur:ctx.email||''};
    if(old){patches.push({id:old.id,fields:fields});}else{fields.Date_creation=now;posts.push({fields:fields});}
  });
  if(posts.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CORRESPONDANCE_CLASSES_TABLE_)+'/records',{records:posts});if(patches.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CORRESPONDANCE_CLASSES_TABLE_)+'/records',{records:patches});
  return {ok:true,annee:annee,sourcePronote:source,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length};
}
