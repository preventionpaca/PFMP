const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('apps-script/EUC_PFMP_DEV538_BookQuotas.js');
const relations=read('apps-script/EUC_PFMP_DEV562_RelationsEntreprises.js');
const quotaHtml=read('apps-script/Apprentissage_Quotas_DEV538.html');
const apprenticesHtml=read('apps-script/Apprentissage_PFMP_V190X.html');
const bookHtml=read('apps-script/Book_Entreprises_DEV538.html');
const studentBookHtml=read('apps-script/Book_Entreprises_Eleves_DEV546.html');
const mapHtml=read('apps-script/Cartographie_PFMP_DEV441.html');
const apprenticeMapHtml=read('apps-script/Cartographie_Apprentis_DEV545.html');
const geo=read('apps-script/EUC_PFMP_DEV441_AccesPpGeocodage.js');
const routes=read('apps-script/EUC_PFMP_DEV481_AdminRoutes.js');
const admin=read('apps-script/Admin_PFMP.html');
const publicHome=read('apps-script/Suivi_Conventions_Public_Summary_V348.html');
const familyHtml=read('apps-script/Suivi_Conventions_Admin_FamilleV190L.html');
const detailHtml=read('apps-script/Suivi_PFMP_Classe_Detail_V156.html');
let n=0;function test(name,fn){try{fn();n++;console.log('✓',name)}catch(e){console.error('✗',name);throw e}}

function context(){
  const c={console,PropertiesService:{getScriptProperties:()=>({getProperty:()=>'',setProperty:()=>{},setProperties:()=>{}})},Utilities:{formatDate:(d,z,p)=>p==='dd/MM/yyyy'?new Date(d).toLocaleDateString('fr-FR',{timeZone:'UTC'}):new Date(d).toISOString().slice(0,10)},Session:{getScriptTimeZone:()=> 'Europe/Paris',getActiveUser:()=>({getEmail:()=> 'prof@lycee-les-eucalyptus.org'})},HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle(){return this},setXFrameOptionsMode(){return this}})}),XFrameOptionsMode:{ALLOWALL:'ALLOWALL'}}};
  vm.createContext(c);vm.runInContext(server,c);vm.runInContext(relations,c);return c;
}

