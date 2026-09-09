/** Eucalyptus PFMP — v1.0.0-dev.83 — import Pronote Professeurs + Classes piloté par le périmètre mémorisé lors de l'import élèves. */
var EUC_PROFS_TABLE_='EUC_PROFESSEURS_PFMP';
var EUC_CLASSES_PROFS_TABLE_='EUC_CLASSES_PROFESSEURS_PFMP';
var EUC_CLASSES_DIPLOMES_TABLE_='EUC_CLASSES_DIPLOMES_PFMP';
function EUC_PC_col_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_PC_ensure_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],ids={};tables.forEach(function(t){ids[t.id]=true;});var c=EUC_PC_col_;
  if(!ids[EUC_PROFS_TABLE_])EUC_ENT_grist('post','/tables',{tables:[{id:EUC_PROFS_TABLE_,columns:[c('Identifiant_Pronote','Identifiant Pronote'),c('Numero_Pronote','Numéro Pronote'),c('Civilite','Civilité'),c('Nom','Nom'),c('Prenom','Prénom'),c('Date_naissance','Date de naissance','Date'),c('Discipline','Discipline'),c('Code_matiere_pref','Code matière préférentielle'),c('Matiere_pref','Matière préférentielle'),c('Email','E-mail'),c('Telephone_fixe','Téléphone fixe'),c('Telephone_portable','Téléphone portable'),c('Classes_source','Classes source'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime')]}]});
  if(!ids[EUC_CLASSES_PROFS_TABLE_])EUC_ENT_grist('post','/tables',{tables:[{id:EUC_CLASSES_PROFS_TABLE_,columns:[c('Classe','Classe','Ref:Classes'),c('Professeur','Professeur','Ref:'+EUC_PROFS_TABLE_),c('Role','Rôle'),c('Source_Pronote','Source Pronote'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime')]}]});
  if(!ids[EUC_CLASSES_DIPLOMES_TABLE_])EUC_ENT_grist('post','/tables',{tables:[{id:EUC_CLASSES_DIPLOMES_TABLE_,columns:[c('Classe','Classe','Ref:Classes'),c('Intitule_diplome','Intitulé exact du diplôme'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime'),c('Auteur','Auteur')]}]});
  var existing=EUC_ENT_grist('get','/tables/Classes/columns').columns||[],present={};existing.forEach(function(x){present[x.id]=true;});var wanted=[c('Etablissement_Pronote','Établissement Pronote'),c('Niveau_Pronote','Niveau Pronote'),c('Filiere_Pronote','Filière Pronote'),c('Principaux_Pronote','Professeurs principaux Pronote')],missing=wanted.filter(function(x){return !present[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/Classes/columns',{columns:missing});
}
function EUC_PC_parseCsv_(txt){var lines=String(txt||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(function(x){return x.trim()!=='';});if(lines.length<2)throw new Error('Fichier vide ou invalide.');var headers=lines[0].split(';').map(function(x){return x.trim();});return {headers:headers,rows:lines.slice(1).map(function(l){return l.split(';');})};}
function EUC_PC_ix_(h,n){return h.indexOf(n);}
function EUC_PC_exigerColonnes_(h,noms,type){var abs=noms.filter(function(n){return h.indexOf(n)<0;});if(abs.length)throw new Error('Export '+type+' incompatible : colonne(s) manquante(s) '+abs.join(', ')+'. Utilisez un export séparé par point-virgule.');}
function EUC_PC_norm_(s){return String(s||'').trim().toUpperCase().replace(/^M(ME)?\.?\s+/,'').replace(/\s+/g,' ');}
function EUC_PC_perimetrePfmp_(){
  var out={annee:'',ids:{},byPronote:{},source:'IMPORT_ELEVES'};
  try{
    var rows=EUC_IMPORT_lireRecordsBruts_(EUC_CORRESPONDANCE_CLASSES_TABLE_).filter(function(r){var f=r.fields||r;return f.Actif!==false&&String(f.Annee_scolaire||'').trim();});
    rows.forEach(function(r){var f=r.fields||r,a=String(f.Annee_scolaire||'').trim();if(a>out.annee)out.annee=a;});
    rows.filter(function(r){var f=r.fields||r;return String(f.Annee_scolaire||'').trim()===out.annee&&f.Exclure_import!==true&&Number(f.Classe_Grist)>0;}).forEach(function(r){var f=r.fields||r,id=String(f.Classe_Grist),n=EUC_PC_norm_(f.Nom_classe_Pronote||f.Classe_Grist_nom||'');out.ids[id]=true;if(n){(out.byPronote[n]=out.byPronote[n]||[]).push(Number(id));}});
  }catch(e){}
  if(!Object.keys(out.ids).length){
    try{EUC_IMPORT_lireRecordsBruts_('EUC_ELEVES_PFMP').forEach(function(r){var f=r.fields||r;if(f.Actif!==false&&f.Present_dernier_import!==false&&Number(f.Classe)>0)out.ids[String(f.Classe)]=true;});out.source='ELEVES_ACTIFS';}catch(e2){}
  }
  return out;
}
function EUC_PC_resoudreClassePerimetre_(nom,classesById,perimetre){
  var ids=(perimetre.byPronote[EUC_PC_norm_(nom)]||[]).filter(function(id,i,a){return a.indexOf(id)===i&&perimetre.ids[String(id)];});
  if(ids.length===1)return classesById[String(ids[0])]||null;
  if(ids.length>1)return null;
  var matches=[];Object.keys(classesById).forEach(function(id){if(!perimetre.ids[id])return;var r=classesById[id],f=r.fields||r;[f.Nom,f.Libelle,f.Code_import].forEach(function(x){if(x&&EUC_PC_norm_(x)===EUC_PC_norm_(nom)&&matches.indexOf(r)<0)matches.push(r);});});return matches.length===1?matches[0]:null;
}
function EUC_PC_importerProfesseurs(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var p=EUC_PC_parseCsv_(payload.texte||''),h=p.headers;EUC_PC_exigerColonnes_(h,['IDENT','CIVILITE','NOM','PRENOM','DISCIPLINE','EMAIL','CLASSES'],'Professeurs');EUC_PC_ensure_();
  var ix={numero:EUC_PC_ix_(h,'NUMERO'),ident:EUC_PC_ix_(h,'IDENT'),civilite:EUC_PC_ix_(h,'CIVILITE'),nom:EUC_PC_ix_(h,'NOM'),prenom:EUC_PC_ix_(h,'PRENOM'),naissance:EUC_PC_ix_(h,'DATE NAISS'),discipline:EUC_PC_ix_(h,'DISCIPLINE'),email:EUC_PC_ix_(h,'EMAIL'),fixe:EUC_PC_ix_(h,'FIXEComplet'),portable:EUC_PC_ix_(h,'PORTABLEComplet'),code:EUC_PC_ix_(h,'CODE MATIERE_PREF'),matiere:EUC_PC_ix_(h,'MATIERE_PREF'),classes:EUC_PC_ix_(h,'CLASSES')};
  var old=EUC_IMPORT_lireRecordsBruts_(EUC_PROFS_TABLE_),byIdent={};old.forEach(function(r){var f=r.fields||r;if(f.Identifiant_Pronote)byIdent[String(f.Identifiant_Pronote)]=r;});var posts=[],patches=[],now=EUC_IMPORT_nowGrist_();
  p.rows.forEach(function(r){var ident=String(r[ix.ident]||'').trim();if(!ident)return;var fields={Identifiant_Pronote:ident,Numero_Pronote:ix.numero>=0?String(r[ix.numero]||''):'',Civilite:String(r[ix.civilite]||''),Nom:String(r[ix.nom]||''),Prenom:String(r[ix.prenom]||''),Date_naissance:ix.naissance>=0?EUC_IMPORT_dateGrist_(EUC_SUIVI_dateISO_(r[ix.naissance])):null,Discipline:String(r[ix.discipline]||''),Code_matiere_pref:ix.code>=0?String(r[ix.code]||''):'',Matiere_pref:ix.matiere>=0?String(r[ix.matiere]||''):'',Email:String(r[ix.email]||''),Telephone_fixe:ix.fixe>=0?String(r[ix.fixe]||''):'',Telephone_portable:ix.portable>=0?String(r[ix.portable]||''):'',Classes_source:String(r[ix.classes]||''),Actif:true,Date_modification:now},ex=byIdent[ident];if(ex)patches.push({id:ex.id,fields:fields});else posts.push({fields:fields});});
  if(posts.length)EUC_ENT_grist('post','/tables/'+EUC_PROFS_TABLE_+'/records',{records:posts});if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_PROFS_TABLE_+'/records',{records:patches});return {ok:true,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length};
}
function EUC_PC_importerClasses(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var p=EUC_PC_parseCsv_(payload.texte||''),h=p.headers;EUC_PC_exigerColonnes_(h,['NOM','NIVEAU','ETABLISSEMENT','PRINCIPAUX','FILIERE'],'Classes');EUC_PC_ensure_();
  var ix={nom:EUC_PC_ix_(h,'NOM'),niveau:EUC_PC_ix_(h,'NIVEAU'),etab:EUC_PC_ix_(h,'ETABLISSEMENT'),principaux:EUC_PC_ix_(h,'PRINCIPAUX'),filiere:EUC_PC_ix_(h,'FILIERE')},perimetre=EUC_PC_perimetrePfmp_();if(!Object.keys(perimetre.ids).length)throw new Error('Aucun périmètre PFMP trouvé. Mémorisez d’abord les classes retenues dans l’import Élèves + responsables.');
  var classes=EUC_IMPORT_lireRecordsBruts_('Classes'),classesById={};classes.forEach(function(r){classesById[String(r.id)]=r;});
  var profs=EUC_IMPORT_lireRecordsBruts_(EUC_PROFS_TABLE_),byName={};profs.forEach(function(r){var f=r.fields||r;byName[EUC_PC_norm_((f.Nom||'')+' '+(f.Prenom||''))]=r;});
  var links=EUC_IMPORT_lireRecordsBruts_(EUC_CLASSES_PROFS_TABLE_),byLink={};links.forEach(function(r){var f=r.fields||r;byLink[[f.Classe,f.Professeur,f.Role].join('|')]=r;});
  var classPatches=[],linkPosts=[],linkPatches=[],horsPerimetre=[],unknownProfs=[],now=EUC_IMPORT_nowGrist_();
  p.rows.forEach(function(r){var name=String(r[ix.nom]||'').trim(),cl=EUC_PC_resoudreClassePerimetre_(name,classesById,perimetre);if(!cl){horsPerimetre.push(name);return;}var cf={Etablissement_Pronote:String(r[ix.etab]||''),Niveau_Pronote:String(r[ix.niveau]||''),Filiere_Pronote:String(r[ix.filiere]||''),Principaux_Pronote:String(r[ix.principaux]||'')};classPatches.push({id:cl.id,fields:cf});String(r[ix.principaux]||'').split(',').map(function(x){return x.trim();}).filter(Boolean).forEach(function(label){var prof=byName[EUC_PC_norm_(label)];if(!prof){unknownProfs.push(name+' → '+label);return;}var k=[cl.id,prof.id,'PROFESSEUR_PRINCIPAL'].join('|'),fields={Classe:cl.id,Professeur:prof.id,Role:'PROFESSEUR_PRINCIPAL',Source_Pronote:String(r[ix.etab]||''),Actif:true,Date_modification:now};if(byLink[k])linkPatches.push({id:byLink[k].id,fields:fields});else linkPosts.push({fields:fields});});});
  if(classPatches.length)EUC_ENT_grist('patch','/tables/Classes/records',{records:classPatches});if(linkPosts.length)EUC_ENT_grist('post','/tables/'+EUC_CLASSES_PROFS_TABLE_+'/records',{records:linkPosts});if(linkPatches.length)EUC_ENT_grist('patch','/tables/'+EUC_CLASSES_PROFS_TABLE_+'/records',{records:linkPatches});
  return {ok:true,anneePerimetre:perimetre.annee,sourcePerimetre:perimetre.source,classesMisesAJour:classPatches.length,liensCrees:linkPosts.length,liensMisAJour:linkPatches.length,classesHorsPerimetre:horsPerimetre,professeursInconnus:unknownProfs};
}
function EUC_PC_lireDiplomesParClasse(){
  EUC_IMPORT_exigerAdminTexte_();EUC_PC_ensure_();var perimetre=EUC_PC_perimetrePfmp_(),classes=EUC_IMPORT_chargerClassesCamin_().filter(function(c){return c.actif&&perimetre.ids[String(c.id)];}),rows=EUC_IMPORT_lireRecordsBruts_(EUC_CLASSES_DIPLOMES_TABLE_),byClass={};rows.forEach(function(r){var f=r.fields||r;if(f.Actif!==false)byClass[String(f.Classe)]={id:r.id,intitule:String(f.Intitule_diplome||'')};});return classes.map(function(c){var d=byClass[String(c.id)]||{};return {id:c.id,classe:c.nom,libelle:c.libelle,etab:c.etab,formation:c.formation,niveau:c.niveau,diplomeId:d.id||'',intitule:d.intitule||'',anneePerimetre:perimetre.annee};}).sort(function(a,b){return String(a.classe).localeCompare(String(b.classe),'fr');});
}
function EUC_PC_enregistrerDiplomesParClasse(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};EUC_PC_ensure_();var values=payload.valeurs||{},perimetre=EUC_PC_perimetrePfmp_(),valid=perimetre.ids,existing=EUC_IMPORT_lireRecordsBruts_(EUC_CLASSES_DIPLOMES_TABLE_),byClass={};existing.forEach(function(r){var f=r.fields||r;byClass[String(f.Classe)]=r;});var posts=[],patches=[],now=EUC_IMPORT_nowGrist_();Object.keys(values).forEach(function(k){if(!valid[k])return;var text=String(values[k]||'').trim(),ex=byClass[k],fields={Classe:Number(k),Intitule_diplome:text,Actif:!!text,Date_modification:now,Auteur:ctx.email||''};if(ex)patches.push({id:ex.id,fields:fields});else if(text)posts.push({fields:fields});});if(posts.length)EUC_ENT_grist('post','/tables/'+EUC_CLASSES_DIPLOMES_TABLE_+'/records',{records:posts});if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_CLASSES_DIPLOMES_TABLE_+'/records',{records:patches});return {ok:true,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length};
}
function EUC_PC_diplomeClasse_(classeId){try{EUC_PC_ensure_();var rows=EUC_IMPORT_lireRecordsBruts_(EUC_CLASSES_DIPLOMES_TABLE_).filter(function(r){var f=r.fields||r;return f.Actif!==false&&String(f.Classe)===String(classeId);});return rows.length?String((rows[0].fields||rows[0]).Intitule_diplome||''):'';}catch(e){return '';}}
