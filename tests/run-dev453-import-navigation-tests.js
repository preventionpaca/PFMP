const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV453_ImportNavigation.js'),'utf8');
const edt=fs.readFileSync(path.join(root,'apps-script','EDT.js'),'utf8');
const detail=fs.readFileSync(path.join(root,'apps-script','Suivi_PFMP_Classe_Detail_V156.html'),'utf8');
const sync=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV311_SnapshotAutoSync.js'),'utf8');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}

test('purge les deux caches de détail pour les trois familles sans appel Grist',()=>{
  const removed=[],dropped=[];
  const ctx={
    CacheService:{getScriptCache:()=>({remove:k=>removed.push(k)})},
    EUC_DEV416_key_:(a,f,c,p)=>[a,f,c,p].join('|'),
    EUC_DEV416_cacheDrop_:k=>dropped.push(k)
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  assert.equal(ctx.EUC_DEV453_dropTargetCaches_('2026-2027',30,63),true);
  assert.equal(removed.length,3);assert.equal(dropped.length,3);
  assert.ok(removed.every(k=>k.startsWith('DEV423_DETAIL_2026-2027_')));
  assert.doesNotMatch(code,/EUC_(?:ENT_grist|DEV190_api_)\s*\(/);
});

test('déduit la seule famille à resynchroniser depuis la classe',()=>{
  const ctx={CacheService:{getScriptCache:()=>({remove:()=>{}})}};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  assert.equal(ctx.EUC_DEV453_familyForClass_({Libelle:'1BTS CIEL'}),'BTS');
  assert.equal(ctx.EUC_DEV453_familyForClass_({Code:'1CAPP'}),'CAP');
  assert.equal(ctx.EUC_DEV453_familyForClass_({Libelle:'TMVA1'}),'BACPRO');
});

test('la synchronisation ciblée purge le cache seulement après reconstruction',()=>{
  assert.match(sync,/var r=EUC_DEV190J_syncOne\(payload\)[\s\S]*EUC_DEV453_dropTargetCaches_\(annee,classe,periode\)/);
});

test('la synchronisation de synthèse se limite aux familles réellement touchées',()=>{
  assert.match(sync,/families\[y\+'\|'\+f\]/);
  assert.doesNotMatch(sync,/\['BACPRO','BTS','CAP'\]\.forEach/);
});

test('les deux routes publiques prioritaires passent par DEV453',()=>{
  const marker=edt.indexOf('EUC_DEV453_PUBLIC_NAV_BEGIN');
  assert.ok(marker>=0);
  assert.ok(edt.indexOf("return EUC_DEV453_publicFamily(e)",marker)>marker);
  assert.ok(edt.indexOf("return EUC_DEV453_publicDetail(e)",marker)>marker);
  assert.ok(marker<edt.indexOf("e.parameter.page === 'suivi-pfmp-classe-public'"));
});

test('le rendu public remplace tout identifiant de déploiement administrateur',()=>{
  assert.match(code,/split\(EUC_DEV453_ADMIN_URL_\)\.join\(EUC_DEV453_PUBLIC_URL_\)/);
  assert.match(code,/"'suivi-conventions'"/);
  assert.match(code,/"'suivi-conventions-public'"/);
  assert.match(code,/EUC_DEV353_publicFamily\(e\)/);
  assert.match(code,/EUC_DEV415_publicDetail\(e\)/);
});

test('le fil historique est masqué uniquement en mode administrateur',()=>{
  assert.match(detail,/var isPublic=.*C\.publicMode===true/);
  assert.match(detail,/if\(!isPublic\)[\s\S]*getElementById\('EUC_V51_CRUMB'\)/);
});

test('les URL publique et administrateur restent explicitement distinctes',()=>{
  const ids=[...code.matchAll(/\/s\/(AKfyc[^/']+)\/exec/g)].map(x=>x[1]);
  assert.equal(ids.length,2);assert.notEqual(ids[0],ids[1]);
});

if(!process.exitCode)console.log(`${n} tests DEV453 import/navigation réussis.`);
