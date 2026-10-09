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
const pdfTemplatePrep=fs.readFileSync(path.join(root,'scripts','prepare_dossier_apprentissage_pdf_template.py'),'utf8');
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
  assert(server.includes("EUC_DEV464_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec'"),'configuration serveur non branchée sur le déploiement administrateur');
  assert(router.includes("'dossier-apprentissage-pfmp'"),'route absente');
  assert(admin.includes('Dossier de demande d’apprentissage'),'tuile absente');
  assert(admin.includes("?page=dossier-apprentissage-pfmp"),'lien absent');
  assert(admin.includes('href="<?= adminBase ?>?page=dossier-apprentissage-pfmp"'),'destination administrateur du dossier absente');
  assert(/(?:target=["']_top["']|\.target=["']_top["'])/.test(admin),'sortie de l’iframe technique absente');
  assert(html.includes("$('#back').href=CONFIG.baseUrl+'?page=admin-pfmp'"),'retour administrateur dynamique absent');
  assert(html.includes("$('#back').target='_top'"),'retour administrateur encore enfermé dans l’iframe');
});

test('l’autocomplétion charge un index unique sans appel serveur à chaque frappe',()=>{
  assert((html.match(/EUC_DEV464_studentIndex\(\)/g)||[]).length===1,'index chargé plusieurs fois');
  const input=html.slice(html.indexOf("search.addEventListener('input'"),html.indexOf("results.addEventListener"));
  assert(!input.includes('google.script.run'),'appel serveur pendant la frappe');
  assert(html.includes('EUC_DEV464_studentDossier(id)'),'dossier non ciblé');
});

test('l’index du dossier ne mélange pas les inscriptions historiques et courantes',()=>{
  const rows={
    Annees_Scolaires:[
      {id:1,fields:{Code:'2026-2027'}},
      {id:4,fields:{Code:'2025-2026'}}
    ],
    EUC_ELEVES_PFMP:[
      {id:10,fields:{Nom:'NIGITA--FARRIS',Prenom:'Loris',Code_classe_importe:'1MVA1',Annee_scolaire:4,Actif:true,Present_dernier_import:true}},
      {id:11,fields:{Nom:'NIGITA--FARRIS',Prenom:'Loris',Code_classe_importe:'TMVA1',Annee_scolaire:1,Actif:true,Present_dernier_import:true}},
      {id:12,fields:{Nom:'ANCIEN',Prenom:'Absent',Code_classe_importe:'TMVA1',Annee_scolaire:1,Actif:true,Present_dernier_import:false}}
    ]
  };
  const ctx={Date,String,Number,Array,Object,isNaN,Math,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_DEV190G_fastRecords_:(table)=>rows[table]||[]};
  vm.createContext(ctx);vm.runInContext(server,ctx);const index=Array.from(ctx.EUC_DEV464_studentIndex());
  assert(index.length===1,'une inscription historique ou absente reste visible');
  assert(index[0].id===11&&index[0].classe==='TMVA1'&&index[0].annee==='2026-2027','l’inscription courante n’est pas la seule proposée');
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

test('plusieurs modèles PDF sont téléversables avec un seul défaut',()=>{
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELES"),'registre des modèles absent');
  assert(server.includes("DOSSIER_APPRENTISSAGE_MODELE_DEFAUT_ID"),'propriété du modèle par défaut absente');
  assert(server.includes("EUC_DEV500_pdfBytes_(q.base64)"),'contrôle du PDF téléversé absent');
  assert(server.includes("u(0)!==37||u(1)!==80||u(2)!==68||u(3)!==70||u(4)!==45"),'signature PDF non contrôlée');
  assert(html.includes('id="modelChoice"')&&html.includes('id="modelList"'),'sélection ou liste des modèles absente');
  assert(html.includes('EUC_DEV495_saveDossierModel')&&html.includes('EUC_DEV495_setDefaultDossierModel')&&html.includes('EUC_DEV495_deleteDossierModel'),'gestion des modèles incomplète');
  assert(html.includes('Gérer les modèles PDF')&&html.includes('id="modelFile"'),'sélecteur PDF absent');
  assert(!html.includes('id="modelDrive"')&&!html.includes('Lien du document Google Docs'),'lien Google Docs encore demandé');
});

test('le registre des modèles impose réellement un seul défaut',()=>{
  const values={},props={getProperty:k=>values[k]||'',setProperty:(k,v)=>{values[k]=String(v)},deleteProperty:k=>{delete values[k]}};let uuid=0,fileId=0;
  const files={},folder={createFile:blob=>{const id='pdf-model-identifier-00000000'+(++fileId);files[id]={getId:()=>id,getMimeType:()=>'application/pdf',getBlob:()=>({getBytes:()=>blob.bytes}),getName:()=>blob.name};return files[id]}};
  const pdf=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(1100)]).toString('base64');
  const ctx={Date,String,Number,Array,Object,isNaN,Math,PropertiesService:{getScriptProperties:()=>props},DriveApp:{getFileById:id=>files[id]},EUC_DOCX_modelFolder_:()=>folder,EUC_DOCX_safeName_:v=>String(v),Utilities:{getUuid:()=>String(++uuid),base64Decode:v=>Array.from(Buffer.from(v,'base64')),newBlob:(bytes,mime,name)=>({bytes,mime,name}),base64Encode:bytes=>Buffer.from(bytes).toString('base64')}};
  ctx.EUC_PFMP_contexteAdmin_=()=>({autorise:true});vm.createContext(ctx);vm.runInContext(server,ctx);
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle A',fileName:'a.pdf',base64:pdf,defaut:true});
  ctx.EUC_DEV495_saveDossierModel({label:'Modèle B',fileName:'b.pdf',base64:pdf,defaut:true});
  let models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.length===2&&models.filter(x=>x.defaut).length===1&&models.find(x=>x.defaut).label==='Modèle B','défaut multiple ou mauvais défaut');
  ctx.EUC_DEV495_setDefaultDossierModel({id:models[0].id});models=ctx.EUC_DEV495_listDossierModels().models;
  assert(models.filter(x=>x.defaut).length===1&&models[0].defaut,'changement de défaut non appliqué');
  let refused='';try{ctx.EUC_DEV495_saveDossierModel({label:'Faux',fileName:'faux.pdf',base64:Buffer.alloc(1100).toString('base64')});}catch(e){refused=e.message||String(e)}assert(/pas un PDF valide/.test(refused),'fichier non-PDF accepté');
});

