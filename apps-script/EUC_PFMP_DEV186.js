/** Eucalyptus PFMP — DEV.186 */

function EUC_DEV186_txt_(v){return String(v==null?'':v).trim();}

function EUC_DEV186_prewarmDetail(payload){
  payload=payload||{};
  var annee=EUC_DEV186_txt_(payload.annee);
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;
  if(!annee||!classe||!periode)return {ok:false};

  var t0=Date.now();
  var d=EUC_DEV185_detail_(annee,classe,periode);
  return {
    ok:true,
    cache:d&&d.__cacheHit===true?'HIT':'READY',
    totalMs:Date.now()-t0
  };
}

function EUC_DEV186_familyCode_(d){
  var nom=String(d&&d.classe&&d.classe.nom||'').toUpperCase();
  var cat=String(d&&d.classe&&d.classe.categorie||'').toUpperCase();
  if(cat.indexOf('BTS')>=0||nom.indexOf('BTS')>=0)return 'BTS';
  if(cat.indexOf('CAP')>=0||nom.indexOf('CAP')>=0)return 'CAP';
  return 'BACPRO';
}

function EUC_DEV186_familyLabel_(f){
  return f==='BACPRO'?'BAC PRO':f;
}

function EUC_DEV186_escape_(v){
  return String(v==null?'':v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function EUC_DEV186_breadcrumbHtml_(d,annee){
  var base=ScriptApp.getService().getUrl();
  var fam=EUC_DEV186_familyCode_(d);
  var fl=EUC_DEV186_familyLabel_(fam);
  var classe=d&&d.classe&&d.classe.nom||'Classe';
  var periode=d&&d.periode&&d.periode.libelle||'Période';

  function url(page,extra){
    var q=['page='+encodeURIComponent(page),'annee='+encodeURIComponent(annee)];
    Object.keys(extra||{}).forEach(function(k){
      q.push(encodeURIComponent(k)+'='+encodeURIComponent(extra[k]));
    });
    return base+'?'+q.join('&');
  }

  return '<nav class="euc186-crumb" aria-label="Fil d’Ariane">'+
    '<a href="'+url('admin-pfmp',{})+'">Accueil PFMP</a><span>›</span>'+
    '<a href="'+url('suivi-conventions',{})+'">Suivi des conventions</a><span>›</span>'+
    '<a href="'+url('suivi-conventions-famille',{famille:fam})+'">'+EUC_DEV186_escape_(fl)+'</a><span>›</span>'+
    '<strong>'+EUC_DEV186_escape_(classe)+'</strong><span>›</span>'+
    '<strong>'+EUC_DEV186_escape_(periode)+'</strong>'+
    '</nav>';
}

function EUC_DEV186_afficherAdminClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classe=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periode=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_DEV186_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(!classe||!periode)throw new Error('Classe ou période manquante.');

  var d=EUC_DEV185_detail_(annee,classe,periode);
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  t.anneeContextJson=JSON.stringify(ctx);
  t.detailJson=JSON.stringify(d);
  t.dev186BreadcrumbHtml=EUC_DEV186_breadcrumbHtml_(d,annee);

  return t.evaluate()
    .setTitle('Suivi PFMP — '+(d.classe&&d.classe.nom||'Classe'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV186_auditClasse(payload){
  payload=payload||{};
  var annee=EUC_DEV186_txt_(payload.annee);
  var classe=Number(payload.classe)||0;
  var periode=Number(payload.periode)||0;
  if(!annee||!classe||!periode)throw new Error('Année, classe et période obligatoires.');

  var perf={},t,d;
  CacheService.getScriptCache().remove('DEV185_DETAIL_'+annee+'_'+classe+'_'+periode);

  t=Date.now();
  d=EUC_SUIVI_CLASSE_detailF18_(annee,classe,periode);
  perf.detailF18Ms=Date.now()-t;

  if(typeof EUC_V50_enrichirDetail_==='function'){
    t=Date.now(); d=EUC_V50_enrichirDetail_(d,annee,classe,periode);
    perf.enrichConventionMs=Date.now()-t;
  }
  if(typeof EUC_V51_numeroPeriodes_==='function'){
    t=Date.now(); d=EUC_V51_numeroPeriodes_(d);
    perf.numeroPeriodesMs=Date.now()-t;
  }
  if(typeof EUC_APP172_enrichirDetail==='function'){
    t=Date.now(); d=EUC_APP172_enrichirDetail(d);
    perf.apprentissageMs=Date.now()-t;
  }
  if(typeof EUC_DEV174_enrichirDetail_==='function'){
    t=Date.now(); d=EUC_DEV174_enrichirDetail_(d,annee);
    perf.pdifMs=Date.now()-t;
  }

  var froid=Object.keys(perf).reduce(function(a,k){return a+Number(perf[k]||0);},0);
  EUC_DEV185_cachePut_('DEV185_DETAIL_'+annee+'_'+classe+'_'+periode,d);

  t=Date.now();
  EUC_DEV185_detail_(annee,classe,periode);
  var chaud=Date.now()-t;

  return {ok:true,phases:perf,pipelineFroidMs:froid,pipelineCacheMs:chaud};
}

function EUC_DEV186_auditOptions(payload){
  var annee=EUC_DEV186_txt_(payload&&payload.annee);
  if(!annee)annee=EUC_PFMP_contexteAnneeLectureV155_().active;
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  return {
    annee:annee,
    classes:(meta.classes||[]).map(function(c){return{id:Number(c.id)||0,label:c.nom||c.libelle||('Classe '+c.id)};}),
    periodes:(meta.periodes||[]).map(function(p){return{id:Number(p.id)||0,label:p.libelle||p.nom||('Période '+p.id)};})
  };
}

function EUC_DEV186_afficherAudit(){
  return HtmlService.createTemplateFromFile('Audit_Classe_PFMP_V186')
    .evaluate()
    .setTitle('Audit classe PFMP — DEV.186')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
