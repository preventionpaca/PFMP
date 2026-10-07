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
const templatePrep=fs.readFileSync(path.join(root,'scripts','prepare_dossier_apprentissage_template.py'),'utf8');
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

test('plusieurs modèles Google Docs sont sélectionnables avec un seul défaut',()=>{
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELES"),'registre des modèles absent');
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELE_DEFAUT_ID"),'propriété du modèle par défaut absente');
  assert(server.includes("file.getMimeType()!==EUC_DEV499_GOOGLE_DOC_MIME_"),'contrôle MIME Google Docs absent');
  assert(html.includes('id="modelChoice"')&&html.includes('id="modelList"'),'sélection ou liste des modèles absente');
  assert(html.includes('EUC_DEV495_saveDossierModel')&&html.includes('EUC_DEV495_setDefaultDossierModel')&&html.includes('EUC_DEV495_deleteDossierModel'),'gestion des modèles incomplète');
  assert(html.includes('Gérer les modèles Google Docs'),'libellé Google Docs absent');
  assert(!html.includes('id="template"')&&!html.includes("modelChoice.value='__local__'"),'ancien modèle PDF local encore proposé');
});

test('le registre des modèles impose réellement un seul défaut',()=>{
  const values={},props={getProperty:k=>values[k]||'',setProperty:(k,v)=>{values[k]=String(v)},deleteProperty:k=>{delete values[k]}};let uuid=0;
  const parts={getText:()=>'{{ELEVE_NOM}} {{ELEVE_PRENOM}}'},doc={getBody:()=>parts,getHeader:()=>null,getFooter:()=>null};
  const ctx={Date,String,Number,Array,Object,isNaN,Math,PropertiesService:{getScriptProperties:()=>props},DriveApp:{getFileById:id=>({getMimeType:()=>id==='not-a-doc-identifier-000000'?'application/pdf':'application/vnd.google-apps.document'})},DocumentApp:{openById:()=>doc},Utilities:{getUuid:()=>String(++uuid)}};
  ctx.EUC_PFMP_contexteAdmin_=()=>({autorise:true});vm.createContext(ctx);vm.runInContext(server,ctx);
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle A',fileId:'doc-model-identifier-000000001',defaut:true});
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle B',fileId:'doc-model-identifier-000000002',defaut:true});
  let models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.length===2&&models.filter(x=>x.defaut).length===1&&models.find(x=>x.defaut).label==='Modèle B','défaut multiple ou mauvais défaut');
  ctx.EUC_DEV495_setDefaultDossierModel({id:models[0].id});models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.filter(x=>x.defaut).length===1&&models[0].defaut,'changement de défaut non appliqué');
  let refused='';try{ctx.EUC_DEV495_saveDossierModel({label:'PDF',fileId:'not-a-doc-identifier-000000'});}catch(e){refused=e.message||String(e)}assert(/Google Docs, pas un PDF/.test(refused),'fichier PDF accepté comme modèle source');
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

test('la fusion part du Google Docs, exporte le PDF et supprime toujours la copie temporaire',()=>{
  assert(server.includes('function EUC_DEV499_generateDossierPdf'),'générateur Google Docs absent');
  assert(server.includes("source.makeCopy('TEMP_Dossier_apprentissage_"),'copie temporaire absente');
  assert(server.includes('DocumentApp.openById(id)')&&server.includes('copy.getAs(MimeType.PDF)'),'fusion ou export PDF absent');
  assert(server.includes('finally{copy.setTrashed(true);'),'copie temporaire non supprimée');
  assert(server.includes("footer.appendParagraph('Date d’édition : {{DATE_EDITION}}')"),'date d’édition répétée en pied de page absente');
  assert(server.includes('remaining.length')&&server.includes('balises du Google Docs sont coupées'),'contrôle des balises résiduelles absent');
  assert(!html.includes('pdfjs-dist')&&!html.includes('PDFLib'),'ancien calque PDF client encore actif');
  assert(html.includes('EUC_DEV499_generateDossierPdf({modelId,values})'),'appel serveur de fusion absent');
});