test('les correspondances validées Pronote sont conservées au prochain import',()=>{
  for(const col of ['Lieu_naissance','Nationalite','Dernier_etablissement','Derniere_classe','Dernier_diplome_prepare'])assert(rich.includes(col),col+' absent');
  assert(rich.includes("['LIEU NAISS']")&&rich.includes("['NATIONALITE']")&&rich.includes("['DERNETAB']")&&rich.includes("['AP CLASSE']")&&rich.includes("['AP FORMATION']"),'entêtes exactes non raccordées');
  assert(rich.includes("'FIXECOMPLET'")&&rich.includes("'PORTABLECOMPLET'")&&rich.includes("'TELBUREAUCOMPLET'")&&rich.includes("'L PROFESSION'")&&rich.includes("heberge:ix('HEBERGE')"),'coordonnées responsables incomplètes');
  assert(rich.includes('responsableEnCharge:EUC_IMPORT_boolOuiRich_'),'hébergement Pronote non raccordé');
  assert(importHtml.includes("add('LIEU NAISS','LIEU NAISS'")&&importHtml.includes("add('DERNETAB','DERNETAB'")&&importHtml.includes("add('AP CLASSE','AP_CLASSE'"),'convertisseur largeur fixe incomplet');
});

test('l’import Pronote permet de cocher uniquement les classes utiles à PFMP',()=>{
  const importScripts=read('Import_Pronote_PFMP_Scripts.html');
  assert(importHtml.includes('Sélection des classes Pronote à intégrer dans PFMP'),'rubrique de sélection absente');
  assert(importHtml.includes('Inclure dans PFMP'),'colonne d’inclusion absente');
  assert(importScripts.includes('input[data-include]'),'cases d’inclusion absentes');
  assert(importScripts.includes('if(include&&!include.checked)classesExclues.push(p)'),'classe décochée non transmise comme exclusion');
  assert(importScripts.includes('EUC_CORRESPONDANCE_enregistrerChoix'),'choix non mémorisables');
});