test('les pages apprentissage, les trois books et les cartographies ont des routes dédiées',()=>{assert.match(routes,/case 'quotas-apprentissage-pfmp'/);assert.match(routes,/case 'book-entreprises-pfmp'/);assert.match(routes,/case 'book-entreprises-public-pfmp'/);assert.match(routes,/case 'book-entreprises-eleves-pfmp'/);assert.match(routes,/case 'cartographie-entreprises-parents'/);assert.match(routes,/case 'cartographie-apprentis-pfmp'/);assert.match(routes,/case 'cartographie-apprentis-public-pfmp'/)});
test('le centre admin expose quotas et book',()=>{assert.match(admin,/Quotas et relances/);assert.match(admin,/Book des entreprises/);assert.match(admin,/v1\.0\.0-dev\.563/)});
test('le suivi destiné aux personnels expose le book',()=>assert.match(publicHome,/page=book-entreprises-public-pfmp/));
test('le book public affiche un indicateur immédiat et conserve le sous-domaine PFMP',()=>{assert.match(publicHome,/Ouverture du book…/);assert.match(publicHome,/aria-busy/);assert.match(publicHome,/EUC_DEV556_PFMP_WRAPPER_NAV/);assert.match(publicHome,/EUC_PFMP_WRAPPER_NAVIGATE/);assert.match(publicHome,/book-entreprises-public-pfmp/)});
test('les pages PFMP publiques partagent le même contrat de navigation enveloppée',()=>{for(const html of [familyHtml,detailHtml,bookHtml]){assert.match(html,/EUC_DEV556_PFMP_/);assert.match(html,/EUC_PFMP_WRAPPER_QUERY/);assert.match(html,/EUC_PFMP_WRAPPER_NAVIGATE/)}assert.match(familyHtml,/Chargement de la synthèse du niveau/);assert.match(familyHtml,/famLabel\(P\.famille\)/)});
test('les pages apprentis publiques conservent apprentis.loucodi.fr',()=>{for(const html of [apprenticesHtml,apprenticeMapHtml]){assert.match(html,/EUC_DEV556_APPRENTIS_/);assert.match(html,/EUC_APPRENTIS_WRAPPER_QUERY/);assert.match(html,/EUC_APPRENTIS_WRAPPER_NAVIGATE/)}assert.match(apprenticesHtml,/https:\/\/pfmp\.loucodi\.fr\//)});
test('la page quota couvre effectif pourcentage calcul et états métier',()=>{for(const s of ['Effectif','Quota %','Nombre défini','Apprentis','Futurs','Distribués','Retournés','Transmis CFA','Relances J+14'])assert.ok(quotaHtml.includes(s),s)});
test('la page quota permet d’inclure ou exclure chaque classe',()=>{assert.match(quotaHtml,/Prise en compte/);assert.match(quotaHtml,/class-active/);assert.match(quotaHtml,/Active/);assert.match(quotaHtml,/Exclue/);assert.match(quotaHtml,/classes actives uniquement/);assert.match(quotaHtml,/active:tr\.querySelector\('\.class-active'\)\.checked/)});
test('la page quota règle explicitement mixité ou classe entière',()=>{assert.match(quotaHtml,/Modalité/);assert.match(quotaHtml,/class-mode/);assert.match(quotaHtml,/Mixité/);assert.match(quotaHtml,/Classe entière/);assert.match(quotaHtml,/mode:tr\.querySelector\('\.class-mode'\)\.value/)});
test('la page quota protège les actions asynchrones',()=>{assert.match(quotaHtml,/button:disabled/);assert.match(quotaHtml,/class="spin"/);assert.match(quotaHtml,/setTimeout\(\(\)=>/);assert.match(quotaHtml,/busy\('save',false\)/)});
test('le book combine les filtres demandés',()=>{for(const id of ['year','window','family','diploma','level','classe','period','city','company','student','teacher','sort','pageSize'])assert.ok(bookHtml.includes('id="'+id+'"'),id)});
test('le book propose export Excel compatible et impression PDF',()=>{assert.match(bookHtml,/Exporter Excel \(CSV\)/);assert.match(bookHtml,/window\.print/);assert.match(bookHtml,/text\/csv;charset=utf-8/)});
test('le book propose filtres assistés fiche entreprise photo carte pagination et retour',()=>{assert.match(bookHtml,/datalist id="companiesOptions"/);assert.match(bookHtml,/id="detail"/);assert.match(bookHtml,/EUC_DEV540_companyPhoto/);assert.match(bookHtml,/EUC_DEV540_saveCompanyPhoto/);assert.match(bookHtml,/class="breadcrumb"/);assert.match(bookHtml,/id="map"/);assert.match(bookHtml,/EUC_DEV547_bookMapData/);assert.match(bookHtml,/Page précédente/);assert.match(bookHtml,/value="ALL">Tous/);assert.match(server,/EUC_ENTREPRISES_PHOTOS_PFMP/)});
test('le book élèves et familles est autonome, épuré et sans historique nominatif',()=>{assert.match(studentBookHtml,/Book des entreprises — élèves et familles/);assert.doesNotMatch(studentBookHtml,/Entreprises ayant accueilli des jeunes/);assert.doesNotMatch(studentBookHtml,/Consultation publique/);assert.doesNotMatch(studentBookHtml,/Données actualisées sur les trois dernières années/);assert.match(studentBookHtml,/EUC_DEV546_studentBookData/);assert.match(studentBookHtml,/Responsables connus/);assert.match(studentBookHtml,/Tuteurs connus/);assert.doesNotMatch(studentBookHtml,/Professeur visiteur/);assert.doesNotMatch(studentBookHtml,/<th>Élève<\/th>/);assert.doesNotMatch(studentBookHtml,/SIRET/);assert.match(server,/function EUC_DEV546_studentBookData/)});
test('la bulle publique rappelle chaque diplôme accueilli une seule fois',()=>{assert.match(studentBookHtml,/Diplômes accueillis/);assert.match(studentBookHtml,/x\.diplomes/);assert.match(server,/diplomes:\(c\.diplomes\|\|\[\]\)\.map/)});
test('les fiches présentent les années des contacts avant leur nom',()=>{assert.match(studentBookHtml,/function contactYears\(c\)/);assert.match(studentBookHtml,/esc\(years\)\+' — '/);assert.match(bookHtml,/c\.annees&&c\.annees\.length/)});
test('toutes les bulles cartographiques proposent un itinéraire externe sûr',()=>{for(const html of [studentBookHtml,bookHtml,mapHtml,apprenticeMapHtml]){assert.match(html,/Itinéraire depuis ma position/);assert.match(html,/https:\/\/www\.google\.com\/maps\/dir\/\?api=1&amp;destination=/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);assert.match(html,/function routeLink\(/)}});
test('les actions asynchrones du book familles sont protégées',()=>{assert.match(studentBookHtml,/let DATA=\[\],LOADING=false/);assert.match(studentBookHtml,/if\(LOADING\)return/);assert.match(studentBookHtml,/MAP_BUSY/);assert.match(studentBookHtml,/button:disabled/);assert.match(studentBookHtml,/Le serveur n’a pas répondu sous 20 secondes/)});
test('le book familles propose filtres publics carte et pagination sans filtre nominatif',()=>{for(const id of ['family','diploma','city','company','sort','pageSize','map','prevPage','nextPage'])assert.ok(studentBookHtml.includes('id="'+id+'"'),id);assert.doesNotMatch(studentBookHtml,/id="student"/);assert.doesNotMatch(studentBookHtml,/id="teacher"/)});
test('les fils publics proposent leur accueil sans palier administratif',()=>{assert.match(studentBookHtml,/id="home" href="https:\/\/pfmp\.loucodi\.fr\/"/);assert.doesNotMatch(studentBookHtml,/Administration PFMP/);assert.match(bookHtml,/id="adminCrumb"/);assert.match(bookHtml,/else \$\('adminCrumb'\)\.remove\(\)/);assert.match(apprenticeMapHtml,/else \$\('adminCrumb'\)\.remove\(\)/)});
test('une fiche entreprise centre une seule entreprise et résout ponctuellement un point manquant',()=>{assert.match(studentBookHtml,/function showCurrentPoint\(c\).*LAYER\.clearLayers\(\).*1 entreprise géolocalisée/s);assert.match(studentBookHtml,/function focusCurrent\(\).*EUC_DEV560_publicCompanyPoint/s);assert.match(studentBookHtml,/busy\('detailMap',true,'Localisation…'\)/);assert.doesNotMatch(studentBookHtml,/function focusCurrent\(\)\{[^}]*mapLoad\(c\)/);assert.match(bookHtml,/function focusCurrent\(\).*MAP_LAYER\.clearLayers\(\).*historyLoaded:true.*1 entreprise géolocalisée/s);assert.doesNotMatch(bookHtml,/function focusCurrent\(\)\{[^}]*loadMap\(c\)/)});
test('la fiche publique charge seulement les photos dont la diffusion est autorisée',()=>{assert.match(studentBookHtml,/id="detailPhoto"/);assert.match(studentBookHtml,/EUC_DEV551_publicCompanyPhoto/);assert.match(server,/function EUC_DEV551_publicCompanyPhoto/);assert.match(server,/Droit_diffusion/)});
test('le book personnels retombe sur la projection publique si Apps Script masque l’identité',()=>{assert.match(server,/function EUC_DEV538_afficherBookStaff\(e\)/);assert.match(server,/if\(!EUC_DEV538_staffAllowed_\(\)\)return EUC_DEV546_afficherBookEleves\(e\)/)});
test('le catalogue cartographique public ne traverse plus le catalogue administrateur',()=>{assert.match(geo,/if\(requireAdmin\)catalog=EUC_DEV368_catalog\(year\)/);assert.match(geo,/EUC_DEV456_familyPersistentGet_/);assert.match(geo,/function EUC_DEV441_catalogPublic\(year\)\{return EUC_DEV441_catalog_\(year,false\);\}/)});
test('la carte apprentis recalcule sa taille après le rendu',()=>{assert.match(apprenticeMapHtml,/map\.invalidateSize\(true\)/);assert.match(apprenticeMapHtml,/leaflet-container \.leaflet-tile/)});
test('la carte apprentis charge la feuille Leaflet sans SRI bloquant dans Apps Script',()=>{assert.match(apprenticeMapHtml,/<link rel="stylesheet" href="https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css">/);assert.doesNotMatch(apprenticeMapHtml,/leaflet\.css" integrity=/)});
test('la page quotas permet de revenir à l’administration et à l’accueil',()=>{assert.match(quotaHtml,/aria-label="Fil d’Ariane"/);assert.match(quotaHtml,/id="admin"/);assert.match(quotaHtml,/alternance\.loucodi\.fr/);assert.match(quotaHtml,/page=admin-pfmp/)});
test('les books nominatifs repèrent les apprentis et distinguent les deux décomptes',()=>{assert.match(bookHtml,/class="apprentice-a"/);assert.match(bookHtml,/scolairesAccueillis/);assert.match(bookHtml,/apprentisAccueillis/);assert.match(bookHtml,/Statut/)});
test('le tableau des quotas rend les chiffres lisibles et explique les compteurs',()=>{assert.match(quotaHtml,/td\.num\{font-size:16px/);assert.match(quotaHtml,/Futurs — début à venir/);assert.match(quotaHtml,/Transmis au CFA — total/)});
test('les indicateurs de quotas exposent leur ventilation au survol et au clavier',()=>{assert.match(quotaHtml,/class="kpi" tabindex="0"/);assert.match(quotaHtml,/class="kpi-detail"/);assert.match(quotaHtml,/detailByMetric/);assert.match(quotaHtml,/LP \/ LGT puis classe/)});
test('la gestion des apprentis intègre le bilan métier complet dans les deux modes',()=>{assert.match(apprenticesHtml,/Bilan des apprentis par diplôme et classe/);assert.match(apprenticesHtml,/EUC_DEV541_apprentissageDashboardPublic/);for(const label of ['Quota fixé','Apprentis','Futurs apprentis','Dossiers remis','Transmis au CFA','Contrats valides','Classe entière','Mixité'])assert.match(apprenticesHtml,new RegExp(label));assert.match(apprenticesHtml,/body\.dev252-readonly #dev541QuotaAdmin/)});
test('le bilan apprentissage est placé après les apprentis et regroupé par accordéons',()=>{assert.ok(apprenticesHtml.indexOf('id="results"')<apprenticesHtml.indexOf('id="dev541QuotaPanel"'));assert.match(apprenticesHtml,/class="dev558-family"/);assert.match(apprenticesHtml,/label==='BAC PRO'&&!classEl\.value\?' open'/);assert.match(apprenticesHtml,/syncClassView/)});
test('la carte des apprentis affiche un indicateur avant la navigation',()=>{assert.match(apprenticesHtml,/#dev545ApprenticeMapAdmin,#dev545ApprenticeMapPublic/);assert.match(apprenticesHtml,/Ouverture de la carte…/);assert.match(apprenticesHtml,/setTimeout\(function\(\)\{a\.removeAttribute\('aria-busy'\)/)});
test('le tableau principal utilise les wrappers de comptage configurables',()=>{assert.match(server,/function EUC_DEV545_dashboardLive/);assert.match(server,/function EUC_DEV545_dashboardDetails/);assert.match(apprenticesHtml,/EUC_DEV545_dashboardLive/);assert.match(apprenticesHtml,/EUC_DEV545_dashboardDetails/);assert.doesNotMatch(apprenticesHtml,/\.EUC_DEV250_dashboardLive\(/);assert.doesNotMatch(apprenticesHtml,/\.EUC_DEV251_dashboardDetails\(/)});
test('les indicateurs intégrés reprennent la même ventilation accessible',()=>{assert.match(apprenticesHtml,/dev544-total-detail/);assert.match(apprenticesHtml,/tabindex="0"/);assert.match(apprenticesHtml,/dev544DetailByMetric/)});
test('les classes exclues disparaissent aussi du sélecteur apprentissage',()=>{assert.match(apprenticesHtml,/activeClassNames/);assert.match(apprenticesHtml,/option\.disabled=!active/);assert.match(apprenticesHtml,/option\.hidden=!active/);assert.match(apprenticesHtml,/MutationObserver\(filterClassOptions\)/)});
test('le bilan intégré protège son chargement asynchrone',()=>{assert.match(apprenticesHtml,/reload\.disabled=!!on/);assert.match(apprenticesHtml,/setTimeout\(function\(\)/);assert.match(apprenticesHtml,/Le bilan n’a pas répondu sous 20 secondes/);assert.match(apprenticesHtml,/withFailureHandler/)});
test('la carte utilise le service nominatif paresseux et une histoire défilante',()=>{assert.match(mapHtml,/EUC_DEV538_mapData/);assert.match(mapHtml,/EUC_DEV538_companyHistory/);assert.match(mapHtml,/popup-history\{max-height:230px;overflow:auto/);assert.match(mapHtml,/Professeur visiteur/);assert.match(mapHtml,/PARENT/);assert.match(server,/function EUC_DEV538_companyHistory/)});
test('la carte de classe conserve le filtre pendant le chargement parallèle et sait revenir',()=>{assert.match(mapHtml,/CATALOG_READY=false,MAP_REQUESTED=false/);assert.match(mapHtml,/CATALOG_READY\?'':P\.classe/);assert.match(mapHtml,/if\(!MAP_REQUESTED\)\{MAP_REQUESTED=true;show\(\)\}/);assert.match(mapHtml,/id="backToClass"/);assert.match(mapHtml,/EUC_DEV558_PFMP_MAP_NAV/);assert.match(detailHtml,/'cartographie-pfmp':1/)});
test('les PFMP ordinaires ne montrent pas le choix de fin de Terminale',()=>{assert.match(detailHtml,/Le choix de fin de Terminale appartient exclusivement au parcours/);assert.match(detailHtml,/periodLabel\.indexOf\('P\.DIF'\)<0/);assert.match(detailHtml,/Ouverture de la carte…/);assert.match(detailHtml,/status-pill\{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;text-align:center/)});
test('la cartographie apprentis est dédiée et strictement en lecture seule',()=>{assert.match(apprenticeMapHtml,/Cartographie des apprentis/);assert.match(apprenticeMapHtml,/EUC_DEV545_apprenticeMapData/);assert.match(apprenticeMapHtml,/Lecture seule/);assert.match(apprenticeMapHtml,/Professeur visiteur/);assert.doesNotMatch(apprenticeMapHtml,/save|enregistrer|supprimer/i);assert.match(apprenticesHtml,/cartographie-apprentis-pfmp/);assert.match(apprenticesHtml,/cartographie-apprentis-public-pfmp/)});
test('le book propose un rattachement manuel sans fusion automatique',()=>{assert.match(bookHtml,/Rattacher cette appellation/);assert.match(bookHtml,/EUC_DEV545_linkCompanyAlias/);assert.match(bookHtml,/Dissocier/);assert.match(server,/EUC_DEV545_COMPANY_ALIASES_PROP_/);assert.match(server,/function EUC_DEV545_linkCompanyAlias/);assert.match(server,/function EUC_DEV545_unlinkCompanyAlias/)});
test('la donnée cartographique conserve le SIRET pour la jointure',()=>assert.match(geo,/key:x\.key,siret:x\.siret\|\|''/));

test('les communes sont extraites après le code postal sans confondre un quartier ou une corniche',()=>{
  const c=context();
  assert.equal(c.EUC_DEV547_city_('RN 2210 QUARTIER LES VIGNASSES 06510 GATTIERES'),'GATTIERES');
  assert.equal(c.EUC_DEV547_city_('MOYENNE CORNICHE DES PUGETS'),'');
  assert.equal(c.EUC_DEV547_city_('QUARTIER LES VIGNASSES'),'');
  assert.equal(c.EUC_DEV547_city_('15 RUE DE BELGIQUE, 06000 Nice'),'NICE');
  assert.equal(c.EUC_DEV547_city_('1 AVENUE ALBERT II, MONACO'),'MONACO');
  assert.equal(c.EUC_DEV547_city_('30 ALLEE DES PECHEURS, 06700 St-Laurent-du-Var'),'SAINT LAURENT DU VAR');
  assert.equal(c.EUC_DEV547_city_('1 AVENUE TEST, 98000 MONACO, MONACO'),'MONACO');
});

test('le filtre ville fusionne casse accents et tirets puis compare uniquement la commune',()=>{
  const c=context(),facets=c.EUC_DEV540_facets_([{entreprise:'A',ville:'Monaco',historique:[]},{entreprise:'B',ville:'MONACO',historique:[]},{entreprise:'C',ville:'Cagnes-sur-Mer',historique:[]},{entreprise:'D',ville:'CAGNES SUR MER',historique:[]}]);
  assert.deepEqual(Array.from(facets.ville),['CAGNES SUR MER','MONACO']);
  c.EUC_DEV549_publicBookIndex_=()=>[{entreprise:'GARAGE GATTIERES',adresse:'RN 2210 QUARTIER LES VIGNASSES 06510 GATTIERES',ville:'GATTIERES',familles:[],diplomes:[],derniereSaisie:''}];
  assert.equal(c.EUC_DEV549_publicBookFiltered_({ville:'Gattières'}).length,1);
  assert.equal(c.EUC_DEV549_publicBookFiltered_({ville:'Quartier les Vignasses'}).length,0);
});

test('le book réunit une entreprise reçue avec puis sans SIRET',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/\s*,\s*/g,', ').trim();c.EUC_DEV441_geoClassify_=()=>({pays:'FRANCE'});c.EUC_DEV537_studentKey_=x=>x.eleveId?'E'+x.eleveId:'';c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Test'});c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];
  const detail=(siret,eleveId,nom)=>({famille:'BACPRO',classe:{id:24,nom:'TCAR'},periode:{id:62,libelle:'PFMP n°1'},lignes:[{entreprise:'ILES.COM',adresseEntreprise:"29 RUE D'ANGLETERRE 06000 NICE",siretEntreprise:siret,eleveId,nom,prenom:'Test'}]});
  c.EUC_DEV445_geoSnapshotDetails_=()=>[detail('',1,'ALPHA')];c.EUC_DEV513_geoAccessDetails_=()=>[detail('52917963200011',1,'ALPHA'),detail('52917963200011',2,'BETA')];c.EUC_DEV537_mergeAnnualCandidates_=()=>[{entreprise:'ILES.COM',adresse:"29 RUE D'ANGLETERRE 06000 NICE",siret:'52917963200011',elevesAccueillis:2,latitude:43.7,longitude:7.2}];c.EUC_DEV538_optionalRecords_=()=>[];c.EUC_DEV538_schoolYearMap_=()=>({});
  const out=c.EUC_DEV538_history_({annee:'2026-2027'});assert.equal(out.length,1);assert.equal(out[0].siret,'52917963200011');assert.equal(out[0].historique.length,2);assert.equal(out[0].elevesAccueillis,2);
});

test('un contrat d’apprentissage historique expose ses vraies dates et ses contacts',()=>{
  const c=context();
  const info=c.EUC_DEV546_contractInfo_({fields:{Eleve:7,Annee_scolaire:'2026-2027',Date_contrat_officielle:'2026-09-01',Date_debut:'2026-09-07',Date_fin:'2028-08-31',Date_rupture_contrat:'2027-02-15',Nom_entreprise:'SOCIETE TEST',Nom_commercial:'ENSEIGNE TEST',SIRET:'123 456 789 01234',Adresse_entreprise:'1 RUE TEST',Code_postal:'06000',Ville:'NICE',Responsable_nom:'Mme Responsable',Tuteur_nom:'M. Tuteur',Tuteur_telephone:'0102030405'}},'2026-2027');
  assert.equal(info.eleveId,7);assert.equal(info.entreprise,'ENSEIGNE TEST');assert.equal(info.siret,'12345678901234');assert.equal(info.periode,'Contrat du 07/09/2026 au 15/02/2027');assert.equal(info.responsable,'Mme Responsable');assert.equal(info.tuteur,'M. Tuteur');assert.equal(info.telephoneTuteur,'0102030405');
});

test('un identifiant Grist d’année sur le contrat ne remplace pas le libellé scolaire résolu',()=>{
  const c=context(),info=c.EUC_DEV546_contractInfo_({fields:{Eleve:7,Annee_scolaire:42,Date_debut:'2026-09-07',Date_fin:'2028-08-31',Entreprise:'ENTREPRISE TEST',Adresse_entreprise:'1 RUE TEST',Code_postal:'06000',Ville:'NICE'}},'2026-2027');
  assert.equal(info.annee,'2026-2027');
});

test('le book remplace les fausses périodes PFMP d’un apprenti par une seule période de contrat',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/\s*,\s*/g,', ').trim();c.EUC_DEV441_geoClassify_=()=>({pays:'FRANCE'});c.EUC_DEV537_studentKey_=x=>x.eleveId?'E'+x.eleveId:'';c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO MELEC'});c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV541_apprentissageClasses_=()=>[{id:24,classe:'TMELEC',famille:'BACPRO',niveau:'Terminale'}];
  const details=['PFMP n°1','PFMP n°2','P.dif.'].map((libelle,i)=>({famille:'BACPRO',classe:{id:24,nom:'TMELEC'},periode:{id:60+i,libelle},lignes:[{entreprise:'ENTREPRISE APPRENTISSAGE TEST',adresseEntreprise:'1 RUE TEST, 06000 NICE',siretEntreprise:'12345678901234',eleveId:7,nom:'ELEVE',prenom:'TEST',apprenti:true}]}));
  c.EUC_DEV445_geoSnapshotDetails_=()=>details;c.EUC_DEV513_geoAccessDetails_=()=>[];c.EUC_DEV537_mergeAnnualCandidates_=()=>[];c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:7,fields:{Nom:'ELEVE',Prenom:'TEST',Classe:24,Annee_scolaire_code:'2026-2027'}}]:[];c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:70,fields:{Eleve:7,Annee_scolaire:'2026-2027',Date_debut:'2026-09-01',Date_fin:'2028-08-31',Entreprise:'ENTREPRISE APPRENTISSAGE TEST',SIRET:'12345678901234',Adresse_entreprise:'1 RUE TEST',Code_postal:'06000',Ville:'NICE',Tuteur_nom:'Tuteur Test'}}]:[];
  const out=c.EUC_DEV538_history_({annee:'2026-2027'});assert.equal(out.length,1);assert.equal(out[0].historique.length,1);assert.equal(out[0].historique[0].apprenti,true);assert.equal(out[0].historique[0].periode,'Contrat du 01/09/2026 au 31/08/2028');assert.equal(out[0].elevesAccueillis,1);assert.equal(out[0].apprentisAccueillis,1);assert.equal(out[0].scolairesAccueillis,0);
});

test('une entreprise accueillant seulement un apprenti reprend son point géocodé validé',()=>{
  const c=context(),siret='31221230101219';
  c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/,\s*6600,\s*ANTIBES$/i,' 06600 ANTIBES').replace(/\s*,\s*/g,' ').replace(/\s+/g,' ').trim();
  c.EUC_DEV443_geoIdentity_=(entreprise,adresse,sir)=>sir?'SIRET|'+sir:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);
  c.EUC_DEV441_geoClassify_=()=>({pays:'FRANCE'});c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Maintenance des Véhicules légers'});c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV541_apprentissageClasses_=()=>[{id:24,classe:'TMVA1',famille:'BACPRO',niveau:'Terminale'}];
  c.EUC_DEV445_geoSnapshotDetails_=()=>[];c.EUC_DEV513_geoAccessDetails_=()=>[];c.EUC_DEV537_mergeAnnualCandidates_=()=>[];
  c.EUC_DEV441_geoRows_=()=>[{SIRET:siret,Entreprise:'RENAULT RETAIL GROUP ANTIBES',Adresse_source:"BRETELLE DE L'AUTOROUTE 1580 ROUTE DE GRASSE 06600 ANTIBES",Latitude:43.58,Longitude:7.11,Statut:'GEOCODE_AUTOMATIQUE'}];
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:7,fields:{Nom:'ELEVE',Prenom:'APPRENTI',Classe:24,Annee_scolaire_code:'2026-2027'}}]:[];
  c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:70,fields:{Eleve:7,Annee_scolaire:'2026-2027',Date_debut:'2026-09-01',Date_fin:'2027-08-31',Entreprise:'RENAULT RETAIL GROUP ANTIBES',SIRET:siret,Adresse_entreprise:"BRETELLE DE L'AUTOROUTE 1580 ROUTE DE GRASSE",Code_postal:6600,Ville:'ANTIBES'}}]:[];
  const out=c.EUC_DEV538_history_({annee:'2026-2027'});assert.equal(out.length,1);assert.equal(out[0].adresse,"BRETELLE DE L'AUTOROUTE 1580 ROUTE DE GRASSE 06600 ANTIBES");assert.equal(out[0].latitude,43.58);assert.equal(out[0].longitude,7.11);assert.equal(out[0].apprentisAccueillis,1);
});

test('la fiche publique localise à la demande une entreprise sans point sans écrire Grist',()=>{
  const c=context(),cache={},calls=[];c.CacheService={getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=String(v)}})};c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/,\s*6600,\s*ANTIBES$/i,' 06600 ANTIBES').replace(/\s*,\s*/g,' ').replace(/\s+/g,' ').trim();c.EUC_DEV441_geoClassify_=()=>({pays:'FRANCE',codePostal:'06600'});c.EUC_DEV549_publicBookIndex_=()=>[{entreprise:'RENAULT RETAIL GROUP ANTIBES',adresse:"BRETELLE DE L'AUTOROUTE 1580 ROUTE DE GRASSE 06600 ANTIBES",latitude:null,longitude:null}];c.UrlFetchApp={fetch:url=>{calls.push(url);return{getContentText:()=>JSON.stringify({features:[{geometry:{coordinates:[7.11,43.58]},properties:{type:'street',postcode:'06600'}}]})}}};c.EUC_DEV540_geoCandidate_=(features)=>({specific:true,feature:features[0]});
  const q={entreprise:'RENAULT RETAIL GROUP ANTIBES',adresse:"BRETELLE DE L'AUTOROUTE 1580 ROUTE DE GRASSE, 6600, ANTIBES"},out=c.EUC_DEV560_publicCompanyPoint(q),cached=c.EUC_DEV560_publicCompanyPoint(q);assert.equal(out.ok,true);assert.equal(out.latitude,43.58);assert.equal(out.longitude,7.11);assert.equal(cached.ok,true);assert.equal(calls.length,1);assert.match(calls[0],/postcode=06600/);assert.equal(JSON.stringify(out).includes('ELEVE'),false);
});

test('le service élèves et familles projette uniquement les champs autorisés',()=>{
  const c=context();c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV441_digest_=v=>'digest-'+String(v);c.EUC_DEV538_history_=q=>{assert.equal(q.annee,'ALL');assert.equal(q.fenetre,3);assert.equal(q.eleve,undefined);assert.equal(q.professeur,undefined);return[{identity:'SECRET-ID',siret:'12345678901234',entreprise:'GARAGE PUBLIC',adresse:'1 RUE PUBLIQUE',ville:'NICE',elevesAccueillis:3,scolairesAccueillis:1,apprentisAccueillis:2,responsables:[{nom:'Mme Responsable',annee:'2026-2027',annees:['2026-2027','2025-2026'],telephone:'0102030405',courriel:'secret@example.test',telephones:['0102030405'],courriels:['secret@example.test']}],tuteurs:[{nom:'M. Tuteur',annee:'2026-2027',annees:['2026-2027'],telephone:'0600000000',courriel:'tuteur@example.test',telephones:['0600000000'],courriels:['tuteur@example.test']}],historique:[{eleve:'NOM ELEVE SECRET',classe:'TCAR',famille:'BACPRO',diplome:'BAC PRO SECRET',periode:'PFMP n°1',professeurVisiteur:'PROF SECRET'}]}]};
  const out=c.EUC_DEV546_studentBookData({annee:'2026-2027',fenetre:10,eleve:'SECRET',professeur:'SECRET'}),json=JSON.stringify(out);assert.equal(out.fenetre,3);assert.equal(out.entreprises[0].entreprise,'GARAGE PUBLIC');assert.equal(out.entreprises[0].responsables[0].nom,'Mme Responsable');assert.equal(out.entreprises[0].responsables[0].annee,'2026-2027');assert.deepEqual(Array.from(out.entreprises[0].responsables[0].annees),['2026-2027','2025-2026']);assert.equal(out.entreprises[0].responsables[0].telephone,'0102030405');assert.equal(out.entreprises[0].responsables[0].courriel,'secret@example.test');assert.deepEqual(Array.from(out.facets.diplome),['BAC PRO SECRET']);assert.deepEqual(Array.from(out.entreprises[0].diplomes),['BAC PRO SECRET']);for(const secret of ['NOM ELEVE SECRET','PROF SECRET','PFMP n°1','12345678901234','SECRET-ID'])assert.equal(json.includes(secret),false,secret);
});

test('les contacts sont regroupés par coordonnées puis triés du plus récent au plus ancien',()=>{
  const c=context(),out=c.EUC_DEV547_contacts_([{annee:'2024-2025',dateSaisie:'2024-11-01',responsable:'Ancien Contact',telephoneResponsable:'04 00 00 00 00'},{annee:'2026-2027',dateSaisie:'2026-01-15',responsable:'Contact Même Année',telephoneResponsable:'04 11 11 11 11'},{annee:'2025-2026',dateSaisie:'2025-10-01',responsable:'A. LECA',telephoneResponsable:'+33 6 12 34 56 78',courrielResponsable:'contact@example.test'},{annee:'2026-2027',dateSaisie:'2026-09-12',responsable:'LECA Anthony',telephoneResponsable:'06 12 34 56 78',courrielResponsable:'CONTACT@example.test'},{annee:'2024-2025',dateSaisie:'2024-09-01',responsable:'LECA',telephoneResponsable:'',courrielResponsable:'contact@example.test'}],'responsable');
  assert.equal(out.length,3);assert.equal(out[0].nom,'LECA Anthony');assert.equal(out[0].annee,'2026-2027');assert.deepEqual(Array.from(out[0].annees),['2026-2027','2025-2026','2024-2025']);assert.equal(out[0].telephones.length,1);assert.equal(out[0].courriels.length,1);assert.equal(out[1].nom,'Contact Même Année');assert.equal(out[1].annee,'2026-2027');assert.equal(out[2].nom,'Ancien Contact');assert.equal(out[2].annee,'2024-2025');
});

test('un nom et un prénom inversés regroupent le contact sans perdre ses coordonnées',()=>{
  const c=context(),out=c.EUC_DEV547_contacts_([{annee:'2026-2027',dateSaisie:'2026-09-01',responsable:'JULIEN Steve',telephoneResponsable:'06 59 50 06 06',courrielResponsable:'compta@example.test'},{annee:'2026-2027',dateSaisie:'2026-09-02',responsable:'Steve Julien',telephoneResponsable:'04 93 18 98 00',courrielResponsable:'info@example.test'}],'responsable');
  assert.equal(out.length,1);assert.equal(out[0].nom,'JULIEN Steve');assert.deepEqual(Array.from(out[0].telephones).sort(),['04 93 18 98 00','06 59 50 06 06']);assert.deepEqual(Array.from(out[0].courriels),['compta@example.test','info@example.test']);
});

test('un nom seul ou une simple ressemblance ne fusionne jamais deux contacts sans coordonnée commune',()=>{
  const c=context(),out=c.EUC_DEV547_contacts_([{responsable:'JULIEN',telephoneResponsable:'0101010101'},{responsable:'JULIEN Steve',telephoneResponsable:'0202020202'},{responsable:'JULIAN Steve',telephoneResponsable:'0303030303'}],'responsable');assert.equal(out.length,3);
});

test('les noms de contacts sont présentés proprement sans modifier la saisie source',()=>{
  const c=context();assert.equal(c.EUC_DEV562_prettyName_('duranti alex'),'Duranti Alex');assert.equal(c.EUC_DEV562_prettyName_('JEAN-PIERRE de LA TOUR'),'Jean-Pierre de la Tour');assert.equal(c.EUC_DEV562_prettyName_('a. martin'),'A. Martin');assert.equal(c.EUC_DEV562_prettyName_('A.MARTIN'),'A. Martin');
});

test('une correction administrateur se superpose à la convention sans fusion floue',()=>{
  const c=context(),contacts=c.EUC_DEV547_contacts_([{responsable:'duranti alex',telephoneResponsable:'04 00 00 00 01'},{responsable:'Durant Alex',telephoneResponsable:'06 00 00 00 02'}],'responsable');assert.equal(contacts.length,2);const target=contacts.filter(x=>x.nom==='duranti alex')[0],key=c.EUC_DEV562_contactKey_(target);c.EUC_DEV562_contactRows_=()=>[{id:1,fields:{Cle_entreprise:'SIRET|123',Role_contact:'RESPONSABLE',Cle_contact_source:key,Nom_source:target.nom,Nom_corrige:'Durant Alex',Actif:true}}];const out=c.EUC_DEV562_applyContactCorrections_({identity:'SIRET|123'},contacts,'RESPONSABLE');assert.equal(out.length,1);assert.equal(out[0].nom,'Durant Alex');assert.deepEqual(Array.from(out[0].telephones).sort(),['04 00 00 00 01','06 00 00 00 02']);assert.match(out[0].sourceNom,/duranti alex/);assert.match(out[0].sourceNom,/Durant Alex/);
});

test('les corrections de contacts ne relisent la révision Grist qu’une fois par exécution',()=>{
  const c=context();let revisions=0,reads=0;c.EUC_DEV457_revision_=()=>{revisions++;return'r1'};c.EUC_DEV538_optionalRecords_=()=>{reads++;return[]};for(let i=0;i<300;i++)c.EUC_DEV562_contactRows_();assert.equal(revisions,1);assert.equal(reads,1);
});

test('le book admin expose la correction des contacts, le profil et le journal de relation',()=>{
  for(const token of ['contactEditor','contactDirectory','EUC_DEV563_contactDirectory','EUC_DEV562_saveContactCorrection','EUC_DEV562_saveCompanySite','EUC_DEV562_saveCompanyLogo','EUC_DEV562_saveRelationship','Historique de la relation avec le lycée','Créer un dossier Drive'])assert.match(bookHtml,new RegExp(token));assert.match(relations,/EUC_ENTREPRISES_PROFILS/);assert.match(relations,/EUC_ENTREPRISES_CONTACTS_CORRECTIONS/);assert.match(relations,/EUC_RELATIONS_ENTREPRISES/);assert.match(relations,/BROUILLON/);assert.match(relations,/PUBLIE/);
});

test('les catégories d’actions ont une portée centrale prudente et réglable',()=>{
  assert.match(bookHtml,/Paramétrer les catégories d’actions/);assert.match(bookHtml,/Visible par les professeurs|Professeurs/);assert.match(bookHtml,/Élèves et familles/);assert.match(bookHtml,/EUC_DEV563_saveCategorySettings/);assert.match(relations,/EUC_RELATIONS_ENTREPRISES_CATEGORIES/);assert.match(relations,/Visible_professeurs/);assert.match(relations,/Visible_familles/);const c=context();c.EUC_DEV563_categoryRows_=()=>[];const row=c.EUC_DEV563_categorySettings_().find(x=>x.code==='MECENAT_TAXE_APPRENTISSAGE');assert.equal(row.visibleAdministration,true);assert.equal(row.visibleProfesseurs,false);assert.equal(row.visibleFamilles,false);assert.equal(row.configured,false);
});

test('la réduction locale des images transmet bien la photo et le logo au serveur',()=>{
  assert.match(bookHtml,/resizePhoto\(file,data=>\{busyButton\('photoSave',false\);call\('EUC_DEV540_saveCompanyPhoto'/);assert.match(bookHtml,/resizePhoto\(file,data=>\{busyButton\('logoSave',false\);call\('EUC_DEV562_saveCompanyLogo'/);
});

test('le book familles ne reçoit que le profil et les actions publiques publiées',()=>{
  assert.match(studentBookHtml,/EUC_DEV562_publicCompanyProfile/);assert.match(studentBookHtml,/Actions menées avec le lycée/);assert.match(relations,/scope==='PUBLIC'/);assert.match(relations,/status!=='PUBLIE'/);assert.match(relations,/setting\.visibleFamilles===true/);assert.doesNotMatch(studentBookHtml,/Drive_folder_id|Created_by|Updated_by/);
});

test('la projection publique du journal écarte brouillons, visibilité interne et identifiants Drive',()=>{
  const c=context(),base={Cle_entreprise:'SIRET|123',Actif:true,Date_action:1791763200,Categorie:'VISITE_ENTREPRISE',Titre:'Visite',Description:'Découverte',Drive_folder_id:'secret-drive'};c.EUC_DEV562_profileRow_=()=>null;c.EUC_DEV563_categoryRows_=()=>[{id:1,fields:{Code_categorie:'VISITE_ENTREPRISE',Visible_professeurs:true,Visible_familles:true,Actif:true}}];c.EUC_DEV562_relationRows_=()=>[{id:1,fields:Object.assign({},base,{Statut:'PUBLIE',Visibilite:'PUBLIC',Lien_site_lycee:'https://lycee.example/action'})},{id:2,fields:Object.assign({},base,{Statut:'BROUILLON',Visibilite:'PUBLIC',Titre:'Brouillon'})},{id:3,fields:Object.assign({},base,{Statut:'PUBLIE',Visibilite:'PERSONNELS',Titre:'Interne'})}];const out=c.EUC_DEV562_profileData_({identity:'SIRET|123'},'PUBLIC');assert.equal(out.actions.length,1);assert.equal(out.actions[0].titre,'Visite');assert.equal(out.actions[0].driveUrl,undefined);assert.deepEqual(JSON.parse(JSON.stringify(out.actions[0].liens)),[{label:'Site du lycée',url:'https://lycee.example/action'}]);
});

test('la portée de catégorie et la restriction de chaque action se croisent sans fuite',()=>{
  const c=context(),settings={VISITE_ENTREPRISE:{visibleProfesseurs:true,visibleFamilles:true},MECENAT_TAXE_APPRENTISSAGE:{visibleProfesseurs:false,visibleFamilles:false}},event=(categorie,visibilite,statut='PUBLIE')=>({Categorie:categorie,Visibilite:visibilite,Statut:statut});assert.equal(c.EUC_DEV563_actionVisible_(event('VISITE_ENTREPRISE','HERITEE'),'STAFF',settings),true);assert.equal(c.EUC_DEV563_actionVisible_(event('VISITE_ENTREPRISE','HERITEE'),'PUBLIC',settings),true);assert.equal(c.EUC_DEV563_actionVisible_(event('VISITE_ENTREPRISE','PERSONNELS'),'PUBLIC',settings),false);assert.equal(c.EUC_DEV563_actionVisible_(event('VISITE_ENTREPRISE','ADMIN'),'STAFF',settings),false);assert.equal(c.EUC_DEV563_actionVisible_(event('MECENAT_TAXE_APPRENTISSAGE','PUBLIC'),'PUBLIC',settings),false);assert.equal(c.EUC_DEV563_actionVisible_(event('VISITE_ENTREPRISE','PUBLIC','BROUILLON'),'PUBLIC',settings),false);assert.equal(c.EUC_DEV563_actionVisible_(event('MECENAT_TAXE_APPRENTISSAGE','ADMIN','BROUILLON'),'ADMIN',settings),true);
});

test('le book ne conserve qu’un contrat cohérent par apprenti, entreprise et année',()=>{
  const c=context();c.EUC_DEV443_geoIdentity_=(entreprise,adresse,siret)=>siret?'SIRET|'+siret:'ADRESSE|'+c.EUC_DEV538_norm_(entreprise)+'|'+c.EUC_DEV538_norm_(adresse);const base={annee:'2026-2027',eleveId:7,entreprise:'GARAGE TEST',adresse:'1 RUE TEST 06000 NICE',siret:'12345678901234',debut:'2025-09-01'};
  const out=c.EUC_DEV557_canonicalContracts_([Object.assign({},base,{recordId:10,fin:'2025-06-30',periode:'Contrat incohérent'}),Object.assign({},base,{recordId:11,fin:'2027-06-30',periode:'Contrat cohérent'})]);assert.equal(out.length,1);assert.equal(out[0].recordId,11);assert.equal(out[0].periode,'Contrat cohérent');
});

test('la pagination limite à dix entreprises par défaut et conserve le total',()=>{
  const c=context(),list=Array.from({length:23},(_,i)=>({entreprise:'E'+i,historique:[]})),out=c.EUC_DEV547_bookResponse_({},list);assert.equal(out.total,23);assert.equal(out.entreprises.length,10);assert.equal(out.totalPages,3);assert.equal(out.page,1);const all=c.EUC_DEV547_bookResponse_({pageSize:'ALL'},list);assert.equal(all.entreprises.length,23);assert.equal(all.totalPages,1);
});

test('un rattachement d’appellation fusionne les accueils sans ligne technique vide',()=>{
  const c=context(),target='40822877300060',source='40822877300078',students=[{id:1,fields:{Nom:'ALPHA',Prenom:'Ana',Classe:24,Annee_scolaire_code:'2026-2027'}},{id:2,fields:{Nom:'BETA',Prenom:'Bilal',Classe:24,Annee_scolaire_code:'2026-2027'}}];c.EUC_DEV443_geoIdentity_=(e,a,s)=>s?'SIRET|'+s:'ADRESSE|'+c.EUC_DEV538_norm_(e)+'|'+c.EUC_DEV538_norm_(a);c.EUC_DEV443_normalizeAddress_=v=>String(v||'').replace(/\s*,\s*/g,', ').trim();c.EUC_DEV441_geoClassify_=()=>({pays:'MONACO'});c.EUC_DEV441_digest_=v=>'digest-'+v;c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Test'});c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV545_companyAliases_=()=>({['SIRET|'+source]:{target:'SIRET|'+target,entreprise:'SACOME CONTI',adresse:'1 AVENUE ALBERT II, MONACO',siret:target,sourceEntreprise:'SAM SACOME'}});c.EUC_DEV445_geoSnapshotDetails_=()=>[{famille:'BACPRO',classe:{id:24,nom:'TMP3D'},periode:{id:62,libelle:'PFMP n°1'},lignes:[{eleveId:1,nom:'ALPHA',prenom:'Ana',entreprise:'SACOME CONTI',adresseEntreprise:'1 AVENUE ALBERT II, MONACO',siretEntreprise:target,professeurVisiteur:'M. VISITEUR'}]}];c.EUC_DEV513_geoAccessDetails_=()=>[{famille:'BACPRO',classe:{id:24,nom:'TMP3D'},periode:{id:62,libelle:'PFMP n°1'},lignes:[{eleveId:1,entreprise:'SACOME CONTI',adresseEntreprise:'1 AVENUE ALBERT II, MONACO',siretEntreprise:target},{eleveId:2,entreprise:'SAM SACOME',adresseEntreprise:'1 AV PRINCE HEREDITAIRE ALBERT, MONACO',siretEntreprise:source}]}];c.EUC_DEV537_mergeAnnualCandidates_=()=>[{entreprise:'SACOME CONTI',adresse:'1 AVENUE ALBERT II, MONACO',siret:target,latitude:43.73,longitude:7.42}];c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?students:[];c.EUC_DEV538_optionalRecords_=table=>table==='EUC_ELEVES_PFMP'?students:table==='EUC_AFFECTATIONS_SUIVI_PFMP'?[{fields:{Annee_scolaire:'2026-2027',Type_suivi:'VISITE',Eleve:2,Nom_professeur_snapshot:'Mme VISITEUSE',Actif:true}}]:[];
  const out=c.EUC_DEV538_history_({annee:'2026-2027'});assert.equal(out.length,1);assert.equal(out[0].entreprise,'SACOME CONTI');assert.equal(out[0].historique.length,2);assert.deepEqual(Array.from(out[0].historique,h=>h.eleve).sort(),['ALPHA Ana','BETA Bilal']);assert.equal(out[0].historique.find(h=>h.eleve==='BETA Bilal').professeurVisiteur,'Mme VISITEUSE');assert.equal(out[0].historique.every(h=>h.periode==='PFMP n°1'),true);
});

test('le nom source explicitement rattaché reprend aussi les archives sans SIRET',()=>{
  const c=context(),aliases={'SIRET|40822877300078':{target:'SIRET|40822877300060',entreprise:'SACOME CONTI',adresse:'1 AVENUE ALBERT II, MONACO',siret:'40822877300060',sourceEntreprise:'SAM SACOME'}};const resolved=c.EUC_DEV550_aliasTargetByName_(' sam sacome ',aliases);assert.equal(resolved.identity,'SIRET|40822877300060');assert.equal(resolved.entreprise,'SACOME CONTI');assert.equal(resolved.siret,'40822877300060');
  const ambiguous=Object.assign({},aliases,{'ADRESSE|SAM SACOME|AUTRE':{target:'SIRET|99999999999999',entreprise:'AUTRE SACOME',sourceEntreprise:'SAM SACOME'}});assert.equal(c.EUC_DEV550_aliasTargetByName_('SAM SACOME',ambiguous),null);
});

test('la carte du book public n’expose aucune identité scolaire et conserve tous les diplômes après filtrage',()=>{
  const c=context();c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV441_digest_=v=>'digest-'+v;c.EUC_DEV538_history_=q=>{assert.equal(q.publicStudent,true);return[{identity:'SECRET',entreprise:'GARAGE PUBLIC',adresse:'1 RUE TEST 06000 NICE',ville:'NICE',latitude:43.7,longitude:7.2,siret:'12345678901234',elevesAccueillis:3,scolairesAccueillis:3,apprentisAccueillis:0,responsables:[],tuteurs:[],historique:[{eleve:'ELEVE SECRET',famille:'BACPRO',diplome:'BAC PRO SECRET',professeurVisiteur:'PROF SECRET'},{eleve:'AUTRE ELEVE',famille:'BTS',diplome:'BTS AUTRE'},{eleve:'TROISIEME ELEVE',famille:'BACPRO',diplome:'BAC PRO SECRET'}]}]};const out=c.EUC_DEV547_bookMapData({mode:'PARENTS',diplome:'BAC PRO SECRET'}),json=JSON.stringify(out);assert.equal(out.nominatif,false);assert.equal(out.points[0].historique,undefined);assert.equal(out.points[0].siret,undefined);assert.ok(out.points[0].key);assert.deepEqual(Array.from(out.points[0].diplomes),['BAC PRO SECRET','BTS AUTRE']);assert.equal(json.includes('ELEVE SECRET'),false);assert.equal(json.includes('PROF SECRET'),false);
});

test('le book public réutilise un cache non nominatif commun à la liste et à la carte',()=>{
  const c=context(),props={},cache={};let heavyCalls=0;c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]||'',setProperty:(k,v)=>{props[k]=String(v)},setProperties:o=>Object.keys(o).forEach(k=>{props[k]=String(o[k])})})};c.CacheService={getScriptCache:()=>({get:k=>Object.prototype.hasOwnProperty.call(cache,k)?cache[k]:null,put:(k,v)=>{cache[k]=String(v)}})};c.EUC_DEV538_yearsForScope_=()=>['2026-2027'];c.EUC_DEV441_digest_=v=>'digest-'+String(v).length;c.EUC_DEV538_history_=()=>{heavyCalls++;return[{identity:'SECRET-ID',siret:'12345678901234',entreprise:'ENTREPRISE CACHEE',adresse:'1 RUE TEST 06000 NICE',ville:'NICE',latitude:43.7,longitude:7.2,derniereSaisie:'2026-10-01',elevesAccueillis:1,scolairesAccueillis:1,apprentisAccueillis:0,responsables:[],tuteurs:[],historique:[{eleve:'ELEVE SECRET',professeurVisiteur:'PROF SECRET',famille:'BACPRO',diplome:'BAC PRO TEST'}]}]};
  const first=c.EUC_DEV546_studentBookData({}),second=c.EUC_DEV546_studentBookData({}),map=c.EUC_DEV547_bookMapData({mode:'PARENTS'}),stored=Object.values(props).join('');assert.equal(first.total,1);assert.equal(second.total,1);assert.equal(map.total,1);assert.equal(heavyCalls,1);for(const secret of ['ELEVE SECRET','PROF SECRET','12345678901234','SECRET-ID'])assert.equal(stored.includes(secret),false,secret);
});

test('le démarrage à froid du book public groupe les lectures de propriétés',()=>{assert.match(server,/getProperties\(\) remplace les treize lectures/);assert.match(server,/PropertiesService\.getScriptProperties\(\)\.getProperties\(\)\|\|\{\}/);assert.doesNotMatch(server,/if\(!raw\)try\{var props=PropertiesService\.getScriptProperties\(\);if\(props\.getProperty/)});

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

test('le calcul aligne apprentis futurs dossiers remis et contrats valides sur le tableau principal',()=>{
  const c=context(),now=Date.now(),future=d=>new Date(now+d*86400000).toISOString(),ago=d=>new Date(now-d*86400000).toISOString();
  const contract=c.EUC_DEV538_apprenticeState_({fields:{Date_contrat_officielle:ago(1),Date_debut:future(20),Date_fin:future(200),Dossier_remis:true,Dossier_transmis_CFA:true}},null,new Date(now));
  assert.equal(contract.current,true);assert.equal(contract.future,false);assert.equal(contract.contractValid,true);assert.equal(contract.dossierRemis,true);
  const workflow=c.EUC_DEV538_apprenticeState_({fields:{Dossier_remis:true,Date_remise_dossier:ago(2)}},null,new Date(now));
  assert.equal(workflow.current,false);assert.equal(workflow.future,true);
});

test('les effectifs apprentissage excluent tous les élèves déjà sortis',()=>{
  const c=context();c.EUC_DEV538_admin_=()=>true;c.EUC_DEV368_year=()=> '2026-2027';c.EUC_DEV368_catalog=()=>({classes:[{classeId:24,classe:'TCAR',famille:'BACPRO'}]});c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Carrossier Peintre Automobile'});c.EUC_DEV538_quotaConfig_=()=>({'2026-2027':{24:100}});
  const base={Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true};
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[
    {id:1,fields:{...base,Nom:'PRESENT',Prenom:'Actuel',Statut_scolarite:'PRESENT'}},
    {id:2,fields:{...base,Nom:'SORTI',Prenom:'Statut',Statut_scolarite:'SORTI'}},
    {id:3,fields:{...base,Nom:'SORTI',Prenom:'Date',Statut_scolarite:'PRESENT',Date_sortie:'2026-09-01'}},
    {id:4,fields:{...base,Nom:'ABSENT',Prenom:'Import',Present_dernier_import:false}},
    {id:5,fields:{...base,Nom:'INACTIF',Prenom:'Actif',Actif:false}},
    {id:6,fields:{...base,Nom:'PRESENT',Prenom:'Sortie future',Statut_scolarite:'PRESENT',Date_sortie:'2099-09-01'}}
  ]:[];
  c.EUC_DEV538_optionalRecords_=()=>[];
  const d=c.EUC_DEV538_apprentissageDashboard('2026-2027'),r=d.groups[0].lignes[0];
  assert.equal(r.effectif,2);assert.equal(r.quota,2);assert.equal(d.totals.effectif,2);
});

test('une classe est active par défaut tant qu’aucun réglage contraire n’existe',()=>{
  const c=context();assert.equal(c.EUC_DEV542_classActive_({},'2026-2027',24),true);assert.equal(c.EUC_DEV542_classActive_({'2026-2027':{24:true}},'2026-2027',24),true);assert.equal(c.EUC_DEV542_classActive_({'2026-2027':{24:false}},'2026-2027',24),false);
});

test('une classe exclue reste réglable mais sort des totaux listes et bilan public',()=>{
  const c=context(),now=Date.now(),ago=new Date(now-20*86400000).toISOString(),future=new Date(now+200*86400000).toISOString();
  c.EUC_DEV538_admin_=()=>true;c.EUC_DEV368_year=()=> '2026-2027';c.EUC_DEV541_apprentissageClasses_=()=>[{id:24,classe:'TCAR',famille:'BACPRO',niveau:'Terminale'},{id:41,classe:'1MELEC G',famille:'BACPRO',niveau:'Première'}];c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO Carrosserie',41:'BAC PRO MELEC G'});c.EUC_DEV538_quotaConfig_=()=>({'2026-2027':{24:30,41:30}});c.EUC_DEV542_activeClassesConfig_=()=>({'2026-2027':{24:true,41:false}});
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:1,fields:{Nom:'ACTIVE',Prenom:'Ana',Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}},{id:2,fields:{Nom:'EXCLU',Prenom:'Eva',Classe:41,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}}]:[];
  c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:10,fields:{Eleve:1,Annee_scolaire:'2026-2027',Date_contrat_officielle:ago,Date_debut:ago,Date_fin:future,Actif:true}},{id:11,fields:{Eleve:2,Annee_scolaire:'2026-2027',Dossier_distribue:true,Date_distribution_dossier:ago}}]:[];
  const adminData=c.EUC_DEV538_apprentissageDashboard('2026-2027');assert.equal(adminData.groups.length,2);assert.equal(adminData.groups[1].lignes[0].active,false);assert.equal(adminData.totals.effectif,1);assert.equal(adminData.totals.apprentis,1);assert.equal(adminData.totals.distribues,0);assert.equal(adminData.dossiers.length,0);assert.equal(adminData.relances.length,0);
  const publicData=c.EUC_DEV541_apprentissageDashboardPublic('2026-2027');assert.equal(publicData.groups.length,1);assert.equal(publicData.groups[0].lignes[0].classe,'TCAR');assert.equal(JSON.stringify(publicData).includes('1MELEC G'),false);
});

test('l’enregistrement conserve séparément quota et activation par année',()=>{
  const c=context(),written={};c.EUC_DEV538_admin_=()=>true;c.EUC_DEV538_quotaConfig_=()=>({'2025-2026':{24:20}});c.EUC_DEV542_activeClassesConfig_=()=>({'2025-2026':{24:true}});c.PropertiesService={getScriptProperties:()=>({setProperties:values=>Object.assign(written,values)})};
  const out=c.EUC_DEV538_saveQuotas({annee:'2026-2027',lignes:[{classeId:24,quotaPercent:30,active:true},{classeId:41,quotaPercent:25,active:false}]});assert.equal(out.actives,1);const quotas=JSON.parse(written[c.EUC_DEV538_QUOTAS_PROP_]),active=JSON.parse(written[c.EUC_DEV542_ACTIVE_CLASSES_PROP_]);assert.equal(quotas['2025-2026'][24],20);assert.equal(quotas['2026-2027'][41],25);assert.equal(active['2025-2026'][24],true);assert.equal(active['2026-2027'][41],false);
});

test('l’enregistrement conserve aussi la modalité par classe',()=>{
  const c=context(),written={};c.EUC_DEV538_admin_=()=>true;c.EUC_DEV538_quotaConfig_=()=>({});c.EUC_DEV542_activeClassesConfig_=()=>({});c.EUC_DEV545_classModesConfig_=()=>({'2025-2026':{24:'CLASSE_ENTIERE'}});c.PropertiesService={getScriptProperties:()=>({setProperties:values=>Object.assign(written,values)})};
  c.EUC_DEV538_saveQuotas({annee:'2026-2027',lignes:[{classeId:24,quotaPercent:30,active:true,mode:'MIXITE'},{classeId:41,quotaPercent:25,active:true,mode:'CLASSE_ENTIERE'}]});
  const modes=JSON.parse(written[c.EUC_DEV545_CLASS_MODES_PROP_]);assert.equal(modes['2025-2026'][24],'CLASSE_ENTIERE');assert.equal(modes['2026-2027'][24],'MIXITE');assert.equal(modes['2026-2027'][41],'CLASSE_ENTIERE');
});

test('le bilan ventile les apprentis selon la modalité configurée',()=>{
  const c=context(),now=Date.now(),ago=new Date(now-20*86400000).toISOString(),future=new Date(now+200*86400000).toISOString();
  c.EUC_DEV538_admin_=()=>true;c.EUC_DEV368_year=()=> '2026-2027';c.EUC_DEV541_apprentissageClasses_=()=>[{id:24,classe:'TCAR',famille:'BACPRO',niveau:'Terminale'},{id:25,classe:'TMVA1',famille:'BACPRO',niveau:'Terminale'}];c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV538_diplomas_=()=>({24:'BAC PRO A',25:'BAC PRO B'});c.EUC_DEV538_quotaConfig_=()=>({});c.EUC_DEV542_activeClassesConfig_=()=>({});c.EUC_DEV545_classModesConfig_=()=>({'2026-2027':{24:'MIXITE',25:'CLASSE_ENTIERE'}});
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:1,fields:{Nom:'A',Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}},{id:2,fields:{Nom:'B',Classe:25,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}}]:[];
  c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:10,fields:{Eleve:1,Annee_scolaire:'2026-2027',Date_contrat_officielle:ago,Date_debut:ago,Date_fin:future,Dossier_remis:true,Dossier_transmis_CFA:true}},{id:11,fields:{Eleve:2,Annee_scolaire:'2026-2027',Date_contrat_officielle:ago,Date_debut:ago,Date_fin:future,Dossier_remis:true,Dossier_transmis_CFA:true}}]:[];
  const d=c.EUC_DEV538_apprentissageDashboard('2026-2027');assert.equal(d.totals.apprentis,2);assert.equal(d.totals.futurs,0);assert.equal(d.totals.dossiersRemis,2);assert.equal(d.totals.contratsValides,2);assert.equal(d.totals.apprentisMixite,1);assert.equal(d.totals.apprentisClasseEntiere,1);
});

