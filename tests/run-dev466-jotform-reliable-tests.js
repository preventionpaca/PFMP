const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV466_JotFormReliable.js'),'utf8');
const atomic=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV425_AtomicFreshness.js'),'utf8');
const family=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV456_RestaurationExacte.js'),'utf8');
const canonical=fs.readFileSync(path.join(root,'apps-script','EUC_PFMP_DEV459_CanonicalViews.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'apps-script','Migration_JotForm_PFMP_V160.html'),'utf8');
let n=0;function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}
function context(extra){const c=Object.assign({console,JSON,Date,Math,Array,Object,String,Number,RegExp},extra||{});vm.createContext(c);vm.runInContext(code,c);return c;}

test('la clé métier inclut élève classe période et année',()=>{
  const c=context({});assert.equal(c.EUC_DEV466_key_(12,24,62,'2026-2027'),'12|24|62|2026-2027');
});

test('un dossier incomplet est complété sans régresser un statut avancé',()=>{
  const c=context({EUC_DEV307_filterFields_:(x)=>x});
  const out=c.EUC_DEV466_mergeIncomplete_(
    {Reference_convention:'R1',Statut:'SIGNE_PROVISEUR',Entreprise_raison_sociale:''},
    {Reference_convention:'R2',Eleve:8,Statut:'CONVENTION_GENEREE'},
    {Statut:'ENTREPRISE_SAISIE',Entreprise_raison_sociale:'GARAGE TEST'},{}
  );
  assert.equal(out.Reference_convention,undefined);assert.equal(out.Eleve,8);
  assert.equal(out.Statut,undefined);assert.equal(out.Entreprise_raison_sociale,'GARAGE TEST');
});

test('l’import exige une sélection explicite et vérifie son cardinal',()=>{
  const c=context({EUC_DEV298_rows_:()=>[{id:1},{id:2}]});
  assert.throws(()=>c.EUC_DEV466_selected_({ids:[1]}),/sélection explicite/i);
  assert.throws(()=>c.EUC_DEV466_selected_({manualSelection:true,ids:[1,3]}),/Sélection incohérente/);
  assert.deepEqual(Array.from(c.EUC_DEV466_selected_({manualSelection:true,ids:[1,2]}),x=>x.id),[1,2]);
});

test('les créations et compléments utilisent chacun une écriture groupée',()=>{
  assert.match(code,/if\(creates\.length\)EUC_ENT_grist\('post'[\s\S]*\{records:creates\}\)/);
  assert.match(code,/if\(updates\.length\)EUC_ENT_grist\('patch'[\s\S]*\{records:updates\}\)/);
  const body=code.slice(code.indexOf('function EUC_DEV466_importSelection'));
  assert.equal((body.match(/EUC_ENT_grist\(/g)||[]).length,2);
});

test('le précontrôle complet précède le passage atomique à DIRTY',()=>{
  const start=code.indexOf('function EUC_DEV466_importSelection');
  const body=code.slice(start);
  assert.ok(body.indexOf('EUC_DEV466_prepare_')<body.indexOf('EUC_DEV425_beginImportItems_'));
});

test('les anciennes tables de rattachement absentes ne bloquent pas le précontrôle',()=>{
  assert.match(code,/var periods=\[\],links=\[\],years=\[\],offers=\[\]/);
  assert.match(code,/try\{links=EUC_DEV307_flatRecords_\('EUC_OFFRES_PERIODES'\);\}catch\(eLinks\)\{\}/);
  assert.match(code,/EUC_DEV312_periodFor_\(row,student,periods,links,offerId,realClassId,offers\)/);
});

test('le tampon n’est validé qu’après Grist snapshot et vue publiée',()=>{
  const start=code.indexOf('function EUC_DEV466_importSelection');
  const body=code.slice(start);
  const read=body.indexOf('EUC_DEV466_readback_'),finish=body.indexOf('EUC_DEV425_finishMany_');
  const view=body.indexOf('EUC_DEV466_verifyViews_'),patch=body.indexOf('EUC_DEV322_patchBufferValidated_');
  assert.ok(read>=0&&read<finish&&finish<view&&view<patch);
});

test('une vue sans convention empêche la validation finale',()=>{
  const c=context({
    EUC_DEV416_key_:(a,f,cl,p)=>[a,f,cl,p].join('|'),
    EUC_DEV416_cacheGet_:()=>({lignes:[{eleveId:7,statutCode:'SANS_CONVENTION'}]})
  });
  const errors=c.EUC_DEV466_verifyViews_([{rowId:1,label:'ÉLÈVE TEST',studentId:7,classId:24,periodId:62,year:'2026-2027',family:'BACPRO'}]);
  assert.equal(errors.length,1);
});

test('une convention publiée autorise la validation finale',()=>{
  const c=context({
    EUC_DEV416_key_:(a,f,cl,p)=>[a,f,cl,p].join('|'),
    EUC_DEV416_cacheGet_:()=>({lignes:[{eleveId:7,statutCode:'AVEC_CONVENTION'}]})
  });
  assert.equal(c.EUC_DEV466_verifyViews_([{rowId:1,label:'ÉLÈVE TEST',studentId:7,classId:24,periodId:62,year:'2026-2027',family:'BACPRO'}]).length,0);
});

test('la collision QR JotForm ne peut pas écraser un autre SIRET',()=>{
  assert.match(code,/Conflit QR\/JotForm[\s\S]*Aucune donnée n’a été écrasée/);
  assert.match(code,/existingSiret&&existingSiret!==siret/);
});

test('la publication atomique invalide aussi le cache familial persistant',()=>{
  assert.match(atomic,/function EUC_DEV425_invalidateFamily_[\s\S]*EUC_DEV456_familyCacheDrop_\(annee,famille\)/);
  assert.match(family,/EUC_DEV425_payloadFresh_\(annee,famille,cached\)/);
  assert.match(family,/EUC_DEV425_payloadFresh_\(annee,famille,persisted\)/);
  assert.match(canonical,/__dev459Canonical===EUC_DEV459_CANONICAL_[\s\S]*EUC_DEV425_payloadFresh_/);
});

test('le bouton actif appelle le nouvel import et annonce le contrôle de la liste',()=>{
  assert.match(ui,/\.EUC_DEV466_importSelection\(\{/);
  assert.match(ui,/vérifiée\(s\) dans la liste de classe/);
});

if(!process.exitCode)console.log(`${n} tests DEV466 import JotForm fiable réussis.`);
