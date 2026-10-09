const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const family=read('Suivi_Conventions_Admin_FamilleV190L.html');
const adminHtml=read('Admin_Conventions_PFMP.html');
const workflow=read('EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
const consolidation=read('EUC_PFMP_DEV340_ConsolidationLive.js');

let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}

test('le voile de navigation ne se déclenche que sur un vrai lien de classe',()=>{
  const script=(family.match(/<script id='EUC_DEV339_LOADING_JS'>([\s\S]*?)<\/script>/)||[])[1]||'';
  assert.ok(script,'script du voile de navigation introuvable');
  assert.match(script,/closest\('a\[href\]'\)/);
  assert.match(script,/page==='suivi-pfmp-classe'/);
  assert.match(script,/page==='suivi-pfmp-classe-public'/);
  assert.doesNotMatch(script,/article\.card\[data-class\]/);
  assert.doesNotMatch(script,/closest\('\[data-fam\],\.period/);
});

test('le voile de navigation est toujours libéré après un délai borné',()=>{
  const script=(family.match(/<script id='EUC_DEV339_LOADING_JS'>([\s\S]*?)<\/script>/)||[])[1]||'';
  assert.match(script,/timer=setTimeout\(clear,12000\)/);
  assert.match(script,/addEventListener\('pageshow',clear\)/);
  assert.match(script,/addEventListener\('pagehide',clear\)/);
  assert.match(script,/remove\('show'\)/);
});

test('la correction administrative expose et enregistre le nom commercial',()=>{
  assert.match(adminHtml,/data-corr="Entreprise_enseigne"/);
  assert.match(adminHtml,/>Nom commercial \/ enseigne</);
  assert.match(workflow,/Entreprise_enseigne:String\(a\.Entreprise_enseigne\|\|''\)/);
  assert.match(workflow,/Entreprise_enseigne:'Nom commercial \/ enseigne'/);
});

test('la consolidation normalise les formats QR, snapshot et JotForm',()=>{
  assert.match(consolidation,/function EUC_DEV523_normalizeAccessCompany_/);
  assert.match(consolidation,/row\.Telephone_entreprise/);
  assert.match(consolidation,/row\.Email_entreprise/);
  assert.match(consolidation,/row\.Nom_representant/);
  assert.match(consolidation,/a=EUC_DEV520_normalizeResponsible_\(a\|\|\{\}\)/);
});

if(!process.exitCode)console.log(`\n${n} tests DEV523 régressions opérationnelles réussis.`);