test('le bilan public ne renvoie aucune identité ni aucun dossier nominatif',()=>{
  const c=context();
  c.EUC_DEV538_apprentissageDashboard_=()=>({annee:'2026-2027',totals:{effectif:20,quota:6,apprentis:3,futurs:1,distribues:2,transmisCfa:4},dossiers:[{eleve:'NOM SECRET'}],relances:[{eleve:'NOM SECRET'}],groups:[{diplome:'BAC PRO Test',famille:'BACPRO',lignes:[{classeId:24,classe:'TCAR',niveau:'Terminale',effectif:20,quotaPercent:30,quota:6,apprentis:3,futurs:1,distribues:2,transmisCfa:4,dossiers:[{eleve:'NOM SECRET'}],relances:[{eleve:'NOM SECRET'}]}]}]});
  const out=c.EUC_DEV541_apprentissageDashboardPublic('2026-2027'),json=JSON.stringify(out);assert.equal(out.groups[0].lignes[0].quota,6);assert.equal(json.includes('NOM SECRET'),false);assert.equal(out.dossiers,undefined);assert.equal(out.relances,undefined);assert.equal(out.groups[0].lignes[0].dossiers,undefined);assert.equal(out.groups[0].lignes[0].relances,undefined);assert.equal(json.includes('classeId'),false);
});

