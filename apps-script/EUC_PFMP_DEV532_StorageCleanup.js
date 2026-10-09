/**
 * PFMP — DEV532
 * Nettoyage borné des versions techniques redondantes des snapshots.
 *
 * Garanties :
 * - réservé au projet vert et à sa cible Grist configurée ;
 * - aucune table métier n'est modifiée ;
 * - conserve exactement la ligne active la plus récente de chaque clé ;
 * - bloque si une clé ne possède aucune ligne active ;
 * - audit obligatoire et valable trente minutes avant exécution ;
 * - replanification sous verrou juste avant toute suppression.
 */
var EUC_DEV532_VERSION_='1.0.0-dev.532';
var EUC_DEV532_ARM_PROP_='EUC_DEV532_STORAGE_CLEANUP_ARM_V1';
var EUC_DEV532_ARM_TTL_MS_=30*60*1000;
var EUC_DEV532_BACKUP_SHA256_='9eb2c4117ed93fda837bbe58766b9f569066916ee362e18720622e3ebe3dbc64';
var EUC_DEV532_TABLES_=[
  {name:'EUC_SUIVI_PFMP_INDEX',keys:['Annee_scolaire','Famille']},
  {name:'EUC_SUIVI_PFMP_DETAIL_SNAPSHOT',keys:['Annee_scolaire','Famille','Classe_id','Periode_id']}
];

function EUC_DEV532_text_(v){return String(v==null?'':v).trim();}
function EUC_DEV532_active_(v){return v===true||['true','1','yes'].indexOf(EUC_DEV532_text_(v).toLowerCase())>=0;}
function EUC_DEV532_time_(v){var n=Date.parse(EUC_DEV532_text_(v));return isFinite(n)?n:0;}
function EUC_DEV532_chunks_(rows,size){var out=[];for(var i=0;i<(rows||[]).length;i+=size)out.push(rows.slice(i,i+size));return out;}
function EUC_DEV532_hex_(bytes){return (bytes||[]).map(function(b){return ('0'+((b<0?b+256:b)&255).toString(16)).slice(-2);}).join('');}
function EUC_DEV532_hash_(value){return EUC_DEV532_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8));}

function EUC_DEV532_assertGreen_(){
  if(typeof EUC_ENT_controlerCibleRecette_==='function')EUC_ENT_controlerCibleRecette_();
  var canal=typeof EUC_ENT_canalProjet_==='function'?EUC_ENT_canalProjet_():'';
  var cfg=typeof EUC_ENT_lireConfiguration==='function'?EUC_ENT_lireConfiguration():{};
  var doc=EUC_DEV532_text_(cfg&&cfg.EUC_ENT_GRIST_DOC_ID);
  if(canal!=='GREEN'||!doc||doc==='kB8bvDag8x7D')throw new Error('DEV532 : nettoyage autorisé uniquement sur la cible Grist verte configurée.');
  return doc;
}

function EUC_DEV532_rows_(spec){
  var cols=['id'].concat(spec.keys).concat(['Updated_at','Actif','LENGTH(COALESCE(Payload_JSON,\'\')) AS Payload_bytes']);
  var sql='SELECT '+cols.map(function(c){return /\sAS\s/i.test(c)?c:'"'+c+'"';}).join(',')+' FROM "'+spec.name+'"';
  return EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_(sql,[]));
}

function EUC_DEV532_tablePlan_(spec){
  var rows=EUC_DEV532_rows_(spec),groups={};
  rows.forEach(function(r){
    var key=spec.keys.map(function(k){return EUC_DEV532_text_(r[k]);}).join('\u001f');
    (groups[key]||(groups[key]=[])).push(r);
  });
  var keep=[],remove=[],blocked=[];
  Object.keys(groups).sort().forEach(function(key){
    var group=groups[key],active=group.filter(function(r){return EUC_DEV532_active_(r.Actif);}).sort(function(a,b){
      return EUC_DEV532_time_(b.Updated_at)-EUC_DEV532_time_(a.Updated_at)||(Number(b.id)||0)-(Number(a.id)||0);
    });
    if(!active.length){blocked.push(key);return;}
    var keeper=active[0];keep.push(Number(keeper.id));
    group.forEach(function(r){if(Number(r.id)!==Number(keeper.id))remove.push({id:Number(r.id),bytes:Number(r.Payload_bytes)||0});});
  });
  keep.sort(function(a,b){return a-b;});remove.sort(function(a,b){return a.id-b.id;});
  return {
    table:spec.name,rows:rows.length,keys:Object.keys(groups).length,keepers:keep,
    candidates:remove.map(function(r){return r.id;}),candidateBytes:remove.reduce(function(n,r){return n+r.bytes;},0),
    blockedKeys:blocked.length
  };
}

