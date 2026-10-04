const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(
  path.join(__dirname,'..','apps-script','EUC_PFMP_DEV190X_CleanModules.js'),
  'utf8'
);

function output(html){
  return {
    html,
    title:'',
    frameMode:'',
    setTitle(value){this.title=value;return this;},
    setXFrameOptionsMode(value){this.frameMode=value;return this;}
  };
}

function contextFor(classesImpl){
  const ctx={
    Date,
    JSON,
    String,
    ScriptApp:{getService(){return {getUrl(){return 'https://example.test/exec';}};}},
    HtmlService:{
      XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},
      createHtmlOutput:output,
      createTemplateFromFile(){
        return {
          bootJson:'',
          evaluate(){return output(this.bootJson);}
        };
      }
    },
    EUC_DEV190R_getYears(){return {annees:['2026-2027']};},
    EUC_DEV190R_getPageStructure:classesImpl
  };
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return ctx;
}

let calls=0;
let ctx=contextFor(function(){
  calls+=1;
  throw new Error('DEV190 Grist API 429 : {"error":"Exceeded daily limit"}');
});
let result=ctx.EUC_DEV190X_afficherApprentis({});
assert.strictEqual(calls,1,'le rendu ne doit pas relancer Grist après le 429');
assert.match(result.html,/quota quotidien Grist est atteint/);
assert.match(result.html,/aucun nouvel appel automatique/i);
assert.doesNotMatch(result.html,/DEV190 Grist API 429/,'le détail technique ne doit pas être exposé');
assert.strictEqual(result.frameMode,'ALLOWALL');

ctx=contextFor(function(){throw new Error('service indisponible');});
result=ctx.EUC_DEV190X_afficherApprentis({});
assert.match(result.html,/momentanément indisponibles/);
assert.doesNotMatch(result.html,/service indisponible/,'le détail serveur ne doit pas être exposé');

ctx=contextFor(function(){return {classes:[{id:28,nom:'TMP3D'}]};});
result=ctx.EUC_DEV190X_afficherApprentis({});
const boot=JSON.parse(result.html);
assert.deepStrictEqual(boot.classes,[{id:28,nom:'TMP3D'}]);
assert.strictEqual(result.title,'Gestion des apprentis');

assert.strictEqual(ctx.EUC_DEV446_isGristQuotaError_(new Error('Exceeded daily limit')),true);
assert.strictEqual(ctx.EUC_DEV446_isGristQuotaError_(new Error('timeout')),false);

console.log('10 tests DEV446 résilience Apprentis réussis.');
