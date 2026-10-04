/** DEV441 — accès temporaire des professeurs principaux et géocodage PFMP.
 * Les codes PP sont limités à une classe/période et expirent à la fin de la
 * période. Les adresses hors France ne sont jamais envoyées à un géocodeur.
 */
var EUC_DEV441_PP_TABLE_='EUC_ACCES_PP_PFMP';
var EUC_DEV441_GEO_TABLE_='EUC_GEO_ENTREPRISES_PFMP';
var EUC_DEV441_GEO_URL_='https://data.geopf.fr/geocodage/search';

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
function EUC_DEV441_catalog_(year,requireAdmin){
  if(requireAdmin)EUC_DEV441_admin_();
  year=EUC_DEV368_year(year);var out=[];
  ['BACPRO','BTS','CAP'].forEach(function(f){
    var r=EUC_DEV190G1_fastFamilyIndex({annee:year,famille:f}),d=r&&r.ready&&r.payload?r.payload:{classes:[]};
    (d.classes||[]).forEach(function(c){out.push({famille:f,classeId:EUC_DEV441_n_(c.classeId||c.id),classe:EUC_DEV441_t_(c.classe||c.nom),periodes:(c.periodes||[]).map(function(p){return{id:EUC_DEV441_n_(p.id||p.periodeId),libelle:EUC_DEV441_t_(p.libelle||p.nom),debut:EUC_DEV441_t_(p.debutFr||p.debut),fin:EUC_DEV441_t_(p.finFr||p.fin)};})});});
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
    c('Actif','Actif','Bool'),c('Date_creation','Date de création','DateTime'),c('Expiration','Expiration','DateTime'),c('Cree_par','Créé par'),c('Date_revocation','Date de révocation','DateTime')
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
  if(!row)throw new Error('Code inconnu ou révoqué.');if(!row.Expiration||new Date(row.Expiration).getTime()<now)throw new Error('Ce code a expiré à la fin de la période.');return row;
}
function EUC_DEV441_ppScope_(access){
  var y=EUC_DEV441_t_(access.Annee_scolaire),cid=EUC_DEV441_n_(access.Classe_id),pid=EUC_DEV441_n_(access.Periode_id),d=EUC_DEV368_detail(y,cid,pid),aff=EUC_V156_affectations_(y,cid,pid)||[],by={};
  aff.forEach(function(a){var eid=EUC_DEV441_n_(EUC_PFMP_ref_(a.Eleve)),type=EUC_DEV441_t_(a.Type_suivi).toUpperCase();if(eid&&type)by[eid+'|'+type]=a;});
  var lignes=(d.lignes||[]).map(function(x){var tel=by[EUC_DEV441_n_(x.eleveId)+'|TELEPHONE'],vis=by[EUC_DEV441_n_(x.eleveId)+'|VISITE'];return{eleveId:EUC_DEV441_n_(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),statut:EUC_DEV441_t_(x.statut),telephone:tel?EUC_DEV441_t_(tel.Nom_professeur_snapshot):'',visite:vis?EUC_DEV441_t_(vis.Nom_professeur_snapshot):''};});
  return{ok:true,scope:{annee:y,famille:EUC_DEV441_t_(access.Famille),classeId:cid,classe:EUC_DEV441_t_(access.Classe_nom),periodeId:pid,periode:EUC_DEV441_t_(access.Periode_libelle),expiration:EUC_DEV441_t_(access.Expiration),professeurPrincipal:EUC_DEV441_t_(access.Professeur_nom)},professeurs:EUC_V156_professeurs_(),lignes:lignes};
}
function EUC_DEV441_unlockPp(q){return EUC_DEV441_ppScope_(EUC_DEV441_lookupPp_(q&&q.code));}
function EUC_DEV441_affecterPp(q){
  q=q||{};var access=EUC_DEV441_lookupPp_(q.code),type=EUC_DEV441_t_(q.type).toUpperCase(),profId=EUC_DEV441_n_(q.profId),ids=(q.eleveIds||[]).map(EUC_DEV441_n_).filter(function(x){return x>0;});
  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');if(!profId||!ids.length)throw new Error('Professeur et élèves requis.');
  var scope=EUC_DEV441_ppScope_(access),allowed={};scope.lignes.forEach(function(x){allowed[x.eleveId]=true;});if(ids.some(function(id){return!allowed[id];}))throw new Error('Un élève est hors du périmètre autorisé.');
  var prof=(EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')||[]).filter(function(p){return EUC_DEV441_n_(p.id)===profId&&p.Actif!==false;})[0];if(!prof)throw new Error('Professeur introuvable.');
  EUC_V156_assurerTable_();var y=EUC_DEV441_t_(access.Annee_scolaire),cid=EUC_DEV441_n_(access.Classe_id),pid=EUC_DEV441_n_(access.Periode_id),existing=EUC_IMPORT_lireRecords_(EUC_V156_TABLE_)||[],now=new Date().toISOString(),profNom=[prof.Civilite,prof.Prenom,prof.Nom].filter(Boolean).join(' '),token=EUC_DEV425_beginMutation_({annee:y,classeId:cid,periodeId:pid,reason:'affectation-professeur-principal'});
  ids.forEach(function(eid){var ex=existing.filter(function(r){return r.Actif!==false&&EUC_DEV441_t_(r.Annee_scolaire)===y&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Classe))===cid&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Periode))===pid&&EUC_DEV441_n_(EUC_PFMP_ref_(r.Eleve))===eid&&EUC_DEV441_t_(r.Type_suivi).toUpperCase()===type;})[0],fields={Annee_scolaire:y,Classe:cid,Periode:pid,Eleve:eid,Type_suivi:type,Professeur:profId,Nom_professeur_snapshot:profNom,Email_professeur_snapshot:EUC_DEV441_t_(prof.Email),Date_affectation:now,Affecte_par:'PP_TEMP:'+EUC_DEV441_n_(access.Professeur_id),Actif:true,Date_modification:now};if(ex)EUC_ENT_grist('patch','/tables/'+EUC_V156_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});else EUC_ENT_grist('post','/tables/'+EUC_V156_TABLE_+'/records',{records:[{fields:fields}]});});
  var snapshot=EUC_DEV425_finishMutation_(token),result=EUC_DEV441_ppScope_(access);result.snapshot=snapshot;return result;
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
function EUC_DEV441_geoCandidates_(q){
  var saved={},savedIdentity={},out=[],byIdentity={};EUC_DEV441_geoRows_().forEach(function(r){saved[EUC_DEV441_t_(r.Cle_adresse)]=r;savedIdentity[EUC_DEV443_geoIdentity_(r.Entreprise,r.Adresse_source,r.SIRET)]=r;});
  EUC_DEV441_geoTargets_(q).forEach(function(t){var d=EUC_DEV368_detail(t.annee,t.classeId,t.periode.id);(d.lignes||[]).forEach(function(x){var entreprise=EUC_DEV441_t_(x.entreprise),adresse=EUC_DEV443_normalizeAddress_(x.adresseEntreprise),siret=EUC_DEV441_t_(x.siretEntreprise||x.siret).replace(/\D/g,'');if(!entreprise||!adresse)return;var identity=EUC_DEV443_geoIdentity_(entreprise,adresse,siret),key=EUC_DEV441_geoKey_(entreprise,adresse,siret),r=saved[key]||savedIdentity[identity]||{},existing=byIdentity[identity],perimetre=t.classe+' · '+t.periode.libelle;if(existing){if(EUC_DEV443_addressRank_(adresse)>EUC_DEV443_addressRank_(existing.adresse)){var preferred=EUC_DEV441_geoClassify_(adresse);existing.adresse=adresse;existing.pays=preferred.pays;existing.codePostal=preferred.codePostal}if(existing.perimetres.indexOf(perimetre)<0)existing.perimetres.push(perimetre);existing.classe=existing.perimetres.join(' / ');return}if(r.Cle_adresse)key=EUC_DEV441_t_(r.Cle_adresse);var cls=EUC_DEV441_geoClassify_(adresse),item={key:key,siret:siret,entreprise:entreprise,adresse:adresse,pays:EUC_DEV443_savedCountry_(r,cls),codePostal:EUC_DEV443_postal_(r.Code_postal)||cls.codePostal,statut:EUC_DEV443_savedStatus_(r,cls),latitude:r.Latitude==null?null:Number(r.Latitude),longitude:r.Longitude==null?null:Number(r.Longitude),adresseNormalisee:EUC_DEV441_t_(r.Adresse_normalisee),score:r.Score==null?null:Number(r.Score),precision:EUC_DEV441_t_(r.Precision),commentaire:EUC_DEV441_t_(r.Commentaire),classe:perimetre,periode:'',perimetres:[perimetre]};byIdentity[identity]=item;out.push(item);});});return out;
}
function EUC_DEV441_geoAdminData(q){EUC_DEV441_admin_();var c=EUC_DEV441_geoCandidates_(q);return{ok:true,total:c.length,france:c.filter(function(x){return x.pays==='FRANCE';}).length,manuel:c.filter(function(x){return x.pays!=='FRANCE';}).length,candidats:c};}
function EUC_DEV441_geoUpsert_(item,fields){EUC_DEV441_ensureGeoTable_();var ex=EUC_DEV441_geoRows_().filter(function(r){return EUC_DEV441_t_(r.Cle_adresse)===item.key;})[0],all={Cle_adresse:item.key,SIRET:item.siret||'',Entreprise:item.entreprise,Adresse_source:item.adresse};Object.keys(fields||{}).forEach(function(k){all[k]=fields[k];});if(ex)EUC_ENT_grist('patch','/tables/'+EUC_DEV441_GEO_TABLE_+'/records',{records:[{id:ex.id,fields:all}]});else EUC_ENT_grist('post','/tables/'+EUC_DEV441_GEO_TABLE_+'/records',{records:[{fields:all}]});}
function EUC_DEV441_geocodeFrance(q){
  EUC_DEV441_admin_();q=q||{};var keys=q.keys||[],c=EUC_DEV441_geoCandidates_(q).filter(function(x){return x.pays==='FRANCE'&&(!keys.length||keys.indexOf(x.key)>=0);}).slice(0,40),done=0,manual=0;
  c.forEach(function(x){var url=EUC_DEV441_GEO_URL_+'?q='+encodeURIComponent(EUC_DEV443_normalizeAddress_(x.adresse))+'&limit=3'+(x.codePostal?'&postcode='+encodeURIComponent(x.codePostal):''),res=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,headers:{Accept:'application/json'}}),json={};try{json=JSON.parse(res.getContentText()||'{}');}catch(e){}var feature=json.features&&json.features[0],coords=feature&&feature.geometry&&feature.geometry.coordinates,props=feature&&feature.properties||{},score=Number(props.score)||0;if(feature&&coords&&coords.length>=2){var needsReview=score<0.45;EUC_DEV441_geoUpsert_(x,{Adresse_normalisee:EUC_DEV441_t_(props.label),Pays:'FRANCE',Code_postal:EUC_DEV443_postal_(props.postcode||x.codePostal),Commune:EUC_DEV441_t_(props.city),Latitude:Number(coords[1]),Longitude:Number(coords[0]),Score:score,Precision:EUC_DEV441_t_(props.type),Fournisseur:'Géoplateforme / BAN',Statut:needsReview?'A_VALIDER_MANUELLEMENT':'GEOCODE_AUTOMATIQUE',Date_geocodage:new Date().toISOString(),Commentaire:needsReview?'Résultat automatique peu précis : contrôlez le point proposé.':''});if(needsReview)manual++;else done++;}else{EUC_DEV441_geoUpsert_(x,{Pays:'FRANCE',Code_postal:x.codePostal,Latitude:null,Longitude:null,Fournisseur:'Géoplateforme / BAN',Statut:'COORDONNEES_A_RENSEIGNER',Date_geocodage:new Date().toISOString(),Commentaire:'Aucun point trouvé automatiquement. Recherchez le lieu puis renseignez latitude et longitude.'});manual++;}Utilities.sleep(30);});
  return{ok:true,geocodes:done,aValider:manual,candidats:EUC_DEV441_geoCandidates_(q)};
}
function EUC_DEV441_saveManualGeo(q){
  var ctx=EUC_DEV441_admin_(),key=EUC_DEV441_t_(q&&q.key),rawLat=EUC_DEV441_t_(q&&q.latitude),rawLon=EUC_DEV441_t_(q&&q.longitude),lat=Number(rawLat),lon=Number(rawLon),item=EUC_DEV441_geoCandidates_(q).filter(function(x){return x.key===key;})[0];if(!item)throw new Error('Adresse introuvable.');if(!rawLat||!rawLon||!isFinite(lat)||lat<-90||lat>90||!isFinite(lon)||lon<-180||lon>180)throw new Error('Renseignez une latitude et une longitude valides.');EUC_DEV441_geoUpsert_(item,{Adresse_normalisee:EUC_DEV441_t_(q.adresseNormalisee)||item.adresse,Pays:item.pays,Code_postal:item.codePostal,Latitude:lat,Longitude:lon,Score:1,Precision:'validation manuelle',Fournisseur:'MANUEL',Statut:'VALIDE_MANUELLEMENT',Valide_par:EUC_DEV441_t_(ctx.email),Date_validation:new Date().toISOString(),Commentaire:EUC_DEV441_t_(q.commentaire)});return{ok:true,candidats:EUC_DEV441_geoCandidates_(q)};
}
function EUC_DEV441_mapData(q){var c=EUC_DEV441_geoCandidates_(q).filter(function(x){return isFinite(x.latitude)&&isFinite(x.longitude)&&x.latitude!==null&&x.longitude!==null&&(x.statut==='GEOCODE_AUTOMATIQUE'||x.statut==='VALIDE_MANUELLEMENT');});return{ok:true,total:c.length,points:c};}

function EUC_DEV441_render_(file,title,boot){var t=HtmlService.createTemplateFromFile(file);t.bootJson=JSON.stringify(boot||EUC_DEV368_boot());return t.evaluate().setTitle(title).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function EUC_DEV441_afficherPpAdmin(e){EUC_DEV441_admin_();return EUC_DEV441_render_('Acces_PP_Admin_DEV441','Accès professeurs principaux');}
function EUC_DEV441_afficherPp(e){return EUC_DEV441_render_('Acces_PP_DEV441','Accès professeur principal');}
function EUC_DEV441_afficherGeoAdmin(e){EUC_DEV441_admin_();return EUC_DEV441_render_('Geocodage_PFMP_DEV441','Géocodage des entreprises');}
function EUC_DEV441_afficherCarte(e){return EUC_DEV441_render_('Cartographie_PFMP_DEV441','Cartographie des entreprises',{current:EUC_DEV368_year(e&&e.parameter&&e.parameter.annee),baseUrl:EUC_DEV368_boot().baseUrl,params:e&&e.parameter||{}});}
