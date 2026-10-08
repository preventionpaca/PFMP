const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8');
const service=read('EUC_CONVENTION_PFMP_Service.gs');
const qr=read('EUC_CONVENTION_PFMP_QRPublicV85.gs');
const workflow=read('EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
const live=read('EUC_PFMP_DEV340_ConsolidationLive.js');
const generator=read('Convention_PFMP_Generateur.html');
const admin=read('Admin_Conventions_PFMP.html');
const detail=read('Suivi_PFMP_Classe_Detail_V156.html');
const missions=read('EUC_PFMP_DEV370_AdminTools.js');
let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.message);process.exitCode=1;}}
function baseContext(){
  const c={console,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,encodeURIComponent,
    Utilities:{getUuid:()=> 'uuid',base64EncodeWebSafe:()=> 'hash',computeDigest:()=>[],DigestAlgorithm:{SHA_256:'sha'},Charset:{UTF_8:'utf8'},formatDate:()=> '2026-10-08'},
    Session:{getScriptTimeZone:()=> 'Europe/Paris'}};
  vm.createContext(c);return c;
}

test('une convention individuelle conserve la période officielle et imprime les dates réelles',()=>{
  const c=baseContext();vm.runInContext(service,c);c.EUC_CONVENTION_token_=()=> 'secret';c.EUC_CONVENTION_hash_=()=> 'digest';
  const r=c.EUC_CONVENTION_preparerRecordAcces_({email:'admin@example.test'},{id:7},{id:3,nom:'TCAR'},{id:9,type:'PFMP n°1',debut:'2026-09-28',fin:'2026-10-16'},'2026-2027',{scenarioDates:'DEBUT_RETARDE',dateDeclareeDebut:'2026-10-07',dateDeclareeFin:'2026-10-16',motifEcartDates:'Début tardif'});
  const f=r.record.fields;
  assert.equal(f.Date_officielle_debut,'2026-09-28');assert.equal(f.Date_officielle_fin,'2026-10-16');
  assert.equal(f.Date_debut,'2026-10-07');assert.equal(f.Date_fin,'2026-10-16');assert.equal(f.Motif_ecart_dates,'Début tardif');
  assert.equal(f.Type_sequence,'INITIALE');assert.ok(!Object.keys(f).some(k=>/^Entreprise_|^Responsable_|^Tuteur_/.test(k)));
});

test('les dates individuelles invalides et sans motif sont refusées',()=>{
  const c=baseContext();vm.runInContext(service,c);
  assert.throws(()=>c.EUC_CONVENTION_validerDatesIndividuelles_('2026-10-17','2026-10-07','x'),/postérieure/);
  assert.throws(()=>c.EUC_CONVENTION_validerDatesIndividuelles_('2026-10-07','2026-10-17',''),/motif/);
});

test('le QR est ouvert avant le départ, bloqué pendant la PFMP et expiré après',()=>{
  const c=baseContext();c.EUC_IMPORT_dateExistanteISO_=v=>String(v||'').slice(0,10);vm.runInContext(qr,c);
  const a={Date_debut:'2026-10-10',Date_fin:'2026-10-20'};
  assert.equal(c.EUC_CONVENTION_etatQRV511_(a,'2026-10-09').etat,'OUVERT');
  assert.equal(c.EUC_CONVENTION_etatQRV511_(a,'2026-10-10').etat,'PERIODE_COMMENCEE');
  assert.equal(c.EUC_CONVENTION_etatQRV511_(a,'2026-10-21').etat,'EXPIRE_DEFINITIF');
  assert.equal(c.EUC_CONVENTION_etatQRV511_({...a,Statut_administratif:'INTERROMPUE'},'2026-10-09').etat,'REVOQUE');
});

