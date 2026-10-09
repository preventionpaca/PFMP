const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const family=read('EUC_PFMP_DEV339_FamilleUX.js');
const atomic=read('EUC_PFMP_DEV425_AtomicFreshness.js');
const planned=read('EUC_PFMP_DEV424_SnapshotPlanifie.js');
const restore=read('EUC_PFMP_DEV456_RestaurationExacte.js');
const familyHtml=read('Suivi_Conventions_Admin_FamilleV190L.html');
const service=read('EUC_CONVENTION_PFMP_Service.gs');
const groups=read('EUC_CONVENTION_PFMP_GroupesClasses.gs');
const generator=read('Convention_PFMP_Generateur.html');
const pdf=read('Convention_PFMP_PdfV95.html');
const print=read('Convention_PFMP_Print.html');
const batch=read('Convention_PFMP_Batch_Print.html');
const detail=read('Suivi_PFMP_Classe_Detail_V156.html');
const geo=read('EUC_PFMP_DEV441_AccesPpGeocodage.js');
const geoHtml=read('Geocodage_PFMP_DEV441.html');

let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}
function body(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}

test('la page famille ne recalcule jamais les jointures lourdes sur le chemin utilisateur',()=>{
  const fast=body(family,'function EUC_DEV421_fastFamilySnapshot_','function EUC_DEV394_BASE_EUC_DEV339_familyData_');
  const display=body(family,'function EUC_DEV394_BASE_EUC_DEV339_familyData_','function EUC_DEV339_afficherFamille');
  assert.doesNotMatch(fast,/EUC_DEV190E_heavyFamily_|EUC_DEV422_hydrateFamily_/);
  assert.doesNotMatch(display,/EUC_DEV190E_heavyFamily_|EUC_APP172_chargerFamille/);
  assert.match(display,/PERSISTENT_RECALCUL/);
});

test('une mutation garde la publication complète précédente pendant le recalcul',()=>{
  const invalidate=body(atomic,'function EUC_DEV425_invalidateFamily_','function EUC_DEV425_beginMutation_');
  assert.match(restore,/function EUC_DEV456_familyTransientDrop_/);
  assert.match(invalidate,/EUC_DEV456_familyTransientDrop_/);
  assert.doesNotMatch(invalidate,/EUC_DEV456_familyCacheDrop_/);
});

test('la maintenance snapshot reconnaît strictement la recette bleue actuelle',()=>{
  assert.match(planned,/EUC_DEV424_RECIPE_DOC_='kB8bvDag8x7D'/);
  assert.match(planned,/canal==='BLUE'\?EUC_DEV424_RECIPE_DOC_/);
  assert.match(planned,/canal==='GREEN'\?EUC_DEV424_PRODUCTION_DOC_/);
  assert.doesNotMatch(planned,/b2CyeMEdVEMS/);
});

test('le chargement de famille se termine ou échoue explicitement sous quinze secondes',()=>{
  assert.match(familyHtml,/if\(!settled\)fail\('Le chargement a dépassé 15 secondes[\s\S]*\},15000\)/);
  assert.match(familyHtml,/Le chargement a dépassé 15 secondes/);
  assert.match(familyHtml,/load-retry/);
  assert.match(familyHtml,/\.load-status\[hidden\]\{display:none!important\}/);
});

test('cartes et infobulles consomment la même donnée quick déjà embarquée',()=>{
  assert.match(familyHtml,/p\.quick/);
  assert.match(familyHtml,/if\(p\.quick\)\{local=p\.quick;return true;\}/);
  assert.match(familyHtml,/if\(local\)\{cache\[k\]=local;render\(el,local\);return;\}/);
  assert.match(familyHtml,/embedded=!!x\.quick/);
  assert.match(familyHtml,/if\(embedded\)return/);
});

test('un choix futur P.dif ne retire aucun élève des PFMP ordinaires',()=>{
  const enrich=body(family,'function EUC_DEV422_enrichDetailBatch_','function EUC_DEV422_hydrateFamily_');
  assert.doesNotMatch(enrich,/detail\.lignes=\(detail\.lignes\|\|\[\]\)\.filter/);
  assert.match(enrich,/x\.parcoursDifferencie=false/);
  assert.match(familyHtml,/function apply\(r\)\{[\s\S]*?aucune seconde couche ne doit le modifier[\s\S]*?\n  \}/);
});

test('une convention est idempotente et son recalcul est différé',()=>{
  const single=body(service,'function EUC_CONVENTION_preparerAcces(payload)','function EUC_CONVENTION_preparerAccesParEleve');
  assert.match(service,/Request_id/);
  assert.match(single,/LockService\.getScriptLock/);
  assert.match(single,/tryLock\(10000\)/);
  assert.match(single,/EUC_CONVENTION_accesParRequestIdV513_/);
  assert.match(single,/idempotent:!!existing/);
  assert.match(single,/refreshToken:refresh/);
  assert.doesNotMatch(single,/EUC_CONVENTION_finRafraichissementV511_\(refresh\)/);
  assert.match(generator,/requestId:generationRequestId/);
  assert.match(generator,/EUC_CONVENTION_finaliserRafraichissementV513/);
});

test('un lot de conventions n’attend pas non plus la reconstruction des synthèses',()=>{
  const lot=body(groups,'function EUC_CONVENTION_preparerAccesClasseNom','function EUC_CONVENTION_donneesImpressionLot');
  assert.match(lot,/EUC_CONVENTION_debutRafraichissementV511_/);
  assert.match(lot,/refreshToken:refresh/);
  assert.doesNotMatch(lot,/EUC_CONVENTION_finRafraichissementV511_/);
});

test('le QR est agrandi et encodé avec une correction plus robuste',()=>{
  assert.match(pdf,/QR:\{p:0,x:468,y:716,w:92,h:92\}/);
  assert.match(pdf,/qrcode\(0,'Q'\)/);
  [print,batch].forEach(source=>{
    assert.match(source,/\.qr\{width:30mm;height:30mm/);
    assert.match(source,/width:320,height:320,correctLevel:QRCode\.CorrectLevel\.Q/);
  });
});

test('l’historique masque les initiales dupliquées et formate les dates Unix',()=>{
  assert.match(detail,/function fmtPfmpDate\(v\)/);
  assert.match(detail,/Math\.abs\(n\)<1000000000000\?n\*1000:n/);
  assert.match(detail,/Historique rupture \/ remplacement/);
  assert.match(detail,/type!==['"]INITIALE['"]/);
});

test('le géocodage retombe sur les conventions actives si les snapshots sont absents',()=>{
  assert.match(geo,/function EUC_DEV513_geoAccessDetails_/);
  assert.match(geo,/if\(!details\.length\)details=EUC_DEV513_geoAccessDetails_\(q\)/);
  assert.match(geo,/Entreprise_raison_sociale/);
});

test('les actions de géocodage protègent le double clic et bornent l’attente',()=>{
  assert.match(geoHtml,/function busy\(btn,on,label\)/);
  assert.match(geoHtml,/setTimeout\(\(\)=>\{if\(settled\)return;settled=true;busy\(b,false\)/);
  assert.match(geoHtml,/20000/);
  assert.match(geoHtml,/45000/);
  assert.match(geoHtml,/Le géocodage a dépassé 45 secondes/);
  assert.match(geoHtml,/Validation…/);
  assert.match(geoHtml,/Géocodage…/);
});

if(!process.exitCode)console.log(`\n${n} tests DEV513 stabilisation réussis.`);
