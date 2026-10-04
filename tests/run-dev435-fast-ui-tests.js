'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const familyPublic=read('apps-script/Suivi_Conventions_Public_FamilleClone_V353.html');
const familyAdmin=read('apps-script/Suivi_Conventions_Admin_FamilleV190L.html');
const detailRoute=read('apps-script/EUC_PFMP_DEV401_DetailRepair.js');
const detailUi=read('apps-script/Suivi_PFMP_Classe_Detail_V156.html');
const adminTools=read('apps-script/EUC_PFMP_DEV370_AdminTools.js');
const noConventionUi=read('apps-script/Sans_Convention_PFMP_V368.html');
const missionsUi=read('apps-script/Ordres_Mission_PFMP_V368.html');

let count=0;
function test(name,fn){try{fn();console.log('✓',name);count++;}catch(e){console.error('✗',name,e.stack||e);process.exitCode=1;}}

test('les contrôles rapides public et admin repositionnent aussi les données préchargées',()=>{
  for(const html of [familyPublic,familyAdmin])assert.match(html,/function render\(el,r\)[\s\S]*?panel\.classList\.add\('show'\); place\(el\);/);
});
test('le détail admin conserve le snapshot rapide sans charger les professeurs',()=>{
  const body=(detailRoute.match(/function EUC_DEV401_adminDetail\(e\)\{[\s\S]*?\n\}/)||[])[0]||'';
  assert.match(body,/EUC_DEV416_finalDetail_/);assert.match(body,/d\.peutModifier=!!EUC_V156_contexteAdmin_/);
  assert.doesNotMatch(body,/EUC_V156_professeurs_\(/);
});
test('l’annuaire des professeurs est protégé et chargé à la demande',()=>{
  assert.match(detailRoute,/function EUC_DEV435_professeursDisponibles\(\)[\s\S]*Accès administrateur requis/);
  assert.match(detailUi,/function ensureProfesseurs\(done\)/);assert.match(detailUi,/\.EUC_DEV435_professeursDisponibles\(\)/);
  assert.match(detailUi,/input\.onfocus=function\(\).*ensureProfesseurs/);
});
test('la recherche sans convention exige niveau période et classe exacts',()=>{
  assert.match(noConventionUi,/id="classe"/);assert.match(noConventionUi,/Choisissez un niveau, une période et une classe/);
  assert.match(noConventionUi,/classeId:Number\(c\.classeId\),periodeId:Number\(p\.id\)/);
  assert.match(adminTools,/if\(classeId&&c\.classeId!==classeId\)return/);assert.match(adminTools,/if\(periodeId&&p\.id!==periodeId\)return/);
});
test('la recherche sans convention lit prioritairement le snapshot détaillé',()=>{
  assert.match(adminTools,/function EUC_DEV435_detailSans_/);assert.match(adminTools,/EUC_DEV416_finalDetail_\(y,f,c,p\)/);
});
test('le moyen de transport individuel affiche son état de sauvegarde',()=>{
  assert.match(missionsUi,/data-save=/);assert.match(missionsUi,/Enregistrement…/);assert.match(missionsUi,/Enregistré/);
  assert.match(missionsUi,/const statusEl=document\.getElementById\('status'\)/);
});
test('les missions réutilisent le détail et le groupe déjà chargés pour accélérer le PDF',()=>{
  assert.match(adminTools,/EUC_DEV416_finalDetail_\(y,f,c,p\)/);
  assert.match(adminTools,/function EUC_DEV440_groupForPdf_/);
  assert.match(adminTools,/CacheService\.getScriptCache\(\)/);
  assert.match(adminTools,/generationMs:new Date\(\)\.getTime\(\)-started/);
  assert.match(missionsUi,/missionToken:g\.pdfToken/);
});
test('la page sans convention utilise un état visible et non window.status',()=>{
  assert.match(noConventionUi,/const statusEl=document\.getElementById\('status'\)/);assert.doesNotMatch(noConventionUi,/\bstatus\.textContent/);
});

function serverContext(){
  const catalog={annee:'2026-2027',classes:[
    {famille:'BACPRO',classeId:10,classe:'TCAR',periodes:[{id:101,libelle:'PFMP n°1'},{id:102,libelle:'PFMP n°2'}]},
    {famille:'BACPRO',classeId:11,classe:'TCIEL',periodes:[{id:111,libelle:'PFMP n°1'}]}
  ]};
  let detailCalls=0;
  const ctx={console,JSON,String,Number,Boolean,Array,Object,Math,Date,
    EUC_V156_contexteAdmin_:()=>({autorise:true}),
    EUC_DEV368_admin:()=>({autorise:true}),
    EUC_DEV368_year:v=>String(v||'2026-2027'),
    EUC_DEV368_t:v=>String(v==null?'':v).trim(),
    EUC_DEV368_n:v=>Number(v)||0,
    EUC_DEV190G1_fastFamilyIndex:q=>({ready:true,payload:{classes:q.famille==='BACPRO'?catalog.classes:[]}}),
    EUC_DEV416_finalDetail_:()=>{detailCalls++;return{lignes:[{eleveId:7,nom:'TEST',prenom:'Élève',conventionId:0,apprenti:false,statutCode:'SANS_CONVENTION'}]};},
    EUC_DEV420_motifs_:()=>[]
  };
  vm.createContext(ctx);vm.runInContext(adminTools,ctx,{filename:'EUC_PFMP_DEV370_AdminTools.js'});
  return {ctx,getDetailCalls:()=>detailCalls};
}
test('la cible exacte ne parcourt qu’une classe et une période',()=>{
  const {ctx}=serverContext(),targets=ctx.EUC_DEV371_targets_({annee:'2026-2027',niveau:'TBAC',famille:'BACPRO',classeId:10,periodeKind:'PFMP1',periodeId:101});
  assert.equal(targets.length,1);assert.equal(targets[0].classe,'TCAR');assert.equal(targets[0].periode.id,101);
});
test('le calcul ciblé effectue une seule lecture détaillée',()=>{
  const s=serverContext(),r=s.ctx.EUC_DEV371_sansConvention({annee:'2026-2027',niveau:'TBAC',famille:'BACPRO',classeId:10,periodeKind:'PFMP1',periodeId:101});
  assert.equal(s.getDetailCalls(),1);assert.equal(r.total,1);assert.equal(r.lignes[0].eleve,'TEST Élève');
});

if(!process.exitCode)console.log(`${count} tests DEV435 interface rapide réussis`);
