const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const source=read('EUC_PFMP_DEV528_JotFormContacts.js');
const consolidation=read('EUC_PFMP_DEV340_ConsolidationLive.js');
const importCode=read('EUC_PFMP_DEV466_JotFormReliable.js');
const persistent=read('EUC_PFMP_DEV456_RestaurationExacte.js');
const canonical=read('EUC_PFMP_DEV459_CanonicalViews.js');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}
function context(rows){
  const cache={};const ctx={console,JSON,String,Number,Object,Array,Math,isFinite,
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;}})},
    EUC_DEV519_referenceRows_:()=>rows,
    EUC_DEV340_ref_:v=>Array.isArray(v)?Number(v[1]||v[0]):Number(v),
    EUC_DEV520_firstText_:(...xs)=>xs.map(x=>String(x||'').trim()).find(Boolean)||'',
    EUC_DEV307_companyFields_:()=>({Statut:'ENTREPRISE_SAISIE'}),
    EUC_DEV307_filterFields_:(fields,columns)=>Object.fromEntries(Object.entries(fields).filter(([k])=>columns[k]))
  };vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
const raw={
  'N° SIRET (France)':'73282932000074',
  'Nom du responsable':'Responsable Exemple',
  'Téléphone entreprise':'04 00 00 00 00',
  "Adresse e-mail de l'entreprise":'responsable@example.test'
};
test('une convention JotForm historique retrouve son responsable depuis Raw_JSON',()=>{
  const ctx=context([{id:9,Decision:'VALIDEE',Eleve_match_id:7,Classe_match_id:24,SIRET_normalise:'73282932000074',Raw_JSON:JSON.stringify(raw)}]);
  const row={Eleve:7,Classe_convention:24,Entreprise_siret:'73282932000074'};
  ctx.EUC_DEV528_enrichJotformContacts_([row]);
  assert.equal(row.Responsable_nom,'Responsable Exemple');
  assert.equal(row.Responsable_telephone,'04 00 00 00 00');
  assert.equal(row.Responsable_courriel,'responsable@example.test');
});
test('une ligne JotForm non validée ne complète jamais une convention',()=>{
  const ctx=context([{id:9,Decision:'A_CONTROLER',Eleve_match_id:7,Classe_match_id:24,SIRET_normalise:'73282932000074',Raw_JSON:JSON.stringify(raw)}]);
  const row={Eleve:7,Classe_convention:24,Entreprise_siret:'73282932000074'};
  ctx.EUC_DEV528_enrichJotformContacts_([row]);assert.equal(row.Responsable_nom,undefined);
});
test('les prochains imports écrivent les coordonnées canoniques',()=>{
  const ctx=context([]),columns={Entreprise_telephone:1,Entreprise_courriel:1,Responsable_nom:1,Responsable_telephone:1,Responsable_courriel:1};
  const out=ctx.EUC_DEV528_companyFields_({SIRET_normalise:'73282932000074',Raw_JSON:JSON.stringify(raw)},{},columns);
  assert.equal(out.Responsable_nom,'Responsable Exemple');
  assert.equal(out.Entreprise_telephone,'04 00 00 00 00');
  assert.equal(out.Responsable_courriel,'responsable@example.test');
  assert.match(importCode,/EUC_DEV528_companyFields_/);
});
test('le chemin de consolidation applique le repli JotForm après les références entreprise',()=>{
  assert.match(consolidation,/EUC_DEV528_enrichJotformContacts_\(rows\)/);
});
test('le premier chargement lit tous les blocs persistants en un seul appel',()=>{
  const body=persistent.slice(persistent.indexOf('function EUC_DEV456_familyPersistentGet_'),persistent.indexOf('function EUC_DEV456_familyPersistentPut_'));
  assert.match(body,/p\.getProperties\(\)/);
  assert.doesNotMatch(body,/p\.getProperty\(/);
});
test('les anciennes fiches de classe sont invalidées pour reconstruire les coordonnées',()=>{
  assert.match(canonical,/EUC_DEV459_CANONICAL_='DEV528-C12'/);
});
if(!process.exitCode)console.log(`\n${n} tests DEV528 coordonnées JotForm et premier chargement réussis.`);
