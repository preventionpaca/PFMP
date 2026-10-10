const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
const quotaHtml=read('apps-script/Apprentissage_Quotas_DEV538.html');
const apprenticesHtml=read('apps-script/Apprentissage_PFMP_V190X.html');
const bookHtml=read('apps-script/Book_Entreprises_DEV538.html');
const mapHtml=read('apps-script/Cartographie_PFMP_DEV441.html');
const geo=read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js');
const routes=read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js');
const admin=read('apps-script/Admin_PFMP.html');
const publicHome=read('apps-script/Suivi_Conventions_Public_Summary_V348.html');
let n=0;function test(name,fn){try{fn();n++;console.log('✓',name)}catch(e){console.error('✗',name);throw e}}

function context(){
  const c={console,PropertiesService:{getScriptProperties:()=>({getProperty:()=>'',setProperty:()=>{}})},Utilities:{formatDate:d=>d.toISOString().slice(0,10)},Session:{getScriptTimeZone:()=> 'Europe/Paris',getActiveUser:()=>({getEmail:()=> 'prof@lycee-les-eucalyptus.org'})},HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle(){return this},setXFrameOptionsMode(){return this}})}),XFrameOptionsMode:{ALLOWALL:'ALLOWALL'}}};
  vm.createContext(c);vm.runInContext(server,c);return c;
}

