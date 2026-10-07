const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8');
const server=read('EUC_PFMP_DEV464_DossierApprentissage.js');
const html=read('Dossier_Apprentissage_DEV464.html');
const fast=read('EUC_PFMP_DEV382_Performance.js');
const detail=read('Suivi_PFMP_Classe_Detail_V156.html');
const router=read('EUC_PFMP_DEV455_FastVerifiedViews.js');
const admin=read('Admin_PFMP.html');
const rich=read('EUC_IMPORT_PFMP_RichData.gs');
const importHtml=read('Import_Pronote_PFMP.html');
let ok=0,ko=0;function assert(v,m){if(!v)throw new Error(m||'assertion failed')}function test(n,f){try{f();console.log('✓',n);ok++}catch(e){console.error('✗',n,'-',e.message);ko++}}

test('la navigation rapide utilise le même détail canonique que la route complète',()=>{
  assert(fast.includes("EUC_DEV455_fastDetail_(annee,famille,classe,periode)"),'calcul canonique absent');
  assert(fast.includes('EUC_DEV459_sanitizeDetail_(detail)'),'nettoyage canonique absent');
  assert(fast.indexOf('EUC_DEV455_fastDetail_')<fast.indexOf('EUC_DEV416_finalDetail_'),'ancien calcul prioritaire');
  assert(detail.includes('publicMode:!!'),'mode public non transmis');
  assert(detail.includes('history.replaceState'),'URL locale non synchronisée');
});

test('le détail rapide public reste en lecture seule et l’admin reste contrôlé',()=>{
  assert(fast.includes('detail.peutModifier=!publicMode'),'droits non séparés');
  assert(fast.includes("if(!publicMode)"),'contrôle admin absent');
  assert(fast.includes("throw new Error('Accès administrateur requis.')"),'refus admin absent');
});

