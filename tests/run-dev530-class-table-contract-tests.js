const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const admin=read('Suivi_PFMP_Classe_Detail_V156.html');
const publicView=read('Suivi_PFMP_Classe_Public_DEV455.html');
const legacy=read('EUC_SUIVI_PFMP_ClasseDetailV155.gs');
const vm=require('vm');
const contactContext={console,JSON,Object,Array,Number,String,Boolean,Math,Date};
vm.createContext(contactContext);
vm.runInContext(read('EUC_PFMP_DEV340_ConsolidationLive.js'),contactContext);
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}

test('la convention enregistrée et le contrat apprenti sont verts à texte blanc',()=>{
  assert.match(admin,/\.s-ENREGISTREE[^\n]+background:#0b8f72!important;color:#fff!important/);
  assert.match(admin,/\.s-APPRENTI\{background:#0b8f72!important;color:#fff!important\}/);
  assert.match(publicView,/\.s-ok\{background:#0b8f72;color:#fff\}/);
  assert.match(publicView,/c==='APPRENTI'/);
});
test('sans convention et rupture restent rouges sur fond rose',()=>{
  assert.match(admin,/\.s-SANS_CONVENTION\{background:#fff1f2;color:#b42318\}/);
  assert.match(admin,/\.s-ANNULEE,\.s-INTERROMPUE,\.s-SUPPRIMEE\{background:#fee4e2;color:#b42318\}/);
  assert.match(publicView,/c==='SANS_CONVENTION'\|\|c==='ANNULEE'\|\|c==='INTERROMPUE'/);
});
test('le repère A et le fond jaune apprenti sont conservés',()=>{
  assert.match(admin,/\.euc275b-a,\.dev275-badge-a/);
  assert.match(admin,/tr\.app172\{background:#fff7bf!important\}/);
  assert.match(publicView,/\.app\{background:#fffbd0\}/);
});
test('la date de début du contrat reste dans la pastille et est lisible',()=>{
  assert.match(admin,/Début du contrat :/);
  assert.match(admin,/\.status-date\{[^}]*font-size:12px[^}]*font-weight:800[^}]*opacity:1/);
});
test('les deux rendus affichent le responsable et les coordonnées générales disponibles',()=>{
  assert.match(admin,/contactVal\(x\.contactEntreprise\)/);
  assert.match(publicView,/contact\(x\.contactEntreprise,x\.telephoneEntreprise,x\.courrielEntreprise\)/);
  assert.match(legacy,/Responsable_telephone\|\|a\.Entreprise_telephone\|\|a\.Entreprise_telephone_snapshot/);
  assert.match(legacy,/EUC_DEV519_enrichAccessCompanyContacts_\(dossiers\)/);
});
test('un tuteur enregistré reste un contact entreprise de dernier recours',()=>{
  const out=contactContext.EUC_DEV340_contact_({
    Responsable_nom:'',Responsable_prenom:'',Responsable_telephone:'',Responsable_courriel:'',
    Entreprise_telephone:'',Entreprise_courriel:'',
    Tuteur_prenom:'Camille',Tuteur_nom:'TEST',Tuteur_telephone:'0102030405',Tuteur_courriel:'contact@example.test'
  });
  assert.equal(out,'Camille TEST · 0102030405 · contact@example.test');
});
test('le responsable explicite reste prioritaire sur le tuteur',()=>{
  const out=contactContext.EUC_DEV340_contact_({
    Responsable_prenom:'Rita',Responsable_nom:'DIRECTION',Responsable_telephone:'0101010101',Responsable_courriel:'direction@example.test',
    Tuteur_prenom:'Tom',Tuteur_nom:'TUTEUR',Tuteur_telephone:'0202020202',Tuteur_courriel:'tuteur@example.test'
  });
  assert.equal(out,'Rita DIRECTION · 0101010101 · direction@example.test');
});
if(!process.exitCode)console.log(`\n${n} tests DEV530 contrat tableau de classe réussis.`);