test('les deux nouvelles pages et la carte parents ont des routes dédiées',()=>{assert.match(routes,/case 'quotas-apprentissage-pfmp'/);assert.match(routes,/case 'book-entreprises-pfmp'/);assert.match(routes,/case 'book-entreprises-public-pfmp'/);assert.match(routes,/case 'cartographie-entreprises-parents'/)});
test('le centre admin expose quotas et book',()=>{assert.match(admin,/Quotas et relances/);assert.match(admin,/Book des entreprises/);assert.match(admin,/v1\.0\.0-dev\.541/)});
test('le suivi destiné aux personnels expose le book',()=>assert.match(publicHome,/page=book-entreprises-public-pfmp/));
test('la page quota couvre effectif pourcentage calcul et états métier',()=>{for(const s of ['Effectif','Quota %','Nombre défini','Apprentis','Futurs','Distribués','Retournés','Transmis CFA','Relances J+14'])assert.ok(quotaHtml.includes(s),s)});
test('la page quota protège les actions asynchrones',()=>{assert.match(quotaHtml,/button:disabled/);assert.match(quotaHtml,/class="spin"/);assert.match(quotaHtml,/setTimeout\(\(\)=>/);assert.match(quotaHtml,/busy\('save',false\)/)});
test('le book combine les filtres demandés',()=>{for(const id of ['year','window','family','diploma','level','classe','period','company','student','teacher'])assert.ok(bookHtml.includes('id="'+id+'"'),id)});
test('le book propose export Excel compatible et impression PDF',()=>{assert.match(bookHtml,/Exporter Excel \(CSV\)/);assert.match(bookHtml,/window\.print/);assert.match(bookHtml,/text\/csv;charset=utf-8/)});
test('le book propose filtres assistés fiche entreprise photo et retour',()=>{assert.match(bookHtml,/datalist id="companiesOptions"/);assert.match(bookHtml,/id="detail"/);assert.match(bookHtml,/EUC_DEV540_companyPhoto/);assert.match(bookHtml,/EUC_DEV540_saveCompanyPhoto/);assert.match(bookHtml,/class="breadcrumb"/);assert.match(server,/EUC_ENTREPRISES_PHOTOS_PFMP/)});
test('le tableau des quotas rend les chiffres lisibles et explique les compteurs',()=>{assert.match(quotaHtml,/td\.num\{font-size:16px/);assert.match(quotaHtml,/Futurs — début à venir/);assert.match(quotaHtml,/Transmis au CFA — total/)});
test('la gestion des apprentis intègre le bilan par diplôme dans les deux modes',()=>{assert.match(apprenticesHtml,/Bilan des apprentis par diplôme et classe/);assert.match(apprenticesHtml,/EUC_DEV541_apprentissageDashboardPublic/);assert.match(apprenticesHtml,/Quota fixé/);assert.match(apprenticesHtml,/Apprentis actuels/);assert.match(apprenticesHtml,/Futurs apprentis/);assert.match(apprenticesHtml,/Dossiers distribués/);assert.match(apprenticesHtml,/Transmis au CFA/);assert.match(apprenticesHtml,/body\.dev252-readonly #dev541QuotaAdmin/)});
test('le bilan intégré protège son chargement asynchrone',()=>{assert.match(apprenticesHtml,/reload\.disabled=!!on/);assert.match(apprenticesHtml,/setTimeout\(function\(\)/);assert.match(apprenticesHtml,/Le bilan n’a pas répondu sous 20 secondes/);assert.match(apprenticesHtml,/withFailureHandler/)});
test('la carte utilise le service nominatif paresseux et une histoire défilante',()=>{assert.match(mapHtml,/EUC_DEV538_mapData/);assert.match(mapHtml,/EUC_DEV538_companyHistory/);assert.match(mapHtml,/popup-history\{max-height:230px;overflow:auto/);assert.match(mapHtml,/Professeur visiteur/);assert.match(mapHtml,/PARENT/);assert.match(server,/function EUC_DEV538_companyHistory/)});
test('la donnée cartographique conserve le SIRET pour la jointure',()=>assert.match(geo,/key:x\.key,siret:x\.siret\|\|''/));

test('le book réunit une entreprise reçue avec puis sans SIRET',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/\s*,\s*/g,', ').trim();c.EUC_DEV441_geoClassify_=()=>({pays:'FRANCE'});c.EUC_DEV537_studentKey_=x=>x.eleveId?'E'+x.eleveId:'';c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Test'});c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];
  const detail=(siret,eleveId,nom)=>({famille:'BACPRO',classe:{id:24,nom:'TCAR'},periode:{id:62,libelle:'PFMP n°1'},lignes:[{entreprise:'ILES.COM',adresseEntreprise:"29 RUE D'ANGLETERRE 06000 NICE",siretEntreprise:siret,eleveId,nom,prenom:'Test'}]});
  c.EUC_DEV445_geoSnapshotDetails_=()=>[detail('',1,'ALPHA')];c.EUC_DEV513_geoAccessDetails_=()=>[detail('52917963200011',1,'ALPHA'),detail('52917963200011',2,'BETA')];c.EUC_DEV537_mergeAnnualCandidates_=()=>[{entreprise:'ILES.COM',adresse:"29 RUE D'ANGLETERRE 06000 NICE",siret:'52917963200011',elevesAccueillis:2,latitude:43.7,longitude:7.2}];
  const out=c.EUC_DEV538_history_({annee:'2026-2027'});assert.equal(out.length,1);assert.equal(out[0].siret,'52917963200011');assert.equal(out[0].historique.length,2);assert.equal(out[0].elevesAccueillis,2);
});

test('la carte agrège les doublons SIRET/adresse sans exposer le SIRET',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);c.EUC_DEV441_digest_=v=>'digest-'+String(v);c.EUC_DEV537_scopeMatches_=()=>true;c.EUC_DEV517_geoFilter_=items=>items;c.EUC_DEV538_staffAllowed_=()=>true;c.EUC_DEV441_geoCandidates_=()=>[{entreprise:'GARAGE TEST',adresse:'1 RUE TEST 06000 NICE',siret:'',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',elevesAccueillis:1,classe:'TCAR',accueils:[{eleveKey:'E1',scope:{}}]},{entreprise:'GARAGE TEST',adresse:'1 RUE TEST 06000 NICE',siret:'12345678901234',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',elevesAccueillis:2,classe:'TMVA1',accueils:[{eleveKey:'E1',scope:{}},{eleveKey:'E2',scope:{}}]}];
  const out=c.EUC_DEV538_mapData({annee:'2026-2027'});assert.equal(out.total,1);assert.equal(out.points[0].elevesAccueillis,2);assert.equal(out.points[0].siret,undefined);
});

test('deux SIRET valides à la même adresse restent deux entreprises distinctes',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);c.EUC_DEV441_digest_=v=>'digest-'+String(v);c.EUC_DEV537_scopeMatches_=()=>true;c.EUC_DEV517_geoFilter_=items=>items;c.EUC_DEV538_staffAllowed_=()=>true;c.EUC_DEV441_geoCandidates_=()=>[{entreprise:'SOCIETE A',adresse:'1 RUE TEST 06000 NICE',siret:'11111111111111',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',accueils:[]},{entreprise:'SOCIETE B',adresse:'1 RUE TEST 06000 NICE',siret:'22222222222222',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',accueils:[]}];
  assert.equal(c.EUC_DEV538_mapData({annee:'2026-2027'}).total,2);
});

test('une recherche photo vide ne peut jamais sélectionner une fiche vide',()=>{
  const c=context();c.EUC_DEV443_normalizeAddress_=v=>String(v||'').trim();
  assert.equal(c.EUC_DEV540_photoMatch_({fields:{Entreprise:'',Adresse:'',Actif:true}},{identity:'',siret:'',entreprise:'',adresse:''}),false);
});

test('le calcul quota et les relances J+14 consolident les données existantes',()=>{
  const c=context(),now=Date.now(),ago=d=>new Date(now-d*86400000).toISOString(),future=d=>new Date(now+d*86400000).toISOString();
  c.EUC_DEV538_admin_=()=>true;c.EUC_DEV368_year=()=> '2026-2027';c.EUC_DEV368_catalog=()=>({classes:[{classeId:24,classe:'TCAR',famille:'BACPRO'}]});c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Carrossier Peintre Automobile'});c.EUC_DEV538_quotaConfig_=()=>({'2026-2027':{24:50}});
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:1,fields:{Nom:'ALPHA',Prenom:'Ana',Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}},{id:2,fields:{Nom:'BETA',Prenom:'Bilal',Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}}]:[];
  c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:10,fields:{Eleve:1,Annee_scolaire:'2026-2027',Date_contrat_officielle:ago(30),Date_debut:ago(20),Date_fin:future(200),Actif:true}},{id:11,fields:{Eleve:2,Annee_scolaire:'2026-2027',Dossier_distribue:true,Date_distribution_dossier:ago(16)}}]:[];
  const d=c.EUC_DEV538_apprentissageDashboard('2026-2027'),r=d.groups[0].lignes[0];assert.equal(r.effectif,2);assert.equal(r.quota,1);assert.equal(r.apprentis,1);assert.equal(r.distribues,1);assert.equal(d.relances.length,1);assert.equal(d.relances[0].eleve,'BETA Bilal');assert.ok(d.relances[0].jours>=15);
});

