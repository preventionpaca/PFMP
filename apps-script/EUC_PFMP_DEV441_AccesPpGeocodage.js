/** DEV441 — accès temporaire des professeurs principaux et géocodage PFMP.
 * Les codes PP sont limités à une classe/période et expirent à la fin de la
 * période. Les adresses hors France ne sont jamais envoyées à un géocodeur.
 */
var EUC_DEV441_PP_TABLE_='EUC_ACCES_PP_PFMP';
var EUC_DEV441_GEO_TABLE_='EUC_GEO_ENTREPRISES_PFMP';
var EUC_DEV441_GEO_URL_='https://data.geopf.fr/geocodage/search';
var EUC_DEV444_PP_SIGN_TABLE_='EUC_RESPONSABLES_CAMPAGNES_PP_PFMP';
var EUC_DEV444_PUBLIC_SITE_='https://pfmp.loucodi.fr/';

function EUC_DEV441_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV441_n_(v){return Number(v)||0;}
function EUC_DEV441_admin_(){return EUC_DEV368_admin();}
function EUC_DEV441_col_(id,label,type){return{id:id,fields:{label:label,type:type||'Text'}};}
function EUC_DEV441_digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,EUC_DEV441_t_(value))).replace(/=+$/,'');}
function EUC_DEV441_codeCanon_(value){return EUC_DEV441_t_(value).toUpperCase().replace(/[^A-Z0-9]/g,'');}
function EUC_DEV441_codeHash_(code,salt){return EUC_DEV441_digest_(EUC_DEV441_t_(salt)+'|'+EUC_DEV441_codeCanon_(code));}
function EUC_DEV441_newCode_(){var s=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'').toUpperCase().slice(0,20);return s.match(/.{1,5}/g).join('-');}
function EUC_DEV441_dateIso_(v){
  var s=EUC_DEV441_t_(v),m;if(!s)return'';
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[1]+'-'+m[2]+'-'+m[3];
  if((m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)))return m[3]+'-'+m[2]+'-'+m[1];
  try{return Utilities.formatDate(new Date(s),'Europe/Paris','yyyy-MM-dd');}catch(e){return'';}
}
function EUC_DEV441_expiration_(fin){
  var iso=EUC_DEV441_dateIso_(fin);if(!iso)throw new Error('Date de fin de période introuvable.');
  try{return Utilities.parseDate(iso+' 23:59:59','Europe/Paris','yyyy-MM-dd HH:mm:ss');}
  catch(e){return new Date(iso+'T23:59:59+02:00');}
}
function EUC_DEV463_dateMs_(value){
  var v=value;
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number'||typeof v[i]==='string'){v=v[i];break;}
    }
  }
  if(v&&typeof v==='object'){
    if(v.value!==undefined)v=v.value;
    else if(v.timestamp!==undefined)v=v.timestamp;
  }
  if(typeof v==='number'&&isFinite(v))return Math.abs(v)<1000000000000?v*1000:v;
  var s=EUC_DEV441_t_(v);
  if(!s)return NaN;
  if(/^\d+(?:\.\d+)?$/.test(s)){
    var n=Number(s);
    return Math.abs(n)<1000000000000?n*1000:n;
  }
  return Date.parse(s);
}
function EUC_DEV441_catalog_(year,requireAdmin){
  if(requireAdmin)EUC_DEV441_admin_();
  year=EUC_DEV368_year(year);var out=[],catalog=EUC_DEV368_catalog(year);
  (catalog&&catalog.classes||[]).forEach(function(c){
    out.push({famille:EUC_DEV441_t_(c.famille),classeId:EUC_DEV441_n_(c.classeId||c.id),classe:EUC_DEV441_t_(c.classe||c.nom),periodes:(c.periodes||[]).map(function(p){return{id:EUC_DEV441_n_(p.id||p.periodeId),libelle:EUC_DEV441_t_(p.libelle||p.nom),debut:EUC_DEV441_t_(p.debutFr||p.debut),fin:EUC_DEV441_t_(p.finFr||p.fin)};})});
  });
  out.sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});return{annee:year,classes:out};
}
function EUC_DEV441_catalogAdmin(year){return EUC_DEV441_catalog_(year,true);}
function EUC_DEV441_catalogPublic(year){return EUC_DEV441_catalog_(year,false);}
function EUC_DEV441_target_(q,requireAdmin){
  q=q||{};var year=EUC_DEV368_year(q.annee),cid=EUC_DEV441_n_(q.classeId),pid=EUC_DEV441_n_(q.periodeId),found=null;
  EUC_DEV441_catalog_(year,requireAdmin).classes.some(function(c){if(c.classeId!==cid)return false;return(c.periodes||[]).some(function(p){if(p.id!==pid)return false;found={annee:year,famille:c.famille,classeId:cid,classe:c.classe,periode:p};return true;});});
  if(!found)throw new Error('Classe ou période introuvable.');return found;
}