test('les données responsables et apprenti sont lues seulement pour l’élève choisi',()=>{
  assert(server.includes("{Eleve:[studentId]}").toString(),'filtres ciblés absents');
  assert(server.includes("EUC_RESPONSABLES_ELEVES_PFMP"),'responsables absents');
  assert(server.includes("EUC_APPRENTISSAGE_PFMP"),'apprentissage absent');
});

test('une table complémentaire absente dans la recette bleue ne bloque pas le dossier',()=>{
  const rows={EUC_ELEVES_PFMP:[{id:31,fields:{Nom:'TEST',Prenom:'Recette',Code_classe_importe:'TMVA1'}}]};
  const ctx={Date,String,Number,Array,Object,isNaN,Math,EUC_PFMP_contexteAdmin_:()=>({autorise:true}),EUC_DEV190G_fastRecords_:(table)=>{
    if(table==='EUC_ELEVES_PFMP')return rows[table];
    throw new Error('DEV190 Grist API 404 : {"error":"Table not found \\"'+table+'\\""}');
  }};
  vm.createContext(ctx);vm.runInContext(server,ctx);const d=ctx.EUC_DEV464_studentDossier(31);
  assert(d.ok&&d.eleve.nom==='TEST','élève de recette non chargé');
  assert(d.responsables.length===2&&!d.responsables[0].nom,'responsables absents non normalisés');
  assert(d.apprentissage.entreprise===''&&d.apprentissage.dateDebut==='','apprentissage absent non normalisé');
});

test('la fusion se fait directement dans le PDF exporté depuis Word',()=>{
  assert(html.includes('pdfjs-dist')&&html.includes('PDFLib'),'moteur PDF client absent');
  assert(html.includes('function mergeTokenGroups')&&html.includes('function drawMergedValue'),'repérage ou superposition des valeurs absent');
  assert(html.includes('EUC_DEV495_loadDossierModel({id})'),'chargement du PDF enregistré absent');
  assert(html.includes('pages.length!==8'),'nombre de pages non contrôlé');
  assert(html.includes('merged.replaced<100'),'seuil de balises reconnues absent');
  assert(html.includes("DATE_HEURE_IMPRESSION:dateLabel")&&html.includes("PAGE_COURANTE:String(pageNumber)")&&html.includes("NB_PAGES:String(pageCount)"),'date ou pagination non fusionnée');
  assert(!server.includes('DocumentApp')&&!server.includes('EUC_DEV499_generateDossierPdf'),'ancienne fusion Google Docs encore active');
});

