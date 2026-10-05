const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'..','apps-script','EUC_PFMP_DEV447_GristUsage.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','apps-script','Consommation_API_Grist_DEV447.html'),'utf8');
const enterpriseBridge=fs.readFileSync(path.join(__dirname,'..','apps-script','EUC_ENT_Grist.gs'),'utf8');
const values={};
const props={
  getProperty(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},
  setProperty(key,value){values[key]=String(value);return this;},
  deleteProperty(key){delete values[key];return this;}
};
function output(content){return{content,title:'',meta:[],getContent(){return this.content;},setTitle(v){this.title=v;return this;},setXFrameOptionsMode(){return this;},addMetaTag(k,v){this.meta.push([k,v]);return this;}};}
const ctx={
  console,JSON,String,Number,Math,Array,Object,Date,
  Session:{getScriptTimeZone(){return'Europe/Paris';}},
  Utilities:{formatDate(){return'2026-10-05';}},
  LockService:{getScriptLock(){return{tryLock(){return true;},releaseLock(){}};}},
  PropertiesService:{getScriptProperties(){return props;}},
  ScriptApp:{getService(){return{getUrl(){return'https://example.test/exec';}};}},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput:output,createTemplateFromFile(name){return{bootJson:'',adminUrl:'',evaluate(){return output(name+'|'+this.bootJson+'|'+this.adminUrl);}};}},
  EUC_DEV368_admin(){return{role:'ADMIN_PFMP'};},
  EUC_ENT_grist(method,path,body){return{method,path,body};},
  EUC_DEV190_api_(){throw new Error('DEV190 Grist API 429 : Exceeded daily limit');},
  doGet(){return output('<a class="link" id="euc-snapshot-setting" href="x">Snapshot</a>');}
};
vm.createContext(ctx);
vm.runInContext(source,ctx);

assert.strictEqual(ctx.EUC_DEV447_AUTO_INSTALL_,true);
assert.strictEqual(ctx.EUC_DEV447_category_('/tables/EUC_GEO_ENTREPRISES_PFMP/records'),'Géocodage');
assert.strictEqual(ctx.EUC_DEV447_category_('/tables/EUC_ENTREPRISES/records'),'Entreprises / SIRET');
assert.strictEqual(ctx.EUC_DEV447_category_('/tables/EUC_PFMP_SNAPSHOT/records'),'Snapshots');
assert.strictEqual(ctx.EUC_DEV447_category_('/sql',{sql:'select * from EUC_SOUMISSIONS_PFMP'}),'Conventions');
assert.strictEqual(ctx.EUC_DEV447_category_('/tables/EUC_APPRENTIS/records'),'Apprentis');

const success=ctx.EUC_DEV447_call_(ctx.EUC_ENT_grist,ctx,['get','/tables/EUC_ENTREPRISES/records?filter=NOM_SECRET',null]);
assert.strictEqual(success.path.indexOf('EUC_ENTREPRISES')>0,true);
assert.throws(()=>ctx.EUC_DEV447_call_(ctx.EUC_DEV190_api_,ctx,['get','/tables/EUC_PFMP_SNAPSHOT/records',null]),/429/);
const dashboard=ctx.EUC_DEV447_dashboardData_();
assert.strictEqual(dashboard.today.total,2);
assert.strictEqual(dashboard.today.success,1);
assert.strictEqual(dashboard.today.errors,1);
assert.strictEqual(dashboard.today.error429,1);
assert.strictEqual(dashboard.remaining,39998);
assert.strictEqual(dashboard.resetTimeVerified,false);
assert.deepStrictEqual(Array.from(dashboard.categories,x=>x.name),['Entreprises / SIRET','Snapshots']);
assert.strictEqual(JSON.stringify(values).includes('NOM_SECRET'),false,'aucune URL ou donnée métier ne doit être stockée');

const admin=ctx.doGet({parameter:{page:'admin-pfmp'}});
assert.match(admin.getContent(),/Consommation API Grist/);
assert.match(admin.getContent(),/page=consommation-api-grist/);
const page=ctx.doGet({parameter:{page:'consommation-api-grist'}});
assert.match(page.getContent(),/Consommation_API_Grist_DEV447/);

assert.match(html,/Historique quotidien — 31 jours/);
assert.match(html,/uniquement les appels Grist observés par PFMP/);
assert.match(html,/horaire non vérifié/);
assert.doesNotMatch(html,/api\/docs\/[A-Za-z0-9_-]+/,'le tableau ne doit exposer aucun identifiant de document Grist');
assert.match(enterpriseBridge,/EUC_DEV447_call_\(appel/,'la passerelle Entreprises doit instrumenter chaque appel réel');

console.log('23 tests DEV447 consommation API Grist réussis.');
