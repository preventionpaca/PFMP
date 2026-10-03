/** PFMP — DEV420 : situations administratives des élèves sans convention. */
var EUC_DEV420_MOTIFS_TABLE_='EUC_STATUTS_SUIVI_ELEVE_PFMP';
var EUC_DEV420_SITUATIONS_TABLE_='EUC_SITUATIONS_ELEVES_PFMP';
var EUC_DEV420_INSTALL_TOKEN_='AUTORISATION_SITUATIONS_ELEVES_DEV420';
/* Ces deux tables changent uniquement depuis les écrans administratifs qui
 * invalident explicitement le cache. Un TTL de 60 s imposait deux lectures
 * Grist presque à chaque navigation ; six heures gardent la lecture rapide
 * tout en laissant un filet de sécurité en cas de modification extérieure. */
var EUC_DEV420_CACHE_TTL_=21600;

function EUC_DEV420_txt_(v,max){
  var s=String(v==null?'':v).trim();
  return max&&s.length>max?s.slice(0,max):s;
}
function EUC_DEV420_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV420_col_(id,label,type){return{id:id,fields:{label:label,type:type||'Text'}};}
function EUC_DEV420_adminWrite_(){
  EUC_ENT_controlerCibleRecette_();
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx||ctx.peutModifier!==true||ctx.lectureSeule===true)throw new Error('Droit de modification administrateur requis.');
  return ctx;
}
function EUC_DEV420_tables_(){
  EUC_ENT_controlerCibleRecette_();
  var out={};
  (EUC_ENT_grist('get','/tables').tables||[]).forEach(function(t){out[t.id]=true;});
  return out;
}
function EUC_DEV420_motifCols_(){var c=EUC_DEV420_col_;return[
  c('Code','Code'),c('Libelle','Libellé'),c('Ordre','Ordre','Int'),c('Actif','Actif','Bool'),
  c('Exclure_sans_convention','Retirer du compteur sans convention','Bool'),
  c('Date_creation','Créé le','DateTime'),c('Date_modification','Modifié le','DateTime'),
  c('Auteur_modification','Modifié par')
];}
function EUC_DEV420_situationCols_(){var c=EUC_DEV420_col_;return[
  c('Cle_situation','Clé situation'),c('Annee_scolaire','Année scolaire'),
  c('Classe','Classe','Ref:Classes'),c('Periode','Période','Ref:Planning_Periodes'),
  c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),
  c('Statut','Statut','Ref:EUC_STATUTS_SUIVI_ELEVE_PFMP'),
  c('Code_statut_snapshot','Code statut'),c('Libelle_statut_snapshot','Libellé statut'),
  c('Commentaire','Commentaire'),c('Actif','Actif','Bool'),
  c('Date_creation','Créé le','DateTime'),c('Date_modification','Modifié le','DateTime'),
  c('Auteur_modification','Modifié par')
];}
function EUC_DEV420_ensureTable_(id,cols,tables){
  if(!tables[id]){
    EUC_ENT_grist('post','/tables',{tables:[{id:id,columns:cols}]});
    tables[id]=true;
    return {created:true,columns:cols.map(function(x){return x.id;})};
  }
  var have={};
  (EUC_ENT_grist('get','/tables/'+encodeURIComponent(id)+'/columns').columns||[]).forEach(function(x){have[x.id]=true;});
  var missing=cols.filter(function(x){return !have[x.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(id)+'/columns',{columns:missing});
  return {created:false,columns:missing.map(function(x){return x.id;})};
}
function EUC_DEV420_readRows_(table){
  try{return EUC_IMPORT_lireRecords_(table)||[];}catch(e){return [];}
}
function EUC_DEV420_cache_(){try{return CacheService.getScriptCache();}catch(e){return null;}}
function EUC_DEV420_compactRow_(table,r){
  r=r||{};
  if(table===EUC_DEV420_MOTIFS_TABLE_)return{
    id:Number(r.id)||0,Code:r.Code||'',Libelle:r.Libelle||'',Ordre:Number(r.Ordre)||0,
    Actif:r.Actif!==false,Exclure_sans_convention:r.Exclure_sans_convention!==false
  };
  return{
    id:Number(r.id)||0,Annee_scolaire:r.Annee_scolaire||'',Classe:r.Classe,
    Periode:r.Periode,Eleve:r.Eleve,Statut:r.Statut,Actif:r.Actif!==false
  };
}
function EUC_DEV420_cachedRows_(table){
  var cache=EUC_DEV420_cache_(),key='DEV420_ROWS_'+table,raw=null;
  try{raw=cache&&cache.get(key);}catch(e){}
  if(raw){try{return JSON.parse(raw);}catch(e2){}}
  var rows=EUC_DEV420_readRows_(table).map(function(r){return EUC_DEV420_compactRow_(table,r);});
  try{if(cache)cache.put(key,JSON.stringify(rows),EUC_DEV420_CACHE_TTL_);}catch(e3){}
  return rows;
}
function EUC_DEV420_clearRowsCache_(){
  var cache=EUC_DEV420_cache_();if(!cache)return;
  try{cache.removeAll(['DEV420_ROWS_'+EUC_DEV420_MOTIFS_TABLE_,'DEV420_ROWS_'+EUC_DEV420_SITUATIONS_TABLE_]);}catch(e){
    try{cache.remove('DEV420_ROWS_'+EUC_DEV420_MOTIFS_TABLE_);cache.remove('DEV420_ROWS_'+EUC_DEV420_SITUATIONS_TABLE_);}catch(e2){}
  }
}
function EUC_DEV420_seedMotifs_(ctx){
  var seeds=[
    {Code:'AVIS_SCOLAIRE',Libelle:'Dossier géré par avis scolaire',Ordre:10},
    {Code:'DEMISSIONNAIRE',Libelle:'Démissionnaire',Ordre:20},
    {Code:'ABSENTEISTE',Libelle:'Absentéiste',Ordre:30}
  ],rows=EUC_DEV420_readRows_(EUC_DEV420_MOTIFS_TABLE_),have={},now=new Date().toISOString(),posts=[];
  rows.forEach(function(r){have[EUC_DEV420_txt_(r.Code).toUpperCase()]=true;});
  seeds.forEach(function(s){if(!have[s.Code])posts.push({fields:{
    Code:s.Code,Libelle:s.Libelle,Ordre:s.Ordre,Actif:true,Exclure_sans_convention:true,
    Date_creation:now,Date_modification:now,Auteur_modification:EUC_DEV420_txt_(ctx.email,250)
  }});});
  if(posts.length)EUC_ENT_grist('post','/tables/'+EUC_DEV420_MOTIFS_TABLE_+'/records',{records:posts});
  return posts.length;
}

/** Installation idempotente autorisée explicitement pour la base active b2CyeMEdVEMS. */
function EUC_DEV420_installer(autorisation){
  if(autorisation!==EUC_DEV420_INSTALL_TOKEN_)throw new Error('Autorisation explicite requise.');
  var ctx=EUC_DEV420_adminWrite_(),lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Une autre installation est en cours.');
  try{
    var tables=EUC_DEV420_tables_();
    var motifs=EUC_DEV420_ensureTable_(EUC_DEV420_MOTIFS_TABLE_,EUC_DEV420_motifCols_(),tables);
    var situations=EUC_DEV420_ensureTable_(EUC_DEV420_SITUATIONS_TABLE_,EUC_DEV420_situationCols_(),tables);
    EUC_DEV420_clearRowsCache_();
    var seeds=EUC_DEV420_seedMotifs_(ctx);EUC_DEV420_clearRowsCache_();
    return {ok:true,cible:'b2CyeMEdVEMS',tables:[
      {id:EUC_DEV420_MOTIFS_TABLE_,created:motifs.created,columnsAdded:motifs.columns},
      {id:EUC_DEV420_SITUATIONS_TABLE_,created:situations.created,columnsAdded:situations.columns}
    ],motifsCrees:seeds};
  }finally{try{lock.releaseLock();}catch(e){}}
}
function EUC_DEV420_schemaEtat(){
  EUC_DEV368_admin();var t=EUC_DEV420_tables_();
  return {ok:true,installed:!!(t[EUC_DEV420_MOTIFS_TABLE_]&&t[EUC_DEV420_SITUATIONS_TABLE_]),
    motifs:!!t[EUC_DEV420_MOTIFS_TABLE_],situations:!!t[EUC_DEV420_SITUATIONS_TABLE_]};
}
function EUC_DEV420_motifs_(includeInactive){
  return EUC_DEV420_cachedRows_(EUC_DEV420_MOTIFS_TABLE_).filter(function(r){return includeInactive||r.Actif!==false;}).map(function(r){return{
    id:Number(r.id)||0,code:EUC_DEV420_txt_(r.Code),libelle:EUC_DEV420_txt_(r.Libelle),ordre:Number(r.Ordre)||0,
    actif:r.Actif!==false,exclureSansConvention:r.Exclure_sans_convention!==false
  };}).filter(function(r){return r.id&&r.code&&r.libelle;}).sort(function(a,b){return a.ordre-b.ordre||a.libelle.localeCompare(b.libelle,'fr');});
}
function EUC_DEV420_motifsAdmin(){EUC_DEV368_admin();return{ok:true,motifs:EUC_DEV420_motifs_(true)};}
function EUC_DEV420_code_(v){
  return EUC_DEV420_txt_(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60);
}
function EUC_DEV420_ajouterMotif(payload){
  var ctx=EUC_DEV420_adminWrite_(),p=payload||{},lib=EUC_DEV420_txt_(p.libelle,160),code=EUC_DEV420_code_(p.code||lib);
  if(lib.length<3||!code)throw new Error('Libellé de situation invalide.');
  if(EUC_DEV420_motifs_(true).some(function(x){return x.code===code;}))throw new Error('Ce code de situation existe déjà.');
  var now=new Date().toISOString(),order=EUC_DEV420_motifs_(true).reduce(function(m,x){return Math.max(m,x.ordre);},0)+10;
  EUC_ENT_grist('post','/tables/'+EUC_DEV420_MOTIFS_TABLE_+'/records',{records:[{fields:{Code:code,Libelle:lib,Ordre:order,Actif:true,
    Exclure_sans_convention:p.exclureSansConvention!==false,Date_creation:now,Date_modification:now,Auteur_modification:EUC_DEV420_txt_(ctx.email,250)}}]});
  EUC_DEV420_clearRowsCache_();return EUC_DEV420_motifsAdmin();
}
function EUC_DEV420_definirMotifActif(payload){
  var ctx=EUC_DEV420_adminWrite_(),p=payload||{},id=Number(p.id)||0;
  if(!id||!EUC_DEV420_motifs_(true).some(function(x){return x.id===id;}))throw new Error('Situation introuvable.');
  EUC_ENT_grist('patch','/tables/'+EUC_DEV420_MOTIFS_TABLE_+'/records',{records:[{id:id,fields:{Actif:p.actif===true,
    Date_modification:new Date().toISOString(),Auteur_modification:EUC_DEV420_txt_(ctx.email,250)}}]});
  EUC_DEV420_clearRowsCache_();return EUC_DEV420_motifsAdmin();
}

function EUC_DEV420_situationKey_(annee,classe,periode,eleve){return [EUC_DEV420_txt_(annee),Number(classe)||0,Number(periode)||0,Number(eleve)||0].join('|');}
function EUC_DEV420_situationsMap_(annee,classe,periode){
  var out={},a=EUC_DEV420_txt_(annee),c=Number(classe)||0,p=Number(periode)||0;
  EUC_DEV420_cachedRows_(EUC_DEV420_SITUATIONS_TABLE_).forEach(function(r){
    if(r.Actif===false||EUC_DEV420_txt_(r.Annee_scolaire)!==a||EUC_DEV420_ref_(r.Classe)!==c||EUC_DEV420_ref_(r.Periode)!==p)return;
    var eid=EUC_DEV420_ref_(r.Eleve),old=out[eid];
    if(eid&&(!old||Number(r.id)>Number(old.id)))out[eid]=r;
  });return out;
}
function EUC_DEV420_incident_(x){var c=EUC_DEV420_txt_((x&&x.statutCode)||'')+' '+EUC_DEV420_txt_((x&&x.statut)||'');c=c.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return c.indexOf('ANNULE')>=0||c.indexOf('INTERROMP')>=0;}
function EUC_DEV420_hasConvention_(x){return Number(x&&x.conventionId)>0||x&&x.convention===true;}
function EUC_DEV420_enrichDetail_(detail,annee,famille,classe,periode){
  detail=detail||{};var motifs={},situations=EUC_DEV420_situationsMap_(annee,classe,periode);
  /* Un motif désactivé n'est plus sélectionnable mais reste appliqué aux
     affectations historiques existantes. */
  EUC_DEV420_motifs_(true).forEach(function(m){motifs[m.id]=m;});
  var st={total:0,apprentis:0,mixtes:0,avecConvention:0,sansConvention:0,annulees:0,interrompues:0,situationsAdministratives:0,situationsExcluantes:0};
  (detail.lignes||[]).forEach(function(x){
    st.total++;if(x.statutMixte)st.mixtes++;
    if(x.apprenti){st.apprentis++;return;}
    if(EUC_DEV420_incident_(x)){
      var cc=EUC_DEV420_txt_(x.statutCode||x.statut).toUpperCase();if(cc.indexOf('INTERROMP')>=0)st.interrompues++;else st.annulees++;return;
    }
    if(EUC_DEV420_hasConvention_(x)){st.avecConvention++;return;}
    var s=situations[Number(x.eleveId)||0],m=s&&motifs[EUC_DEV420_ref_(s.Statut)];
    if(m){
      x.situationAdministrativeId=Number(s.id)||0;x.situationAdministrativeCode=m.code;x.situationAdministrativeLibelle=m.libelle;
      x.exclureSansConvention=m.exclureSansConvention===true;
      x.statutCode='SITUATION_ADMIN_'+m.code;x.statut=m.libelle;st.situationsAdministratives++;
      if(x.exclureSansConvention){st.situationsExcluantes++;return;}
    }
    st.sansConvention++;
  });
  st.scolairesAttendus=Math.max(0,st.total-st.apprentis-st.mixtes);detail.stats=Object.assign({},detail.stats||{},st);return detail;
}
function EUC_DEV420_enrichFamily_(data,annee,famille){
  var d;try{d=JSON.parse(JSON.stringify(data||{}));}catch(e){d=data||{};}
  var motifs={},by={};EUC_DEV420_motifs_(true).forEach(function(m){motifs[m.id]=m;});
  EUC_DEV420_cachedRows_(EUC_DEV420_SITUATIONS_TABLE_).forEach(function(r){
    if(r.Actif===false||EUC_DEV420_txt_(r.Annee_scolaire)!==EUC_DEV420_txt_(annee))return;
    var m=motifs[EUC_DEV420_ref_(r.Statut)];if(!m||m.exclureSansConvention!==true)return;
    var k=EUC_DEV420_ref_(r.Classe)+'|'+EUC_DEV420_ref_(r.Periode),eid=EUC_DEV420_ref_(r.Eleve);if(!eid)return;
    (by[k]||(by[k]={}))[eid]=true;
  });
  (d.classes||[]).forEach(function(c){var cid=Number(c.classeId||c.id)||0;(c.periodes||[]).forEach(function(p){
    var assigned=Object.keys(by[cid+'|'+(Number(p.id)||0)]||{}).length,missing=Math.max(0,(Number(p.total)||0)-(Number(p.conventions)||0));
    p.situationsAdministratives=Math.min(assigned,missing);p.sansConvention=Math.max(0,missing-p.situationsAdministratives);p.manquantes=p.sansConvention;
  });});return d;
}
function EUC_DEV420_invalidate_(annee,famille,classe,periode){
  var cache=EUC_DEV420_cache_(),keys=['DEV420_ROWS_'+EUC_DEV420_SITUATIONS_TABLE_,
    EUC_DEV416_key_(annee,famille||'BACPRO',classe,periode)+'_M',
    ['DEV392_QUICK',annee,famille||'BACPRO',classe,periode].join('_')];
  try{if(cache)cache.removeAll(keys);}catch(e){try{keys.forEach(function(k){cache.remove(k);});}catch(e2){}}
  if(typeof EUC_DEV421_familyCacheInvalidate_==='function')EUC_DEV421_familyCacheInvalidate_(annee,famille||'BACPRO');
}
function EUC_DEV420_sauverSituation(payload){
  var ctx=EUC_DEV420_adminWrite_(),p=payload||{},annee=EUC_DEV420_txt_(p.annee,20),famille=EUC_DEV420_txt_(p.famille||'BACPRO',20),
    classe=Number(p.classeId)||0,periode=Number(p.periodeId)||0,eleve=Number(p.eleveId)||0,statut=Number(p.statutId)||0;
  if(!annee||!classe||!periode||!eleve)throw new Error('Année, classe, période et élève obligatoires.');
  var detail=EUC_DEV371_detailCorrect_(annee,classe,periode),row=(detail.lignes||[]).filter(function(x){return Number(x.eleveId)===eleve;})[0];
  if(!row)throw new Error('Élève introuvable dans cette classe et cette période.');
  var motif=statut?EUC_DEV420_motifs_(false).filter(function(x){return x.id===statut;})[0]:null;
  if(statut&&!motif)throw new Error('Situation administrative inactive ou introuvable.');
  if(statut&&(row.apprenti||EUC_DEV420_hasConvention_(row)||EUC_DEV420_incident_(row)))throw new Error('Une situation administrative ne peut être affectée qu’à un élève actuellement sans convention.');
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Une autre modification est en cours.');
  try{
    var key=EUC_DEV420_situationKey_(annee,classe,periode,eleve),all=EUC_DEV420_readRows_(EUC_DEV420_SITUATIONS_TABLE_).filter(function(r){return EUC_DEV420_txt_(r.Cle_situation)===key;}).sort(function(a,b){return Number(b.id)-Number(a.id);}),now=new Date().toISOString(),author=EUC_DEV420_txt_(ctx.email,250);
    if(!statut){
      var off=all.filter(function(r){return r.Actif!==false;}).map(function(r){return{id:Number(r.id),fields:{Actif:false,Date_modification:now,Auteur_modification:author}};});
      if(off.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV420_SITUATIONS_TABLE_+'/records',{records:off});
    }else{
      var fields={Cle_situation:key,Annee_scolaire:annee,Classe:classe,Periode:periode,Eleve:eleve,Statut:motif.id,
        Code_statut_snapshot:motif.code,Libelle_statut_snapshot:motif.libelle,Commentaire:EUC_DEV420_txt_(p.commentaire,1000),
        Actif:true,Date_modification:now,Auteur_modification:author};
      if(all.length){
        EUC_ENT_grist('patch','/tables/'+EUC_DEV420_SITUATIONS_TABLE_+'/records',{records:[{id:Number(all[0].id),fields:fields}].concat(all.slice(1).filter(function(r){return r.Actif!==false;}).map(function(r){return{id:Number(r.id),fields:{Actif:false,Date_modification:now,Auteur_modification:author}};}))});
      }else{fields.Date_creation=now;EUC_ENT_grist('post','/tables/'+EUC_DEV420_SITUATIONS_TABLE_+'/records',{records:[{fields:fields}]});}
    }
    EUC_DEV420_clearRowsCache_();EUC_DEV420_invalidate_(annee,famille,classe,periode);
    return {ok:true,actif:!!statut,eleveId:eleve,statutId:statut};
  }finally{try{lock.releaseLock();}catch(e){}}
}
