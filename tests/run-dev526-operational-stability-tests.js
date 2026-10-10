const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8');
const canonical=read('EUC_PFMP_DEV459_CanonicalViews.js');
const detail=read('Suivi_PFMP_Classe_Detail_V156.html');
const missionServer=read('EUC_PFMP_DEV370_AdminTools.js');
const missionClient=read('Ordres_Mission_PFMP_V368.html');
const generatorServer=read('EUC_CONVENTION_PFMP_GroupesClasses.gs');
const generatorClient=read('Convention_PFMP_Generateur.html');
const conventionService=read('EUC_CONVENTION_PFMP_Service.gs');
const conventionWeb=read('EUC_CONVENTION_PFMP_WebApp.gs');
const conventionPdfServer=read('EUC_CONVENTION_PFMP_PdfV95.gs');
const conventionPdfClient=read('Convention_PFMP_PdfV95.html');
const adminServer=read('EUC_CONVENTION_PFMP_AdminWorkflowV144.gs');
const adminClient=read('Admin_Conventions_PFMP.html');
const strictSiret=read('EUC_SIRET_NIS_StrictV161.gs');

let n=0;
function test(name,fn){try{fn();console.log('✓',name);n++;}catch(e){console.error('✗',name,e.stack||e.message);process.exitCode=1;}}
function body(source,start,end){const a=source.indexOf(start),b=end?source.indexOf(end,a+start.length):source.length;assert(a>=0,'fonction absente: '+start);return source.slice(a,b<0?source.length:b);}

test('les coordonnées entreprise invalident réellement le cache antérieur',()=>{
  assert.match(canonical,/EUC_DEV459_CANONICAL_='DEV533-C14'/);
  assert.match(canonical,/EUC_DEV459_DETAIL_CANONICAL_='DEV534-D15'/);
  assert.match(canonical,/responsable conserve dans le tampon JotForm/);
});

test('une affectation rend toujours le bouton et borne son attente',()=>{
  const assign=body(detail,'function assign(type,prof,btn)','function removeAssignment');
  assert.match(assign,/<span class="euc405-spin"><\/span>Affectation en cours/);
  assert.match(assign,/setTimeout\(function\(\)[\s\S]*?25000\)/);
  assert.match(assign,/withSuccessHandler\(function\(r\)[\s\S]*?clearTimeout\(timer\);restore\(\)/);
  assert.match(assign,/withFailureHandler\(function\(e\)[\s\S]*?clearTimeout\(timer\);restore\(\)/);
});

test('les ordres de mission ciblés ne chargent pas le catalogue complet',()=>{
  const targets=body(missionServer,'function EUC_DEV368_targets(q)','function EUC_DEV368_sansConvention');
  const shortcut=targets.slice(targets.indexOf('if(cid&&pid)'),targets.indexOf('EUC_DEV368_catalog'));
  assert.match(shortcut,/return\[\{annee:y/);
  assert.doesNotMatch(shortcut,/EUC_DEV368_catalog/);
  assert.match(missionServer,/function EUC_DEV526_bootMissions_/);
  assert.match(missionClient,/if\(PREF\.classe&&PREF\.periode\)\{CAT=/);
  assert.match(missionClient,/setTimeout\(function\(\)[\s\S]*?30000\)/);
});

test('le générateur lit les trois tables Grist en parallèle et met le résultat en cache révisionné',()=>{
  const parallel=body(generatorServer,'function EUC_DEV526_lireTablesGenerateurParallele_','function EUC_DEV526_generateurPayload_');
  assert.match(parallel,/UrlFetchApp\.fetchAll/);
  assert.match(parallel,/\['Classes','EUC_ELEVES_PFMP','Planning_Periodes'\]/);
  assert.match(generatorServer,/EUC_DEV457_revision_/);
  assert.match(generatorServer,/EUC_DEV526_GENERATEUR_/);
  assert.match(generatorServer,/c\.put\(key\+'_N',String\(n\),600\)/);
  assert.match(generatorClient,/EUC_CONVENTION_chargerGenerateurAdmin\(\)/);
  assert.match(generatorClient,/le serveur n’a pas répondu sous 20 secondes/);
});

test('la génération individuelle reprend une convention identique et bloque un doublon de dates',()=>{
  const single=body(conventionService,'function EUC_CONVENTION_preparerAcces(payload)','function EUC_CONVENTION_preparerAccesClasse');
  assert.match(single,/EUC_CONVENTION_accesActifsV525_/);
  assert.match(single,/if\(exDebut!==a\.dateDebut\|\|exFin!==a\.dateFin\)throw new Error/);
  assert.match(single,/idempotent:!!existing/);
  assert.match(single,/page=convention-pfmp-print&rid=/);
});

test('la réédition durable fonctionne par identifiant même après fermeture du navigateur',()=>{
  assert.match(conventionWeb,/parameter&&e\.parameter\.rid/);
  assert.match(conventionWeb,/EUC_PDF_payloadAccesIdV525\(rid\)/);
  assert.match(adminServer,/base\.urlImpression=serviceUrl\+'\?page=convention-pfmp-print&rid='/);
  assert.match(adminClient,/id="reprintConvention"/);
  assert.match(adminClient,/Rééditer \/ imprimer/);
  assert.match(adminClient,/v\.remplacement\.urlImpression/);
});

test('le PDF est archivé dans Drive avec une arborescence et un lien conservé dans Grist',()=>{
  assert.match(conventionService,/EUC_CONVENTION_SCHEMA_V526/);
  ['Drive_pdf_file_id','Drive_pdf_url','Drive_pdf_nom','Drive_pdf_date','Drive_pdf_taille'].forEach(x=>assert.match(conventionService,new RegExp(x)));
  assert.match(conventionPdfServer,/Eucalyptus PFMP|EUC_DOCX_root_/);
  assert.match(conventionPdfServer,/Conventions PDF/);
  assert.match(conventionPdfServer,/EUC_PDF_niveauV525_/);
  assert.match(conventionPdfServer,/EUC_PDF_archiverV525/);
  assert.match(conventionPdfServer,/EUC_ENT_grist\('patch'/);
  assert.match(conventionPdfClient,/EUC_PDF_archiverV525/);
  assert.match(conventionPdfClient,/PDF prêt et téléchargeable, mais archivage Drive impossible/);
  assert.match(adminClient,/openConventionDrive/);
});

test('un SIRET trouvé conserve la voie normalisée jusqu’au formulaire QR',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(strictSiret,ctx);
  const out=ctx.EUC_V161_mapperEntrepriseFrance_({source:'grist',entreprise:{raisonSociale:'ENTREPRISE TEST',numeroVoie:'12 RUE DES TESTS',codePostal:'06000',commune:'NICE',pays:'France'}},'73282932000074');
  assert.equal(out.found,true);
  assert.equal(out.entrepriseAdresse,'12 RUE DES TESTS');
  assert.equal(out.entrepriseCodePostal,'06000');
  assert.equal(out.entrepriseCommune,'NICE');
});

if(!process.exitCode)console.log(`\n${n} tests DEV526 stabilité opérationnelle réussis.`);
