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
  assert(router.includes("'dossier-apprentissage-pfmp'"),'route absente');
  assert(admin.includes('Dossier de demande d’apprentissage'),'tuile absente');
  assert(admin.includes("?page=dossier-apprentissage-pfmp"),'lien absent');
  assert(admin.includes('AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec?page=dossier-apprentissage-pfmp'),'déploiement administrateur absolu absent');
  assert(/(?:target=["']_top["']|\.target=["']_top["'])/.test(admin),'sortie de l’iframe technique absente');
});

test('l’autocomplétion charge un index unique sans appel serveur à chaque frappe',()=>{
  assert((html.match(/EUC_DEV464_studentIndex\(\)/g)||[]).length===1,'index chargé plusieurs fois');
  const input=html.slice(html.indexOf("search.addEventListener('input'"),html.indexOf("results.addEventListener"));
  assert(!input.includes('google.script.run'),'appel serveur pendant la frappe');
  assert(html.includes('EUC_DEV464_studentDossier(id)'),'dossier non ciblé');
});

test('INE et NIR restent deux champs distincts et aucune valeur n’est inventée',()=>{
  assert(server.includes("['INE','Numero_INE','Numero_national']"),'aliases INE absents');
  assert(server.includes("['NIR','Numero_securite_sociale','Numero_securite','SSN']"),'aliases NIR absents');
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

console.log(`\nDEV464: ${ok} tests réussis, ${ko} échec(s)`);if(ko)process.exit(1);
