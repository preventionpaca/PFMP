const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const atomic=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV425_AtomicFreshness.js'),'utf8');
const family=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV339_FamilleUX.js'),'utf8');
const familyLive=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV340_ConsolidationLive.js'),'utf8');
const firstRouter=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV455_FastVerifiedViews.js'),'utf8');
const familyHtml=fs.readFileSync(path.join(root,'apps-script','Suivi_Conventions_Admin_FamilleV190L.html'),'utf8');
const canonicalFamilyHtml=fs.readFileSync(path.join(root,'apps-script','Suivi_Conventions_Famille_DEV459.html'),'utf8');
const publicSummaryHtml=fs.readFileSync(path.join(root,'apps-script','Suivi_Conventions_Public_Summary_V348.html'),'utf8');
const migration=fs.readFileSync(path.join(root,'apps-script','Migration_JotForm_PFMP_V160.html'),'utf8');
const pdf=fs.readFileSync(path.join(root,'apps-script','Convention_PFMP_PdfV95.html'),'utf8');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}

function atomicContext(state){
  const c={console,JSON,Date,Math,Array,Object,String,Number,RegExp};
  vm.createContext(c);vm.runInContext(atomic,c,{filename:'EUC_PFMP_DEV425_AtomicFreshness.js'});
  c.EUC_DEV425_readState_=()=>state;
  return c;
}

