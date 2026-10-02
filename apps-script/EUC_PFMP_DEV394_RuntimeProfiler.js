
/**
 * PFMP — DEV394 — Runtime profiler
 * Instrumentation temporaire, sans écriture Grist.
 */
var EUC_DEV394_TRACE_CTX_ = null;
var EUC_DEV394_TRACE_PROP_ = 'EUC_DEV394_RUNTIME_TRACES_V1';

function EUC_DEV394_now_(){
  return Date.now();
}

function EUC_DEV394_begin_(route){
  EUC_DEV394_TRACE_CTX_ = {
    id: Utilities.getUuid(),
    route: String(route||''),
    startedAt: new Date().toISOString(),
    startedMs: Date.now(),
    marks: []
  };
}

function EUC_DEV394_mark_(name, ms){
  if(!EUC_DEV394_TRACE_CTX_) return;
  EUC_DEV394_TRACE_CTX_.marks.push({
    name: String(name||''),
    ms: Number(ms)||0
  });
}

function EUC_DEV394_store_(trace){
  if(!trace) return;
  try{
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(EUC_DEV394_TRACE_PROP_) || '[]';
    var arr = [];
    try{ arr = JSON.parse(raw)||[]; }catch(e){ arr=[]; }
    arr.unshift(trace);
    if(arr.length>40) arr = arr.slice(0,40);
    props.setProperty(EUC_DEV394_TRACE_PROP_, JSON.stringify(arr));
  }catch(e){}
}

function EUC_DEV394_finish_(topName, topMs){
  var ctx = EUC_DEV394_TRACE_CTX_;
  if(!ctx) return;
  ctx.top = String(topName||'');
  ctx.totalMs = Number(topMs)||0;
  ctx.finishedAt = new Date().toISOString();
  EUC_DEV394_TRACE_CTX_ = null;
  EUC_DEV394_store_(ctx);
}

function EUC_DEV394_lireTraces(){
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(EUC_DEV394_TRACE_PROP_) || '[]';
  var arr = [];
  try{ arr = JSON.parse(raw)||[]; }catch(e){ arr=[]; }
  return {
    ok:true,
    traces:arr,
    count:arr.length
  };
}

function EUC_DEV394_effacerTraces(){
  PropertiesService.getScriptProperties().deleteProperty(EUC_DEV394_TRACE_PROP_);
  return {ok:true};
}

function EUC_DEV394_afficher(e){
  var tpl = HtmlService.createTemplateFromFile('Runtime_Profiler_PFMP_DEV394');
  tpl.baseUrl = ScriptApp.getService().getUrl();
  return tpl.evaluate()
    .setTitle('PFMP — Runtime Profiler DEV394')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
