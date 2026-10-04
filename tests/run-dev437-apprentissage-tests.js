const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..','apps-script');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const coherence=read('EUC_PFMP_DEV277_CoherenceApprentissage.js');
const details=read('EUC_PFMP_DEV251_DashboardDetails.js');
const legacy=read('EUC_PFMP_DEV192_ApprentisGlobal.js');
const live=read('EUC_PFMP_DEV340_ConsolidationLive.js');
const pub=read('Suivi_PFMP_Classe_PublicClone_V353.html');
const adminApp=read('Apprentissage_PFMP_V190X.html');
const publicApp=read('Apprentissage_PFMP_PublicClone_V353.html');

const context={};
vm.createContext(context);
vm.runInContext(coherence,context,{filename:'EUC_PFMP_DEV277_CoherenceApprentissage.js'});

const p=context.EUC_DEV437_pipeline_;
assert.equal(typeof p,'function');
assert.deepEqual(
  JSON.parse(JSON.stringify(p({dossierRemis:true}))),
  {dossier:true,cfa:false,contrat:false,rupture:false}
);
assert.deepEqual(
  JSON.parse(JSON.stringify(p({dossierRemis:true,transmisCfa:true}))),
  {dossier:false,cfa:true,contrat:false,rupture:false}
);
assert.equal(p({dossierDistribue:true}).dossier,false);
assert.equal(p({dossierRemis:true,transmisCfa:true,contrat:'2026-09-01',debut:'2026-09-01',fin:'2027-08-31'}).cfa,false);
assert.equal(p({dossierRemis:true,rupture:'2026-10-01'}).dossier,false);
assert.equal(p({dossierRemis:true,transmisCfa:true,nouveauContrat:true}).cfa,false);

assert.match(coherence,/Dossier_remis/);
assert.doesNotMatch(coherence,/EUC_DEV277_boolCol_\(f,cols,\['Dossier_remis','Dossier_distribue'\]\)/);
assert.match(legacy,/s\.dossierDistribue = bool\(\['Dossier_distribue'\]\)/);
assert.doesNotMatch(legacy,/s\.dossierRemis = bool\(\['Dossier_distribue'\]\)/);
assert.match(details,/EUC_DEV437_pipeline_/);
assert.match(adminApp,/pipe\.dossier/);
assert.match(publicApp,/pipe\.dossier/);

assert.match(live,/x\.dateContrat=EUC_DEV340_txt_\(st\.record\.debut\)/);
assert.match(pub,/id="exportPdf"/);
assert.match(pub,/document\.getElementById\('exportPdf'\)\.onclick=function\(\)\{window\.print\(\)\}/);
assert.match(pub,/Début du contrat/);
assert.match(pub,/row-situation-admin/);
assert.match(pub,/@media print/);

console.log('✓ DEV437 dates, PDF public et pipeline apprentissage');
