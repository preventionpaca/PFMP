const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const c={console,Date,Math,JSON,String,Number,Object,Array,RegExp,isFinite};
vm.createContext(c);
vm.runInContext(read('EUC_PFMP_Service.gs'),c);
vm.runInContext(read('EUC_CONVENTION_PFMP_AdminWorkflowV144.gs'),c);

let passed=0;
function test(name,fn){
  try{fn();console.log('✓',name);passed++;}
  catch(error){console.error('✗',name,error.stack||error.message);process.exitCode=1;}
}

test('le lecteur commun résout toutes les formes de référence Grist',()=>{
  assert.equal(c.EUC_PFMP_ref_(321),321);
  assert.equal(c.EUC_PFMP_ref_([321]),321);
  assert.equal(c.EUC_PFMP_ref_(['L',321]),321);
  assert.equal(c.EUC_PFMP_ref_({id:321}),321);
  assert.equal(c.EUC_PFMP_ref_(['L']),0);
});

test('la liste administrative affiche le jeune lié par une référence Grist',()=>{
  c.EUC_ADMIN_WORKFLOW_ctxV144_=()=>({email:'admin@example.test'});
  c.EUC_CONVENTION_lireAccesFraisV108_=()=>[{
    id:901,Eleve:['L',321],Annee_scolaire:'2026-2027',
    Numero_enregistrement:'PFMP-PFMP-000901',
    Entreprise_raison_sociale:'ENTREPRISE TEST',Date_saisie_entreprise:'2026-10-09'
  }];
  c.EUC_IMPORT_lireRecords_=table=>table==='EUC_ELEVES_PFMP'
    ?[{id:321,Nom:'DUPONT',Prenom_usage:'Lina'}]:[];
  c.EUC_IMPORT_dateExistanteISO_=value=>String(value||'').slice(0,10);
  const rows=c.EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148('2026-2027');
  assert.equal(rows.length,1);
  assert.equal(rows[0].jeune,'Lina DUPONT');
  assert.match(rows[0].recherche,/dupont/);
  assert.match(rows[0].recherche,/lina/);
});

test('les instantanés historiques restent utilisables sans référence élève',()=>{
  const identity=c.EUC_ADMIN_WORKFLOW_identiteEleveV521_({
    Jeune_nom:'MARTIN',Jeune_prenom:'Noé'
  },{});
  assert.equal(identity.jeune,'Noé MARTIN');
});

test('le détail administratif utilise la même résolution que la recherche',()=>{
  const row={id:902,Eleve:['L',654],Classe_convention_nom:'TCAR'};
  c.EUC_ADMIN_WORKFLOW_ctxV144_=()=>({email:'admin@example.test'});
  c.EUC_ADMIN_WORKFLOW_vueV144=()=>({etapes:[]});
  c.EUC_ADMIN_WORKFLOW_lireDossierV144_=()=>row;
  c.EUC_IMPORT_lireRecords_=table=>table==='EUC_ELEVES_PFMP'
    ?[{id:654,Nom:'BERNARD',Prenom:'Sam'}]:[];
  c.EUC_IMPORT_dateExistanteISO_=value=>String(value||'').slice(0,10);
  const detail=c.EUC_ADMIN_WORKFLOW_vueV146(902);
  assert.equal(detail.jeune.prenom,'Sam');
  assert.equal(detail.jeune.nom,'BERNARD');
});

test('une convention interrompue reste recherchable pour créer son remplacement',()=>{
  c.EUC_ADMIN_WORKFLOW_ctxV144_=()=>({email:'admin@example.test'});
  c.EUC_CONVENTION_lireAccesFraisV108_=()=>[{
    id:903,Eleve:['L',777],Annee_scolaire:'2026-2027',
    Statut_administratif:'INTERROMPUE',Revoked:true
  }];
  c.EUC_IMPORT_lireRecords_=table=>table==='EUC_ELEVES_PFMP'
    ?[{id:777,Nom:'TEMOIN',Prenom_usage:'Élève'}]:[];
  c.EUC_IMPORT_dateExistanteISO_=value=>String(value||'').slice(0,10);
  const rows=c.EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148('2026-2027');
  assert.equal(rows.length,1);
  assert.equal(rows[0].statut,'INTERROMPUE');
  assert.equal(rows[0].jeune,'Élève TEMOIN');
  assert.equal(c.EUC_ADMIN_WORKFLOW_listerDossiersParAnneeV148('2025-2026').length,0);
});

if(!process.exitCode)console.log(`\n${passed} tests DEV521 résolution des jeunes réussis.`);