function EUC_DEV441_ensurePpTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],c=EUC_DEV441_col_,cols=[
    c('Annee_scolaire','Année scolaire'),c('Famille','Famille'),c('Classe_id','Classe ID','Int'),c('Classe_nom','Classe'),c('Periode_id','Période ID','Int'),c('Periode_libelle','Période'),c('Date_fin','Date de fin'),
    c('Professeur_id','Professeur principal ID','Int'),c('Professeur_nom','Professeur principal'),c('Professeur_email','Courriel professeur'),c('Code_salt','Sel du code'),c('Code_hash','Empreinte du code'),
    c('Actif','Actif','Bool'),c('Date_creation','Date de création','DateTime'),c('Expiration','Expiration','DateTime'),c('Cree_par','Créé par'),c('Date_revocation','Date de révocation','DateTime'),
    c('Campagne_id','Campagne'),c('Etat_courriel','État courriel'),c('Date_courriel','Date courriel','DateTime'),c('Erreur_courriel','Erreur courriel')
  ],exists=tables.some(function(t){return t.id===EUC_DEV441_PP_TABLE_;});
  if(!exists)EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV441_PP_TABLE_,columns:cols}]});
  else{var current=EUC_ENT_grist('get','/tables/'+EUC_DEV441_PP_TABLE_+'/columns').columns||[],have={};current.forEach(function(x){have[x.id]=true;});var missing=cols.filter(function(x){return!have[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_DEV441_PP_TABLE_+'/columns',{columns:missing});}
}
function EUC_DEV441_ppRows_(){try{return EUC_IMPORT_lireRecords_(EUC_DEV441_PP_TABLE_)||[];}catch(e){return[];}}
function EUC_DEV441_ppPrincipal_(classeId,profId){
  var list=EUC_V155_professeursPrincipaux_(classeId)||[],p=list.filter(function(x){return EUC_DEV441_n_(x.id)===EUC_DEV441_n_(profId);})[0];
  if(!p)throw new Error('Ce professeur n’est pas professeur principal de la classe.');return p;
}
function EUC_DEV441_ppAdminData(q){
  EUC_DEV441_admin_();var t=EUC_DEV441_target_(q,false),rows=EUC_DEV441_ppRows_().filter(function(r){return EUC_DEV441_t_(r.Annee_scolaire)===t.annee&&EUC_DEV441_n_(r.Classe_id)===t.classeId&&EUC_DEV441_n_(r.Periode_id)===t.periode.id;});
  return{ok:true,target:t,principaux:EUC_V155_professeursPrincipaux_(t.classeId)||[],acces:rows.map(function(r){return{id:EUC_DEV441_n_(r.id),professeur:EUC_DEV441_t_(r.Professeur_nom),email:EUC_DEV441_t_(r.Professeur_email),actif:r.Actif!==false,expiration:EUC_DEV441_t_(r.Expiration),cree:EUC_DEV441_t_(r.Date_creation)};})};
}
function EUC_DEV441_generatePpAccess(q){
  var ctx=EUC_DEV441_admin_(),t=EUC_DEV441_target_(q,false),p=EUC_DEV441_ppPrincipal_(t.classeId,q&&q.profId),expiration=EUC_DEV441_expiration_(t.periode.fin);
  if(expiration.getTime()<=new Date().getTime())throw new Error('La période est terminée : aucun code ne peut être créé.');
  EUC_DEV441_ensurePpTable_();var rows=EUC_DEV441_ppRows_(),now=new Date().toISOString();
  rows.filter(function(r){return r.Actif!==false&&EUC_DEV441_t_(r.Annee_scolaire)===t.annee&&EUC_DEV441_n_(r.Classe_id)===t.classeId&&EUC_DEV441_n_(r.Periode_id)===t.periode.id&&EUC_DEV441_n_(r.Professeur_id)===EUC_DEV441_n_(p.id);}).forEach(function(r){EUC_ENT_grist('patch','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:[{id:r.id,fields:{Actif:false,Date_revocation:now}}]});});
  var code=EUC_DEV441_newCode_(),salt=Utilities.getUuid(),fields={Annee_scolaire:t.annee,Famille:t.famille,Classe_id:t.classeId,Classe_nom:t.classe,Periode_id:t.periode.id,Periode_libelle:t.periode.libelle,Date_fin:EUC_DEV441_dateIso_(t.periode.fin),Professeur_id:EUC_DEV441_n_(p.id),Professeur_nom:EUC_DEV441_t_(p.nom),Professeur_email:EUC_DEV441_t_(p.email),Code_salt:salt,Code_hash:EUC_DEV441_codeHash_(code,salt),Actif:true,Date_creation:now,Expiration:expiration.toISOString(),Cree_par:EUC_DEV441_t_(ctx.email)};
  var created=EUC_ENT_grist('post','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:[{fields:fields}]});
  return{ok:true,id:created&&created.records&&created.records[0]?created.records[0].id:0,code:code,professeur:fields.Professeur_nom,classe:t.classe,periode:t.periode.libelle,expiration:fields.Expiration,url:EUC_DEV368_boot().baseUrl+'?page=acces-pp-pfmp'};
}
function EUC_DEV441_revokePpAccess(q){EUC_DEV441_admin_();var id=EUC_DEV441_n_(q&&q.id);if(!id)throw new Error('Accès invalide.');EUC_ENT_grist('patch','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:[{id:id,fields:{Actif:false,Date_revocation:new Date().toISOString()}}]});return{ok:true};}
function EUC_DEV441_lookupPp_(code){
  var canonical=EUC_DEV441_codeCanon_(code);if(canonical.length<16)throw new Error('Code invalide.');
  var now=new Date().getTime(),row=EUC_DEV441_ppRows_().filter(function(r){return r.Actif!==false&&EUC_DEV441_codeHash_(canonical,r.Code_salt)===EUC_DEV441_t_(r.Code_hash);})[0];
  if(!row)throw new Error('Code inconnu ou révoqué.');var expires=EUC_DEV463_dateMs_(row.Expiration);if(!isFinite(expires)&&row.Date_fin)expires=EUC_DEV441_expiration_(row.Date_fin).getTime();if(!isFinite(expires)||expires<now)throw new Error('Ce code a expiré à la fin de la période.');return row;
}
function EUC_DEV441_ppScope_(access){
  var y=EUC_DEV441_t_(access.Annee_scolaire),cid=EUC_DEV441_n_(access.Classe_id),pid=EUC_DEV441_n_(access.Periode_id),d=EUC_DEV368_detail(y,cid,pid),aff=EUC_V156_affectations_(y,cid,pid)||[],by={};
  aff.forEach(function(a){var eid=EUC_DEV441_n_(EUC_PFMP_ref_(a.Eleve)),type=EUC_DEV441_t_(a.Type_suivi).toUpperCase();if(eid&&type)by[eid+'|'+type]=a;});
  var lignes=(d.lignes||[]).map(function(x){var tel=by[EUC_DEV441_n_(x.eleveId)+'|TELEPHONE'],vis=by[EUC_DEV441_n_(x.eleveId)+'|VISITE'];return{eleveId:EUC_DEV441_n_(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),statut:EUC_DEV441_t_(x.statut),telephone:tel?EUC_DEV441_t_(tel.Nom_professeur_snapshot):'',visite:vis?EUC_DEV441_t_(vis.Nom_professeur_snapshot):''};});
  return{ok:true,scope:{annee:y,famille:EUC_DEV441_t_(access.Famille),classeId:cid,classe:EUC_DEV441_t_(access.Classe_nom),periodeId:pid,periode:EUC_DEV441_t_(access.Periode_libelle),expiration:EUC_DEV441_t_(access.Expiration),professeurPrincipal:EUC_DEV441_t_(access.Professeur_nom)},professeurs:EUC_V156_professeurs_(),lignes:lignes};
}
function EUC_DEV441_unlockPp(q){return EUC_DEV441_ppScope_(EUC_DEV441_lookupPp_(q&&q.code));}
function EUC_DEV444_assertPpPageScope_(access,q){
  q=q||{};if(EUC_DEV441_t_(access.Annee_scolaire)!==EUC_DEV441_t_(q.annee)||EUC_DEV441_n_(access.Classe_id)!==EUC_DEV441_n_(q.classeId)||EUC_DEV441_n_(access.Periode_id)!==EUC_DEV441_n_(q.periodeId))throw new Error('Ce code appartient à une autre classe ou à une autre période.');
}
function EUC_DEV444_unlockPpForScope(q){var access=EUC_DEV441_lookupPp_(q&&q.code);EUC_DEV444_assertPpPageScope_(access,q);return EUC_DEV441_ppScope_(access);}
function EUC_DEV444_affecterPpForScope(q){var access=EUC_DEV441_lookupPp_(q&&q.code);EUC_DEV444_assertPpPageScope_(access,q);return EUC_DEV441_affecterPp(q);}
function EUC_DEV441_affecterPp(q){
  q=q||{};var access=EUC_DEV441_lookupPp_(q.code),type=EUC_DEV441_t_(q.type).toUpperCase(),profId=EUC_DEV441_n_(q.profId),ids=(q.eleveIds||[]).map(EUC_DEV441_n_).filter(function(x){return x>0;});
  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');if(!profId||!ids.length)throw new Error('Professeur et élèves requis.');
  var scope=EUC_DEV441_ppScope_(access),allowed={};scope.lignes.forEach(function(x){allowed[x.eleveId]=true;});if(ids.some(function(id){return!allowed[id];}))throw new Error('Un élève est hors du périmètre autorisé.');
  var prof=(EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')||[]).filter(function(p){return EUC_DEV441_n_(p.id)===profId&&p.Actif!==false;})[0];if(!prof)throw new Error('Professeur introuvable.');
  EUC_V156_assurerTable_();var y=EUC_DEV441_t_(access.Annee_scolaire),cid=EUC_DEV441_n_(access.Classe_id),pid=EUC_DEV441_n_(access.Periode_id),existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_)||[],now=new Date().toISOString(),profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),token=EUC_DEV425_beginMutation_({annee:y,classeId:cid,periodeId:pid,reason:'affectation-professeur-principal'});
  ids.forEach(function(eid){var ex=existing.filter(function(r){return r.Actif!==false&&EUC_DEV441_t_(r.Annee_scolaire)===y&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Classe))===cid&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Periode))===pid&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Eleve))===eid&&EUC_DEV441_t_(r.Type_suivi).toUpperCase()===type;})[0],fields={Annee_scolaire:y,Classe:cid,Periode:pid,Eleve:eid,Type_suivi:type,Professeur:profId,Nom_professeur_snapshot:profNom,Email_professeur_snapshot:EUC_DEV441_t_(prof.Email),Date_affectation:now,Affecte_par:'PP_TEMP:'+EUC_DEV441_n_(access.Professeur_id),Actif:true,Date_modification:now};if(ex)EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});else EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});});
  var snapshot=EUC_DEV425_finishMutation_(token),result=EUC_DEV441_ppScope_(access);result.snapshot=snapshot;return result;
}