test('le bilan public construit ses classes sans exiger le catalogue administrateur',()=>{
  const c=context();let adminCatalogCalled=false;c.EUC_DEV190X_classes_=()=>[{id:24,nom:'TCAR'},{id:41,nom:'1BTS CIEL'},{id:52,nom:'1CAP'}];c.EUC_DEV368_catalog=()=>{adminCatalogCalled=true;throw new Error('catalogue admin interdit')};
  const rows=c.EUC_DEV541_apprentissageClasses_('2026-2027');assert.equal(adminCatalogCalled,false);assert.deepEqual(Array.from(rows,r=>r.famille),['BACPRO','BTS','CAP']);assert.deepEqual(Array.from(rows,r=>r.niveau),['Terminale','1re année','Première']);
});

test('le bilan ventile chaque indicateur par établissement puis par classe',()=>{
  const c=context();
  assert.equal(c.EUC_DEV544_establishment_({classe:'1BTS CIEL',famille:'BTS',Etablissement_Pronote:'LGT'}),'LGT');
  assert.equal(c.EUC_DEV544_establishment_({classe:'TCAR',famille:'BACPRO',Etab:'LP'}),'LP');
  assert.equal(c.EUC_DEV544_establishment_({classe:'2BTS MV',famille:'BTS'}),'LGT');
  const breakdown=c.EUC_DEV544_dashboardBreakdown_([{lignes:[
    {active:true,etablissement:'LP',classe:'TCAR',effectif:19,quota:5,apprentis:3,futurs:1,distribues:2,transmisCfa:3},
    {active:true,etablissement:'LGT',classe:'1BTS CIEL',effectif:24,quota:7,apprentis:2,futurs:0,distribues:1,transmisCfa:2},
    {active:false,etablissement:'LP',classe:'1MELEC G',effectif:30,quota:9,apprentis:4,futurs:0,distribues:0,transmisCfa:4}
  ]}]);
  assert.deepEqual(Array.from(breakdown,x=>x.code),['LP','LGT']);
  assert.equal(breakdown[0].totals.effectif,19);assert.equal(breakdown[0].classes[0].classe,'TCAR');
  assert.equal(breakdown[1].totals.quota,7);assert.equal(JSON.stringify(breakdown).includes('1MELEC G'),false);
});