function EUC_DEV532_plan_(){
  EUC_DEV532_assertGreen_();
  var tables=EUC_DEV532_TABLES_.map(EUC_DEV532_tablePlan_);
  var canonical=tables.map(function(t){return {table:t.table,rows:t.rows,keys:t.keys,keepers:t.keepers,candidates:t.candidates,blockedKeys:t.blockedKeys};});
  return {
    version:EUC_DEV532_VERSION_,createdAt:new Date().toISOString(),backupSha256:EUC_DEV532_BACKUP_SHA256_,tables:tables,
    totalRows:tables.reduce(function(n,t){return n+t.rows;},0),
    totalKeepers:tables.reduce(function(n,t){return n+t.keepers.length;},0),
    totalCandidates:tables.reduce(function(n,t){return n+t.candidates.length;},0),
    candidateBytes:tables.reduce(function(n,t){return n+t.candidateBytes;},0),
    blockedKeys:tables.reduce(function(n,t){return n+t.blockedKeys;},0),
    hash:EUC_DEV532_hash_(JSON.stringify(canonical))
  };
}

function EUC_DEV532_publicPlan_(plan){
  return {version:plan.version,createdAt:plan.createdAt,backupSha256:plan.backupSha256,hash:plan.hash,
    totalRows:plan.totalRows,totalKeepers:plan.totalKeepers,totalCandidates:plan.totalCandidates,
    candidateBytes:plan.candidateBytes,blockedKeys:plan.blockedKeys,
    tables:plan.tables.map(function(t){return {table:t.table,rows:t.rows,keys:t.keys,keepers:t.keepers.length,candidates:t.candidates.length,candidateBytes:t.candidateBytes,blockedKeys:t.blockedKeys};})};
}

/** Étape 1, sans suppression : calcule et arme le plan pour trente minutes. */
function EUC_DEV532_auditStorageCleanup(){
  var plan=EUC_DEV532_plan_();
  if(plan.blockedKeys)throw new Error('DEV532 : nettoyage bloqué, '+plan.blockedKeys+' clé(s) sans ligne active.');
  if(!plan.totalKeepers)throw new Error('DEV532 : aucun snapshot actif à conserver.');
  PropertiesService.getScriptProperties().setProperty(EUC_DEV532_ARM_PROP_,JSON.stringify({hash:plan.hash,createdAt:Date.now(),backupSha256:EUC_DEV532_BACKUP_SHA256_}));
  var result=EUC_DEV532_publicPlan_(plan);console.log(JSON.stringify({diagnostic:'DEV532_AUDIT_STOCKAGE',result:result}));return result;
}

/** Étape 2 : exécutable uniquement après l'audit identique encore valide. */
function EUC_DEV532_cleanupObsoleteSnapshots(){
  EUC_DEV532_assertGreen_();
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('DEV532 : une autre opération PFMP est en cours.');
  try{
    var props=PropertiesService.getScriptProperties(),armed={};
    try{armed=JSON.parse(props.getProperty(EUC_DEV532_ARM_PROP_)||'{}')||{};}catch(e){armed={};}
    if(!armed.hash||Date.now()-Number(armed.createdAt||0)>EUC_DEV532_ARM_TTL_MS_||armed.backupSha256!==EUC_DEV532_BACKUP_SHA256_)
      throw new Error('DEV532 : audit préalable absent ou expiré.');
    var plan=EUC_DEV532_plan_();
    if(plan.hash!==armed.hash)throw new Error('DEV532 : le contenu a changé depuis l’audit ; relancez uniquement l’audit.');
    if(plan.blockedKeys||!plan.totalKeepers)throw new Error('DEV532 : invariants de conservation non satisfaits.');
    plan.tables.forEach(function(t){
      EUC_DEV532_chunks_(t.candidates,200).forEach(function(ids){
        if(ids.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t.table)+'/records/delete',ids);
      });
    });
    props.deleteProperty(EUC_DEV532_ARM_PROP_);
    var after=EUC_DEV532_plan_();
    if(after.totalCandidates!==0||after.blockedKeys!==0||after.totalRows!==plan.totalKeepers)
      throw new Error('DEV532 : contrôle après nettoyage incohérent ; restauration à examiner.');
    var result={ok:true,version:EUC_DEV532_VERSION_,deleted:plan.totalCandidates,deletedPayloadBytes:plan.candidateBytes,
      remainingRows:after.totalRows,remainingCandidates:after.totalCandidates,backupSha256:EUC_DEV532_BACKUP_SHA256_};
    console.log(JSON.stringify({diagnostic:'DEV532_NETTOYAGE_STOCKAGE',result:result}));return result;
  }finally{try{lock.releaseLock();}catch(e2){}}
}
