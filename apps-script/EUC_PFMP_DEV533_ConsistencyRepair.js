/**
 * PFMP — DEV533
 * Réparation bornée des remplacements dont la saisie entreprise est complète
 * mais dont le statut est resté à A_COMPLETER_ENTREPRISE.
 */
var EUC_DEV533_VERSION_='1.0.0-dev.533';
var EUC_DEV533_REPAIR_ARM_='EUC_DEV533_COMPLETED_REPLACEMENTS_ARM_V1';
var EUC_DEV533_REPAIR_TTL_MS_=30*60*1000;

function EUC_DEV533_repairText_(v){return String(v==null?'':v).trim();}
function EUC_DEV533_repairRows_(){
  var rows=EUC_CONVENTION_lireAccesFraisV108_()||[];
  return rows.map(EUC_DEV519_flatRecord_).filter(function(a){
    return EUC_DEV533_repairText_(a.Statut_administratif).toUpperCase()==='A_COMPLETER_ENTREPRISE'&&
      EUC_DEV533_repairText_(a.Type_sequence).toUpperCase()==='REMPLACEMENT_APRES_RUPTURE'&&
      a.Revoked!==true&&a.Supprimee_admin!==true&&EUC_DEV533_companySubmissionComplete_(a);
  }).sort(function(a,b){return Number(a.id)-Number(b.id);});
}
function EUC_DEV533_repairSignature_(rows){
  return (rows||[]).map(function(a){return [Number(a.id)||0,EUC_DEV533_repairText_(a.Statut),EUC_DEV533_repairText_(a.Statut_administratif)].join(':');}).join('|');
}
function EUC_DEV533_auditCompletedReplacementRepair(){
  EUC_DEV532_assertGreen_();
  var rows=EUC_DEV533_repairRows_(),signature=EUC_DEV533_repairSignature_(rows);
  PropertiesService.getScriptProperties().setProperty(EUC_DEV533_REPAIR_ARM_,JSON.stringify({at:Date.now(),signature:signature}));
  var result={ok:true,version:EUC_DEV533_VERSION_,candidates:rows.length,ids:rows.map(function(a){return Number(a.id);})};
  console.log(JSON.stringify({diagnostic:'DEV533_AUDIT_STATUT_REMPLACEMENTS',result:result}));
  return result;
}
function EUC_DEV533_repairCompletedReplacementStatus(){
  EUC_DEV532_assertGreen_();
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('DEV533 : une autre opération PFMP est en cours.');
  try{
    var props=PropertiesService.getScriptProperties(),armed={};
    try{armed=JSON.parse(props.getProperty(EUC_DEV533_REPAIR_ARM_)||'{}')||{};}catch(e){armed={};}
    if(!Object.prototype.hasOwnProperty.call(armed,'signature'))throw new Error('DEV533 : audit préalable absent.');
    if(Date.now()-Number(armed.at||0)>EUC_DEV533_REPAIR_TTL_MS_)throw new Error('DEV533 : audit préalable expiré.');
    var rows=EUC_DEV533_repairRows_(),signature=EUC_DEV533_repairSignature_(rows);
    if(signature!==armed.signature)throw new Error('DEV533 : les conventions ont changé depuis l’audit.');
    var repaired=[];
    rows.forEach(function(a){
      var refresh=typeof EUC_CONVENTION_debutRafraichissementV511_==='function'?EUC_CONVENTION_debutRafraichissementV511_(a,'reparation-statut-remplacement'):null;
      EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:Number(a.id),fields:{
        Statut:'ENTREPRISE_SAISIE',
        Statut_administratif:'INFORMATIONS_ENREGISTREES',
        Date_saisie_entreprise:a.Date_saisie_entreprise||a.Date_derniere_utilisation||new Date().toISOString()
      }}]});
      repaired.push(Number(a.id));
      if(typeof EUC_CONVENTION_finRafraichissementV511_==='function')EUC_CONVENTION_finRafraichissementV511_(refresh);
    });
    props.deleteProperty(EUC_DEV533_REPAIR_ARM_);
    var remaining=EUC_DEV533_repairRows_();
    if(remaining.length)throw new Error('DEV533 : '+remaining.length+' remplacement(s) complet(s) restent incohérents.');
    var result={ok:true,version:EUC_DEV533_VERSION_,repaired:repaired.length,ids:repaired,remaining:0};
    console.log(JSON.stringify({diagnostic:'DEV533_REPARATION_STATUT_REMPLACEMENTS',result:result}));
    return result;
  }finally{try{lock.releaseLock();}catch(e2){}}
}