test('un détail non ciblé reste frais après une mutation ciblée',()=>{
  const c=atomicContext({status:'READY',revision:'r2',targets:[{classe:24,periode:62}]});
  assert.equal(c.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r1',classe:{id:24},periode:{id:63}}),true);
});

test('le détail ciblé exige la nouvelle révision',()=>{
  const c=atomicContext({status:'READY',revision:'r2',targets:[{classe:24,periode:62}]});
  assert.equal(c.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r1',classe:{id:24},periode:{id:62}}),false);
  assert.equal(c.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r2',classe:{id:24},periode:{id:62}}),true);
});

test('le snapshot familial conserve une révision atomique',()=>{
  const c=atomicContext({status:'READY',revision:'r2',targets:[{classe:24,periode:62}]});
  assert.equal(c.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r1',classes:[]}),false);
});

test('la reconstruction ne réécrit plus les détails inchangés',()=>{
  const build=atomic.slice(atomic.indexOf('function EUC_DEV425_buildFamily_'),atomic.indexOf('function EUC_DEV425_finishMutation_'));
  assert.doesNotMatch(build,/copy\.__dev425Revision[\s\S]*details\.push\(\{classe:cid,periode:pid,detail:copy\}\)/);
  assert.doesNotMatch(build,/EUC_DEV427_rawDetailMap_/);
  assert.match(build,/usablePrevious\?previous:\(EUC_DEV190E_heavyFamily_/);
  assert.match(build,/details\.push\(\{classe:t\.classe,periode:t\.periode,detail:detail\}\)/);
  assert.match(atomic,/status:'READY'[\s\S]*targets:\(token\.targets\|\|\[\]\)/);
});

test('le suivi de famille sert d’abord le snapshot persistant local',()=>{
  const base=family.slice(family.indexOf('function EUC_DEV394_BASE_EUC_DEV339_familyData_'),family.indexOf('function EUC_DEV339_afficherFamille'));
  assert.ok(base.indexOf('EUC_DEV456_familyPersistentGet_')<base.indexOf('EUC_DEV421_fastFamilySnapshot_'));
  assert.match(base,/PERSISTENT_IMMEDIAT/);
  assert.match(base,/PERSISTENT_RECALCUL/);
  assert.match(family,/Classe_convention:selectedClassIds/);
  assert.match(family,/Classe:selectedClassIds/);
});

test('la route famille rend une coque avant le chargement métier',()=>{
  const route=family.slice(family.indexOf('function EUC_DEV339_afficherFamille'),family.indexOf('function EUC_DEV504_chargerFamille'));
  assert.doesNotMatch(route,/EUC_DEV339_familyData_\(/);
  assert.match(familyHtml,/Chargement de la synthèse métier/);
  assert.match(familyHtml,/\.EUC_DEV504_chargerFamille\(P\)/);
  assert.match(familyHtml,/Le serveur travaille encore/);
  assert.match(familyHtml,/Aucune synthèse n’est disponible pour cette famille/);
});

test('le routeur famille prioritaire délègue lui aussi à la coque asynchrone',()=>{
  const route=familyLive.slice(
    familyLive.indexOf('function EUC_DEV394_BASE_EUC_DEV340_afficherFamille'),
    familyLive.indexOf('function EUC_DEV340_afficherAdminClasse')
  );
  assert.match(route,/EUC_DEV339_afficherFamille\(e\)/);
  assert.ok(route.indexOf('EUC_DEV339_afficherFamille(e)')<route.indexOf('EUC_DEV340_familyData_(annee,famille)'));
});

test('le tout premier routeur doGet ne court-circuite plus la coque asynchrone',()=>{
  const route=firstRouter.slice(
    firstRouter.indexOf('function EUC_DEV455_routeDetail_'),
    firstRouter.indexOf('return null;',firstRouter.indexOf('function EUC_DEV455_routeDetail_'))
  );
  assert.match(route,/suivi-conventions-famille'[\s\S]*EUC_DEV339_afficherFamille\(e\)/);
  assert.ok(route.indexOf('EUC_DEV339_afficherFamille(e)')<route.indexOf('EUC_DEV459_family_(e,false)'));
  assert.match(route,/suivi-conventions-public-famille'[\s\S]*EUC_DEV508_afficherFamillePublique_\(e\)/);
  assert.ok(route.indexOf('EUC_DEV508_afficherFamillePublique_(e)')<route.indexOf('EUC_DEV459_family_(e,true)'));
});

test('la coque publique reste entièrement sur les routes publiques',()=>{
  assert.match(family,/function EUC_DEV508_afficherFamillePublique_/);
  assert.match(familyHtml,/P\.publicMode\?'suivi-conventions-public':'suivi-conventions'/);
  assert.match(familyHtml,/P\.publicMode\?'suivi-pfmp-classe-public':'suivi-pfmp-classe'/);
  assert.match(familyHtml,/if\(P\.publicMode\)\{a\.remove\(\)/);
});

test('le bouton public Voir les classes sort du cadre Apps Script',()=>{
  assert.match(publicSummaryHtml,/window\.top\.location\.href=url\(b\.dataset\.f\)/);
  assert.doesNotMatch(publicSummaryHtml,/(?<!top\.)location\.href=url\(b\.dataset\.f\)/);
});

test('la famille canonique affiche un état vide explicite',()=>{
  assert.match(canonicalFamilyHtml,/Aucune synthèse n’est disponible pour cette famille dans cet environnement/);
  assert.match(canonicalFamilyHtml,/role="status"/);
});

test('le rattachement JotForm possède une confirmation locale explicite',()=>{
  assert.match(migration,/id="euc503save"/);
  assert.match(migration,/Enregistrer le rattachement pour cet import/);
  assert.match(migration,/sessionStorage\.setItem\(overrideStorageKey/);
  assert.match(migration,/modifié mais pas enregistré/);
  assert.match(migration,/Étape 1\/3/);
  assert.match(migration,/mise à jour ciblée du suivi/);
});

test('la fusion de lot ne sérialise et ne recharge plus chaque convention',()=>{
  const build=pdf.slice(pdf.indexOf('async function buildOne'),pdf.indexOf('const started='));
  assert.match(build,/return pdf\}/);
  assert.doesNotMatch(build,/pdf\.save/);
  assert.doesNotMatch(pdf,/PDFDocument\.load\(oneBytes\)/);
  assert.match(pdf,/setTimeout\(resolve,0\)/);
  assert.match(pdf,/Finalisation du PDF/);
});

if(!process.exitCode)console.log(`${n} tests DEV504 parcours métier et performance réussis.`);
