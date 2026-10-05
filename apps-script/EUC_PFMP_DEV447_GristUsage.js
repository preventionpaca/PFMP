/** DEV447 — compteur local des appels Grist émis par Eucalyptus PFMP.
 * Stockage : Script Properties uniquement. Aucune donnée métier, URL, requête
 * SQL ou valeur de réponse n'est conservée. Historique glissant : 31 jours.
 */
var EUC_DEV447_USAGE_PREFIX_='EUC_DEV447_GRIST_USAGE_V1_';
var EUC_DEV447_USAGE_INDEX_='EUC_DEV447_GRIST_USAGE_INDEX_V1';
var EUC_DEV447_USAGE_QUOTA_=40000;
var EUC_DEV447_USAGE_RETENTION_=31;
var EUC_DEV447_BREAKER_PROP_='EUC_DEV447_GRIST_BREAKER_V1';
var EUC_DEV447_INSTALLED_=false;
var EUC_DEV447_BASE_DOGET_=null;

function EUC_DEV447_day_(date){
  var tz='Europe/Paris';
  try{tz=Session.getScriptTimeZone()||tz;}catch(e){}
  return Utilities.formatDate(date||new Date(),tz,'yyyy-MM-dd');
}

function EUC_DEV447_status_(err){
  var s=String(err&&err.message||err||''),m=s.match(/(?:Grist API\s+|\()(\d{3})\b/i);
  if(m)return Number(m[1])||0;
  return /Exceeded daily limit/i.test(s)?429:0;
}
function EUC_DEV447_hour_(date){
  var tz='Europe/Paris';try{tz=Session.getScriptTimeZone()||tz;}catch(e){}
  return Utilities.formatDate(date||new Date(),tz,'HH')+':00';
}
function EUC_DEV447_origin_(){
  var stack='';try{stack=String((new Error()).stack||'');}catch(e){}
  var names=[],re=/\bat\s+([A-Za-z0-9_$]+)\b/g,m;
  while((m=re.exec(stack))){
    var n=m[1];if(/^EUC_DEV447_|^(?:EUC_ENT_grist|EUC_DEV190_api_)$/.test(n))continue;
    if(names.indexOf(n)<0)names.push(n);if(names.length>=2)break;
  }
  return names.join(' ← ')||'Origine non identifiée';
}

function EUC_DEV447_category_(path,body){
  var s=String(path||'').toUpperCase();
  if(String(path||'').toLowerCase()==='/sql'&&body&&body.sql)s+=' '+String(body.sql).toUpperCase();
  if(/GEO_ENTREPRISE|GEOLOCATION|GEOCOD/.test(s))return'Géocodage';
  if(/APPRENT|ALTERNANCE|CONTRAT_APPRENT/.test(s))return'Apprentis';
  if(/SNAPSHOT/.test(s))return'Snapshots';
  if(/CONVENTION|SOUMISSION|ACCES_FORMULAIRES|PARAM_CONVENTION/.test(s))return'Conventions';
  if(/SIRET|ENTREPRISE|CONTACTS_ENTREPRISE/.test(s))return'Entreprises / SIRET';
  if(/AFFECTATION|ACCES_PP|MISSION|PROFESSEUR|PERSONNEL/.test(s))return'Pilotage / affectations';
  if(/IMPORT|PRONOTE|ELEVES_PFMP/.test(s))return'Imports / élèves';
  return'Autres PFMP';
}

function EUC_DEV447_emptyDay_(day){
  return{version:2,date:day,total:0,success:0,errors:0,error429:0,blockedLocally:0,firstCall:'',last429:'',lastCall:'',durationMs:0,categories:{},hours:{},origins:{}};
}

function EUC_DEV447_updateIndex_(props,day){
  var index=[];
  try{index=JSON.parse(props.getProperty(EUC_DEV447_USAGE_INDEX_)||'[]')||[];}catch(e){index=[];}
  if(!Array.isArray(index))index=[];
  if(index.indexOf(day)<0)index.push(day);
  index=index.sort().slice(-EUC_DEV447_USAGE_RETENTION_);
  props.setProperty(EUC_DEV447_USAGE_INDEX_,JSON.stringify(index));
  return index;
}

function EUC_DEV447_record_(method,path,body,status,durationMs,origin){
  var lock=null,acquired=false;
  try{
    lock=LockService.getScriptLock();
    acquired=lock.tryLock(100);
    if(!acquired)return false;
    var props=PropertiesService.getScriptProperties(),day=EUC_DEV447_day_(new Date()),key=EUC_DEV447_USAGE_PREFIX_+day;
    var raw=props.getProperty(key),data=EUC_DEV447_emptyDay_(day);
    if(raw){try{data=JSON.parse(raw)||data;}catch(e){data=EUC_DEV447_emptyDay_(day);}}
    var category=EUC_DEV447_category_(path,body),ok=Number(status)>=200&&Number(status)<400,now=new Date().toISOString(),hour=EUC_DEV447_hour_(new Date());
    origin=String(origin||'Origine non identifiée').replace(/[^A-Za-z0-9_$ àâäéèêëîïôöùûüç←.-]/g,'').slice(0,120)||'Origine non identifiée';
    var item=data.categories[category]||{total:0,success:0,errors:0,error429:0,durationMs:0};
    data.total=(Number(data.total)||0)+1;
    data.success=(Number(data.success)||0)+(ok?1:0);
    data.errors=(Number(data.errors)||0)+(ok?0:1);
    data.error429=(Number(data.error429)||0)+(Number(status)===429?1:0);
    data.durationMs=(Number(data.durationMs)||0)+(Number(durationMs)||0);
    if(!data.firstCall)data.firstCall=now;
    data.lastCall=now;
    if(Number(status)===429)data.last429=now;
    item.total=(Number(item.total)||0)+1;
    item.success=(Number(item.success)||0)+(ok?1:0);
    item.errors=(Number(item.errors)||0)+(ok?0:1);
    item.error429=(Number(item.error429)||0)+(Number(status)===429?1:0);
    item.durationMs=(Number(item.durationMs)||0)+(Number(durationMs)||0);
    data.categories[category]=item;
    data.hours=data.hours||{};data.hours[hour]=(Number(data.hours[hour])||0)+1;
    data.origins=data.origins||{};data.origins[origin]=(Number(data.origins[origin])||0)+1;
    props.setProperty(key,JSON.stringify(data));
    if(!raw)EUC_DEV447_updateIndex_(props,day);
    return true;
  }catch(e){return false;}
  finally{if(acquired&&lock)try{lock.releaseLock();}catch(e2){}}
}

function EUC_DEV447_breaker_(){
  var state={};try{state=JSON.parse(PropertiesService.getScriptProperties().getProperty(EUC_DEV447_BREAKER_PROP_)||'{}')||{};}catch(e){state={};}
  return state&&Number(state.until)>Date.now()?state:null;
}
function EUC_DEV447_openBreaker_(err){
  var message=String(err&&err.message||err||'');if(EUC_DEV447_status_(err)!==429)return null;
  var delay=/Exceeded daily limit/i.test(message)?900000:120000;
  var state={openedAt:new Date().toISOString(),until:Date.now()+delay,reason:/backlogged/i.test(message)?'BACKLOG':'QUOTA_429'};
  try{PropertiesService.getScriptProperties().setProperty(EUC_DEV447_BREAKER_PROP_,JSON.stringify(state));}catch(e){}
  try{if(typeof EUC_DEV448_autoPauseOnGristError_==='function')EUC_DEV448_autoPauseOnGristError_(err);}catch(e2){}
  return state;
}
function EUC_DEV447_recordBlocked_(origin){
  var lock=null,acquired=false;try{lock=LockService.getScriptLock();acquired=lock.tryLock(100);if(!acquired)return false;var props=PropertiesService.getScriptProperties(),day=EUC_DEV447_day_(new Date()),key=EUC_DEV447_USAGE_PREFIX_+day,data=EUC_DEV447_readDay_(props,day);data.blockedLocally=(Number(data.blockedLocally)||0)+1;data.origins=data.origins||{};var name='BLOQUÉ · '+String(origin||'Origine non identifiée').slice(0,100);data.origins[name]=(Number(data.origins[name])||0)+1;props.setProperty(key,JSON.stringify(data));EUC_DEV447_updateIndex_(props,day);return true;}catch(e){return false;}finally{if(acquired&&lock)try{lock.releaseLock();}catch(e2){}};
}

function EUC_DEV447_call_(fn,context,args){
  var started=Date.now(),status=200,err=null,origin=EUC_DEV447_origin_(),breaker=EUC_DEV447_breaker_();
  if(breaker){EUC_DEV447_recordBlocked_(origin);throw new Error('Accès Grist temporairement suspendu par PFMP après une saturation. Réessayez dans quelques minutes.');}
  try{return fn.apply(context,args);}
  catch(e){err=e;status=EUC_DEV447_status_(e);if(status===429)EUC_DEV447_openBreaker_(e);throw e;}
  finally{
    try{EUC_DEV447_record_(args[0],args[1],args[2],err?status:200,Date.now()-started,origin);}catch(ignore){}
  }
}

function EUC_DEV447_readDay_(props,day){
  var raw=props.getProperty(EUC_DEV447_USAGE_PREFIX_+day);
  if(!raw)return EUC_DEV447_emptyDay_(day);
  try{return JSON.parse(raw)||EUC_DEV447_emptyDay_(day);}catch(e){return EUC_DEV447_emptyDay_(day);}
}

function EUC_DEV447_dashboardData_(){
  var props=PropertiesService.getScriptProperties(),index=[];
  try{index=JSON.parse(props.getProperty(EUC_DEV447_USAGE_INDEX_)||'[]')||[];}catch(e){index=[];}
  if(!Array.isArray(index))index=[];
  var todayKey=EUC_DEV447_day_(new Date());
  if(index.indexOf(todayKey)<0)index.push(todayKey);
  index=index.sort().slice(-EUC_DEV447_USAGE_RETENTION_);
  var days=index.map(function(day){return EUC_DEV447_readDay_(props,day);}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
  var today=days.filter(function(x){return x.date===todayKey;})[0]||EUC_DEV447_emptyDay_(todayKey);
  var categories=Object.keys(today.categories||{}).map(function(name){
    var x=today.categories[name]||{},total=Number(x.total)||0;
    return{name:name,total:total,success:Number(x.success)||0,errors:Number(x.errors)||0,error429:Number(x.error429)||0,averageMs:total?Math.round((Number(x.durationMs)||0)/total):0};
  }).sort(function(a,b){return b.total-a.total||a.name.localeCompare(b.name,'fr');});
  var hours=Object.keys(today.hours||{}).sort().map(function(hour){return{hour:hour,total:Number(today.hours[hour])||0};});
  var origins=Object.keys(today.origins||{}).map(function(name){return{name:name,total:Number(today.origins[name])||0};}).sort(function(a,b){return b.total-a.total||a.name.localeCompare(b.name,'fr');}).slice(0,30);
  return{ok:true,installedFrom:'DEV447',today:today,categories:categories,hours:hours,origins:origins,breaker:EUC_DEV447_breaker_(),history:days,quota:EUC_DEV447_USAGE_QUOTA_,remaining:Math.max(0,EUC_DEV447_USAGE_QUOTA_-(Number(today.total)||0)),percentage:Math.min(100,Math.round(((Number(today.total)||0)/EUC_DEV447_USAGE_QUOTA_)*1000)/10),resetTimeVerified:false,scope:'Appels Grist observés par les deux passerelles PFMP depuis l’installation de DEV447.'};
}

function EUC_DEV447_getUsageDashboard(){
  EUC_DEV368_admin();
  return EUC_DEV447_dashboardData_();
}

function EUC_DEV447_afficherUsage(e){
  EUC_DEV368_admin();
  var tpl=HtmlService.createTemplateFromFile('Consommation_API_Grist_DEV447');
  tpl.bootJson=JSON.stringify(EUC_DEV447_dashboardData_());
  tpl.adminUrl=ScriptApp.getService().getUrl()+'?page=admin-pfmp';
  return tpl.evaluate().setTitle('Consommation API Grist — PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV447_injectAdminLink_(output){
  try{
    var html=output.getContent();
    if(html.indexOf('page=consommation-api-grist')>=0||html.indexOf('id="euc-snapshot-setting"')<0)return output;
    var base=ScriptApp.getService().getUrl();
    var link='<a class="link" href="'+base+'?page=consommation-api-grist">Consommation API Grist<small>Appels PFMP observés, erreurs 429 et historique quotidien</small></a>';
    html=html.replace('<a class="link" id="euc-snapshot-setting"',link+'<a class="link" id="euc-snapshot-setting"');
    return HtmlService.createHtmlOutput(html).setTitle('Administration PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
  }catch(e){return output;}
}

function EUC_DEV447_install_(){
  if(EUC_DEV447_INSTALLED_)return true;
  if(typeof doGet==='function'){
    EUC_DEV447_BASE_DOGET_=doGet;
    doGet=function(e){
      var page=String(e&&e.parameter&&e.parameter.page||'');
      if(page==='consommation-api-grist')return EUC_DEV447_afficherUsage(e);
      var output=EUC_DEV447_BASE_DOGET_.apply(this,arguments);
      return page==='admin-pfmp'?EUC_DEV447_injectAdminLink_(output):output;
    };
  }
  EUC_DEV447_INSTALLED_=true;
  return true;
}

var EUC_DEV447_AUTO_INSTALL_=EUC_DEV447_install_();