test('le modèle Word métier complet est accepté sans fausse balise de pagination',()=>{
  const block=(server.match(/var EUC_DEV499_MERGE_KEYS_=\[([\s\S]*?)\];/)||[])[1]||'';
  const allowed=Array.from(block.matchAll(/'([^']+)'/g),m=>m[1]);
  const official=`
ANCIEN_APPRENTISSAGE_ANNEE ANCIEN_APPRENTISSAGE_CLASSE ANCIEN_APPRENTISSAGE_ETABLISSEMENT ANNEE_ENTREE_APPRENTISSAGE AVANTAGE_AUTRE AVANTAGE_LOGEMENT AVANTAGE_NOURRITURE CONTACT_RH_COURRIEL CONTACT_RH_NOM CONTACT_RH_PRENOM CONTACT_RH_TELEPHONE CONTRAT_AUTORISATION_DEPOT_OPCO
CONTRAT_DATE_AVENANT CONTRAT_DATE_DEBUT CONTRAT_DATE_FIN CONTRAT_DUREE_HEBDO_HEURES CONTRAT_DUREE_HEBDO_MINUTES CONTRAT_DUREE_HEBDO_TYPE CONTRAT_MAJORATION_HEURES_SUP CONTRAT_RISQUES_PARTICULIERS DATE_HEURE_IMPRESSION DEMANDE_INTERNAT DOSSIER_DATE_RECEPTION ELEVE_ADRESSE
ELEVE_BOE ELEVE_CODE_POSTAL ELEVE_COURRIEL ELEVE_DATE_NAISSANCE ELEVE_EQUIVALENCE_15_20 ELEVE_FORMATION_PREPAREE ELEVE_INE ELEVE_LIEU_NAISSANCE ELEVE_NATIONALITE ELEVE_NIR ELEVE_NOM ELEVE_PHOTO ELEVE_PRENOM ELEVE_PROJET_ENTREPRISE ELEVE_RQTH ELEVE_SPORTIF_HAUT_NIVEAU ELEVE_TELEPHONE ELEVE_TITRE_EQUIVALENCE ELEVE_VILLE
ENTREPRISE_ADRESSE ENTREPRISE_CAISSE_RETRAITE ENTREPRISE_CODE_POSTAL ENTREPRISE_CODE_SPECIFIQUE ENTREPRISE_CODE_TYPE_EMPLOYEUR ENTREPRISE_CONVENTION_COLLECTIVE ENTREPRISE_COURRIEL ENTREPRISE_EFFECTIF ENTREPRISE_ENSEIGNE ENTREPRISE_IDCC ENTREPRISE_OPCO ENTREPRISE_RAISON_SOCIALE ENTREPRISE_SIRET ENTREPRISE_STATUT_JURIDIQUE ENTREPRISE_TELEPHONE ENTREPRISE_TROUVEE ENTREPRISE_TYPE_EMPLOYEUR ENTREPRISE_VILLE ETABLISSEMENT_ACTUEL
FORMATION_DATE_DEBUT FORMATION_DATE_EXAMEN FORMATION_DATE_FIN FORMATION_DUREE_CONTRAT_PROPOSEE FORMATION_HEURES_CENTRE FORMATION_MODALITE_VALIDATION FORMATION_SOUHAITEE MAITRE_CIVILITE MAITRE_COURRIEL MAITRE_DATE_NAISSANCE MAITRE_DIPLOME MAITRE_NIVEAU MAITRE_NOM MAITRE_POSTE MAITRE_PRENOM MAITRE_TELEPHONE
ORIGINE_CANDIDATURE ORIGINE_CANDIDATURE_AUTRE POSITIONNEMENT_ANNEE_DIPLOME POSITIONNEMENT_AVIS_APPRENTI POSITIONNEMENT_AVIS_ENTREPRISE POSITIONNEMENT_AVIS_EQUIPE POSITIONNEMENT_AVIS_ORGANISME POSITIONNEMENT_COMMENTAIRE_APPRENTI POSITIONNEMENT_COMMENTAIRE_ENTREPRISE POSITIONNEMENT_COMMENTAIRE_ORGANISME POSITIONNEMENT_DATE POSITIONNEMENT_DATE_SIGNATURE POSITIONNEMENT_DERNIER_DIPLOME POSITIONNEMENT_DIPLOME_OBTENU POSITIONNEMENT_OBSERVATIONS POSITIONNEMENT_REFERENT POSITIONNEMENT_TOUTES_UNITES POSITIONNEMENT_UNITES_GENERALES POSITIONNEMENT_UNITES_PRO
REMUNERATION_BASE REMUNERATION_SMC_MONTANT RESP1_ADRESSE RESP1_CIVILITE RESP1_CODE_POSTAL RESP1_COURRIEL RESP1_NOM RESP1_PRENOM RESP1_PROFESSION RESP1_TELEPHONE_FIXE RESP1_TELEPHONE_PORTABLE RESP1_VILLE RESP2_ADRESSE RESP2_CIVILITE RESP2_CODE_POSTAL RESP2_COURRIEL RESP2_NOM RESP2_PRENOM RESP2_PROFESSION RESP2_TELEPHONE_FIXE RESP2_TELEPHONE_PORTABLE RESP2_VILLE RESPONSABLES_CONFIGURATION
RESP_ENTREPRISE_CIVILITE RESP_ENTREPRISE_COURRIEL RESP_ENTREPRISE_FONCTION RESP_ENTREPRISE_NOM RESP_ENTREPRISE_PRENOM RESP_ENTREPRISE_TELEPHONE SCOLARITE_ANNEE SCOLARITE_ANNEE_DIPLOME SCOLARITE_AUCUN_DIPLOME SCOLARITE_DERNIERE_CLASSE SCOLARITE_DERNIER_DIPLOME SCOLARITE_DERNIER_ETABLISSEMENT SCOLARITE_ETABLISSEMENT_DIPLOME SITUATION_AVANT_CFA SITUATION_AVANT_CFA_AUTRE
  `.trim().split(/\s+/);
  for(const token of official)assert(allowed.includes(token),'balise officielle refusée : '+token);
  assert(!allowed.includes('PAGE_COURANTE')&&!allowed.includes('NB_PAGES'),'fausses balises de pagination encore autorisées');
  assert(server.includes('La pagination du modèle doit utiliser les champs natifs'),'diagnostic de pagination absent');
  assert(templatePrep.includes('field_run("PAGE", "1")')&&templatePrep.includes('field_run("NUMPAGES", "8")'),'préparation des vrais numéros de page absente');
  assert(templatePrep.includes('Balises coupées en plusieurs styles/runs'),'contrôle des balises Word fragmentées absent');
});