test('la page dossier est réservée à l’administration et reliée au centre',()=>{
  assert(server.includes('EUC_DEV464_admin_();'),'garde admin absente');
  assert(server.includes("EUC_DEV464_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'"),'configuration serveur encore branchée sur le déploiement public');
  assert(router.includes("'dossier-apprentissage-pfmp'"),'route absente');
  assert(admin.includes('Dossier de demande d’apprentissage'),'tuile absente');
  assert(admin.includes("?page=dossier-apprentissage-pfmp"),'lien absent');
  assert(admin.includes('AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec?page=dossier-apprentissage-pfmp'),'déploiement administrateur absolu absent');
  assert(/(?:target=["']_top["']|\.target=["']_top["'])/.test(admin),'sortie de l’iframe technique absente');
  assert(html.includes('AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec?page=admin-pfmp'),'retour administrateur absolu absent');
  assert(html.includes("$('#back').target='_top'"),'retour administrateur encore enfermé dans l’iframe');
});

test('l’autocomplétion charge un index unique sans appel serveur à chaque frappe',()=>{
  assert((html.match(/EUC_DEV464_studentIndex\(\)/g)||[]).length===1,'index chargé plusieurs fois');
  const input=html.slice(html.indexOf("search.addEventListener('input'"),html.indexOf("results.addEventListener"));
  assert(!input.includes('google.script.run'),'appel serveur pendant la frappe');
  assert(html.includes('EUC_DEV464_studentDossier(id)'),'dossier non ciblé');
});

test('INE et NIR restent deux champs distincts et aucune valeur n’est inventée',()=>{
  assert(server.includes("['INE','Numero_INE','Numero_national']"),'aliases INE absents');
  assert(server.includes("['NIR','Numero_securite_sociale','Numero_securite_sociale_eleve','Numero_securite','SSN']"),'aliases NIR absents');
  assert(!server.includes("nir:EUC_DEV464_t_(f.Numero_national"),'numéro national confondu avec NIR');
  assert(html.includes("['','eleve.nir','N° de sécurité sociale']"),'champ NIR absent');
});

test('l’année d’entrée couvre 2023-2024 à 2037-2038 avec l’année courante par défaut',()=>{
  const ctx={Date,String,Number,Array,Object,isNaN,Math};vm.createContext(ctx);vm.runInContext(server,ctx);
  const years=Array.from(ctx.EUC_DEV464_schoolYears_());
  assert(years.length===15,'nombre d’années incorrect');assert(years[0]==='2023-2024','première année incorrecte');assert(years.at(-1)==='2037-2038','dernière année incorrecte');
  assert(ctx.EUC_DEV464_currentSchoolYear_(new Date('2026-10-06T12:00:00Z'))==='2026-2027','année courante incorrecte');
  assert(server.includes("anneeEntree:anneeCourante"),'année courante non appliquée au dossier');
  assert(server.includes('var anneeCourante=EUC_DEV464_currentSchoolYear_();'),'année d’entrée encore reprise depuis la fiche élève');
});

test('le choix formation combine diplôme et niveau et alimente la formation préparée',()=>{
  assert(html.includes('id="formationChoice"'),'liste diplôme/niveau absente');
  assert(html.includes('id="entryYear"'),'liste année d’entrée absente');
  assert(html.includes('p.formationPreparee=p.formationSouhaitee'),'formation préparée non dérivée du diplôme');
  assert(html.includes('pr.formationPreparee||e.formation'),'PDF non raccordé à la formation préparée');
});

test('la liste des diplômes reste modifiable hors Grist',()=>{
  assert(server.includes("DOSSIER_APPRENTISSAGE_FORMATIONS"),'propriété de catalogue absente');
  assert(server.includes('PropertiesService.getScriptProperties().setProperty'),'catalogue non enregistrable');
  assert(html.includes('EUC_DEV464_saveFormations(rows)'),'commande de sauvegarde absente');
  assert(!server.slice(server.indexOf('function EUC_DEV464_saveFormations'),server.indexOf('function EUC_DEV495_driveId_')).includes('EUC_DEV464_records_'),'sauvegarde du catalogue branchée sur Grist');
});

test('plusieurs modèles PDF Drive sont sélectionnables avec un seul défaut',()=>{
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELES"),'registre des modèles absent');
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELE_DEFAUT_ID"),'propriété du modèle par défaut absente');
  assert(server.includes("file.getMimeType()!=='application/pdf'"),'contrôle MIME PDF absent');
  assert(html.includes('id="modelChoice"')&&html.includes('id="modelList"'),'sélection ou liste des modèles absente');
  assert(html.includes('EUC_DEV495_saveDossierModel')&&html.includes('EUC_DEV495_setDefaultDossierModel')&&html.includes('EUC_DEV495_deleteDossierModel'),'gestion des modèles incomplète');
  assert(html.includes('EUC_DEV495_loadDossierModel'),'chargement tardif du PDF Drive absent');
  assert(html.includes("modelChoice.value='__local__'"),'solution temporaire locale absente');
});

test('le registre des modèles impose réellement un seul défaut',()=>{
  const values={},props={getProperty:k=>values[k]||'',setProperty:(k,v)=>{values[k]=String(v)},deleteProperty:k=>{delete values[k]}};let uuid=0;
  const ctx={Date,String,Number,Array,Object,isNaN,Math,PropertiesService:{getScriptProperties:()=>props},DriveApp:{getFileById:id=>({getMimeType:()=>id==='not-a-pdf-identifier-000000'?'text/plain':'application/pdf',getSize:()=>2048})},Utilities:{getUuid:()=>String(++uuid)}};
  ctx.EUC_PFMP_contexteAdmin_=()=>({autorise:true});vm.createContext(ctx);vm.runInContext(server,ctx);
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle A',fileId:'pdf-model-identifier-000000001',defaut:true});
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle B',fileId:'pdf-model-identifier-000000002',defaut:true});
  let models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.length===2&&models.filter(x=>x.defaut).length===1&&models.find(x=>x.defaut).label==='Modèle B','défaut multiple ou mauvais défaut');
  ctx.EUC_DEV495_setDefaultDossierModel({id:models[0].id});models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.filter(x=>x.defaut).length===1&&models[0].defaut,'changement de défaut non appliqué');
  let refused='';try{ctx.EUC_DEV495_saveDossierModel({label:'Texte',fileId:'not-a-pdf-identifier-000000'});}catch(e){refused=e.message||String(e)}assert(/fichier PDF/.test(refused),'fichier non PDF accepté');
});

test('les correspondances validées Pronote sont conservées au prochain import',()=>{
  for(const col of ['Lieu_naissance','Nationalite','Dernier_etablissement','Derniere_classe','Dernier_diplome_prepare'])assert(rich.includes(col),col+' absent');
  assert(rich.includes("['LIEU NAISS']")&&rich.includes("['NATIONALITE']")&&rich.includes("['DERNETAB']")&&rich.includes("['AP CLASSE']")&&rich.includes("['AP FORMATION']"),'entêtes exactes non raccordées');
  assert(rich.includes("'FIXECOMPLET'")&&rich.includes("'PORTABLECOMPLET'")&&rich.includes("'TELBUREAUCOMPLET'")&&rich.includes("'L PROFESSION'")&&rich.includes("heberge:ix('HEBERGE')"),'coordonnées responsables incomplètes');
  assert(rich.includes('responsableEnCharge:EUC_IMPORT_boolOuiRich_'),'hébergement Pronote non raccordé');
  assert(importHtml.includes("add('LIEU NAISS','LIEU NAISS'")&&importHtml.includes("add('DERNETAB','DERNETAB'")&&importHtml.includes("add('AP CLASSE','AP_CLASSE'"),'convertisseur largeur fixe incomplet');
});

test('les données responsables et apprenti sont lues seulement pour l’élève choisi',()=>{
  assert(server.includes("{Eleve:[studentId]}").toString(),'filtres ciblés absents');
  assert(server.includes("EUC_RESPONSABLES_ELEVES_PFMP"),'responsables absents');
  assert(server.includes("EUC_APPRENTISSAGE_PFMP"),'apprentissage absent');
});

test('le PDF de huit pages reçoit une date d’édition sur chaque page',()=>{
  assert(html.includes('pdf.getPages()'),'pages PDF non lues');
  assert(html.includes('pages.length!==8'),'contrôle 8 pages absent');
  assert(html.includes("pages.slice(0,8).forEach"),'date non appliquée aux huit pages');
  assert(html.includes("'Date d\\'édition : '"),'date d’édition absente');
  assert(html.includes('arrayBuffer()'),'modèle local temporaire non utilisable');
  assert(html.includes('decodeBase64(loaded.base64)'),'modèle Drive non utilisable');
});

test('la distribution est confirmée explicitement puis inscrite dans un registre dédié',()=>{
  assert(server.includes("EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS"),'table de registre absente');
  assert(server.includes("Statut:'DISTRIBUE'"),'statut de distribution absent');
  assert(server.includes("c('Eleve','Élève','Ref:EUC_ELEVES_PFMP')"),'relation élève du registre absente');
  assert(server.includes("if(typeof EUC_ENT_controlerCibleRecette_==='function')EUC_ENT_controlerCibleRecette_()"),'garde de cible Grist absente');
  assert(html.includes('id="markDistributed"')&&html.includes('EUC_DEV495_confirmDossierDistribution(LAST_GENERATION)'),'confirmation explicite absente');
  assert(html.indexOf('EUC_DEV495_confirmDossierDistribution(LAST_GENERATION)')>html.indexOf("markDistributed.addEventListener('click'"),'registre alimenté hors confirmation');
});

test('l’écriture du registre est bornée à la cible autorisée et ne duplique pas les données nominatives',()=>{
  let guarded=0,posted=null;
  const ctx={Date,String,Number,Array,Object,isNaN,Math,encodeURIComponent,JSON,
    EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_ENT_controlerCibleRecette_:()=>{guarded++},EUC_DEV190G_fastRecords_:(table)=>table==='EUC_ELEVES_PFMP'?[{id:12,fields:{Nom:'NON JOURNALISE'}}]:[],
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},EUC_RELEASE_channel_:()=>'GREEN',Session:{getScriptTimeZone:()=>'Europe/Paris'},
    Utilities:{formatDate:()=> '07/10/2026 12:00'},EUC_ENT_grist:(method,path,body)=>{if(method==='get'&&path==='/tables')return{tables:[]};if(method==='get'&&path.includes('/records?filter='))return{records:[]};if(method==='post'&&path.includes('/records')){posted=body;return{records:[{id:44}]}}return{};}
  };
  vm.createContext(ctx);vm.runInContext(server,ctx);const out=ctx.EUC_DEV495_confirmDossierDistribution({studentId:12,token:'dist-12-test',annee:'2026-2027',modelId:'m1',modelLabel:'Modèle 2026'});
  assert(guarded===1&&out.id===44,'garde cible ou écriture absente');
  const f=posted.records[0].fields;assert(f.Eleve===12&&f.Statut==='DISTRIBUE'&&f.Canal==='GREEN','registre incorrect');
  assert(!('Nom' in f)&&!('Prenom' in f),'données nominatives dupliquées dans le registre');
});

