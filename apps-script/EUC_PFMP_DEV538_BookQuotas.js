/**
 * DEV538 — quotas apprentissage, relances et book entreprises.
 *
 * Les quotas sont une configuration applicative légère conservée dans les
 * propriétés Apps Script. Les données élèves, contrats et accueils restent
 * dans leurs tables métier existantes : aucune duplication n'est créée.
 */
var EUC_DEV538_VERSION_='1.0.0-dev.547';
var EUC_DEV538_QUOTAS_PROP_='EUC_DEV538_QUOTAS_APPRENTISSAGE_V1';
var EUC_DEV542_ACTIVE_CLASSES_PROP_='EUC_DEV542_CLASSES_APPRENTISSAGE_ACTIVES_V1';
var EUC_DEV545_CLASS_MODES_PROP_='EUC_DEV545_MODALITES_APPRENTISSAGE_V1';
var EUC_DEV545_COMPANY_ALIASES_PROP_='EUC_DEV545_RATTACHEMENTS_ENTREPRISES_V1';
var EUC_DEV538_RELANCE_DAYS_=14;
var EUC_DEV540_PHOTO_TABLE_='EUC_ENTREPRISES_PHOTOS_PFMP';
var EUC_DEV540_PHOTO_FOLDER_PROP_='EUC_DEV540_PHOTO_FOLDER_ID';

function EUC_DEV538_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV538_n_(v){var n=Number(v);return isFinite(n)?n:0;}
function EUC_DEV538_ref_(v){if(Array.isArray(v))return EUC_DEV538_n_(v.length>1?v[1]:v[0]);return EUC_DEV538_n_(v);}
function EUC_DEV538_bool_(v){if(v===true||v===false)return v;var s=EUC_DEV538_t_(v).toLowerCase();return s==='true'||s==='1'||s==='oui'||s==='yes'||s==='x';}
function EUC_DEV538_fields_(r){return r&&r.fields||r||{};}
function EUC_DEV538_pick_(f,names){for(var i=0;i<names.length;i++){var v=f&&f[names[i]];if(v!==null&&v!==undefined&&EUC_DEV538_t_(v)!=='')return v;}return'';}
function EUC_DEV538_date_(v){
  if(v===null||v===undefined||v==='')return null;var d;
  if(v instanceof Date)d=v;else if(typeof v==='number')d=new Date(Math.abs(v)<100000000000?v*1000:v);else if(/^\d+(?:\.\d+)?$/.test(EUC_DEV538_t_(v))){var n=Number(v);d=new Date(Math.abs(n)<100000000000?n*1000:n);}else d=new Date(v);
  return d&&!isNaN(d.getTime())?d:null;
}
function EUC_DEV538_iso_(v){var d=EUC_DEV538_date_(v);if(!d)return'';return Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','yyyy-MM-dd');}
function EUC_DEV538_records_(table,filter){
  if(typeof EUC_DEV190G_fastRecords_==='function')return EUC_DEV190G_fastRecords_(table,filter||{})||[];
  return EUC_IMPORT_lireRecords_(table)||[];
}
function EUC_DEV538_optionalRecords_(table,filter){try{return EUC_DEV538_records_(table,filter);}catch(e){if(/(?:Table not found|404|introuvable|absente)/i.test(String(e&&e.message||e)))return[];throw e;}}
function EUC_DEV538_admin_(){return EUC_DEV368_admin();}
function EUC_DEV538_activeEmail_(){try{return EUC_DEV538_t_(Session.getActiveUser().getEmail()).toLowerCase();}catch(e){return'';}}
function EUC_DEV538_staffAllowed_(){
  try{if(EUC_DEV538_admin_())return true;}catch(e){}
  return /@lycee-les-eucalyptus\.org$/i.test(EUC_DEV538_activeEmail_());
}
function EUC_DEV538_norm_(v){return EUC_DEV538_t_(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();}
/* Le SIRET est l'identité stable d'un établissement français. L'adresse
 * normalisée reste le repli pour les anciennes conventions qui n'en ont pas. */
function EUC_DEV540_normalizeAddress_(adresse){return typeof EUC_DEV443_normalizeAddress_==='function'?EUC_DEV443_normalizeAddress_(adresse):EUC_DEV538_t_(adresse);}
function EUC_DEV538_companyIdentity_(entreprise,adresse,siret){return EUC_DEV443_geoIdentity_(entreprise,EUC_DEV540_normalizeAddress_(adresse),siret||'');}
function EUC_DEV540_companyLooseKey_(entreprise,adresse){
  var a=EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(adresse)),cp=(a.match(/\b\d{5}\b/)||[''])[0],before=cp?a.slice(0,a.indexOf(cp)):a,number=(before.match(/\b\d+[A-Z]?\b/)||[''])[0],words=before.split(' ').filter(function(w){return w.length>2&&['RUE','ROUTE','AVENUE','BOULEVARD','CHEMIN','IMPASSE','PLACE','RESIDENCE','BATIMENT'].indexOf(w)<0&&!/^\d/.test(w);});
  return[EUC_DEV538_norm_(entreprise),cp,number,words.slice(-3).join(' ')].join('|');
}
function EUC_DEV540_contactName_(value){return EUC_DEV538_t_(value).split(/\s*[·|]\s*/)[0];}
function EUC_DEV547_phoneKey_(value){
  var digits=EUC_DEV538_t_(value).replace(/\D/g,'');
  if(/^0033\d{9}$/.test(digits))digits='0'+digits.slice(4);
  else if(/^33\d{9}$/.test(digits))digits='0'+digits.slice(2);
  return digits;
}
function EUC_DEV547_emailKey_(value){return EUC_DEV538_t_(value).toLowerCase().replace(/\s+/g,'');}
function EUC_DEV547_nameScore_(value){
  var original=EUC_DEV540_contactName_(value),normal=EUC_DEV538_norm_(original),tokens=normal.split(' ').filter(Boolean).filter(function(x){return['M','MR','MME','MLLE','MONSIEUR','MADAME'].indexOf(x)<0;});
  if(!tokens.length)return 0;
  var initials=tokens.filter(function(x){return x.length===1;}).length,base=tokens.length>=2&&!initials?400:tokens.length>=2?300:200;
  return base+Math.min(99,original.length);
}
function EUC_DEV547_contacts_(history,kind){
  var groups=[];
  (history||[]).forEach(function(h){
    var responsible=kind==='responsable',name=EUC_DEV540_contactName_(h&&h[responsible?'responsable':'tuteur']),phone=EUC_DEV538_t_(h&&h[responsible?'telephoneResponsable':'telephoneTuteur']),email=EUC_DEV538_t_(h&&h[responsible?'courrielResponsable':'courrielTuteur']),phoneKey=EUC_DEV547_phoneKey_(phone),emailKey=EUC_DEV547_emailKey_(email),nameKey=EUC_DEV538_norm_(name);
    if(!name&&!phone&&!email)return;
    var matches=[];groups.forEach(function(g,index){if(phoneKey&&g.phoneKeys[phoneKey]||emailKey&&g.emailKeys[emailKey]||!phoneKey&&!emailKey&&nameKey&&g.nameKeys[nameKey])matches.push(index);});
    var target=matches.length?groups[matches[0]]:{names:{},phones:{},emails:{},phoneKeys:{},emailKeys:{},nameKeys:{}};
    if(!matches.length)groups.push(target);
    for(var m=matches.length-1;m>0;m--){var extra=groups[matches[m]];Object.keys(extra.names).forEach(function(k){target.names[k]=extra.names[k];});Object.keys(extra.phones).forEach(function(k){target.phones[k]=extra.phones[k];});Object.keys(extra.emails).forEach(function(k){target.emails[k]=extra.emails[k];});Object.keys(extra.phoneKeys).forEach(function(k){target.phoneKeys[k]=true;});Object.keys(extra.emailKeys).forEach(function(k){target.emailKeys[k]=true;});Object.keys(extra.nameKeys).forEach(function(k){target.nameKeys[k]=true;});groups.splice(matches[m],1);}
    if(name){target.names[name]=EUC_DEV547_nameScore_(name);if(nameKey)target.nameKeys[nameKey]=true;}
    if(phone){target.phones[phoneKey||phone]=target.phones[phoneKey||phone]||phone;if(phoneKey)target.phoneKeys[phoneKey]=true;}
    if(email){target.emails[emailKey||email]=target.emails[emailKey||email]||email;if(emailKey)target.emailKeys[emailKey]=true;}
  });
  return groups.map(function(g){
    var names=Object.keys(g.names).sort(function(a,b){return g.names[b]-g.names[a]||b.length-a.length||a.localeCompare(b,'fr');}),phones=Object.keys(g.phones).map(function(k){return g.phones[k];}).sort(),emails=Object.keys(g.emails).map(function(k){return g.emails[k];}).sort(function(a,b){return a.localeCompare(b,'fr');});
    return{nom:names[0]||'',telephones:phones,courriels:emails,telephone:phones.join(' · '),courriel:emails.join(' · ')};
  }).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
}
function EUC_DEV547_city_(address){
  var value=EUC_DEV538_t_(address).replace(/\s+/g,' '),match=value.match(/(?:^|[,;]\s*|\s)(?:MC-)?\d{4,5}\s+([^,;]+?)(?:\s+(?:FRANCE|MONACO))?$/i);
  if(match&&match[1])return EUC_DEV538_t_(match[1]).replace(/\b\d{4,5}\b.*$/,'').trim()||EUC_DEV538_t_(match[1]);
  var parts=value.split(/[,;]/).map(function(x){return x.trim();}).filter(Boolean);return parts.length?parts[parts.length-1].replace(/^(?:MC-)?\d{4,5}\s+/,'').trim():'';
}
function EUC_DEV547_pageSize_(value){var n=Number(value);return[10,30,40,50,100,200].indexOf(n)>=0?n:(String(value).toUpperCase()==='ALL'||n===0?0:10);}
function EUC_DEV547_paginate_(list,q){
  var size=EUC_DEV547_pageSize_(q&&q.pageSize),total=list.length,pages=size?Math.max(1,Math.ceil(total/size)):1,page=Math.max(1,Math.min(pages,Math.floor(Number(q&&q.page)||1))),start=size?(page-1)*size:0;
  return{items:size?list.slice(start,start+size):list,page:page,pageSize:size,total:total,totalPages:pages};
}
function EUC_DEV546_dateFr_(value){var d=EUC_DEV538_date_(value);return d?Utilities.formatDate(d,Session.getScriptTimeZone()||'Europe/Paris','dd/MM/yyyy'):'';}
function EUC_DEV546_contractInfo_(row,fallbackYear){
  var f=EUC_DEV538_fields_(row),studentId=EUC_DEV538_ref_(EUC_DEV538_pick_(f,['Eleve','Élève','Eleve_id'])),rawYear=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Annee_scolaire','Année_scolaire','Annee'])),year=/^20\d{2}-20\d{2}$/.test(rawYear)?rawYear:EUC_DEV538_t_(fallbackYear),start=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_debut','Debut','Date_contrat_officielle','Date_contrat'])),end=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_fin','Fin'])),rupture=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_rupture_contrat','Date_rupture']));
  if(rupture&&(!end||rupture.getTime()<end.getTime()))end=rupture;
  var entreprise=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Nom_commercial','Nom_entreprise','Entreprise'])),adresse=EUC_DEV540_normalizeAddress_([EUC_DEV538_t_(EUC_DEV538_pick_(f,['Adresse_entreprise','Adresse'])),EUC_DEV538_t_(EUC_DEV538_pick_(f,['Code_postal','CodePostal','CP'])),EUC_DEV538_t_(f.Ville)].filter(Boolean).join(', '));
  if(!studentId||!year||!start||!end||!entreprise||!adresse)return null;
  return{recordId:EUC_DEV538_n_(row&&row.id),dateSaisie:EUC_DEV538_t_(EUC_DEV538_pick_(f,['Date_modification','Updated_at','Date_creation','Date_saisie_entreprise','Date_derniere_utilisation'])),eleveId:studentId,annee:year,debut:EUC_DEV538_iso_(start),fin:EUC_DEV538_iso_(end),periode:'Contrat du '+EUC_DEV546_dateFr_(start)+' au '+EUC_DEV546_dateFr_(end),entreprise:entreprise,adresse:adresse,siret:EUC_DEV538_t_(f.SIRET).replace(/\D/g,''),responsable:EUC_DEV540_contactName_(EUC_DEV538_pick_(f,['Responsable_nom','Responsable','Nom_responsable_entreprise'])),telephoneResponsable:EUC_DEV538_t_(EUC_DEV538_pick_(f,['Entreprise_telephone','Telephone_entreprise','Responsable_telephone'])),courrielResponsable:EUC_DEV538_t_(EUC_DEV538_pick_(f,['Entreprise_courriel','Courriel_entreprise','Responsable_courriel'])),tuteur:EUC_DEV540_contactName_(EUC_DEV538_pick_(f,['Tuteur_nom','Tuteur'])),telephoneTuteur:EUC_DEV538_t_(EUC_DEV538_pick_(f,['Tuteur_telephone','Telephone_tuteur'])),courrielTuteur:EUC_DEV538_t_(EUC_DEV538_pick_(f,['Tuteur_courriel','Courriel_tuteur']))};
}
function EUC_DEV546_bookApprentices_(years,withVisitors){
  var wanted={};(years||[]).forEach(function(y){wanted[y]=true;});var yearsById=EUC_DEV538_schoolYearMap_(),students={},studentNameKeys={};
  EUC_DEV538_optionalRecords_('EUC_ELEVES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id),year=EUC_DEV538_studentYear_(f,yearsById);if(!id||!wanted[year])return;var classeId=EUC_DEV538_ref_(f.Classe),classe=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Code_classe_importe','Classe_nom','Classe_snapshot'])),name=[EUC_DEV538_t_(f.Nom),EUC_DEV538_t_(f.Prenom_usage||f.Prenom)].filter(Boolean).join(' '),famille=EUC_DEV538_t_(f.Famille).toUpperCase()||(/BTS/.test(classe.toUpperCase())?'BTS':/CAP/.test(classe.toUpperCase())?'CAP':'BACPRO');students[id]={id:id,annee:year,eleve:name,classeId:classeId,classe:classe,famille:famille};if(name)studentNameKeys[year+'|'+EUC_DEV538_norm_(name)]=id;});
  var visitors={};if(withVisitors)EUC_DEV538_optionalRecords_('EUC_AFFECTATIONS_SUIVI_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),year=EUC_DEV538_t_(f.Annee_scolaire),type=EUC_DEV538_norm_(f.Type_suivi),eid=EUC_DEV538_ref_(f.Eleve),name=EUC_DEV538_t_(f.Nom_professeur_snapshot);if(f.Actif===false||!wanted[year]||type.indexOf('VISITE')<0||!eid||!name)return;var key=year+'|'+eid;if(!visitors[key])visitors[key]={};visitors[key][name]=true;});
  var byStudentYear={},unique={};EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP',{}).forEach(function(row){var raw=EUC_DEV538_fields_(row),studentId=EUC_DEV538_ref_(EUC_DEV538_pick_(raw,['Eleve','Élève','Eleve_id'])),meta=students[studentId]||{},info=EUC_DEV546_contractInfo_(row,meta.annee);if(!info||!wanted[info.annee])return;var key=[info.annee,info.eleveId,info.siret||EUC_DEV538_norm_(info.entreprise+' '+info.adresse),info.debut,info.fin].join('|'),previous=unique[key];if(previous&&previous.recordId>=info.recordId)return;info.meta=meta;info.eleve=meta.eleve||EUC_DEV538_t_(EUC_DEV538_pick_(raw,['Eleve_nom','Nom_eleve','Jeune_nom']));info.professeurVisiteur=Object.keys(visitors[info.annee+'|'+info.eleveId]||{}).sort(function(a,b){return a.localeCompare(b,'fr');}).join(' · ');unique[key]=info;});
  var contracts=Object.keys(unique).map(function(k){return unique[k];});contracts.forEach(function(info){var key=info.annee+'|'+info.eleveId;if(!byStudentYear[key])byStudentYear[key]=[];byStudentYear[key].push(info);});return{contracts:contracts,byStudentYear:byStudentYear,students:students,studentNameKeys:studentNameKeys,visitors:visitors};
}
function EUC_DEV546_isApprenticeLine_(x,entreprise,adresse,siret,contracts){
  if(!contracts||!contracts.length)return false;if(x&&x.apprenti===true||/APPRENTI/.test(EUC_DEV538_norm_(x&&x.statutApprentissage||x&&x.statutJeune)))return true;var sir=EUC_DEV538_t_(siret).replace(/\D/g,''),addressIdentity=EUC_DEV538_companyIdentity_(entreprise,adresse,'');return contracts.some(function(c){return sir.length===14&&sir===c.siret||addressIdentity===EUC_DEV538_companyIdentity_(c.entreprise,c.adresse,'');});
}