function EUC_DEV444_email_(value){var s=EUC_DEV441_t_(value).toLowerCase();return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:'';}
function EUC_DEV444_periodKey_(p){return[EUC_DEV441_t_(p&&p.libelle).toUpperCase(),EUC_DEV441_dateIso_(p&&p.debut),EUC_DEV441_dateIso_(p&&p.fin)].join('|');}
function EUC_DEV444_ensureSignTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],c=EUC_DEV441_col_,cols=[c('Annee_scolaire','Année scolaire'),c('Classe_id','Classe ID','Int'),c('Classe_nom','Classe'),c('Adjoint_nom','Proviseur adjoint'),c('Adjoint_email','Courriel proviseur adjoint'),c('Ddf_nom','Direction déléguée'),c('Ddf_email','Courriel direction déléguée'),c('Actif','Actif','Bool'),c('Date_modification','Date modification','DateTime'),c('Modifie_par','Modifié par')],exists=tables.some(function(t){return t.id===EUC_DEV444_PP_SIGN_TABLE_;});
  if(!exists)EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV444_PP_SIGN_TABLE_,columns:cols}]});
  else{var current=EUC_ENT_grist('get','/tables/'+EUC_DEV444_PP_SIGN_TABLE_+'/columns').columns||[],have={};current.forEach(function(x){have[x.id]=true;});var missing=cols.filter(function(x){return!have[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_DEV444_PP_SIGN_TABLE_+'/columns',{columns:missing});}
}
function EUC_DEV444_signRows_(){try{return EUC_IMPORT_lireRecords_(EUC_DEV444_PP_SIGN_TABLE_)||[];}catch(e){return[];}}
function EUC_DEV444_campaignTargets_(q){
  var anchor=EUC_DEV441_target_(q,false),key=EUC_DEV444_periodKey_(anchor.periode),classes=EUC_DEV441_catalog_(anchor.annee,false).classes.filter(function(c){return c.famille===anchor.famille;}),out=[];
  classes.forEach(function(c){(c.periodes||[]).forEach(function(p){if(EUC_DEV444_periodKey_(p)===key)out.push({annee:anchor.annee,famille:c.famille,classeId:c.classeId,classe:c.classe,periode:p});});});
  return{anchor:anchor,targets:out};
}
function EUC_DEV444_campaignPreview(q){
  EUC_DEV441_admin_();var campaign=EUC_DEV444_campaignTargets_(q),saved=EUC_DEV444_signRows_(),by={};
  saved.forEach(function(r){if(r.Actif!==false)by[EUC_DEV441_t_(r.Annee_scolaire)+'|'+EUC_DEV441_n_(r.Classe_id)]=r;});
  var classes=campaign.targets.map(function(t){var s=by[t.annee+'|'+t.classeId]||{},pp=EUC_V155_professeursPrincipaux_(t.classeId)||[];return{annee:t.annee,famille:t.famille,classeId:t.classeId,classe:t.classe,periodeId:t.periode.id,periode:t.periode.libelle,debut:t.periode.debut,fin:t.periode.fin,principaux:pp.map(function(p){return{id:EUC_DEV441_n_(p.id),nom:EUC_DEV441_t_(p.nom),email:EUC_DEV444_email_(p.email)};}),adjointNom:EUC_DEV441_t_(s.Adjoint_nom),adjointEmail:EUC_DEV444_email_(s.Adjoint_email),ddfNom:EUC_DEV441_t_(s.Ddf_nom),ddfEmail:EUC_DEV444_email_(s.Ddf_email)};});
  var recipients=0,blocking=[];classes.forEach(function(c){if(!c.principaux.length)blocking.push(c.classe+' : aucun professeur principal');c.principaux.forEach(function(p){if(p.email)recipients++;else blocking.push(c.classe+' : courriel manquant pour '+p.nom);});if(!c.adjointNom||!c.adjointEmail||!c.ddfNom)blocking.push(c.classe+' : signataires incomplets');});
  return{ok:true,anchor:campaign.anchor,classes:classes,recipients:recipients,blocking:blocking,siteUrl:EUC_DEV444_PUBLIC_SITE_};
}
function EUC_DEV444_saveCampaignSignatures(q){
  var ctx=EUC_DEV441_admin_(),items=q&&q.classes||[];if(!items.length)throw new Error('Aucune classe à configurer.');EUC_DEV444_ensureSignTable_();var rows=EUC_DEV444_signRows_(),now=new Date().toISOString();
  items.forEach(function(x){var y=EUC_DEV368_year(x.annee),cid=EUC_DEV441_n_(x.classeId),nom=EUC_DEV441_t_(x.classe),adj=EUC_DEV441_t_(x.adjointNom),adjMail=EUC_DEV444_email_(x.adjointEmail),ddf=EUC_DEV441_t_(x.ddfNom),ddfMail=EUC_DEV444_email_(x.ddfEmail);if(!cid||!adj||!adjMail||!ddf)throw new Error(nom+' : renseignez le proviseur adjoint, son courriel et la direction déléguée.');var fields={Annee_scolaire:y,Classe_id:cid,Classe_nom:nom,Adjoint_nom:adj,Adjoint_email:adjMail,Ddf_nom:ddf,Ddf_email:ddfMail,Actif:true,Date_modification:now,Modifie_par:EUC_DEV441_t_(ctx.email)},ex=rows.filter(function(r){return r.Actif!==false&&EUC_DEV441_t_(r.Annee_scolaire)===y&&EUC_DEV441_n_(r.Classe_id)===cid;})[0];if(ex)EUC_ENT_grist('patch','/tables/'+EUC_DEV444_PP_SIGN_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});else EUC_ENT_grist('post','/tables/'+EUC_DEV444_PP_SIGN_TABLE_+'/records',{records:[{fields:fields}]});});return EUC_DEV444_campaignPreview(q);
}
function EUC_DEV444_ppMailBody_(c,p,access){
  return['Bonjour '+EUC_DEV441_t_(p.nom)+',','','Dans le cadre de la préparation des visites en entreprise, il vous appartient de compléter les affectations des professeurs visiteurs et des suivis téléphoniques pour la classe '+c.classe+'.','','Période : '+c.periode+' — du '+c.debut+' au '+c.fin,'Code temporaire : '+access.code,'Ce code est valable jusqu’au '+Utilities.formatDate(new Date(access.expiration),'Europe/Paris','dd/MM/yyyy à HH:mm')+'.','','Pour l’utiliser :','1. Rendez-vous sur '+EUC_DEV444_PUBLIC_SITE_,'2. Ouvrez '+c.classe+' puis '+c.periode+'.','3. Cliquez sur « Accès professeur principal » et saisissez le code ci-dessus.','','Cet accès est strictement limité à cette classe, à cette période et aux affectations de suivi téléphonique ou de visite.','','Cordialement,','',c.adjointNom,'Proviseur adjoint','',c.ddfNom,'Direction déléguée aux formations professionnelles et technologiques'].join('\n');
}
function EUC_DEV444_sendCampaign(q){
  var ctx=EUC_DEV441_admin_(),preview=EUC_DEV444_campaignPreview(q);if(preview.blocking.length)throw new Error('Campagne incomplète : '+preview.blocking.join(' ; '));if(!preview.recipients)throw new Error('Aucun destinataire.');if(MailApp.getRemainingDailyQuota()<preview.recipients)throw new Error('Quota de courriels insuffisant pour cette campagne.');
  var lock=LockService.getScriptLock();if(!lock.tryLock(5000))throw new Error('Une campagne est déjà en cours.');var campaignId='PP-'+Utilities.formatDate(new Date(),'Europe/Paris','yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,8),sent=[],failed=[];
  try{
    EUC_DEV441_ensurePpTable_();var existing=EUC_DEV441_ppRows_(),now=new Date().toISOString(),jobs=[],revocations=[];
    preview.classes.forEach(function(c){var expiration=EUC_DEV441_expiration_(c.fin);if(expiration.getTime()<=Date.now())throw new Error(c.classe+' : la période est terminée.');c.principaux.forEach(function(p){existing.filter(function(r){return r.Actif!==false&&EUC_DEV441_t_(r.Annee_scolaire)===c.annee&&EUC_DEV441_n_(r.Classe_id)===c.classeId&&EUC_DEV441_n_(r.Periode_id)===c.periodeId&&EUC_DEV441_n_(r.Professeur_id)===p.id;}).forEach(function(r){revocations.push({id:r.id,fields:{Actif:false,Date_revocation:now}});});var code=EUC_DEV441_newCode_(),salt=Utilities.getUuid(),fields={Annee_scolaire:c.annee,Famille:c.famille,Classe_id:c.classeId,Classe_nom:c.classe,Periode_id:c.periodeId,Periode_libelle:c.periode,Date_fin:EUC_DEV441_dateIso_(c.fin),Professeur_id:p.id,Professeur_nom:p.nom,Professeur_email:p.email,Code_salt:salt,Code_hash:EUC_DEV441_codeHash_(code,salt),Actif:true,Date_creation:now,Expiration:expiration.toISOString(),Cree_par:EUC_DEV441_t_(ctx.email),Campagne_id:campaignId,Etat_courriel:'EN_COURS'};jobs.push({classe:c,professeur:p,code:code,expiration:fields.Expiration,fields:fields,id:0});});});
    if(revocations.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:revocations});var created=EUC_ENT_grist('post','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:jobs.map(function(j){return{fields:j.fields};})}),createdRows=created&&created.records||[];if(createdRows.length!==jobs.length){var partial=createdRows.map(function(r){return{id:EUC_DEV441_n_(r.id),fields:{Actif:false,Date_revocation:new Date().toISOString(),Etat_courriel:'ERREUR',Erreur_courriel:'Création de campagne incomplète'}};}).filter(function(r){return r.id;});if(partial.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:partial});throw new Error('Création incomplète des codes : aucun courriel n’a été envoyé.');}createdRows.forEach(function(r,i){jobs[i].id=EUC_DEV441_n_(r.id);});
    var finalPatches=[];jobs.forEach(function(j){try{MailApp.sendEmail({to:j.professeur.email,replyTo:j.classe.adjointEmail,name:'Lycée Les Eucalyptus — PFMP',subject:'[PFMP] Affectations à compléter — '+j.classe.classe+' — '+j.classe.periode,body:EUC_DEV444_ppMailBody_(j.classe,j.professeur,j)});finalPatches.push({id:j.id,fields:{Etat_courriel:'ENVOYE',Date_courriel:new Date().toISOString(),Erreur_courriel:''}});sent.push({classe:j.classe.classe,professeur:j.professeur.nom,email:j.professeur.email});}catch(e){finalPatches.push({id:j.id,fields:{Actif:false,Date_revocation:new Date().toISOString(),Etat_courriel:'ERREUR',Erreur_courriel:String(e&&e.message||e).slice(0,500)}});failed.push({classe:j.classe.classe,professeur:j.professeur.nom,error:String(e&&e.message||e)});}});if(finalPatches.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV441_PP_TABLE_+'/records',{records:finalPatches});
  }finally{lock.releaseLock();}
  return{ok:failed.length===0,campaignId:campaignId,envoyes:sent,echecs:failed,declenchePar:EUC_DEV441_t_(ctx.email)};
}

function EUC_DEV443_postal_(value){var s=EUC_DEV441_t_(value).replace(/\s+/g,'');return /^\d{4}$/.test(s)?'0'+s:s;}
function EUC_DEV443_normalizeAddress_(adresse){
  var s=EUC_DEV441_t_(adresse).replace(/[·•]/g,',').replace(/\s*,\s*/g,', ').replace(/\s+/g,' ').trim();
  /* Grist renvoie parfois un CP typé nombre : 06100 devient alors 6100.
     La correction reste strictement limitée au segment postal placé avant la commune. */
  return s.replace(/(^|[,;]\s+|\s)(\d{4})(?=\s+[A-Za-zÀ-ÖØ-öø-ÿ'’ -]+$)/,function(all,prefix,cp){return prefix+EUC_DEV443_postal_(cp)});
}
function EUC_DEV443_geoIdentity_(entreprise,adresse,siret){
  var sir=EUC_DEV441_t_(siret).replace(/\D/g,'');if(sir.length===14)return'SIRET|'+sir;
  var ent=EUC_DEV441_t_(entreprise).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(SARL|SAS|SA|EURL|ETS|ETABLISSEMENTS?)\b/g,' ').replace(/[^A-Z0-9]+/g,' ').trim();
  var adr=EUC_DEV443_normalizeAddress_(adresse).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(AVENUE|AV)\b/g,'AV').replace(/\b(BOULEVARD|BD)\b/g,'BD').replace(/[^A-Z0-9]+/g,' ').trim();
  return'ADRESSE|'+ent+'|'+adr;
}
function EUC_DEV443_addressRank_(adresse){var s=EUC_DEV443_normalizeAddress_(adresse),rank=/\b\d{5}\b/.test(s)?100:0;rank+=/^\s*\d+[A-Za-z]?\b/.test(s)?30:0;return rank-Math.min(99,s.length)/100;}
function EUC_DEV443_savedCountry_(row,classified){var p=EUC_DEV441_t_(row&&row.Pays);return classified.pays==='FRANCE'&&p==='INDETERMINE'?'FRANCE':(p||classified.pays);}
function EUC_DEV443_savedStatus_(row,classified){var s=EUC_DEV441_t_(row&&row.Statut);if(s==='A_VALIDER_MANUELLEMENT'&&(row.Latitude==null||row.Longitude==null))return'COORDONNEES_A_RENSEIGNER';return s||classified.statut;}
function EUC_DEV441_geoKey_(entreprise,adresse,siret){return EUC_DEV441_digest_(EUC_DEV443_geoIdentity_(entreprise,adresse,siret)).slice(0,32);}
function EUC_DEV441_geoClassify_(adresse){
  var s=EUC_DEV443_normalizeAddress_(adresse).toUpperCase(),postals=s.match(/\b\d{5}\b/g)||[],cp=postals.length?postals[postals.length-1]:'';
  if(/\bMONACO\b/.test(s)||cp==='98000')return{pays:'MONACO',codePostal:cp||'98000',statut:'COORDONNEES_A_RENSEIGNER'};
  if(/\b(ITALIE|ITALY|SUISSE|SWITZERLAND|ESPAGNE|SPAIN|ALLEMAGNE|GERMANY|BELGIQUE|BELGIUM)\b/.test(s))return{pays:'ETRANGER',codePostal:cp,statut:'COORDONNEES_A_RENSEIGNER'};
  if(cp)return{pays:'FRANCE',codePostal:cp,statut:'A_GEOCODER'};
  return{pays:'INDETERMINE',codePostal:'',statut:'COORDONNEES_A_RENSEIGNER'};
}
function EUC_DEV441_ensureGeoTable_(){
  var tables=EUC_ENT_grist('get','/tables').tables||[],c=EUC_DEV441_col_,cols=[c('Cle_adresse','Clé adresse'),c('SIRET','SIRET'),c('Entreprise','Entreprise'),c('Adresse_source','Adresse source'),c('Adresse_normalisee','Adresse normalisée'),c('Pays','Pays'),c('Code_postal','Code postal'),c('Commune','Commune'),c('Latitude','Latitude','Numeric'),c('Longitude','Longitude','Numeric'),c('Score','Score','Numeric'),c('Precision','Précision'),c('Fournisseur','Fournisseur'),c('Statut','Statut'),c('Date_geocodage','Date géocodage','DateTime'),c('Valide_par','Validé par'),c('Date_validation','Date validation','DateTime'),c('Commentaire','Commentaire')],exists=tables.some(function(t){return t.id===EUC_DEV441_GEO_TABLE_;});
  if(!exists)EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV441_GEO_TABLE_,columns:cols}]});
  else{var current=EUC_ENT_grist('get','/tables/'+EUC_DEV441_GEO_TABLE_+'/columns').columns||[],have={};current.forEach(function(x){have[x.id]=true;});var missing=cols.filter(function(x){return!have[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+EUC_DEV441_GEO_TABLE_+'/columns',{columns:missing});}
}
function EUC_DEV441_geoRows_(){try{return EUC_IMPORT_lireRecords_(EUC_DEV441_GEO_TABLE_)||[];}catch(e){return[];}}
function EUC_DEV441_geoTargets_(q){
  q=q||{};var y=EUC_DEV368_year(q.annee),fam=EUC_DEV441_t_(q.famille),cid=EUC_DEV441_n_(q.classeId),pid=EUC_DEV441_n_(q.periodeId),out=[];
  EUC_DEV441_catalog_(y,false).classes.forEach(function(c){if(fam&&c.famille!==fam)return;if(cid&&c.classeId!==cid)return;(c.periodes||[]).forEach(function(p){if(pid&&p.id!==pid)return;out.push({annee:y,famille:c.famille,classeId:c.classeId,classe:c.classe,periode:p});});});return out;
}
/* DEV445 — index géographique incrémental.
 *
 * L'ancien parcours reconstruisait chaque détail classe/période, puis relisait
 * la table géographique avant CHAQUE écriture. Un lot de 40 adresses pouvait
 * ainsi consommer plusieurs centaines d'appels Grist. Les détails persistants
 * DEV427 sont déjà enrichis : une lecture annuelle groupée suffit. */
function EUC_DEV445_geoAddressFingerprint_(value){
  return EUC_DEV443_normalizeAddress_(value).toUpperCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
}
function EUC_DEV445_geoSnapshotDetails_(q){
  q=q||{};var y=EUC_DEV368_year(q.annee),fam=EUC_DEV441_t_(q.famille).toUpperCase(),cid=EUC_DEV441_n_(q.classeId),pid=EUC_DEV441_n_(q.periodeId),rows=[],latest={},prefix=typeof EUC_DEV427_DETAIL_PREFIX_==='string'?EUC_DEV427_DETAIL_PREFIX_:'__DEV427_DETAIL__';
  try{rows=EUC_DEV190G_fastRecords_(EUC_DEV190E_INDEX_TABLE_,{Annee_scolaire:[y]})||[];}catch(e){rows=[];}
  rows.forEach(function(r){
    var f=r.fields||r;if(f.Actif===false)return;var tech=EUC_DEV441_t_(f.Famille);if(tech.indexOf(prefix)!==0)return;
    var tail=tech.slice(prefix.length).split('_'),rowFam=EUC_DEV441_t_(tail[0]).toUpperCase(),rowCid=EUC_DEV441_n_(tail[1]),rowPid=EUC_DEV441_n_(tail[2]);
    if(fam&&rowFam!==fam)return;if(cid&&rowCid!==cid)return;if(pid&&rowPid!==pid)return;
    var key=rowFam+'|'+rowCid+'|'+rowPid,at=Date.parse(f.Updated_at||'')||0,id=EUC_DEV441_n_(r.id);if(latest[key]&&(latest[key].at>at||(latest[key].at===at&&latest[key].id>id)))return;
    try{latest[key]={at:at,id:id,famille:rowFam,detail:JSON.parse(f.Payload_JSON||'{}')};}catch(eJson){}
  });
  var out=Object.keys(latest).map(function(k){var x=latest[k],d=x.detail||{};d.famille=EUC_DEV441_t_(d.famille||x.famille).toUpperCase();return d;});
  /* Compatibilité avec une recette n'ayant pas encore les lignes DEV427. */
  if(!out.length){
    try{rows=EUC_DEV190G_fastRecords_(EUC_DEV190I_TABLE_,{Annee_scolaire:[y]})||[];}catch(eFallback){rows=[];}
    latest={};rows.forEach(function(r){var f=r.fields||r;if(f.Actif===false)return;var rowFam=EUC_DEV441_t_(f.Famille).toUpperCase(),rowCid=EUC_DEV441_n_(f.Classe_id),rowPid=EUC_DEV441_n_(f.Periode_id);if(fam&&rowFam!==fam)return;if(cid&&rowCid!==cid)return;if(pid&&rowPid!==pid)return;var key=rowFam+'|'+rowCid+'|'+rowPid,at=Date.parse(f.Updated_at||'')||0,id=EUC_DEV441_n_(r.id);if(latest[key]&&(latest[key].at>at||(latest[key].at===at&&latest[key].id>id)))return;try{latest[key]={at:at,id:id,famille:rowFam,detail:JSON.parse(f.Payload_JSON||'{}')};}catch(eJson){}});
    out=Object.keys(latest).map(function(k){var x=latest[k],d=x.detail||{};d.famille=EUC_DEV441_t_(d.famille||x.famille).toUpperCase();return d;});
  }
  return out;
}
function EUC_DEV441_geoCandidates_(q){
  var saved={},savedIdentity={},out=[],byIdentity={};EUC_DEV441_geoRows_().forEach(function(r){saved[EUC_DEV441_t_(r.Cle_adresse)]=r;savedIdentity[EUC_DEV443_geoIdentity_(r.Entreprise,r.Adresse_source,r.SIRET)]=r;});
  EUC_DEV445_geoSnapshotDetails_(q).forEach(function(d){var cn=EUC_DEV441_t_(d&&d.classe&&(d.classe.nom||d.classe.libelle)),pn=EUC_DEV441_t_(d&&d.periode&&(d.periode.libelle||d.periode.nom)),perimetre=[cn,pn].filter(Boolean).join(' · ');(d.lignes||[]).forEach(function(x){var entreprise=EUC_DEV441_t_(x.entreprise),adresse=EUC_DEV443_normalizeAddress_(x.adresseEntreprise),siret=EUC_DEV441_t_(x.siretEntreprise||x.siret).replace(/\D/g,'');if(!entreprise||!adresse)return;var identity=EUC_DEV443_geoIdentity_(entreprise,adresse,siret),key=EUC_DEV441_geoKey_(entreprise,adresse,siret),r=saved[key]||savedIdentity[identity]||{},existing=byIdentity[identity];if(existing){if(EUC_DEV443_addressRank_(adresse)>EUC_DEV443_addressRank_(existing.adresse)){var preferred=EUC_DEV441_geoClassify_(adresse),source=savedIdentity[identity]||{};existing.adresse=adresse;existing.pays=preferred.pays;existing.codePostal=preferred.codePostal;if(source.Cle_adresse&&EUC_DEV445_geoAddressFingerprint_(source.Adresse_source)!==EUC_DEV445_geoAddressFingerprint_(adresse)){existing.statut=preferred.pays==='FRANCE'?'A_REGEOCODER':'COORDONNEES_A_RENSEIGNER';existing.latitude=null;existing.longitude=null;existing.adresseNormalisee='';existing.score=null;existing.precision='';existing.commentaire='Adresse modifiée depuis le dernier géocodage.';}}if(perimetre&&existing.perimetres.indexOf(perimetre)<0)existing.perimetres.push(perimetre);existing.classe=existing.perimetres.join(' / ');return}if(r.Cle_adresse)key=EUC_DEV441_t_(r.Cle_adresse);var cls=EUC_DEV441_geoClassify_(adresse),changed=!!r.Cle_adresse&&EUC_DEV445_geoAddressFingerprint_(r.Adresse_source)!==EUC_DEV445_geoAddressFingerprint_(adresse),status=changed&&cls.pays==='FRANCE'?'A_REGEOCODER':EUC_DEV443_savedStatus_(r,cls),item={key:key,_recordId:EUC_DEV441_n_(r.id),siret:siret,entreprise:entreprise,adresse:adresse,pays:changed?cls.pays:EUC_DEV443_savedCountry_(r,cls),codePostal:changed?cls.codePostal:(EUC_DEV443_postal_(r.Code_postal)||cls.codePostal),statut:status,latitude:changed?null:(r.Latitude==null?null:Number(r.Latitude)),longitude:changed?null:(r.Longitude==null?null:Number(r.Longitude)),adresseNormalisee:changed?'':EUC_DEV441_t_(r.Adresse_normalisee),score:changed?null:(r.Score==null?null:Number(r.Score)),precision:changed?'':EUC_DEV441_t_(r.Precision),commentaire:changed?'Adresse modifiée depuis le dernier géocodage.':EUC_DEV441_t_(r.Commentaire),classe:perimetre,periode:'',perimetres:perimetre?[perimetre]:[]};byIdentity[identity]=item;out.push(item);});});return out;
}
function EUC_DEV441_geoAdminData(q){EUC_DEV441_admin_();var c=EUC_DEV441_geoCandidates_(q);return{ok:true,total:c.length,france:c.filter(function(x){return x.pays==='FRANCE';}).length,manuel:c.filter(function(x){return x.pays!=='FRANCE';}).length,candidats:c};}
function EUC_DEV445_geoFields_(item,fields){var all={Cle_adresse:item.key,SIRET:item.siret||'',Entreprise:item.entreprise,Adresse_source:item.adresse};Object.keys(fields||{}).forEach(function(k){all[k]=fields[k];});return all;}
function EUC_DEV445_geoBatchUpsert_(items){
  var patches=[],posts=[];(items||[]).forEach(function(x){var record={fields:EUC_DEV445_geoFields_(x.item,x.fields)};if(x.item._recordId){record.id=x.item._recordId;patches.push(record);}else posts.push(record);});
  if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV441_GEO_TABLE_+'/records',{records:patches});
  if(posts.length)EUC_ENT_grist('post','/tables/'+EUC_DEV441_GEO_TABLE_+'/records',{records:posts});
}
function EUC_DEV445_geoApply_(item,fields){Object.keys(fields||{}).forEach(function(k){var map={Adresse_normalisee:'adresseNormalisee',Pays:'pays',Code_postal:'codePostal',Latitude:'latitude',Longitude:'longitude',Score:'score',Precision:'precision',Statut:'statut',Commentaire:'commentaire'},target=map[k];if(target)item[target]=fields[k];});return item;}
function EUC_DEV441_geocodeFrance(q){
  EUC_DEV441_admin_();q=q||{};var keys=q.keys||[],all=EUC_DEV441_geoCandidates_(q),c=all.filter(function(x){return x.pays==='FRANCE'&&(x.statut==='A_GEOCODER'||x.statut==='A_REGEOCODER')&&(!keys.length||keys.indexOf(x.key)>=0);}).slice(0,40),done=0,manual=0,writes=[];
  c.forEach(function(x){var url=EUC_DEV441_GEO_URL_+'?q='+encodeURIComponent(EUC_DEV443_normalizeAddress_(x.adresse))+'&limit=3'+(x.codePostal?'&postcode='+encodeURIComponent(x.codePostal):''),res=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,headers:{Accept:'application/json'}}),json={};try{json=JSON.parse(res.getContentText()||'{}');}catch(e){}var feature=json.features&&json.features[0],coords=feature&&feature.geometry&&feature.geometry.coordinates,props=feature&&feature.properties||{},score=Number(props.score)||0,fields;if(feature&&coords&&coords.length>=2){var needsReview=score<0.45;fields={Adresse_normalisee:EUC_DEV441_t_(props.label),Pays:'FRANCE',Code_postal:EUC_DEV443_postal_(props.postcode||x.codePostal),Commune:EUC_DEV441_t_(props.city),Latitude:Number(coords[1]),Longitude:Number(coords[0]),Score:score,Precision:EUC_DEV441_t_(props.type),Fournisseur:'Géoplateforme / BAN',Statut:needsReview?'A_VALIDER_MANUELLEMENT':'GEOCODE_AUTOMATIQUE',Date_geocodage:new Date().toISOString(),Commentaire:needsReview?'Résultat automatique peu précis : contrôlez le point proposé.':''};if(needsReview)manual++;else done++;}else{fields={Pays:'FRANCE',Code_postal:x.codePostal,Latitude:null,Longitude:null,Fournisseur:'Géoplateforme / BAN',Statut:'COORDONNEES_A_RENSEIGNER',Date_geocodage:new Date().toISOString(),Commentaire:'Aucun point trouvé automatiquement. Recherchez le lieu puis renseignez latitude et longitude.'};manual++;}writes.push({item:x,fields:fields});EUC_DEV445_geoApply_(x,fields);Utilities.sleep(30);});
  EUC_DEV445_geoBatchUpsert_(writes);return{ok:true,geocodes:done,aValider:manual,candidats:all};
}
function EUC_DEV441_saveManualGeo(q){
  var ctx=EUC_DEV441_admin_(),key=EUC_DEV441_t_(q&&q.key),rawLat=EUC_DEV441_t_(q&&q.latitude),rawLon=EUC_DEV441_t_(q&&q.longitude),lat=Number(rawLat),lon=Number(rawLon),all=EUC_DEV441_geoCandidates_(q),item=all.filter(function(x){return x.key===key;})[0];if(!item)throw new Error('Adresse introuvable.');if(!rawLat||!rawLon||!isFinite(lat)||lat<-90||lat>90||!isFinite(lon)||lon<-180||lon>180)throw new Error('Renseignez une latitude et une longitude valides.');var fields={Adresse_normalisee:EUC_DEV441_t_(q.adresseNormalisee)||item.adresse,Pays:item.pays,Code_postal:item.codePostal,Latitude:lat,Longitude:lon,Score:1,Precision:'validation manuelle',Fournisseur:'MANUEL',Statut:'VALIDE_MANUELLEMENT',Valide_par:EUC_DEV441_t_(ctx.email),Date_validation:new Date().toISOString(),Commentaire:EUC_DEV441_t_(q.commentaire)};EUC_DEV445_geoBatchUpsert_([{item:item,fields:fields}]);EUC_DEV445_geoApply_(item,fields);return{ok:true,candidats:all};
}
function EUC_DEV441_mapData(q){var c=EUC_DEV441_geoCandidates_(q).filter(function(x){return isFinite(x.latitude)&&isFinite(x.longitude)&&x.latitude!==null&&x.longitude!==null&&(x.statut==='GEOCODE_AUTOMATIQUE'||x.statut==='VALIDE_MANUELLEMENT');});return{ok:true,total:c.length,points:c};}

function EUC_DEV441_render_(file,title,boot){var t=HtmlService.createTemplateFromFile(file);t.bootJson=JSON.stringify(boot||EUC_DEV368_boot());return t.evaluate().setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV441_afficherPpAdmin(e){EUC_DEV441_admin_();return EUC_DEV441_render_('Acces_PP_Admin_DEV441','Accès professeurs principaux');}
function EUC_DEV441_afficherPp(e){return EUC_DEV441_render_('Acces_PP_DEV441','Accès professeur principal');}
function EUC_DEV441_afficherGeoAdmin(e){EUC_DEV441_admin_();return EUC_DEV441_render_('Geocodage_PFMP_DEV441','Géocodage des entreprises');}
function EUC_DEV441_afficherCarte(e){
  var output=EUC_DEV441_render_('Cartographie_PFMP_DEV441','Cartographie des entreprises',{current:EUC_DEV368_year(e&&e.parameter&&e.parameter.annee),baseUrl:EUC_DEV368_boot().baseUrl,params:e&&e.parameter||{}});
  return typeof EUC_RELEASE_decorateOutput_==='function'?EUC_RELEASE_decorateOutput_(output):output;
}