test('la rupture crée une nouvelle séquence vide d’entreprise et reliée à l’ancienne',()=>{
  const c=baseContext();vm.runInContext(service,c);vm.runInContext(workflow,c);
  const rows=[{id:1,Eleve:7,Annee_scolaire:'2026-2027',Classe_convention:3,Classe_convention_nom:'TCAR',Periode:9,Periode_libelle:'PFMP n°1',Date_debut:'2026-09-28',Date_fin:'2026-10-16',Date_fin_reelle:'2026-10-05',Statut:'ENTREPRISE_SAISIE',Statut_administratif:'INTERROMPUE',Entreprise_raison_sociale:'ANCIENNE ENTREPRISE',Numero_sequence:1,Historique_admin_JSON:'[]'}];
  c.EUC_PFMP_ref_=v=>Number(v)||0;c.EUC_IMPORT_dateExistanteISO_=v=>String(v||'').slice(0,10);c.EUC_ADMIN_WORKFLOW_ctxV144_=()=>({email:'admin@example.test'});c.EUC_CONVENTION_assurerTableAcces_=()=>({});c.EUC_ADMIN_WORKFLOW_assurerColonnesV144_=()=>[];c.EUC_CONVENTION_lireAccesFraisV108_=()=>rows;c.EUC_IMPORT_lireRecords_=t=>t==='Planning_Periodes'?[{id:9,Type:'PFMP n°1',Date_debut:'2026-09-28',Date_fin:'2026-10-16'}]:[];c.EUC_CONVENTION_token_=()=> 'new-secret';c.EUC_CONVENTION_hash_=()=> 'new-digest';c.ScriptApp={getService:()=>({getUrl:()=> 'https://blue.invalid/dev'})};
  let createdFields=null;
  c.EUC_ENT_grist=(method,url,body)=>{
    if(method==='post'&&/records$/.test(url)){createdFields=body.records[0].fields;rows.push({id:2,...createdFields});return {records:[{id:2}]};}
    if(method==='patch'){for(const rec of body.records){const row=rows.find(x=>x.id===rec.id);Object.assign(row,rec.fields);}return {records:body.records};}
    throw new Error('appel inattendu '+method+' '+url);
  };
  const r=c.EUC_ADMIN_WORKFLOW_creerRemplacementV511(1,'2026-10-06','2026-10-23','Nouvelle entreprise à rechercher');
  assert.equal(r.remplacementId,2);assert.equal(createdFields.Convention_origine,1);assert.equal(createdFields.Type_sequence,'REMPLACEMENT_APRES_RUPTURE');assert.equal(createdFields.Statut_administratif,'A_COMPLETER_ENTREPRISE');
  assert.equal(createdFields.Date_debut,'2026-10-06');assert.equal(createdFields.Date_fin,'2026-10-23');assert.equal(rows[0].Convention_remplacement,2);
  assert.ok(!Object.keys(createdFields).some(k=>/^Entreprise_|^Responsable_|^Tuteur_/.test(k)));
  assert.match(r.urlFormulaire,/rid=2/);assert.throws(()=>c.EUC_ADMIN_WORKFLOW_creerRemplacementV511(1,'2026-10-07','2026-10-23','doublon'),/existe déjà/);
});

test('l’interruption révoque immédiatement l’ancien QR et rafraîchit le suivi',()=>{
  const c=baseContext();vm.runInContext(service,c);vm.runInContext(workflow,c);
  const row={id:11,Eleve:7,Annee_scolaire:'2026-2027',Classe_convention:3,Classe_convention_nom:'TCAR',Periode:9,Date_debut:'2026-09-28',Date_fin:'2026-10-16',Statut:'ENTREPRISE_SAISIE',Statut_administratif:'INFORMATIONS_ENREGISTREES',Revoked:false,Historique_admin_JSON:'[]'};
  c.EUC_PFMP_ref_=v=>Number(v)||0;c.EUC_IMPORT_dateExistanteISO_=v=>String(v||'').slice(0,10);c.EUC_ADMIN_WORKFLOW_ctxV144_=()=>({email:'admin@example.test'});c.EUC_CONVENTION_assurerTableAcces_=()=>({});c.EUC_ADMIN_WORKFLOW_assurerColonnesV144_=()=>[];c.EUC_ADMIN_WORKFLOW_lireDossierV144_=()=>row;c.EUC_CONVENTION_lireAccesFraisV108_=()=>[row];
  let beginReason='',finished=false;
  c.EUC_CONVENTION_debutRafraichissementV511_=(a,reason)=>{beginReason=reason;return {scope:'one'};};
  c.EUC_CONVENTION_finRafraichissementV511_=token=>{finished=token.scope==='one';return {ok:true};};
  c.EUC_ENT_grist=(method,url,body)=>{assert.equal(method,'patch');Object.assign(row,body.records[0].fields);return {records:body.records};};
  c.EUC_ADMIN_WORKFLOW_vueV144=()=>({id:11,statutAdministratif:row.Statut_administratif});
  const vue=c.EUC_ADMIN_WORKFLOW_interrompreV144(11,'2026-10-05','Rupture avec la première entreprise');
  assert.equal(row.Statut_administratif,'INTERROMPUE');assert.equal(row.Revoked,true);assert.equal(row.Date_fin_reelle,'2026-10-05');
  assert.equal(beginReason,'rupture-convention');assert.equal(finished,true);assert.deepEqual(vue.snapshot,{ok:true});
});