function EUC_DEV538_quotaConfig_(){
  var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV538_QUOTAS_PROP_)||'';}catch(e){}
  try{var parsed=JSON.parse(raw||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch(e2){return{};}
}
function EUC_DEV542_activeClassesConfig_(){
  var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV542_ACTIVE_CLASSES_PROP_)||'';}catch(e){}
  try{var parsed=JSON.parse(raw||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch(e2){return{};}
}
function EUC_DEV545_classModesConfig_(){
  var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV545_CLASS_MODES_PROP_)||'';}catch(e){}
  try{var parsed=JSON.parse(raw||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch(e2){return{};}
}
function EUC_DEV545_classMode_(config,year,classId){
  var value=EUC_DEV538_t_(config&&config[year]&&config[year][String(classId)]).toUpperCase();
  return value==='CLASSE_ENTIERE'?'CLASSE_ENTIERE':'MIXITE';
}
function EUC_DEV542_classActive_(config,year,classId){
  var byYear=config&&config[year];
  if(!byYear||!Object.prototype.hasOwnProperty.call(byYear,String(classId)))return true;
  return byYear[String(classId)]!==false;
}
function EUC_DEV538_schoolYearMap_(){
  var byId={};EUC_DEV538_optionalRecords_('Annees_Scolaires',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id),code=EUC_DEV538_t_(f.Code||f.Annee||f.Libelle);if(id&&code)byId[id]=code;});return byId;
}
function EUC_DEV538_studentYear_(f,yearsById){
  var direct=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Annee_scolaire_code','Annee_code','Annee_scolaire_libelle']));if(/^20\d{2}-20\d{2}$/.test(direct))return direct;
  var raw=f&&f.Annee_scolaire;if(/^20\d{2}-20\d{2}$/.test(EUC_DEV538_t_(raw)))return EUC_DEV538_t_(raw);return EUC_DEV538_t_((yearsById||{})[EUC_DEV538_ref_(raw)]);
}
function EUC_DEV543_explicitFalse_(value){
  if(value===false)return true;var s=EUC_DEV538_norm_(value);return s==='0'||s==='FALSE'||s==='NON'||s==='NO'||s==='INACTIF';
}
function EUC_DEV543_studentPresent_(f,now){
  f=f||{};now=now||new Date();
  if(EUC_DEV543_explicitFalse_(f.Actif)||EUC_DEV543_explicitFalse_(f.Present_dernier_import))return false;
  var status=EUC_DEV538_norm_(EUC_DEV538_pick_(f,['Statut_scolarite','Statut_scolarité','Situation_scolarite','Situation']));
  if(/(?:^| )(?:SORTI|SORTIE|RADIE|INACTIF)(?: |$)/.test(status))return false;
  var sortie=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_sortie','Date_fin_scolarite','Fin_scolarite']));
  return!sortie||sortie.getTime()>now.getTime();
}
function EUC_DEV538_diplomas_(){
  var out={};EUC_DEV538_optionalRecords_('EUC_CLASSES_DIPLOMES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r);if(f.Actif===false)return;var cid=EUC_DEV538_ref_(EUC_DEV538_pick_(f,['Classe','Classe_id'])),label=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Intitule_diplome','Intitule','Diplome','Diplome_imprime','Libelle']));if(cid&&label)out[cid]=label;});return out;
}
function EUC_DEV538_fallbackDiploma_(c){
  var name=EUC_DEV538_t_(c&&c.classe||c&&c.nom),fam=EUC_DEV538_t_(c&&c.famille).toUpperCase(),code=name.toUpperCase().replace(/^(?:T|1|2)/,'').replace(/[0-9]+$/,'');
  var labels={CAR:'BAC PRO Carrossier Peintre Automobile',CIEL:'BAC PRO Cybersécurité, Informatique et Électronique',MELEC:"BAC PRO Métiers de l'Électricité et de ses Environnements Connectés",MP3D:'BAC PRO Modélisation et Prototypage 3D',MP3:'BAC PRO Modélisation et Prototypage 3D',MT:'BAC PRO Microtechniques',MVA:'BAC PRO Maintenance des Véhicules',RMO:'BAC PRO TRPM option Réalisation et Maintenance des Outillages',RSP:'BAC PRO TRPM option Réalisation et Suivi de Production'};
  if(labels[code])return labels[code];if(fam==='BTS')return'BTS — '+name.replace(/^[12]/,'');if(fam==='CAP')return'CAP — '+name.replace(/^(?:T|1|2)/,'');return'BAC PRO — '+code;
}
function EUC_DEV538_level_(c){
  if(c&&c.niveau)return EUC_DEV538_t_(c.niveau);var name=EUC_DEV538_t_(c&&c.classe||c&&c.nom).toUpperCase(),fam=EUC_DEV538_t_(c&&c.famille).toUpperCase();
  if(fam==='BTS')return/^2/.test(name)?'2e année':'1re année';if(fam==='CAP')return/^(?:T|2)/.test(name)?'Terminale':'Première';if(/^T/.test(name))return'Terminale';if(/^1/.test(name))return'Première';if(/^2/.test(name))return'Seconde';return'Autre';
}
function EUC_DEV544_establishment_(c){
  c=c||{};var raw=EUC_DEV538_norm_(EUC_DEV538_pick_(c,['etablissement','Etablissement_Pronote','Etablissement','Etab','Source_Pronote','site','Site']));
  if(/(?:^| )(?:LGT|GENERAL|TECHNOLOGIQUE)(?: |$)/.test(raw))return'LGT';
  if(/(?:^| )(?:LP|PROFESSIONNEL)(?: |$)/.test(raw))return'LP';
  return EUC_DEV538_t_(c.famille).toUpperCase()==='BTS'?'LGT':'LP';
}
function EUC_DEV544_dashboardBreakdown_(groups){
  var keys=['effectif','quota','apprentis','futurs','distribues','dossiersRemis','transmisCfa','contratsValides','apprentisClasseEntiere','apprentisMixite'],by={LP:{code:'LP',label:'Lycée professionnel',totals:{},classes:[]},LGT:{code:'LGT',label:'Lycée général et technologique',totals:{},classes:[]}};
  keys.forEach(function(k){by.LP.totals[k]=0;by.LGT.totals[k]=0;});
  (groups||[]).forEach(function(g){(g.lignes||[]).forEach(function(r){if(r.active===false)return;var code=EUC_DEV544_establishment_(r),bucket=by[code]||by.LP,totals={};keys.forEach(function(k){totals[k]=EUC_DEV538_n_(r[k]);bucket.totals[k]+=totals[k];});bucket.classes.push({classe:EUC_DEV538_t_(r.classe),niveau:EUC_DEV538_t_(r.niveau),diplome:EUC_DEV538_t_(r.diplome||g.diplome),totals:totals});});});
  return['LP','LGT'].map(function(code){by[code].classes.sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});return by[code];});
}
function EUC_DEV538_latestByStudent_(rows,year){
  var latest={};(rows||[]).forEach(function(r){var f=EUC_DEV538_fields_(r),rowYear=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Annee_scolaire','Année_scolaire','Annee']));if(rowYear&&rowYear!==year)return;var eid=EUC_DEV538_ref_(EUC_DEV538_pick_(f,['Eleve','Élève','Eleve_id']));if(!eid)return;if(!latest[eid]||EUC_DEV538_n_(r.id)>EUC_DEV538_n_(latest[eid].id))latest[eid]=r;});return latest;
}
function EUC_DEV538_distributionByStudent_(rows,year){
  var latest={};(rows||[]).forEach(function(r){var f=EUC_DEV538_fields_(r),rowYear=EUC_DEV538_t_(f.Annee_scolaire);if(rowYear&&rowYear!==year||EUC_DEV538_t_(f.Statut).toUpperCase()==='ANNULE')return;var eid=EUC_DEV538_ref_(f.Eleve),d=EUC_DEV538_date_(f.Date_edition);if(!eid||!d)return;if(!latest[eid]||d.getTime()>latest[eid].getTime())latest[eid]=d;});return latest;
}
function EUC_DEV538_apprenticeState_(row,printDate,now){
  var f=EUC_DEV538_fields_(row),rupture=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_rupture_contrat','Date_rupture'])),contract=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_contrat_officielle','Date_contrat'])),start=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_debut','Debut']))||contract,end=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_fin','Fin']));
  var broken=!!rupture&&rupture.getTime()<=now.getTime(),complete=!!contract&&!!start&&!!end&&!broken,current=!broken&&(EUC_DEV538_bool_(f.Actif)||complete)&&(!end||end.getTime()>=now.getTime());
  var distribution=EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_distribution_dossier']))||printDate||null,distributed=EUC_DEV538_bool_(f.Dossier_distribue)||!!distribution,returned=EUC_DEV538_bool_(f.Dossier_remis)||!!EUC_DEV538_date_(EUC_DEV538_pick_(f,['Date_remise_dossier','Date_dossier'])),cfa=EUC_DEV538_bool_(f.Dossier_transmis_CFA)||!!EUC_DEV538_date_(f.Date_transmission_CFA),days=distribution?Math.max(0,Math.floor((now.getTime()-distribution.getTime())/86400000)):0;
  var future=!broken&&!current&&(distributed||returned||cfa||!!contract||!!start);
  return{current:current,future:future,distributed:distributed,returned:returned,dossierRemis:returned,cfa:cfa,contractValid:complete,reminder:distributed&&!returned&&days>=EUC_DEV538_RELANCE_DAYS_,days:days,distribution:EUC_DEV538_iso_(distribution)};
}
function EUC_DEV541_apprentissageClasses_(annee){
  var rows=[];
  if(typeof EUC_DEV190X_classes_==='function')rows=EUC_DEV190X_classes_(annee,false)||[];
  else rows=(EUC_DEV368_catalog(annee).classes||[]);
  return rows.map(function(c){
    var classe=EUC_DEV538_t_(c.classe||c.nom),upper=classe.toUpperCase(),famille=EUC_DEV538_t_(c.famille).toUpperCase();
    if(!famille)famille=/BTS/.test(upper)?'BTS':/CAP/.test(upper)?'CAP':'BACPRO';
    return{id:EUC_DEV538_n_(c.classeId||c.id),classe:classe,famille:famille,niveau:EUC_DEV538_level_({classe:classe,famille:famille,niveau:c.niveau}),etablissement:EUC_DEV544_establishment_({classe:classe,famille:famille,etablissement:c.etablissement,Etablissement_Pronote:c.Etablissement_Pronote,Etablissement:c.Etablissement,Etab:c.Etab,Source_Pronote:c.Source_Pronote,site:c.site,Site:c.Site})};
  }).filter(function(c){return c.id&&c.classe;});
}
function EUC_DEV538_apprentissageDashboard_(annee){
  annee=EUC_DEV538_t_(annee)||EUC_DEV368_year('');var classes=EUC_DEV541_apprentissageClasses_(annee),classById={},classByName={};classes.forEach(function(c){classById[c.id]=c;classByName[EUC_DEV538_norm_(c.classe)]=c;});
  var now=new Date(),yearsById=EUC_DEV538_schoolYearMap_(),students=[],studentById={};EUC_DEV538_records_('EUC_ELEVES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id);if(!id||!EUC_DEV543_studentPresent_(f,now)||EUC_DEV538_studentYear_(f,yearsById)!==annee)return;var cid=EUC_DEV538_ref_(f.Classe),label=EUC_DEV538_t_(f.Code_classe_importe||f.Classe_nom||f.Classe_snapshot),cl=classById[cid]||classByName[EUC_DEV538_norm_(label)];if(!cl)return;var s={id:id,nom:[EUC_DEV538_t_(f.Nom),EUC_DEV538_t_(f.Prenom_usage||f.Prenom)].filter(Boolean).join(' '),classeId:cl.id,classe:cl.classe};students.push(s);studentById[id]=s;});
  var latest=EUC_DEV538_latestByStudent_(EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP',{}),annee),prints=EUC_DEV538_distributionByStudent_(EUC_DEV538_optionalRecords_('EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS',{}),annee),diplomas=EUC_DEV538_diplomas_(),config=EUC_DEV538_quotaConfig_(),yearConfig=config[annee]||{},activeConfig=EUC_DEV542_activeClassesConfig_(),modeConfig=EUC_DEV545_classModesConfig_(),rowByClass={};
  classes.forEach(function(c){rowByClass[c.id]={classeId:c.id,classe:c.classe,famille:c.famille,niveau:c.niveau,etablissement:c.etablissement||EUC_DEV544_establishment_(c),diplome:diplomas[c.id]||EUC_DEV538_fallbackDiploma_(c),active:EUC_DEV542_classActive_(activeConfig,annee,c.id),mode:EUC_DEV545_classMode_(modeConfig,annee,c.id),effectif:0,quotaPercent:EUC_DEV538_n_(yearConfig[c.id]),quota:0,apprentis:0,futurs:0,distribues:0,dossiersRemis:0,retournes:0,transmisCfa:0,contratsValides:0,apprentisClasseEntiere:0,apprentisMixite:0,relances:[],dossiers:[]};});
  students.forEach(function(s){var out=rowByClass[s.classeId];if(!out)return;out.effectif++;var state=EUC_DEV538_apprenticeState_(latest[s.id],prints[s.id],now);if(state.current){out.apprentis++;if(out.mode==='CLASSE_ENTIERE')out.apprentisClasseEntiere++;else out.apprentisMixite++;}if(state.future)out.futurs++;if(state.distributed&&!state.returned)out.distribues++;if(state.dossierRemis)out.dossiersRemis++;if(state.returned&&!state.cfa)out.retournes++;if(state.cfa)out.transmisCfa++;if(state.contractValid)out.contratsValides++;if(state.distributed||state.returned||state.cfa)out.dossiers.push({eleveId:s.id,eleve:s.nom,classe:s.classe,dateDistribution:state.distribution,jours:state.days,statut:state.cfa?'Transmis au CFA':state.returned?'Dossier remis':'Dossier distribué',aRelancer:state.reminder});if(state.reminder)out.relances.push({eleveId:s.id,eleve:s.nom,classe:s.classe,dateDistribution:state.distribution,jours:state.days});});
  var groups={},totals={effectif:0,quota:0,apprentis:0,futurs:0,distribues:0,dossiersRemis:0,retournes:0,transmisCfa:0,contratsValides:0,apprentisClasseEntiere:0,apprentisMixite:0,relances:0};Object.keys(rowByClass).forEach(function(k){var r=rowByClass[k];r.quota=Math.round(r.effectif*r.quotaPercent/100);var key=r.diplome;if(!groups[key])groups[key]={diplome:key,famille:r.famille,lignes:[]};groups[key].lignes.push(r);if(r.active)Object.keys(totals).forEach(function(x){if(x==='relances')totals[x]+=r.relances.length;else totals[x]+=EUC_DEV538_n_(r[x]);});});
  var groupList=Object.keys(groups).map(function(k){groups[k].lignes.sort(function(a,b){return a.niveau.localeCompare(b.niveau,'fr')||a.classe.localeCompare(b.classe,'fr');});return groups[k];}).sort(function(a,b){return a.diplome.localeCompare(b.diplome,'fr');});
  var dossiers=[],relances=[];groupList.forEach(function(g){g.lignes.forEach(function(r){if(!r.active)return;dossiers=dossiers.concat(r.dossiers||[]);relances=relances.concat(r.relances||[]);});});dossiers.sort(function(a,b){return(a.classe||'').localeCompare(b.classe||'','fr')||(a.eleve||'').localeCompare(b.eleve||'','fr');});relances.sort(function(a,b){return b.jours-a.jours||(a.eleve||'').localeCompare(b.eleve||'','fr');});
  return{ok:true,version:EUC_DEV538_VERSION_,annee:annee,groups:groupList,totals:totals,breakdown:EUC_DEV544_dashboardBreakdown_(groupList),dossiers:dossiers,relances:relances,relanceApresJours:EUC_DEV538_RELANCE_DAYS_};
}
function EUC_DEV538_apprentissageDashboard(annee){EUC_DEV538_admin_();return EUC_DEV538_apprentissageDashboard_(annee);}
/* Vue agrégée commune aux pages publique et administrative. Elle expose les
 * capacités et compteurs par classe, mais jamais les dossiers ou les noms des
 * élèves présents dans la réponse administrative complète. */
function EUC_DEV541_apprentissageDashboardPublic(annee){
  var data=EUC_DEV538_apprentissageDashboard_(annee),totals=data.totals||{};
  return{ok:true,version:EUC_DEV538_VERSION_,annee:data.annee,totals:{effectif:EUC_DEV538_n_(totals.effectif),quota:EUC_DEV538_n_(totals.quota),apprentis:EUC_DEV538_n_(totals.apprentis),futurs:EUC_DEV538_n_(totals.futurs),distribues:EUC_DEV538_n_(totals.distribues),dossiersRemis:EUC_DEV538_n_(totals.dossiersRemis),transmisCfa:EUC_DEV538_n_(totals.transmisCfa),contratsValides:EUC_DEV538_n_(totals.contratsValides),apprentisClasseEntiere:EUC_DEV538_n_(totals.apprentisClasseEntiere),apprentisMixite:EUC_DEV538_n_(totals.apprentisMixite)},breakdown:EUC_DEV544_dashboardBreakdown_(data.groups||[]),groups:(data.groups||[]).map(function(g){var activeRows=(g.lignes||[]).filter(function(r){return r.active!==false;});return activeRows.length?{diplome:EUC_DEV538_t_(g.diplome),famille:EUC_DEV538_t_(g.famille),lignes:activeRows.map(function(r){return{niveau:EUC_DEV538_t_(r.niveau),classe:EUC_DEV538_t_(r.classe),effectif:EUC_DEV538_n_(r.effectif),quotaPercent:EUC_DEV538_n_(r.quotaPercent),quota:EUC_DEV538_n_(r.quota),mode:EUC_DEV538_t_(r.mode),apprentis:EUC_DEV538_n_(r.apprentis),futurs:EUC_DEV538_n_(r.futurs),distribues:EUC_DEV538_n_(r.distribues),dossiersRemis:EUC_DEV538_n_(r.dossiersRemis),transmisCfa:EUC_DEV538_n_(r.transmisCfa),contratsValides:EUC_DEV538_n_(r.contratsValides),apprentisClasseEntiere:EUC_DEV538_n_(r.apprentisClasseEntiere),apprentisMixite:EUC_DEV538_n_(r.apprentisMixite)};})}:null;}).filter(Boolean)};
}
function EUC_DEV538_saveQuotas(q){
  EUC_DEV538_admin_();q=q||{};var year=EUC_DEV538_t_(q.annee),rows=Array.isArray(q.lignes)?q.lignes:[];if(!/^20\d{2}-20\d{2}$/.test(year))throw new Error('Année scolaire invalide.');var all=EUC_DEV538_quotaConfig_(),activeAll=EUC_DEV542_activeClassesConfig_(),modeAll=EUC_DEV545_classModesConfig_(),saved={},activeSaved={},modeSaved={};rows.forEach(function(r){var id=EUC_DEV538_n_(r.classeId),pct=Number(r.quotaPercent),mode=EUC_DEV538_t_(r.mode).toUpperCase()||'MIXITE';if(!id||!isFinite(pct)||pct<0||pct>100)throw new Error('Pourcentage invalide pour une classe.');if(['MIXITE','CLASSE_ENTIERE'].indexOf(mode)<0)throw new Error('Modalité invalide pour une classe.');saved[id]=Math.round(pct*100)/100;activeSaved[id]=r.active!==false;modeSaved[id]=mode;});all[year]=saved;activeAll[year]=activeSaved;modeAll[year]=modeSaved;var values={};values[EUC_DEV538_QUOTAS_PROP_]=JSON.stringify(all);values[EUC_DEV542_ACTIVE_CLASSES_PROP_]=JSON.stringify(activeAll);values[EUC_DEV545_CLASS_MODES_PROP_]=JSON.stringify(modeAll);PropertiesService.getScriptProperties().setProperties(values,false);return{ok:true,annee:year,lignes:Object.keys(saved).length,actives:Object.keys(activeSaved).filter(function(id){return activeSaved[id];}).length};
}

/* DEV545 — le tableau principal historique reste la source des compteurs
 * globaux. Seule sa ventilation classe entière / mixité est remplacée par le
 * réglage explicite de chaque classe. */
function EUC_DEV545_classModesByName_(annee){
  var config=EUC_DEV545_classModesConfig_(),out={};
  EUC_DEV541_apprentissageClasses_(annee).forEach(function(c){out[EUC_DEV538_norm_(c.classe)]=EUC_DEV545_classMode_(config,annee,c.id);});
  return out;
}
function EUC_DEV545_dashboardLive(annee){
  var base=EUC_DEV250_dashboardLive(annee)||{},modes=EUC_DEV545_classModesByName_(annee),entiere=0,mixite=0;
  base.global=base.global||{};base.classes=base.classes||{};
  Object.keys(base.classes).forEach(function(code){var n=EUC_DEV538_n_((base.classes[code]||{}).apprentisActifs);if((modes[EUC_DEV538_norm_(code)]||'MIXITE')==='CLASSE_ENTIERE')entiere+=n;else mixite+=n;});
  base.global.apprentisClasseEntiere=entiere;base.global.apprentisMixite=mixite;return base;
}
function EUC_DEV545_dashboardDetails(annee){
  var base=EUC_DEV251_dashboardDetails(annee)||{},lists=base.lists||{},modes=EUC_DEV545_classModesByName_(annee);lists.classeEntiere=[];lists.mixite=[];
  (lists.total||[]).forEach(function(item){if((modes[EUC_DEV538_norm_(item.classe)]||'MIXITE')==='CLASSE_ENTIERE')lists.classeEntiere.push(item);else lists.mixite.push(item);});
  base.lists=lists;return base;
}

function EUC_DEV545_companyAliases_(){
  var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV545_COMPANY_ALIASES_PROP_)||'';}catch(e){}
  try{var parsed=JSON.parse(raw||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch(e2){return{};}
}
function EUC_DEV545_companyIdentityFrom_(q){
  q=q||{};var explicit=EUC_DEV538_t_(q.identity),siret=EUC_DEV538_t_(q.siret).replace(/\D/g,'');
  return explicit||(siret.length===14?'SIRET|'+siret:EUC_DEV538_companyIdentity_(EUC_DEV538_t_(q.entreprise),EUC_DEV540_normalizeAddress_(q.adresse),''));
}
function EUC_DEV545_aliasTarget_(identity,aliases){
  var seen={},current=EUC_DEV538_t_(identity),entry=null;
  while(current&&aliases&&aliases[current]&&!seen[current]){seen[current]=true;entry=aliases[current];current=EUC_DEV538_t_(entry.target);}
  return entry?{identity:current||identity,entreprise:EUC_DEV538_t_(entry.entreprise),adresse:EUC_DEV538_t_(entry.adresse),siret:EUC_DEV538_t_(entry.siret).replace(/\D/g,'')}:{identity:identity,entreprise:'',adresse:'',siret:''};
}
function EUC_DEV545_linkCompanyAlias(q){
  EUC_DEV538_admin_();q=q||{};var source=EUC_DEV545_companyIdentityFrom_(q.source),target=EUC_DEV545_companyIdentityFrom_(q.target);if(!source||!target||source===target)throw new Error('Choisissez deux établissements différents.');
  var aliases=EUC_DEV545_companyAliases_(),resolved=EUC_DEV545_aliasTarget_(target,aliases);if(resolved.identity===source)throw new Error('Ce rattachement créerait une boucle.');
  aliases[source]={target:resolved.identity,entreprise:EUC_DEV538_t_(q.target&&q.target.entreprise),adresse:EUC_DEV540_normalizeAddress_(q.target&&q.target.adresse),siret:EUC_DEV538_t_(q.target&&q.target.siret).replace(/\D/g,''),sourceEntreprise:EUC_DEV538_t_(q.source&&q.source.entreprise),updatedAt:new Date().toISOString()};
  PropertiesService.getScriptProperties().setProperty(EUC_DEV545_COMPANY_ALIASES_PROP_,JSON.stringify(aliases));return{ok:true,source:source,target:resolved.identity};
}
function EUC_DEV545_unlinkCompanyAlias(q){
  EUC_DEV538_admin_();var source=EUC_DEV545_companyIdentityFrom_(q&&q.source);if(!source)throw new Error('Appellation à dissocier invalide.');var aliases=EUC_DEV545_companyAliases_();delete aliases[source];PropertiesService.getScriptProperties().setProperty(EUC_DEV545_COMPANY_ALIASES_PROP_,JSON.stringify(aliases));return{ok:true,source:source};
}

function EUC_DEV538_yearsForScope_(q){
  q=q||{};var available=EUC_DEV537_geoYears_().slice().sort().reverse(),year=EUC_DEV538_t_(q.annee);if(year&&year.toUpperCase()!=='ALL')return[year];var windowSize=EUC_DEV538_n_(q.fenetre);return windowSize>0?available.slice(0,windowSize):available;
}
function EUC_DEV538_history_(q){
  q=q||{};var years=EUC_DEV538_yearsForScope_(q),companies={},bySiret={},byAddress={},byLoose={},aliasConfig=EUC_DEV545_companyAliases_(),diplomas=EUC_DEV538_diplomas_(),apprentices=EUC_DEV546_bookApprentices_(years,q.publicStudent!==true),needleCompany=EUC_DEV538_norm_(q.entreprise),needleStudent=EUC_DEV538_norm_(q.eleve),needleTeacher=EUC_DEV538_norm_(q.professeur),needleDiploma=EUC_DEV538_norm_(q.diplome),needleLevel=EUC_DEV538_norm_(q.niveau),needleClass=EUC_DEV538_norm_(q.classe),needlePeriod=EUC_DEV538_norm_(q.periode),needleCity=EUC_DEV538_norm_(q.ville);
  function copySet(target,source,name){Object.keys(source[name]||{}).forEach(function(k){target[name][k]=true;});}
  function merge(target,source){if(!source||target===source)return target;(source.historique||[]).forEach(function(h){target.historique.push(h);});copySet(target,source,'_seen');copySet(target,source,'_students');copySet(target,source,'_apprenticeStudents');if(!target.siret&&source.siret)target.siret=source.siret;if((source.adresse||'').length>(target.adresse||'').length)target.adresse=source.adresse;Object.keys(companies).forEach(function(k){if(companies[k]===source)delete companies[k];});Object.keys(byAddress).forEach(function(k){if(byAddress[k]===source)byAddress[k]=target;});Object.keys(byLoose).forEach(function(k){if(byLoose[k]===source)byLoose[k]=target;});return target;}
  function company(entreprise,adresse,siret){
    var sir=EUC_DEV538_t_(siret).replace(/\D/g,''),skey=sir.length===14?'SIRET|'+sir:'',akey=EUC_DEV538_companyIdentity_(entreprise,adresse,''),alias=EUC_DEV545_aliasTarget_(skey||akey,aliasConfig),identity=alias.identity||skey||akey;
    if(alias.entreprise)entreprise=alias.entreprise;if(alias.adresse)adresse=alias.adresse;if(alias.siret)sir=alias.siret;
    skey=sir.length===14?'SIRET|'+sir:'';var canonicalAddress=EUC_DEV538_companyIdentity_(entreprise,adresse,''),lkey=EUC_DEV540_companyLooseKey_(entreprise,adresse),candidate=companies[identity]||byAddress[canonicalAddress]||byLoose[lkey],c=skey&&bySiret[skey]||((!skey||!candidate||!candidate.siret||candidate.siret===sir)?candidate:null);
    if(!c)c={identity:identity,siret:sir,entreprise:entreprise,adresse:adresse,pays:EUC_DEV441_geoClassify_(adresse).pays,historique:[],_seen:{},_students:{},_apprenticeStudents:{}};
    c.identity=identity;c.entreprise=alias.entreprise||c.entreprise;c.adresse=alias.adresse||c.adresse;if(sir)c.siret=sir;companies[identity]=c;if(skey)bySiret[skey]=c;byAddress[akey]=c;byAddress[canonicalAddress]=c;if(lkey)byLoose[lkey]=c;return c;
  }
  years.forEach(function(year){var scoped={annee:year,famille:EUC_DEV538_t_(q.famille),classeId:EUC_DEV538_n_(q.classeId),periodeId:EUC_DEV538_n_(q.periodeId)},details=EUC_DEV445_geoSnapshotDetails_(scoped).concat(EUC_DEV513_geoAccessDetails_(scoped));
    details.forEach(function(d){var cid=EUC_DEV538_n_(d&&d.classe&&(d.classe.id||d.classe.classeId)),classe=EUC_DEV538_t_(d&&d.classe&&(d.classe.nom||d.classe.libelle)),famille=EUC_DEV538_t_(d&&d.famille),periode=EUC_DEV538_t_(d&&d.periode&&(d.periode.libelle||d.periode.nom)),niveau=EUC_DEV538_level_({classe:classe,famille:famille}),diplome=diplomas[cid]||EUC_DEV538_fallbackDiploma_({classe:classe,famille:famille});if(needleDiploma&&EUC_DEV538_norm_(diplome).indexOf(needleDiploma)<0||needleLevel&&EUC_DEV538_norm_(niveau).indexOf(needleLevel)<0||needleClass&&EUC_DEV538_norm_(classe).indexOf(needleClass)<0||needlePeriod&&EUC_DEV538_norm_(periode).indexOf(needlePeriod)<0)return;
      (d.lignes||[]).forEach(function(x){var entreprise=EUC_DEV538_t_(x.entreprise),adresse=EUC_DEV443_normalizeAddress_(x.adresseEntreprise),siret=EUC_DEV538_t_(x.siretEntreprise||x.siret).replace(/\D/g,''),eleve=[EUC_DEV538_t_(x.nom),EUC_DEV538_t_(x.prenom)].filter(Boolean).join(' '),prof=EUC_DEV538_t_(x.professeurVisiteur),studentId=EUC_DEV538_n_(x.eleveId)||EUC_DEV538_n_(apprentices.studentNameKeys[year+'|'+EUC_DEV538_norm_(eleve)]),meta=apprentices.students[studentId],contracts=apprentices.byStudentYear[year+'|'+studentId]||[];if(meta){if(!eleve)eleve=meta.eleve;if(!meta.eleve)meta.eleve=eleve;if(!meta.classeId)meta.classeId=cid;if(!meta.classe)meta.classe=classe;if(!meta.famille)meta.famille=famille;}if(!prof&&studentId)prof=Object.keys(apprentices.visitors[year+'|'+studentId]||{}).sort(function(a,b){return a.localeCompare(b,'fr');}).join(' · ');if(EUC_DEV546_isApprenticeLine_(x,entreprise,adresse,siret,contracts))return;if(!entreprise||!adresse||needleCompany&&EUC_DEV538_norm_(entreprise+' '+adresse).indexOf(needleCompany)<0||needleStudent&&EUC_DEV538_norm_(eleve).indexOf(needleStudent)<0||needleTeacher&&EUC_DEV538_norm_(prof).indexOf(needleTeacher)<0)return;
        var c=company(entreprise,adresse,siret),studentKey=studentId?'E'+studentId:(EUC_DEV537_studentKey_(x)||EUC_DEV538_norm_(eleve));if(!studentKey)return;var key=[year,cid,EUC_DEV538_n_(d&&d.periode&&d.periode.id),studentKey].join('|');if(c._seen[key])return;c._seen[key]=true;c._students[studentKey]=true;c.historique.push({annee:year,famille:famille,eleve:eleve,classe:classe,niveau:niveau,diplome:diplome,periode:periode,professeurVisiteur:prof,apprenti:false,typeAccueil:'SCOLAIRE',responsable:EUC_DEV540_contactName_(x.responsableEntreprise||x.contactEntreprise),telephoneResponsable:EUC_DEV538_t_(x.telephoneEntreprise),courrielResponsable:EUC_DEV538_t_(x.courrielEntreprise),tuteur:EUC_DEV540_contactName_(x.tuteurEntreprise),telephoneTuteur:EUC_DEV538_t_(x.telephoneTuteur),courrielTuteur:EUC_DEV538_t_(x.courrielTuteur),dateSaisie:EUC_DEV538_t_(x.dateSaisieEntreprise||x.dateSaisie||x.updatedAt||d.updatedAt||year+'-01-01'),sourceRecordId:EUC_DEV538_n_(x.sourceRecordId)});
      });
    });
  });
  (apprentices.contracts||[]).forEach(function(info){var meta=info.meta||{},classe=EUC_DEV538_t_(meta.classe),cid=EUC_DEV538_n_(meta.classeId),famille=EUC_DEV538_t_(meta.famille),niveau=EUC_DEV538_level_({classe:classe,famille:famille}),diplome=diplomas[cid]||EUC_DEV538_fallbackDiploma_({classe:classe,famille:famille}),eleve=EUC_DEV538_t_(info.eleve),prof=EUC_DEV538_t_(info.professeurVisiteur);if(EUC_DEV538_t_(q.famille)&&EUC_DEV538_norm_(famille)!==EUC_DEV538_norm_(q.famille)||EUC_DEV538_n_(q.classeId)&&cid!==EUC_DEV538_n_(q.classeId)||needleDiploma&&EUC_DEV538_norm_(diplome).indexOf(needleDiploma)<0||needleLevel&&EUC_DEV538_norm_(niveau).indexOf(needleLevel)<0||needleClass&&EUC_DEV538_norm_(classe).indexOf(needleClass)<0||needlePeriod&&EUC_DEV538_norm_(info.periode).indexOf(needlePeriod)<0||needleCompany&&EUC_DEV538_norm_(info.entreprise+' '+info.adresse).indexOf(needleCompany)<0||needleStudent&&EUC_DEV538_norm_(eleve).indexOf(needleStudent)<0||needleTeacher&&EUC_DEV538_norm_(prof).indexOf(needleTeacher)<0)return;var c=company(info.entreprise,info.adresse,info.siret),studentKey='E'+info.eleveId,key=['APP',info.annee,studentKey,info.debut,info.fin,c.identity].join('|');if(c._seen[key])return;c._seen[key]=true;c._students[studentKey]=true;c._apprenticeStudents[studentKey]=true;c.historique.push({annee:info.annee,famille:famille,eleve:eleve,classe:classe,niveau:niveau,diplome:diplome,periode:info.periode,professeurVisiteur:prof,apprenti:true,typeAccueil:'APPRENTI',responsable:info.responsable,telephoneResponsable:info.telephoneResponsable,courrielResponsable:info.courrielResponsable,tuteur:info.tuteur,telephoneTuteur:info.telephoneTuteur,courrielTuteur:info.courrielTuteur,dateSaisie:info.dateSaisie||info.annee+'-01-01',sourceRecordId:info.recordId});});
  var geoBy={};EUC_DEV537_mergeAnnualCandidates_(years).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,x.siret),addressKey=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,''),current=geoBy[identity]||geoBy[addressKey];if(!current||(current.latitude==null||current.longitude==null)&&x.latitude!=null&&x.longitude!=null)current=x;geoBy[identity]=current;geoBy[addressKey]=current;});
  var unique=[];Object.keys(companies).forEach(function(k){if(unique.indexOf(companies[k])<0)unique.push(companies[k]);});var list=unique.map(function(c){
    var g=geoBy[c.identity]||geoBy[EUC_DEV538_companyIdentity_(c.entreprise,c.adresse,'')]||{},named=Object.keys(c._students).length,apprenticeCount=Object.keys(c._apprenticeStudents).length,latestAt='',latestRecordId=0;
    c.elevesAccueillis=named||EUC_DEV538_n_(g.elevesAccueillis);c.apprentisAccueillis=Math.min(c.elevesAccueillis,apprenticeCount);c.scolairesAccueillis=Math.max(0,c.elevesAccueillis-c.apprentisAccueillis);if(!c.siret&&g.siret)c.siret=EUC_DEV538_t_(g.siret);c.latitude=g.latitude==null?null:Number(g.latitude);c.longitude=g.longitude==null?null:Number(g.longitude);c.ville=EUC_DEV547_city_(c.adresse);c.aliases=Object.keys(aliasConfig).filter(function(source){return EUC_DEV545_aliasTarget_(source,aliasConfig).identity===c.identity;}).map(function(source){return{identity:source,entreprise:EUC_DEV538_t_(aliasConfig[source].sourceEntreprise)||source};});
    c.historique.forEach(function(h){var at=EUC_DEV538_t_(h.dateSaisie)||EUC_DEV538_t_(h.annee)+'-01-01';if(at>latestAt)latestAt=at;latestRecordId=Math.max(latestRecordId,EUC_DEV538_n_(h.sourceRecordId));delete h.sourceRecordId;});c.derniereSaisie=latestAt;c._latestRecordId=latestRecordId;c.responsables=EUC_DEV547_contacts_(c.historique,'responsable');c.tuteurs=EUC_DEV547_contacts_(c.historique,'tuteur');c.historique.sort(function(a,b){return b.annee.localeCompare(a.annee,'fr')||a.eleve.localeCompare(b.eleve,'fr');});delete c._seen;delete c._students;delete c._apprenticeStudents;return c;
  }).filter(function(c){return!needleCity||EUC_DEV538_norm_(c.ville+' '+c.adresse).indexOf(needleCity)>=0;});
  var rankByCount=EUC_DEV538_t_(q.tri).toUpperCase()==='ACCUEILS';list.sort(function(a,b){return rankByCount?(b.elevesAccueillis-a.elevesAccueillis||a.entreprise.localeCompare(b.entreprise,'fr')):(b.derniereSaisie.localeCompare(a.derniereSaisie,'fr')||b._latestRecordId-a._latestRecordId||a.entreprise.localeCompare(b.entreprise,'fr'));});list.forEach(function(c){delete c._latestRecordId;});return list;
}
function EUC_DEV540_facets_(list){var keys=['famille','diplome','niveau','classe','periode','eleve','professeurVisiteur'],sets={},out={};keys.forEach(function(k){sets[k]={};});var companies={},cities={};(list||[]).forEach(function(c){companies[c.entreprise]=true;if(c.ville)cities[c.ville]=true;(c.historique||[]).forEach(function(h){keys.forEach(function(k){var v=EUC_DEV538_t_(h[k]);if(v)sets[k][v]=true;});});});keys.forEach(function(k){out[k]=Object.keys(sets[k]).sort(function(a,b){return a.localeCompare(b,'fr');});});out.entreprise=Object.keys(companies).sort(function(a,b){return a.localeCompare(b,'fr');});out.ville=Object.keys(cities).sort(function(a,b){return a.localeCompare(b,'fr');});return out;}
function EUC_DEV547_bookResponse_(q,list){var page=EUC_DEV547_paginate_(list,q),facets=EUC_DEV540_facets_(list);return{ok:true,version:EUC_DEV538_VERSION_,total:page.total,page:page.page,pageSize:page.pageSize,totalPages:page.totalPages,facets:facets,companyRefs:list.map(function(c){return{identity:c.identity,siret:c.siret,entreprise:c.entreprise,adresse:c.adresse};}),entreprises:page.items};}
function EUC_DEV538_bookData(q){EUC_DEV538_admin_();return EUC_DEV547_bookResponse_(q||{},EUC_DEV538_history_(q||{}));}
function EUC_DEV538_staffBookData(q){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');return EUC_DEV547_bookResponse_(q||{},EUC_DEV538_history_(q||{}));}
function EUC_DEV546_studentBookData(q){
  q=q||{};var safe={annee:'ALL',fenetre:3,publicStudent:true,famille:EUC_DEV538_t_(q.famille),diplome:EUC_DEV538_t_(q.diplome),ville:EUC_DEV538_t_(q.ville),entreprise:EUC_DEV538_t_(q.entreprise),tri:EUC_DEV538_t_(q.tri),page:q.page,pageSize:q.pageSize},list=EUC_DEV538_history_(safe),page=EUC_DEV547_paginate_(list,safe),allFacets=EUC_DEV540_facets_(list),facets={famille:allFacets.famille||[],diplome:allFacets.diplome||[],ville:allFacets.ville||[],entreprise:allFacets.entreprise||[]};
  function safeContact(c){return{nom:EUC_DEV538_t_(c&&c.nom),telephone:EUC_DEV538_t_(c&&c.telephone),courriel:EUC_DEV538_t_(c&&c.courriel),telephones:(c&&c.telephones||[]).map(EUC_DEV538_t_),courriels:(c&&c.courriels||[]).map(EUC_DEV538_t_)};}
  return{ok:true,version:EUC_DEV538_VERSION_,fenetre:3,total:page.total,page:page.page,pageSize:page.pageSize,totalPages:page.totalPages,facets:facets,entreprises:page.items.map(function(c){return{entreprise:EUC_DEV538_t_(c.entreprise),adresse:EUC_DEV538_t_(c.adresse),ville:EUC_DEV538_t_(c.ville),latitude:c.latitude,longitude:c.longitude,derniereSaisie:EUC_DEV538_t_(c.derniereSaisie),elevesAccueillis:EUC_DEV538_n_(c.elevesAccueillis),scolairesAccueillis:EUC_DEV538_n_(c.scolairesAccueillis),apprentisAccueillis:EUC_DEV538_n_(c.apprentisAccueillis),responsables:(c.responsables||[]).map(safeContact),tuteurs:(c.tuteurs||[]).map(safeContact)};})};
}
/* La carte du book est construite sur le même agrégat canonique que la liste.
 * Un rattachement d'appellation est donc visible immédiatement, sans réécrire
 * les snapshots historiques ni les lignes métier de Grist. */
function EUC_DEV547_bookMapData(q){
  q=q||{};var mode=EUC_DEV538_t_(q.mode).toUpperCase(),parent=mode==='PARENTS';
  if(mode==='ADMIN')EUC_DEV538_admin_();else if(!parent&&!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');
  var safe=parent?{annee:'ALL',fenetre:3,publicStudent:true,famille:EUC_DEV538_t_(q.famille),diplome:EUC_DEV538_t_(q.diplome),ville:EUC_DEV538_t_(q.ville),entreprise:EUC_DEV538_t_(q.entreprise),tri:EUC_DEV538_t_(q.tri)}:{annee:q.annee,fenetre:q.fenetre,famille:q.famille,diplome:q.diplome,niveau:q.niveau,classe:q.classe,periode:q.periode,ville:q.ville,entreprise:q.entreprise,eleve:q.eleve,professeur:q.professeur,tri:q.tri};
  function contact(c){return{nom:EUC_DEV538_t_(c&&c.nom),telephone:EUC_DEV538_t_(c&&c.telephone),courriel:EUC_DEV538_t_(c&&c.courriel)};}
  var points=EUC_DEV538_history_(safe).filter(function(c){return c.latitude!==null&&c.longitude!==null&&isFinite(c.latitude)&&isFinite(c.longitude);}).map(function(c){
    var out={key:EUC_DEV441_digest_(c.identity).slice(0,32),entreprise:EUC_DEV538_t_(c.entreprise),adresse:EUC_DEV538_t_(c.adresse),ville:EUC_DEV538_t_(c.ville),latitude:Number(c.latitude),longitude:Number(c.longitude),elevesAccueillis:EUC_DEV538_n_(c.elevesAccueillis),scolairesAccueillis:EUC_DEV538_n_(c.scolairesAccueillis),apprentisAccueillis:EUC_DEV538_n_(c.apprentisAccueillis),responsables:(c.responsables||[]).map(contact),tuteurs:(c.tuteurs||[]).map(contact)};
    if(!parent)out.siret=EUC_DEV538_t_(c.siret);
    return out;
  });
  return{ok:true,version:EUC_DEV538_VERSION_,nominatif:!parent,total:points.length,points:points};
}
function EUC_DEV547_bookCompanyHistory(q){
  q=q||{};if(EUC_DEV538_t_(q.mode).toUpperCase()==='ADMIN')EUC_DEV538_admin_();else if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');
  var key=EUC_DEV538_t_(q.key),list=EUC_DEV538_history_({annee:q.annee,fenetre:q.fenetre,famille:q.famille,diplome:q.diplome,niveau:q.niveau,classe:q.classe,periode:q.periode,ville:q.ville,entreprise:q.entreprise,eleve:q.eleve,professeur:q.professeur,tri:q.tri}),match=list.filter(function(c){return EUC_DEV441_digest_(c.identity).slice(0,32)===key;})[0];
  return{ok:true,historique:match?(match.historique||[]).map(function(h){return{annee:EUC_DEV538_t_(h.annee),eleve:EUC_DEV538_t_(h.eleve),classe:EUC_DEV538_t_(h.classe),diplome:EUC_DEV538_t_(h.diplome),periode:EUC_DEV538_t_(h.periode),professeurVisiteur:EUC_DEV538_t_(h.professeurVisiteur),apprenti:h.apprenti===true};}):[]};
}
function EUC_DEV538_mapBase_(items,q){
  var by={},byAddress={};EUC_DEV517_geoFilter_(items||[],q||{}).filter(function(x){return isFinite(x.latitude)&&isFinite(x.longitude)&&x.latitude!==null&&x.longitude!==null&&(x.statut==='GEOCODE_AUTOMATIQUE'||x.statut==='VALIDE_MANUELLEMENT');}).forEach(function(x){var identity=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,x.siret),addressKey=EUC_DEV538_companyIdentity_(x.entreprise,x.adresse,''),addressCandidate=byAddress[addressKey],p=by[identity]||(!x.siret||!addressCandidate||!addressCandidate.siret||addressCandidate.siret===x.siret?addressCandidate:null);if(!p){p={identity:identity,key:EUC_DEV441_digest_(identity).slice(0,32),siret:x.siret||'',entreprise:x.entreprise,adresse:EUC_DEV540_normalizeAddress_(x.adresse),pays:x.pays,latitude:x.latitude,longitude:x.longitude,classe:x.classe||'',elevesAccueillis:0,_students:{},_classes:{}};}if(x.siret){p.identity=identity;p.key=EUC_DEV441_digest_(identity).slice(0,32);p.siret=x.siret;}by[p.identity]=p;if(!byAddress[addressKey]||!byAddress[addressKey].siret||byAddress[addressKey].siret===p.siret)byAddress[addressKey]=p;if(x.classe)EUC_DEV538_t_(x.classe).split(' / ').forEach(function(c){if(c)p._classes[c]=true;});(x.accueils||[]).forEach(function(a){if(a.eleveKey&&EUC_DEV537_scopeMatches_(a.scope||{},q||{}))p._students[a.eleveKey]=true;});p.elevesAccueillis=Math.max(p.elevesAccueillis,EUC_DEV538_n_(x.elevesAccueillis));});
  var unique=[];Object.keys(by).forEach(function(k){if(unique.indexOf(by[k])<0)unique.push(by[k]);});var points=unique.map(function(p){var count=Object.keys(p._students).length;p.elevesAccueillis=Math.max(p.elevesAccueillis,count);var classes=Object.keys(p._classes);if(classes.length)p.classe=classes.join(' / ');delete p._students;delete p._classes;delete p.identity;return p;});return{ok:true,total:points.length,points:points};
}
function EUC_DEV538_mapData(q){
  q=q||{};var parent=EUC_DEV538_t_(q.mode).toUpperCase()==='PARENTS',years=parent?EUC_DEV538_yearsForScope_({annee:'ALL',fenetre:3}):[],scope=parent?{annee:'ALL',famille:q.famille,classeId:q.classeId,periodeId:q.periodeId}:q,items=parent?EUC_DEV537_mergeAnnualCandidates_(years):EUC_DEV441_geoCandidates_(q),base=EUC_DEV538_mapBase_(items,scope),allowed=!parent&&EUC_DEV538_staffAllowed_();
  (base.points||[]).forEach(function(p){delete p.siret;p.nominatif=allowed;});base.nominatif=allowed;return base;
}
function EUC_DEV538_companyHistory(q){
  if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');q=q||{};var key=EUC_DEV538_t_(q.key),company=EUC_DEV538_norm_(q.entreprise),address=EUC_DEV538_norm_(EUC_DEV443_normalizeAddress_(q.adresse)),copy={annee:q.annee,fenetre:q.fenetre,famille:q.famille,classeId:q.classeId,periodeId:q.periodeId,entreprise:q.entreprise},list=EUC_DEV538_history_(copy),match=list.filter(function(c){return EUC_DEV441_digest_(c.identity).slice(0,32)===key;})[0];if(!match)match=list.filter(function(c){return EUC_DEV538_norm_(c.entreprise)===company&&EUC_DEV538_norm_(c.adresse)===address;})[0];if(!match&&list.length===1)match=list[0];return{ok:true,historique:match?match.historique:[]};
}

/* Cartographie apprentissage dédiée. La réponse publique ne contient jamais
 * de nom d'élève, d'identifiant ni de professeur. */
function EUC_DEV545_apprenticeMapData(q){
  q=q||{};var admin=EUC_DEV538_t_(q.mode).toUpperCase()==='ADMIN';if(admin)EUC_DEV538_admin_();
  var year=EUC_DEV538_t_(q.annee)||EUC_DEV368_year(''),classId=EUC_DEV538_n_(q.classeId),now=new Date(),classes=EUC_DEV541_apprentissageClasses_(year),classById={},classByName={},activeConfig=EUC_DEV542_activeClassesConfig_();
  classes.forEach(function(c){classById[c.id]=c;classByName[EUC_DEV538_norm_(c.classe)]=c;});
  var students={},yearsById=EUC_DEV538_schoolYearMap_();EUC_DEV538_records_('EUC_ELEVES_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),id=EUC_DEV538_n_(r.id||f.id);if(!id||!EUC_DEV543_studentPresent_(f,now)||EUC_DEV538_studentYear_(f,yearsById)!==year)return;var cid=EUC_DEV538_ref_(f.Classe),label=EUC_DEV538_t_(f.Code_classe_importe||f.Classe_nom||f.Classe_snapshot),cl=classById[cid]||classByName[EUC_DEV538_norm_(label)];if(!cl||!EUC_DEV542_classActive_(activeConfig,year,cl.id)||classId&&cl.id!==classId)return;students[id]={id:id,nom:[EUC_DEV538_t_(f.Nom),EUC_DEV538_t_(f.Prenom_usage||f.Prenom)].filter(Boolean).join(' '),classe:cl.classe,classeId:cl.id};});
  var visitors={};EUC_DEV538_optionalRecords_('EUC_AFFECTATIONS_SUIVI_PFMP',{}).forEach(function(r){var f=EUC_DEV538_fields_(r),rowYear=EUC_DEV538_t_(f.Annee_scolaire),type=EUC_DEV538_t_(f.Type_suivi).toUpperCase(),eid=EUC_DEV538_ref_(f.Eleve),name=EUC_DEV538_t_(f.Nom_professeur_snapshot);if(f.Actif===false||rowYear&&rowYear!==year||type.indexOf('VISITE')<0||!eid||!name)return;if(!visitors[eid])visitors[eid]={};visitors[eid][name]=true;});
  var geoBySiret={},geoByAddress={};(typeof EUC_DEV441_geoRows_==='function'?EUC_DEV441_geoRows_():[]).forEach(function(row){var f=EUC_DEV538_fields_(row),status=EUC_DEV538_t_(f.Statut).toUpperCase(),lat=Number(f.Latitude),lon=Number(f.Longitude),sir=EUC_DEV538_t_(f.SIRET).replace(/\D/g,''),company=EUC_DEV538_t_(f.Entreprise),address=EUC_DEV540_normalizeAddress_(f.Adresse_source);if(['GEOCODE_AUTOMATIQUE','VALIDE_MANUELLEMENT'].indexOf(status)<0||!isFinite(lat)||!isFinite(lon))return;var point={latitude:lat,longitude:lon};if(sir.length===14)geoBySiret[sir]=point;if(company&&address)geoByAddress[EUC_DEV538_companyIdentity_(company,address,'')]=point;});
  var aliases=EUC_DEV545_companyAliases_(),latest=EUC_DEV538_latestByStudent_(EUC_DEV538_optionalRecords_('EUC_APPRENTISSAGE_PFMP',{}),year),points={};Object.keys(students).forEach(function(key){var student=students[key],row=latest[key],state=EUC_DEV538_apprenticeState_(row,null,now);if(!state.current)return;var f=EUC_DEV538_fields_(row),company=EUC_DEV538_t_(EUC_DEV538_pick_(f,['Nom_commercial','Nom_entreprise','Entreprise'])),sir=EUC_DEV538_t_(f.SIRET).replace(/\D/g,''),address=EUC_DEV540_normalizeAddress_([EUC_DEV538_t_(EUC_DEV538_pick_(f,['Adresse_entreprise','Adresse'])),EUC_DEV538_t_(EUC_DEV538_pick_(f,['Code_postal','CodePostal','CP'])),EUC_DEV538_t_(f.Ville)].filter(Boolean).join(', '));if(!company||!address)return;var rawIdentity=sir.length===14?'SIRET|'+sir:EUC_DEV538_companyIdentity_(company,address,''),alias=EUC_DEV545_aliasTarget_(rawIdentity,aliases),identity=alias.identity||rawIdentity;if(alias.entreprise)company=alias.entreprise;if(alias.adresse)address=alias.adresse;if(alias.siret)sir=alias.siret;var geo=geoBySiret[sir]||geoByAddress[EUC_DEV538_companyIdentity_(company,address,'')];if(!geo)return;var point=points[identity];if(!point)point=points[identity]={key:EUC_DEV441_digest_(identity).slice(0,32),entreprise:company,adresse:address,latitude:geo.latitude,longitude:geo.longitude,apprentis:0,_students:{},details:[]};if(point._students[student.id])return;point._students[student.id]=true;point.apprentis++;if(admin)point.details.push({eleve:student.nom,annee:year,classe:student.classe,professeursVisiteurs:Object.keys(visitors[student.id]||{}).sort(function(a,b){return a.localeCompare(b,'fr');})});});
  var list=Object.keys(points).map(function(k){var p=points[k];delete p._students;if(!admin)delete p.details;return p;}).sort(function(a,b){return b.apprentis-a.apprentis||a.entreprise.localeCompare(b.entreprise,'fr');});return{ok:true,version:EUC_DEV538_VERSION_,annee:year,nominatif:admin,total:list.length,classes:classes.filter(function(c){return EUC_DEV542_classActive_(activeConfig,year,c.id);}).map(function(c){return{id:c.id,classe:c.classe};}),points:list};
}

function EUC_DEV540_photoRows_(){return EUC_DEV538_optionalRecords_(EUC_DEV540_PHOTO_TABLE_,{});}
function EUC_DEV540_photoMatch_(row,q){var f=EUC_DEV538_fields_(row),sir=EUC_DEV538_t_(q&&q.siret).replace(/\D/g,''),rowSir=EUC_DEV538_t_(f.SIRET).replace(/\D/g,''),identity=EUC_DEV538_t_(q&&q.identity),company=EUC_DEV538_norm_(q&&q.entreprise),address=EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(q&&q.adresse)),sameLocation=!!company&&!!address&&EUC_DEV538_norm_(f.Entreprise)===company&&EUC_DEV538_norm_(EUC_DEV540_normalizeAddress_(f.Adresse))===address;return f.Actif!==false&&((sir&&rowSir===sir)||(identity&&EUC_DEV538_t_(f.Cle_entreprise)===identity)||sameLocation);}
function EUC_DEV540_companyPhoto(q){
  if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var rows=EUC_DEV540_photoRows_().filter(function(r){return EUC_DEV540_photoMatch_(r,q);}).sort(function(a,b){return EUC_DEV538_n_(b.id)-EUC_DEV538_n_(a.id);}),f=rows.length?EUC_DEV538_fields_(rows[0]):null;if(!f||!f.Drive_file_id)return{ok:true,photo:null};
  try{var file=DriveApp.getFileById(EUC_DEV538_t_(f.Drive_file_id)),blob=file.getBlob(),mime=EUC_DEV538_t_(blob.getContentType()||f.Mime_type);return{ok:true,photo:{name:EUC_DEV538_t_(f.Nom_fichier||file.getName()),mime:mime,data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes()),updatedAt:EUC_DEV538_t_(f.Updated_at)}};}catch(e){return{ok:true,photo:null,avertissement:'La photo référencée dans Drive n’est plus accessible.'};}
}
function EUC_DEV540_ensurePhotoTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(t){return t.id===EUC_DEV540_PHOTO_TABLE_;}),defs=[['Cle_entreprise','Clé entreprise','Text'],['SIRET','SIRET','Text'],['Entreprise','Entreprise','Text'],['Adresse','Adresse','Text'],['Drive_file_id','Identifiant Drive','Text'],['Mime_type','Type MIME','Text'],['Nom_fichier','Nom du fichier','Text'],['Provenance','Provenance','Text'],['Droit_diffusion','Droit de diffusion confirmé','Bool'],['Actif','Actif','Bool'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par','Text']];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV540_PHOTO_TABLE_,columns:defs.map(function(d){return{id:d[0],fields:{label:d[1],type:d[2]}};})}]});return;}
  var current=EUC_ENT_grist('get','/tables/'+EUC_DEV540_PHOTO_TABLE_+'/columns').columns||[],have={};current.forEach(function(c){have[c.id]=true;});var missing=defs.filter(function(d){return!have[d[0]];}).map(function(d){return{id:d[0],fields:{label:d[1],type:d[2]}};});if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_DEV540_PHOTO_TABLE_+'/columns',{columns:missing});
}
function EUC_DEV540_photoFolder_(){
  var props=PropertiesService.getScriptProperties(),id=props.getProperty(EUC_DEV540_PHOTO_FOLDER_PROP_)||'';if(id){try{return DriveApp.getFolderById(id);}catch(e){}}
  var root=DriveApp.getRootFolder(),found=root.getFoldersByName('Eucalyptus PFMP - Photos entreprises'),folder=found.hasNext()?found.next():root.createFolder('Eucalyptus PFMP - Photos entreprises');props.setProperty(EUC_DEV540_PHOTO_FOLDER_PROP_,folder.getId());return folder;
}
function EUC_DEV540_saveCompanyPhoto(q){
  var ctx=EUC_DEV538_admin_();q=q||{};if(q.droitDiffusion!==true)throw new Error('Confirmez le droit de diffusion et l’absence de personne ou plaque lisible.');var mime=EUC_DEV538_t_(q.mime).toLowerCase();if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0)throw new Error('Format de photo non accepté. Utilisez JPEG, PNG ou WebP.');var b64=EUC_DEV538_t_(q.base64).replace(/^data:[^;]+;base64,/,''),bytes=Utilities.base64Decode(b64);if(!bytes.length||bytes.length>3145728)throw new Error('La photo doit peser moins de 3 Mo après réduction.');var identity=EUC_DEV538_t_(q.identity),entreprise=EUC_DEV538_t_(q.entreprise),adresse=EUC_DEV443_normalizeAddress_(q.adresse),siret=EUC_DEV538_t_(q.siret).replace(/\D/g,'');if(!identity||!entreprise)throw new Error('Entreprise invalide.');
  EUC_DEV540_ensurePhotoTable_();var ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg',safe=(entreprise+'-'+(siret||EUC_DEV441_digest_(identity).slice(0,10))).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,120),file=EUC_DEV540_photoFolder_().createFile(Utilities.newBlob(bytes,mime,safe+ext));file.setDescription('Photo de devanture PFMP — diffusion confirmée par '+EUC_DEV538_t_(ctx.email));var existing=EUC_DEV540_photoRows_().filter(function(r){return EUC_DEV540_photoMatch_(r,{identity:identity,siret:siret,entreprise:entreprise,adresse:adresse});})[0],fields={Cle_entreprise:identity,SIRET:siret,Entreprise:entreprise,Adresse:adresse,Drive_file_id:file.getId(),Mime_type:mime,Nom_fichier:file.getName(),Provenance:'TELEVERSEMENT_ADMIN',Droit_diffusion:true,Actif:true,Updated_at:new Date().toISOString(),Updated_by:EUC_DEV538_t_(ctx.email)},record={fields:fields},method='post';if(existing){record.id=existing.id;method='patch';}EUC_ENT_grist(method,'/tables/'+EUC_DEV540_PHOTO_TABLE_+'/records',{records:[record]});return{ok:true,name:file.getName(),mime:mime};
}

