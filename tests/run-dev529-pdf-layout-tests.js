const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const layoutSource=read('EUC_PFMP_DEV529_PdfLayout.js');
const pdfServer=read('EUC_CONVENTION_PFMP_PdfV95.gs');
const pdfHtml=read('Convention_PFMP_PdfV95.html');
const paramsHtml=read('Parametres_Convention_PFMP.html');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}
function context(initial){
  let value=initial||'',reads=0,writes=0,admin=0;
  const ctx={console,JSON,String,Number,Object,Array,Math,isFinite,
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>{reads++;return value;},setProperty:(k,v)=>{writes++;value=v;}})},
    EUC_PDF_exigerAdmin_:()=>{admin++;return{autorise:true};},
    EUC_PDF_modeleBase64_:()=> 'UERG'
  };
  vm.createContext(ctx);vm.runInContext(layoutSource,ctx);
  ctx.counts=()=>({reads,writes,admin,value});return ctx;
}
function inlineScripts(html,replacements){
  let scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  scripts=scripts.map(s=>Object.entries(replacements||{}).reduce((out,[a,b])=>out.split(a).join(b),s));
  return scripts;
}

test('les douze zones possèdent des coordonnées A4 explicites et le QR est descendu',()=>{
  const ctx=context(),items=ctx.EUC_DEV529_layoutDefaults_(),qr=items.find(x=>x.cle==='QR');
  assert.equal(items.length,12);assert.equal(qr.page,1);assert.equal(qr.y,704);assert.equal(qr.w,92);assert.equal(qr.h,92);
  assert(items.every(x=>x.x>=0&&x.y>=0&&x.x+x.w<=595&&x.y+x.h<=842));
});
test('les positions sont stockées hors Grist et relues une seule fois par exécution',()=>{
  const ctx=context(),items=ctx.EUC_DEV529_layoutDefaults_();items.find(x=>x.cle==='PROVISEUR_LIGNE').y=674;items.find(x=>x.cle==='QR').y=700;
  const saved=ctx.EUC_CONVENTION_enregistrerMiseEnPageV529(items),payload=ctx.EUC_DEV529_miseEnPagePayload_();
  assert.equal(saved.total,12);assert.equal(payload.PROVISEUR_LIGNE.y,674);assert.equal(payload.QR.y,700);assert.equal(payload.PROF_SIGNATURE_LIGNE.p,1);
  ctx.EUC_DEV529_miseEnPagePayload_();const counts=ctx.counts();assert.equal(counts.writes,1);assert.equal(counts.reads,0);assert(counts.admin>=1);
});
test('une zone qui sort de la page est refusée avant enregistrement',()=>{
  const ctx=context(),items=ctx.EUC_DEV529_layoutDefaults_();items.find(x=>x.cle==='QR').x=550;
  assert.throws(()=>ctx.EUC_CONVENTION_enregistrerMiseEnPageV529(items),/rester dans la page A4/);assert.equal(ctx.counts().writes,0);
});
test('le payload PDF transporte la mise en page sans modifier les lignes métier',()=>{
  assert.match(pdfServer,/data\.miseEnPage=typeof EUC_DEV529_miseEnPagePayload_/);
  assert.match(pdfServer,/data\.lignes=EUC_CONVENTION_rendreLignesV108_/);
  assert.match(pdfHtml,/P=data\.miseEnPage\|\|\{\}/);
  assert.match(pdfHtml,/placement\(Z\[n\],P\[n\]\)/);
  assert.match(pdfHtml,/drawQR\(pages\[qr\.p\],data\.formUrl,qr\)/);
});
test('l’interface explique le repère et expose page X Y largeur hauteur',()=>{
  assert.match(paramsHtml,/L’origine \(0,0\) est le coin inférieur gauche/);
  assert.match(paramsHtml,/Pour descendre un élément, diminuez Y/);
  for(const key of ['page','x','y','w','h'])assert(paramsHtml.includes(`data-k="${key}"`),`champ ${key} absent`);
  assert.match(pdfServer,/type==='LAYOUT_LIST'.*EUC_CONVENTION_listerMiseEnPageV529/);
  assert.match(pdfServer,/type==='LAYOUT_SAVE'.*EUC_CONVENTION_enregistrerMiseEnPageV529/);
  assert.match(pdfServer,/type==='LAYOUT_PREVIEW'.*EUC_CONVENTION_apercuMiseEnPageV529/);
  assert.match(paramsHtml,/EUC_dispatchUploadV95\('LAYOUT_SAVE',items\)/);
});
test('l’aperçu superpose les zones et leur point d’ancrage au PDF maître',()=>{
  assert.match(paramsHtml,/EUC_dispatchUploadV95\('LAYOUT_PREVIEW',null\)/);
  assert.match(paramsHtml,/class="anchor"/);
  assert.match(paramsHtml,/pdfjsLib\.getDocument/);
  assert.match(paramsHtml,/bottom:'\+\(x\.y\/842\*100\)/);
});
test('les deux nouvelles actions ont spinner, anti-double-clic, délai et restauration',()=>{
  assert.match(paramsHtml,/function beginAsyncAction\(/);
  assert.match(paramsHtml,/btn\.disabled=true;btn\.classList\.add\('spin'\)/);
  assert.match(paramsHtml,/btn\.disabled=false;btn\.classList\.remove\('spin'\)/);
  assert.match(paramsHtml,/beginAsyncAction\(saveLayout,'Enregistrement…',20000/);
  assert.match(paramsHtml,/beginAsyncAction\(loadPreview,'Chargement…',30000/);
  assert.match(paramsHtml,/if\(!finish\(\)\)return/g);
  assert.match(paramsHtml,/Le serveur n’a pas répondu sous 20 secondes/);
  assert.match(paramsHtml,/Le serveur n’a pas répondu sous 30 secondes/);
});
test('le chargement initial réutilise le pont serveur éprouvé et ne reste pas bloqué',()=>{
  assert.match(paramsHtml,/EUC_dispatchUploadV95\('LAYOUT_LIST',null\)/);
  assert.match(paramsHtml,/layoutLoadTimer=setTimeout/);
  assert.match(paramsHtml,/Coordonnées non chargées : aucun enregistrement n’est possible/);
});
test('les scripts intégrés des deux pages restent syntaxiquement valides',()=>{
  inlineScripts(paramsHtml,{'const C=<?!= config ?>;':'const C={baseUrl:"https://example.test"};'}).forEach(code=>new vm.Script(code));
  inlineScripts(pdfHtml,{'const PAYLOAD=<?!= payload ?>;':'const PAYLOAD={pdfBase64:"",items:[]};'}).forEach(code=>new vm.Script(code));
});

if(!process.exitCode)console.log(`\n${n} tests DEV529 placement PDF réussis.`);