test('une convention à compléter reste visible mais non couverte et non missionnable',()=>{
  const c=baseContext();c.EUC_IMPORT_dateExistanteISO_=v=>String(v||'').slice(0,10);vm.runInContext(live,c);
  const pending=c.EUC_DEV340_status_({Statut_administratif:'A_COMPLETER_ENTREPRISE'});
  assert.equal(pending.active,true);assert.equal(pending.covered,false);assert.equal(pending.code,'A_COMPLETER_ENTREPRISE');
  const interrupted=c.EUC_DEV340_status_({Statut_administratif:'INTERROMPUE',Revoked:true});
  assert.equal(interrupted.code,'INTERROMPUE');assert.equal(interrupted.active,false);
  assert.match(missions,/compact\.indexOf\('ANNULEE'\)>=0\|\|compact\.indexOf\('INTERROMP'\)>=0/);
  assert.doesNotMatch(missions,/A_COMPLETER_ENTREPRISE[^\n]*return true/);
});

test('les interfaces exposent la procédure sans saisie d’entreprise au bureau',()=>{
  assert.match(generator,/Utiliser des dates individuelles pour cet élève/);assert.match(generator,/scenarioDates/);assert.match(generator,/motifEcartDates/);assert.match(generator,/setTimeout\(.*30000/s);
  assert.match(admin,/Créer la nouvelle convention après rupture/);assert.match(admin,/Aucune entreprise, aucun responsable et aucun tuteur ne sont repris/);assert.match(admin,/EUC_ADMIN_WORKFLOW_creerRemplacementV511/);assert.match(admin,/spinner/);
  assert.match(detail,/Séquence\(s\) précédente\(s\)/);assert.match(detail,/Entreprise à compléter/);assert.match(detail,/s-A_COMPLETER_ENTREPRISE/);
});

test('le chemin de secours du suivi garde les deux séquences et ne compte pas la remplaçante vide comme couverte',()=>{
  const fallback=read('EUC_SUIVI_PFMP_ClasseDetailV155.gs');
  assert.match(fallback,/historiqueConventions:historique/);assert.match(fallback,/sequenceId:d\?Number\(d\.id\):0/);
  assert.match(fallback,/statut\.code!==\'A_COMPLETER_ENTREPRISE\'/);assert.match(fallback,/conventionId:couverte\?Number\(d\.id\):0/);
});

test('la saisie QR réévalue la date et finalise le statut administratif',()=>{
  assert.match(qr,/EUC_CONVENTION_exigerQRValideV511_\(a\)/);assert.match(qr,/Statut_administratif:'INFORMATIONS_ENREGISTREES'/);
  const qrHtml=read('PFMP_Acces_QR_V116.html');assert.match(qrHtml,/r\.saisieAutorisee === false/);assert.match(qrHtml,/r\.messageQR/);
});

if(!process.exitCode)console.log(`\n${n} tests DEV511 ruptures et dates individuelles réussis.`);