function EUC_DEV538_render_(file,title,boot){var t=HtmlService.createTemplateFromFile(file);t.bootJson=JSON.stringify(boot||EUC_DEV368_boot());return t.evaluate().setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV538_afficherQuotas(e){EUC_DEV538_admin_();return EUC_DEV538_render_('Apprentissage_Quotas_DEV538','Quotas et relances apprentissage');}
function EUC_DEV538_afficherBookAdmin(e){EUC_DEV538_admin_();var b=EUC_DEV368_boot();b.mode='ADMIN';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV538_afficherBookStaff(e){if(!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');var b=EUC_DEV368_boot();b.mode='STAFF';return EUC_DEV538_render_('Book_Entreprises_DEV538','Book des entreprises',b);}
function EUC_DEV546_afficherBookEleves(e){var b=EUC_DEV368_boot();b.mode='STUDENT';b.current='ALL';b.params={annee:'ALL',fenetre:3};return EUC_DEV538_render_('Book_Entreprises_Eleves_DEV546','Book des entreprises — élèves et familles',b);}
function EUC_DEV538_afficherCarteParents(e){var b=EUC_DEV368_boot();b.current='ALL';b.mode='PARENTS';b.params={annee:'ALL',famille:EUC_DEV538_t_(e&&e.parameter&&e.parameter.famille),mode:'PARENTS',fenetre:3};return EUC_DEV538_render_('Cartographie_PFMP_DEV441','Cartographie des entreprises — familles',b);}
function EUC_DEV545_apprenticeMapBoot_(mode,e){var b=EUC_DEV368_boot(),year=EUC_DEV538_t_(e&&e.parameter&&e.parameter.annee)||EUC_DEV538_t_(b.current)||EUC_DEV368_year('');b.mode=mode;b.current=year;b.classes=EUC_DEV541_apprentissageClasses_(year).filter(function(c){return EUC_DEV542_classActive_(EUC_DEV542_activeClassesConfig_(),year,c.id);});b.params={annee:year,classeId:EUC_DEV538_n_(e&&e.parameter&&e.parameter.classe)};return b;}
function EUC_DEV545_afficherCarteApprentisAdmin(e){EUC_DEV538_admin_();return EUC_DEV538_render_('Cartographie_Apprentis_DEV545','Cartographie des apprentis — administration',EUC_DEV545_apprenticeMapBoot_('ADMIN',e));}
function EUC_DEV545_afficherCarteApprentisPublic(e){return EUC_DEV538_render_('Cartographie_Apprentis_DEV545','Cartographie des apprentis — lecture seule',EUC_DEV545_apprenticeMapBoot_('PUBLIC',e));}