test('la fusion protège les libellés voisins et signale en jaune les données absentes',()=>{
  assert(html.includes('function markerBounds(marker)'),'bornes précises des balises absentes');
  assert(!html.includes('x:f.x-3.75')&&!html.includes('width:f.width+7.5'),'ancien masque débordant encore actif');
  assert(html.includes("yellow=PDFLib.rgb(1,.91,.12)"),'couleur de complément manuel absente');
  assert(html.includes('if(!value){')&&html.includes('return{missing:true,compact:false}'),'champ vide non signalé en jaune');
  assert(html.includes('room=Math.max(2,bounds.width-.4)'),'valeur non bornée à son emplacement');
  assert(html.includes('function pdfFontMetrics(page,items)')&&html.includes('fontExtraProperties:true'),'métriques du PDF non chargées');
  assert(html.includes('mergeTokenGroups(content.items,content.styles,fontMetrics,font)'),'métriques du PDF non transmises au repérage');
  assert(html.includes('exactTextWidth(text.slice(0,end),item,fontMetrics)/exactTotal'),'positionnement encore fondé sur une largeur approximative');
  assert(html.includes("merged.missing+' champ(s) sans donnée signalé(s) en jaune"),'bilan des champs jaunes absent');
  const fusionCode=html.slice(html.indexOf('function markerBounds(marker)'),html.indexOf('async function mergeTemplate'));
  const ctx={Math,PDFLib:{rgb:(...parts)=>parts},clean:value=>String(value||'')};vm.createContext(ctx);vm.runInContext(fusionCode,ctx);
  const rectangles=[],texts=[],page={drawRectangle:o=>rectangles.push(o),drawText:(value,o)=>texts.push({value,...o})},font={widthOfTextAtSize:(value,size)=>String(value).length*size};
  const marker={key:'ELEVE_COURRIEL',fragments:[{x:100,y:200,width:40,height:10}]};
  const empty=ctx.drawMergedValue(page,font,font,marker,'');
  assert(empty.missing&&rectangles.length===2,'signal jaune non dessiné pour une donnée absente');
  assert(rectangles[0].x>=99&&rectangles[0].x+rectangles[0].width<=141,'masque blanc hors de la balise');
  assert(rectangles[0].y<=197.2&&rectangles[0].y+rectangles[0].height>=210.2,'masque blanc incomplet en hauteur');
  assert(rectangles[1].x===100&&rectangles[1].width===40&&rectangles[1].color[0]===1&&rectangles[1].color[1]===.91,'ligne jaune incorrecte');
  rectangles.length=0;const filled=ctx.drawMergedValue(page,font,font,marker,'adresse.longue@example.test');
  assert(!filled.missing&&texts.length===1&&texts[0].x===100.2,'valeur non replacée dans la balise');
  assert(font.widthOfTextAtSize(texts[0].value,texts[0].size)<=39.61,'valeur longue débordante');
});

test('le modèle Word emploie des alias courts qui restent continus dans le PDF',()=>{
  for(const alias of ['EL_PROJET','EL_SHN','PAA','PAE','PAO','PCE','PCO'])assert(html.includes(alias+':'),alias+' non reconnu par la fusion');
  assert(pdfTemplatePrep.includes('"ELEVE_PROJET_ENTREPRISE": "EL_PROJET"'),'alias projet entreprise absent');
  assert(pdfTemplatePrep.includes('"POSITIONNEMENT_AVIS_APPRENTI": "PAA"'),'alias avis apprenti absent');
  assert(pdfTemplatePrep.includes('Balises distinctes'),'audit du DOCX préparé absent');
  assert(!html.includes('POS_AV_APP'),'alias trop long encore présent');
});

test('les champs demandés sont tous raccordés aux balises du modèle',()=>{
  for(const token of ['ELEVE_LIEU_NAISSANCE','ELEVE_NATIONALITE','ELEVE_COURRIEL','SCOLARITE_DERNIER_ETABLISSEMENT','SCOLARITE_DERNIERE_CLASSE','SCOLARITE_DERNIER_DIPLOME','RESP1_PROFESSION','RESP2_PROFESSION','ENTREPRISE_RAISON_SOCIALE'])assert(html.includes(token+':'),token+' non raccordé');
  assert(html.includes("Object.prototype.hasOwnProperty.call(values,marker.key)"),'fusion bornée aux valeurs prévues absente');
  assert(html.includes("value=clean(value)"),'nettoyage des valeurs de fusion absent');
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
  assert(html.includes('PDFDocument.load(raw.slice())'),'le PDF source n’est pas chargé intégralement');
  assert(!html.includes('addPage(')&&!html.includes('removePage('),'le générateur modifie le nombre ou l’ordre des pages');
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
  assert(html.includes('item.transform||[1,0,0,8,0,0]'),'coordonnées des balises PDF non lues');
  assert(html.includes('marker.fragments.forEach'),'fragments des balises non utilisés');
  assert(!html.includes('e.nom,65,549')&&!html.includes('e.telephone,210,455'),'coordonnées historiques encore présentes');
  assert(html.includes('page.drawText(value,{x:bounds.minX+.2,y:first.y'),'valeur non dessinée à l’emplacement de la balise');
  assert(html.includes("DATE_HEURE_IMPRESSION:dateLabel"),'date d’édition non répétée dans le pied de page');
});

console.log(`\nDEV464: ${ok} tests réussis, ${ko} échec(s)`);if(ko)process.exit(1);