test('le bilan public ne renvoie aucune identité ni aucun dossier nominatif',()=>{
  const c=context();
  c.EUC_DEV538_apprentissageDashboard_=()=>({annee:'2026-2027',totals:{effectif:20,quota:6,apprentis:3,futurs:1,distribues:2,transmisCfa:4},dossiers:[{eleve:'NOM SECRET'}],relances:[{eleve:'NOM SECRET'}],groups:[{diplome:'BAC PRO Test',famille:'BACPRO',lignes:[{classeId:24,classe:'TCAR',niveau:'Terminale',effectif:20,quotaPercent:30,quota:6,apprentis:3,futurs:1,distribues:2,transmisCfa:4,dossiers:[{eleve:'NOM SECRET'}],relances:[{eleve:'NOM SECRET'}]}]}]});
  const out=c.EUC_DEV541_apprentissageDashboardPublic('2026-2027'),json=JSON.stringify(out);assert.equal(out.groups[0].lignes[0].quota,6);assert.equal(json.includes('NOM SECRET'),false);assert.equal(json.includes('dossiers'),false);assert.equal(json.includes('relances'),false);assert.equal(json.includes('classeId'),false);
});

test('le bilan public construit ses classes sans exiger le catalogue administrateur',()=>{
  const c=context();let adminCatalogCalled=false;c.EUC_DEV190X_classes_=()=>[{id:24,nom:'TCAR'},{id:41,nom:'1BTS CIEL'},{id:52,nom:'1CAP'}];c.EUC_DEV368_catalog=()=>{adminCatalogCalled=true;throw new Error('catalogue admin interdit')};
  const rows=c.EUC_DEV541_apprentissageClasses_('2026-2027');assert.equal(adminCatalogCalled,false);assert.deepEqual(Array.from(rows,r=>r.famille),['BACPRO','BTS','CAP']);assert.deepEqual(Array.from(rows,r=>r.niveau),['Terminale','1re année','Première']);
});

test('le mode parents limite la fenêtre à trois ans et ne renvoie aucun nom',()=>{
  const c=context();let yearsArg=[];c.EUC_DEV538_yearsForScope_=q=>{assert.equal(q.fenetre,3);return['2026-2027','2025-2026','2024-2025']};c.EUC_DEV443_geoIdentity_=(entreprise,adresse)=>'ADRESSE|'+entreprise+'|'+adresse;c.EUC_DEV441_digest_=v=>'digest-'+v;c.EUC_DEV537_scopeMatches_=()=>true;c.EUC_DEV537_mergeAnnualCandidates_=ys=>{yearsArg=ys;return[{key:'k',siret:'123',entreprise:'ENTREPRISE',adresse:'1 RUE',pays:'FRANCE',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',scopes:[{annee:'2026-2027',famille:'BACPRO',classeId:1,periodeId:2}],accueils:[{eleveKey:'opaque',scope:{annee:'2026-2027',famille:'BACPRO',classeId:1,periodeId:2}}],classe:'TCAR'}]};c.EUC_DEV517_geoFilter_=(items)=>{items[0].elevesAccueillis=1;return items};c.EUC_DEV538_staffAllowed_=()=>true;
  const r=c.EUC_DEV538_mapData({annee:'ALL',mode:'PARENTS'});assert.equal(yearsArg.length,3);assert.equal(r.nominatif,false);assert.equal(r.points[0].historique,undefined);assert.equal(r.points[0].siret,undefined);assert.equal(JSON.stringify(r).includes('Élève Test'),false);
});

console.log(`DEV538: ${n} tests réussis`);
