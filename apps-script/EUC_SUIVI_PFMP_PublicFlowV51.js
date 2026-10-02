function EUC_V51_txt_(v){return String(v==null?'':v).trim();}
function EUC_V51_norm_(v){return EUC_V51_txt_(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

function EUC_V51_numeroPeriodes_(detail){
  var ps=(detail&&detail.periodes||[]).slice().sort(function(a,b){
    var da=EUC_V51_txt_(a.debut)||'9999',db=EUC_V51_txt_(b.debut)||'9999';
    if(da!==db)return da.localeCompare(db);
    return Number(a.id||0)-Number(b.id||0);
  });
  var cat=EUC_V51_norm_(detail&&detail.classe&&detail.classe.categorie);
  var nom=EUC_V51_norm_(detail&&detail.classe&&detail.classe.nom);
  var isBts=cat.indexOf('BTS')>=0||nom.indexOf('BTS')>=0,n=0;
  ps.forEach(function(p){
    var t=EUC_V51_norm_(p.libelle);
    if(/P[\.\s-]*DIF/.test(t)){p.libelle='P.dif.';return;}
    if(/PFMP|STAGE|ALTERNANCE/.test(t)){n++;p.libelle=(isBts?'Stage n°':'PFMP n°')+n;p.numero=n;}
  });
  detail.periodes=ps;
  if(detail.periode){
    var cur=ps.filter(function(p){return Number(p.id)===Number(detail.periode.id);})[0];
    if(cur){detail.periode.libelle=cur.libelle;detail.periode.numero=cur.numero||0;}
  }
  return detail;
}

function EUC_SUIVI_PUBLIC_afficherFamillesV51(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamillesV51');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.requestedYear=JSON.stringify(EUC_V51_txt_(e&&e.parameter&&e.parameter.annee));
  return tpl.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_SUIVI_PUBLIC_resumeFamilleV51(payload){return EUC_SUIVI_PUBLIC_resumeFamilleV50(payload);}
function EUC_SUIVI_PUBLIC_afficherFamilleV51(e){
  var tpl=HtmlService.createTemplateFromFile('Suivi_Conventions_FamilleV51');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.paramsJson=JSON.stringify({annee:EUC_V51_txt_(e&&e.parameter&&e.parameter.annee),famille:EUC_V51_txt_(e&&e.parameter&&e.parameter.famille)});
  return tpl.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_SUIVI_PUBLIC_chargerFamilleV51(payload){return EUC_SUIVI_PUBLIC_chargerFamilleV50(payload);}

function EUC_SUIVI_CLASSE_prewarmV51(payload){
  payload=payload||{};
  var annee=EUC_V51_txt_(payload.annee),classeId=Number(payload.classe)||0,periodeId=Number(payload.periode)||0;
  if(!annee||!classeId||!periodeId)return {ok:false};
  var key='EUC_V51_DETAIL_'+annee+'_'+classeId+'_'+periodeId,cache=CacheService.getScriptCache();
  if(cache.get(key))return {ok:true,cached:true};
  var detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
  detail=EUC_V50_enrichirDetail_(detail,annee,classeId,periodeId);
  detail=EUC_V51_numeroPeriodes_(detail);
  try{cache.put(key,JSON.stringify(detail),300);}catch(e){}
  return {ok:true,cached:false};
}

function EUC_SUIVI_CLASSE_afficherV51(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0,periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V51_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var key='EUC_V51_DETAIL_'+annee+'_'+classeId+'_'+periodeId,cache=CacheService.getScriptCache(),detail=null,cached=cache.get(key);
  if(cached){try{detail=JSON.parse(cached);}catch(err){}}
  if(!detail){
    detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
    var pid=Number(detail&&detail.periode&&detail.periode.id)||periodeId||0;
    detail=EUC_V50_enrichirDetail_(detail,annee,classeId,pid);
    detail=EUC_V51_numeroPeriodes_(detail);
    try{cache.put(key,JSON.stringify(detail),300);}catch(err){}
  }
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
