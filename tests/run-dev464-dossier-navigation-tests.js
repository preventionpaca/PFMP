const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'apps-script',f),'utf8');
const server=read('EUC_PFMP_DEV464_DossierApprentissage.js');
const html=read('Dossier_Apprentissage_DEV464.html');
const fast=read('EUC_PFMP_DEV382_Performance.js');
const detail=read('Suivi_PFMP_Classe_Detail_V156.html');
const router=read('EUC_PFMP_DEV455_FastVerifiedViews.js');
const admin=read('Admin_PFMP.html');
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

test('les données responsables et apprenti sont lues seulement pour l’élève choisi',()=>{
  assert(server.includes("{Eleve:[studentId]}").toString(),'filtres ciblés absents');
  assert(server.includes("EUC_RESPONSABLES_ELEVES_PFMP"),'responsables absents');
  assert(server.includes("EUC_APPRENTISSAGE_PFMP"),'apprentissage absent');
});

test('le PDF de huit pages reste local et reçoit une date sur chaque page',()=>{
  assert(html.includes('pdf.getPages()'),'pages PDF non lues');
  assert(html.includes('pages.length!==8'),'contrôle 8 pages absent');
  assert(html.includes("pages.slice(0,8).forEach"),'date non appliquée aux huit pages');
  assert(html.includes("'Imprimé le '"),'date d’impression absente');
  assert(html.includes('arrayBuffer()'),'modèle local non utilisé');
  assert(!html.includes('Historique_impression')&&!server.includes('Historique_impression'),'historique indésirable');
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

test('les zones PDF corrigées ne chevauchent plus les libellés ni le pied de page',()=>{
  assert(!html.includes('w(p,e.formation,200,122,300)'),'formation encore injectée sur le bloc CFA de la page 2');
  assert(html.includes("w(p,e.etablissement||'Lycée Les Eucalyptus',190,104"),'dernier établissement absent de la page 1');
  assert(html.includes('w(p,e.formation||e.classe,180,91'),'dernière classe absente de la page 1');
  assert(html.includes('w(p,e.telephone,210,455')&&html.includes('w(p,e.courriel,210,429'),'coordonnées page 7 encore sur les libellés');
  assert(html.includes("' - page '+(i+1)+'/8',405,18"),'pied de page encore hors marge utile');
});

console.log(`\nDEV464: ${ok} tests réussis, ${ko} échec(s)`);if(ko)process.exit(1);
