var EUC_DEV356_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
var EUC_DEV356_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';

function EUC_DEV356_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV356_y_(e){var y=EUC_DEV356_t_(e&&e.parameter&&e.parameter.annee);if(y)return y;try{return EUC_DEV356_t_(EUC_PFMP_contexteAnneeLectureV155_().active);}catch(err){return '';}}
function EUC_DEV356_family_(a,f){if(typeof EUC_DEV353_family_==='function'){try{return EUC_DEV353_family_(a,f)||{};}catch(e){}}if(typeof EUC_DEV347_family_==='function'){try{return EUC_DEV347_family_(a,f)||{};}catch(e2){}}return {classes:[]};}
function EUC_DEV383_detailBase_(a,f,c,p){if(typeof EUC_DEV353_detail_==='function'){try{return EUC_DEV353_detail_(a,f,c,p);}catch(e){}}if(typeof EUC_DEV347_detail==='function'){try{return EUC_DEV347_detail(a,f,c,p);}catch(e2){}}var r=EUC_DEV190I_readOne({annee:a,famille:f,classe:c,periode:p});return (r&&r.ready&&r.detail)?r.detail:EUC_SUIVI_CLASSE_detailF18_(a,c,p);}
function EUC_DEV356_jump_(annee,currentFamille,currentClasse,currentPeriode){
 var ordinal=0;
 try{var cur=EUC_DEV356_family_(annee,currentFamille),cc=(cur.classes||[]).filter(function(x){return Number(x.classeId||x.id)===Number(currentClasse);})[0],ps=cc&&cc.periodes||[];for(var i=0;i<ps.length;i++){if(Number(ps[i].id)===Number(currentPeriode)){ordinal=i;break;}}}catch(e){}
 var out=[];
 ['BACPRO','BTS','CAP'].forEach(function(fam){var data=EUC_DEV356_family_(annee,fam);(data.classes||[]).forEach(function(c){var ps=c.periodes||[];if(!ps.length)return;var p=ps[Math.min(ordinal,ps.length-1)]||ps[0],id=Number(c.classeId||c.id)||0,nom=EUC_DEV356_t_(c.classe||c.nom),pid=Number(p&&p.id)||0;if(id&&nom&&pid)out.push({id:id,nom:nom,famille:fam,periode:pid});});});
 out.sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
 return out;
}
function EUC_DEV356_adminDetail(e){
 var ctx=EUC_PFMP_contexteAnneeLectureV155_(),a=EUC_DEV356_y_(e),f=EUC_DEV356_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,d=EUC_DEV356_detail_(a,f,c,p),t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
 t.config=JSON.stringify({baseUrl:EUC_DEV356_ADMIN_URL_,readonly:false,publicMode:false});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(d);t.jumpClassesJson=JSON.stringify(EUC_DEV356_jump_(a,f,c,p));t.dev186BreadcrumbHtml='';
 return t.evaluate().setTitle('Suivi PFMP — '+((d.classe&&d.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV356_publicDetail(e){
 var ctx=EUC_PFMP_contexteAnneeLectureV155_(),a=EUC_DEV356_y_(e),f=EUC_DEV356_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,d=EUC_DEV356_detail_(a,f,c,p),t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicClone_V353');
 t.config=JSON.stringify({baseUrl:EUC_DEV356_PUBLIC_URL_,readonly:true,publicMode:true});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(d);t.jumpClassesJson=JSON.stringify(EUC_DEV356_jump_(a,f,c,p));t.dev186BreadcrumbHtml='';
 return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/* DEV383 - cache court du detail, resultat metier inchange. */
function EUC_DEV383_cacheKey_(a,f,c,p){
  return 'DEV423_DETAIL_'+String(a)+'_'+String(f||'BACPRO')+'_'+Number(c||0)+'_'+Number(p||0);
}

function EUC_DEV356_detail_(a,f,c,p){
  var key=EUC_DEV383_cacheKey_(a,f,c,p);
  var cache=CacheService.getScriptCache();
  var raw=null;
  try{raw=cache.get(key);}catch(e){}
  if(raw){
    try{return JSON.parse(raw);}catch(e2){}
  }

  var d=EUC_DEV383_detailBase_(a,f,c,p);
  try{cache.put(key,JSON.stringify(d),120);}catch(e3){}
  return d;
}

function EUC_DEV383_prewarmDetail(payload){
  payload=payload||{};
  var ctx=typeof EUC_V156_contexteAdmin_==='function'?EUC_V156_contexteAdmin_():null;
  if(!ctx)throw new Error('Accès administrateur requis.');

  var a=String(payload.annee||'').trim();
  var f=String(payload.famille||'BACPRO').trim().toUpperCase();
  var c=Number(payload.classe)||0;
  var p=Number(payload.periode)||0;
  if(!a||!c||!p)return {ok:false};

  var t=Date.now();
  EUC_DEV356_detail_(a,f,c,p);
  return {ok:true,ms:Date.now()-t};
}