test('les champs demandés sont tous raccordés aux balises du modèle',()=>{
  for(const token of ['ELEVE_LIEU_NAISSANCE','ELEVE_NATIONALITE','ELEVE_COURRIEL','SCOLARITE_DERNIER_ETABLISSEMENT','SCOLARITE_DERNIERE_CLASSE','SCOLARITE_DERNIER_DIPLOME','RESP1_PROFESSION','RESP2_PROFESSION','ENTREPRISE_RAISON_SOCIALE'])assert(html.includes(token+':'),token+' non raccordé');
  assert(server.includes('EUC_DEV499_MERGE_KEYS_')&&server.includes('audit.unknown.length'),'liste blanche ou refus des balises inconnues absent');
  assert(server.includes('EUC_DEV499_cleanValues_')&&server.includes('.slice(0,1500)'),'bornage des valeurs de fusion absent');
});

test('la distribution est confirmée explicitement puis inscrite dans un registre dédié',()=>{
  assert(server.includes("EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS"),'table de registre absente');
  assert(server.includes("Statut:'DISTRIBUE'"),'statut de distribution absent');
  assert(server.includes("c('Eleve','Élève','Ref:EUC_ELEVES_PFMP')"),'relation élève du registre absente');
  assert(server.includes("if(typeof EUC_ENT_controlerCibleRecette_==='function')EUC_ENT_controlerCibleRecette_()"),'garde de cible Grist absente');
  assert(html.includes('id="markDistributed"')&&html.includes('EUC_DEV495_confirmDossierDistribution(LAST_GENERATION)'),'confirmation explicite absente');
  assert(html.indexOf('EUC_DEV495_confirmDossierDistribution(LAST_GENERATION)')>html.indexOf("markDistributed.addEventListener('click'"),'registre alimenté hors confirmation');
  assert(server.includes("c('Date_annulation','Date d’annulation','DateTime')")&&server.includes("c('Motif_annulation','Motif d’annulation')"),'colonnes d’annulation absentes');
  assert(html.includes('id="distributionHistory"')&&html.includes('EUC_DEV496_listDossierDistributions'),'historique de distribution absent');
  assert(html.includes('EUC_DEV496_cancelDossierDistribution'),'commande d’annulation absente');
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

test('l’annulation d’une distribution est logique, historisée et sans suppression',()=>{
  let patched=null,deletes=0;
  const ctx={Date,String,Number,Array,Object,isNaN,Math,encodeURIComponent,JSON,
    EUC_PFMP_contexteAdmin_:()=>({autorise:true,email:'admin@example.test'}),EUC_ENT_controlerCibleRecette_:()=>true,EUC_RELEASE_channel_:()=>'GREEN',Session:{getScriptTimeZone:()=>'Europe/Paris'},Utilities:{formatDate:()=> '07/10/2026 14:00'},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},EUC_ENT_grist:(method,path,body)=>{if(method==='get'&&path==='/tables')return{tables:[{id:'EUC_DOSSIER_APPRENTISSAGE_IMPRESSIONS'}]};if(method==='get'&&path.endsWith('/columns'))return{columns:[]};if(method==='get'&&path.endsWith('/records'))return{records:[{id:55,fields:{Eleve:12,Statut:'DISTRIBUE'}}]};if(method==='patch'){patched=body;return{}}if(method==='delete')deletes++;return{};}
  };
  vm.createContext(ctx);vm.runInContext(server,ctx);const out=ctx.EUC_DEV496_cancelDossierDistribution({id:55,studentId:12,motif:'Erreur de manipulation'});
  const f=patched.records[0].fields;assert(out.ok&&f.Statut==='ANNULE'&&f.Motif_annulation==='Erreur de manipulation','annulation logique incorrecte');
  assert(f.Auteur_annulation==='admin@example.test'&&f.Date_annulation,'traçabilité d’annulation absente');assert(deletes===0&&!server.includes("EUC_ENT_grist('delete'"),'suppression physique détectée');
});

test('le bleu simule aussi l’annulation sans écriture Grist',()=>{
  let writes=0;const ctx={Date,String,Number,Array,Object,isNaN,Math,encodeURIComponent,JSON,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_ENT_controlerCibleRecette_:()=>true,EUC_RELEASE_channel_:()=>'BLUE',Session:{getScriptTimeZone:()=>'Europe/Paris'},Utilities:{formatDate:()=> '07/10/2026 14:00'},EUC_ENT_grist:(method)=>{if(method!=='get')writes++;return{}}};
  vm.createContext(ctx);vm.runInContext(server,ctx);const out=ctx.EUC_DEV496_cancelDossierDistribution({id:55,studentId:12,motif:'Essai'});assert(out.simulation===true&&writes===0,'le bleu a modifié le registre');
});

test('le modèle conserve l’ordre annexe 11, annexe 12d, positionnement',()=>{
  assert(html.includes('annexes 11, 12d et du positionnement'),'ordre annoncé absent');
  assert(server.includes("source.makeCopy('TEMP_Dossier_apprentissage_"),'le document source n’est pas copié intégralement');
  assert(!server.includes('appendPage')&&!server.includes('moveChild'),'le générateur réordonne le document source');
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

test('la fusion suit les emplacements du modèle au lieu de coordonnées historiques',()=>{
  assert(server.includes('part.replaceText(pattern,replacement)'),'remplacement natif Google Docs absent');
  assert(server.includes("before.match(new RegExp(pattern,'g'))"),'occurrences des balises du modèle non comptées');
  assert(!html.includes('e.nom,65,549')&&!html.includes('e.telephone,210,455'),'coordonnées historiques encore présentes');
  assert(!html.includes('drawText(')&&!html.includes('drawRectangle('),'dessin par coordonnées encore actif');
  assert(server.includes("footer.appendParagraph('Date d’édition : {{DATE_EDITION}}')"),'date d’édition non répétée dans le pied de page');
});

console.log(`\nDEV464: ${ok} tests réussis, ${ko} échec(s)`);if(ko)process.exit(1);