test('le bleu simule la confirmation sans aucune écriture Grist',()=>{
  let writes=0;
  const ctx={Date,String,Number,Array,Object,isNaN,Math,encodeURIComponent,JSON,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_ENT_controlerCibleRecette_:()=>true,EUC_DEV190G_fastRecords_:()=>[{id:12,fields:{Nom:'TEST'}}],EUC_RELEASE_channel_:()=>'BLUE',Session:{getScriptTimeZone:()=>'Europe/Paris'},Utilities:{formatDate:()=> '07/10/2026 12:00'},EUC_ENT_grist:(method)=>{if(method!=='get')writes++;return{}}};
  vm.createContext(ctx);vm.runInContext(server,ctx);const out=ctx.EUC_DEV495_confirmDossierDistribution({studentId:12,token:'dist-12-blue'});
  assert(out.simulation===true&&writes===0,'le bleu a écrit dans Grist');
  assert(html.includes('Site bleu : confirmation simulée'),'message de simulation bleue absent');
});

test('le modèle conserve l’ordre annexe 11, annexe 12d, positionnement',()=>{
  assert(html.includes('annexes 11, 12d et du positionnement'),'ordre annoncé absent');
  assert(html.includes('pages[0]')&&html.includes('pages[2]')&&html.includes('pages[6]'),'cartes de pages absentes');
});