test('le mode parents limite la fenêtre à trois ans et ne renvoie aucun nom',()=>{
  const c=context();let yearsArg=[];c.EUC_DEV538_yearsForScope_=q=>{assert.equal(q.fenetre,3);return['2026-2027','2025-2026','2024-2025']};c.EUC_DEV443_geoIdentity_=(entreprise,adresse)=>'ADRESSE|'+entreprise+'|'+adresse;c.EUC_DEV441_digest_=v=>'digest-'+v;c.EUC_DEV537_scopeMatches_=()=>true;c.EUC_DEV537_mergeAnnualCandidates_=ys=>{yearsArg=ys;return[{key:'k',siret:'123',entreprise:'ENTREPRISE',adresse:'1 RUE',pays:'FRANCE',latitude:43.7,longitude:7.2,statut:'GEOCODE_AUTOMATIQUE',scopes:[{annee:'2026-2027',famille:'BACPRO',classeId:1,periodeId:2}],accueils:[{eleveKey:'opaque',scope:{annee:'2026-2027',famille:'BACPRO',classeId:1,periodeId:2}}],classe:'TCAR'}]};c.EUC_DEV517_geoFilter_=(items)=>{items[0].elevesAccueillis=1;return items};c.EUC_DEV538_staffAllowed_=()=>true;
  const r=c.EUC_DEV538_mapData({annee:'ALL',mode:'PARENTS'});assert.equal(yearsArg.length,3);assert.equal(r.nominatif,false);assert.equal(r.points[0].historique,undefined);assert.equal(r.points[0].siret,undefined);assert.equal(JSON.stringify(r).includes('Élève Test'),false);
});

