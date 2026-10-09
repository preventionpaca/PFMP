const fs=require('fs'),vm=require('vm'),assert=require('assert');
const server=fs.readFileSync('apps-script/EUC_PFMP_DEV370_AdminTools.js','utf8');
const routes=fs.readFileSync('apps-script/EUC_PFMP_DEV481_AdminRoutes.js','utf8');
const apprentices=fs.readFileSync('apps-script/Apprentissage_PFMP_V190X.html','utf8');
const publicSummary=fs.readFileSync('apps-script/Suivi_Conventions_Public_Summary_V348.html','utf8');
const summaryServer=fs.readFileSync('apps-script/EUC_PFMP_DEV348_Finitions.js','utf8');
let n=0;
function test(name,fn){fn();console.log('✓',name);n++;}

test('une convention canonique reste éligible sans conventionId dans le snapshot rapide',()=>{
  const ctx={console,Date,JSON};vm.createContext(ctx);vm.runInContext(server,ctx);
  assert.equal(ctx.EUC_DEV374_missionEligible_({statutCode:'CONVENTION_ENREGISTREE',conventionId:0}),true);
  assert.equal(ctx.EUC_DEV374_missionEligible_({statut:'Convention signée',conventionId:0}),true);
  assert.equal(ctx.EUC_DEV374_missionEligible_({statutCode:'ANNULEE',conventionId:42}),false);
});

test('le chemin rapide des missions réconcilie aussi les affectations visiteur',()=>{
  const ctx={console,Date,JSON};vm.createContext(ctx);vm.runInContext(server,ctx);
  let refreshes=0;
  ctx.EUC_DEV416_key_=()=> 'detail';
  ctx.EUC_DEV416_cacheGet_=()=>({lignes:[{eleveId:7,professeurVisiteur:'',statutCode:'CONVENTION_ENREGISTREE'}]});
  ctx.EUC_DEV425_payloadFresh_=()=>true;
  ctx.EUC_DEV416_cachePut_=()=>{};
  ctx.EUC_DEV428_withContext_=d=>d;
  ctx.EUC_DEV455_refreshAssignments_=d=>{refreshes++;d.lignes[0].professeurVisiteur='M. JEROME HUART';return d;};
  const detail=ctx.EUC_DEV374_missionDetail_('2026-2027','BACPRO',32,71);
  assert.equal(refreshes,1);
  assert.equal(detail.lignes[0].professeurVisiteur,'M. JEROME HUART');
});

test('les infobulles Apprentis mutualisent un seul chargement et réutilisent son résultat',()=>{
  assert.match(apprentices,/window\.EUC_DEV484_TOOLTIP_STATE=tooltipState/);
  assert.match(apprentices,/tooltipState\.status==='loading'/);
  assert.match(apprentices,/window\.EUC_DEV484_requestTooltipDetails=requestDetails/);
  assert.match(apprentices,/EUC_DEV484_requestTooltipDetails\(false,complete\)/);
  assert.match(apprentices,/if\(year && !window\.EUC_DEV484_TOOLTIP_STATE\)/);
});

test('l accueil administratif retrouve ses cartes sobres et un lien toujours vert',()=>{
  const ctx={HtmlService:{createHtmlOutput:html=>({getContent:()=>html})}};
  vm.createContext(ctx);vm.runInContext(routes,ctx);
  const input={getContent:()=>'<html><head></head><body><div class="crumb"><a>Accueil PFMP</a></div><article class="card"><div class="quick">Commentaire inutile.</div></article></body></html>'};
  const html=ctx.EUC_DEV484_nettoyerAccueilSuivi_(input).getContent();
  assert.doesNotMatch(html,/Commentaire inutile/);
  assert.match(html,/\.crumb a:visited/);
  assert.match(html,/color:#0b745f/);
  assert.match(html,/\.card\{min-height:0\}/);
});

test('la consultation publique utilise sa route dédiée sans Accueil PFMP',()=>{
  assert.match(routes,/case 'suivi-conventions-public':\s*return EUC_DEV348_publicSummary\(e\)/);
  assert.doesNotMatch(publicSummary,/Accueil PFMP/);
  assert.doesNotMatch(publicSummary,/EUC_DEV484_SUIVI_ADMIN_STYLE/);
});

test('l accueil public déduit l année courante sans lecture Grist au démarrage',()=>{
  const ctx={console,Date,JSON,EUC_DEV190X_currentYear_:()=> '2026-2027',EUC_PFMP_contexteAnneeLectureV155_:()=>{throw new Error('lecture Grist interdite')}};
  vm.createContext(ctx);vm.runInContext(summaryServer,ctx);
  assert.equal(ctx.EUC_DEV394_BASE_EUC_DEV348_y({parameter:{}}),'2026-2027');
  assert.equal(ctx.EUC_DEV394_BASE_EUC_DEV348_y({parameter:{annee:'2025-2026'}}),'2025-2026');
});

console.log(`${n} tests DEV484 régressions utilisateur réussis.`);