test('les dates Grist en secondes et millisecondes restent lisibles',()=>{
  const ctx={Date,String,Number,Array,Object,isNaN,Math};vm.createContext(ctx);vm.runInContext(server,ctx);
  assert(ctx.EUC_DEV464_date_(1791237599)==='05/10/2026','secondes Unix mal lues');
  assert(ctx.EUC_DEV464_date_(1791237599000)==='05/10/2026','millisecondes mal lues');
});

test('l’adresse élève absente reprend celle du responsable légal sans inventer le NIR',()=>{
  const rows={
    EUC_ELEVES_PFMP:[{id:7,fields:{Nom:'TEST',Prenom:'Camille',Date_naissance:'2010-08-17',Numero_national:'INE-TEST',Formation_Pronote:'Première pro véhicules'}}],
    EUC_RESPONSABLES_ELEVES_PFMP:[{id:9,fields:{Nom:'PARENT',Responsable_legal:true,Adresse_1:'12 rue des Écoles',Code_postal:'06000',Ville:'Nice'}}],
    EUC_APPRENTISSAGE_PFMP:[]
  };
  const ctx={Date,String,Number,Array,Object,isNaN,Math,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_DEV190G_fastRecords_:(table)=>rows[table]||[]};
  vm.createContext(ctx);vm.runInContext(server,ctx);const d=ctx.EUC_DEV464_studentDossier(7);
  assert(d.eleve.adresse==='12 rue des Écoles','adresse responsable non reprise');
  assert(d.eleve.codePostal==='06000'&&d.eleve.ville==='Nice','localité responsable non reprise');
  assert(d.eleve.ine==='INE-TEST'&&d.eleve.nir==='','INE réutilisé comme NIR');
  assert(d.eleve.etablissement==='Lycée Les Eucalyptus','établissement par défaut absent');
  assert(d.eleve.annee===ctx.EUC_DEV464_currentSchoolYear_(),'année scolaire courante absente');
});

test('les colonnes Pronote historiques restent lisibles sans inventer les champs absents',()=>{
  const rows={
    EUC_ELEVES_PFMP:[{id:8,fields:{Nom:'TEST',Prenom:'Alex',LIEU_NAISS:'Nice',NATIONALITE:'Française',EMAIL:'alex@example.test',DERNETAB:'Collège test','AP CLASSE':'3e','AP FORMATION':'Brevet',R1_NOM:'PARENT',R1_PRENOM:'Sam',R1_FIXECOMPLET:'0102030405',R1_TELBUREAUCOMPLET:'0504030201',R1_L_PROFESSION:'Technicien'}}],
    EUC_RESPONSABLES_ELEVES_PFMP:[],EUC_APPRENTISSAGE_PFMP:[]
  };
  const ctx={Date,String,Number,Array,Object,isNaN,Math,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_DEV190G_fastRecords_:(table)=>rows[table]||[]};
  vm.createContext(ctx);vm.runInContext(server,ctx);const d=ctx.EUC_DEV464_studentDossier(8);
  assert(d.eleve.lieuNaissance==='Nice'&&d.eleve.nationalite==='Française'&&d.eleve.courriel==='alex@example.test','champs élève historiques non lus');
  assert(d.scolarite.dernierEtablissement==='Collège test'&&d.scolarite.derniereClasse==='3e'&&d.scolarite.dernierDiplomePrepare==='Brevet','scolarité historique non lue');
  assert(d.responsables[0].telephoneFixe==='0102030405'&&d.responsables[0].telephonePro==='0504030201'&&d.responsables[0].profession==='Technicien','responsable historique non lu');
  assert(d.eleve.nir==='','NIR inventé');
});

test('les zones PDF corrigées ne chevauchent plus les libellés ni le pied de page',()=>{
  assert(!html.includes('w(p,e.formation,200,122,300)'),'formation encore injectée sur le bloc CFA de la page 2');
  assert(html.includes("w(p,s.dernierEtablissement||e.etablissement||'Lycée Les Eucalyptus',190,104"),'dernier établissement absent de la page 1');
  assert(html.includes('w(p,s.derniereClasse||e.formation||e.classe,180,91'),'dernière classe absente de la page 1');
  assert(html.includes('w(p,e.telephone,210,455')&&html.includes('w(p,e.courriel,210,429'),'coordonnées page 7 encore sur les libellés');
  assert(html.includes("' - page '+(i+1)+'/8',375,18"),'pied de page encore hors marge utile');
});

console.log(`\nDEV464: ${ok} tests réussis, ${ko} échec(s)`);if(ko)process.exit(1);