test('la carte apprentis publique agrège sans identité et la carte admin détaille les visiteurs',()=>{
  const c=context(),now=Date.now(),ago=new Date(now-20*86400000).toISOString(),future=new Date(now+200*86400000).toISOString();
  c.EUC_DEV368_year=()=> '2026-2027';c.EUC_DEV538_schoolYearMap_=()=>({});c.EUC_DEV541_apprentissageClasses_=()=>[{id:24,classe:'TCAR',famille:'BACPRO',niveau:'Terminale'}];c.EUC_DEV542_activeClassesConfig_=()=>({});c.EUC_DEV443_normalizeAddress_=v=>String(v||'').trim();c.EUC_DEV443_geoIdentity_=(e,a,s)=>s?'SIRET|'+s:'ADRESSE|'+e+'|'+a;c.EUC_DEV441_digest_=v=>'digest-'+v;c.EUC_DEV441_geoRows_=()=>[{SIRET:'12345678901234',Entreprise:'GARAGE TEST',Adresse_source:'1 RUE TEST 06000 NICE',Latitude:43.7,Longitude:7.2,Statut:'GEOCODE_AUTOMATIQUE'}];
  c.EUC_DEV538_records_=table=>table==='EUC_ELEVES_PFMP'?[{id:1,fields:{Nom:'SECRET',Prenom:'Eleve',Classe:24,Annee_scolaire_code:'2026-2027',Actif:true,Present_dernier_import:true}}]:[];
  c.EUC_DEV538_optionalRecords_=table=>table==='EUC_APPRENTISSAGE_PFMP'?[{id:10,fields:{Eleve:1,Annee_scolaire:'2026-2027',Date_contrat_officielle:ago,Date_debut:ago,Date_fin:future,SIRET:'12345678901234',Entreprise:'GARAGE TEST',Adresse_entreprise:'1 RUE TEST 06000 NICE'}}]:table==='EUC_AFFECTATIONS_SUIVI_PFMP'?[{id:20,fields:{Eleve:1,Annee_scolaire:'2026-2027',Type_suivi:'VISITE',Nom_professeur_snapshot:'Mme VISITE',Actif:true}}]:[];
  const pub=c.EUC_DEV545_apprenticeMapData({annee:'2026-2027',mode:'PUBLIC'}),pubJson=JSON.stringify(pub);assert.equal(pub.points.length,1);assert.equal(pub.points[0].apprentis,1);assert.equal(pub.nominatif,false);assert.equal(pubJson.includes('SECRET'),false);assert.equal(pubJson.includes('VISITE'),false);
  c.EUC_DEV538_admin_=()=>true;const adm=c.EUC_DEV545_apprenticeMapData({annee:'2026-2027',mode:'ADMIN'}),json=JSON.stringify(adm);assert.equal(adm.nominatif,true);assert.equal(json.includes('SECRET Eleve'),true);assert.equal(json.includes('Mme VISITE'),true);
});

console.log(`DEV538: ${n} tests réussis`);
