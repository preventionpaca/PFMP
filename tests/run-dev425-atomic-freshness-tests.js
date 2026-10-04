'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const atomic=read('apps-script/EUC_PFMP_DEV425_AtomicFreshness.js');
const family=read('apps-script/EUC_PFMP_DEV339_FamilleUX.js');
const maintenance=read('apps-script/Snapshot_PFMP_Admin_V190.html');

assert.match(atomic,/__DEV425_STATE__/);
assert.match(atomic,/status==='DIRTY'/);
assert.match(atomic,/EUC_DEV425_writeState_\(token\.annee,fam,\{revision:revision,status:'DIRTY'/);
assert.match(atomic,/EUC_DEV425_writeState_\(token\.annee,fam,\{revision:token\.revision,status:'READY'/);
assert.match(atomic,/function EUC_DEV427_writeDetails_/,'les détails touchés doivent être matérialisés durablement');
assert.match(atomic,/function EUC_DEV432_repairBacproSnapshot\(\)/,
  'la réparation groupée BAC PRO doit être disponible');
assert.match(atomic,/function EUC_DEV434_rebuildBacproSnapshot\(\)/,
  'la maintenance doit pouvoir forcer la reconstruction groupée des détails BAC PRO');
assert.match(maintenance,/id="rebuildBacpro190I"/,
  'la maintenance doit exposer la reconstruction atomique BAC PRO');
assert.match(maintenance,/\.EUC_DEV434_rebuildBacproSnapshot\(\)/,
  'le bouton de maintenance doit appeler la reconstruction atomique');
assert.match(atomic,/function EUC_DEV434_sanitizeBacproDetails\(\)/,
  'les détails BAC PRO existants doivent pouvoir être assainis atomiquement');
const sanitize=atomic.slice(atomic.indexOf('function EUC_DEV434_sanitizeBacproDetails'),atomic.indexOf('/* DEV433'));
assert.match(sanitize,/status:'DIRTY'[\s\S]*EUC_DEV427_writeDetails_[\s\S]*status:'READY'/,
  'la migration P.dif. doit publier les détails entre DIRTY et READY');
assert.match(sanitize,/EUC_DEV416_cacheDrop_/,
  'la migration P.dif. doit supprimer les anciens détails du cache court');
assert.match(family,/EUC_DEV285B_modeFor_\(Number\(x&&x\.eleveId\)\|\|0,annee\)/,
  'le filtrage PFMP ordinaire doit relire le mode P.dif. autoritaire');
assert.match(family,/mode\.indexOf\('PARCOURS_DIFF_LYCEE'\)<0/,
  'un élève P.dif. lycée ne doit pas rester dans une PFMP ordinaire');
assert.match(family,/detail\.__dev434PdifFiltered=true/,
  'les nouveaux détails doivent mémoriser le filtrage P.dif. autoritaire');
const repair=atomic.slice(atomic.indexOf('function EUC_DEV432_repairFamilyFromLegacy_'),atomic.indexOf('function EUC_DEV432_repairBacproSnapshot'));
assert.match(repair,/EUC_DEV422_hydrateFamily_\(base,annee,famille/,
  'la réparation doit hydrater les détails en une opération groupée');
assert.doesNotMatch(repair,/EUC_DEV190_buildHistoricalDetail_/,
  'la réparation ne doit pas recalculer chaque classe et période en série');
assert.match(repair,/EUC_DEV427_writeDetails_[\s\S]*EUC_DEV424_writeFamily_[\s\S]*status:'READY'/,
  'READY doit être publié seulement après les détails et la famille');
assert.doesNotMatch(repair,/details\.forEach[\s\S]*EUC_DEV416_cachePut_\(/,
  'la publication READY ne doit pas recopier 53 gros détails dans CacheService');
assert.match(repair,/status:'READY'[\s\S]*EUC_DEV421_familyCachePut_/,
  'le cache familial partagé doit être remplacé seulement après READY');
assert.match(atomic,/function EUC_DEV432_groupedDetails_/,
  'une reconstruction groupée doit prendre le relais si la table historique est vide');
assert.match(repair,/if\(!details\.length\)[\s\S]*EUC_DEV432_groupedDetails_/,
  'la reconstruction groupée doit être déclenchée sans détails historiques');
assert.match(atomic,/EUC_DEV427_DETAIL_PREFIX_/,'les détails doivent utiliser un espace technique distinct');
assert.match(atomic,/EUC_DEV424_writeFamily_\(annee,famille,hydrated\)/,
  'le snapshot familial doit être écrit avant la transition READY');
assert.match(atomic,/PropertiesService\.getScriptProperties\(\)\.getProperty\(EUC_DEV426_statePropKey_/,
  'la lecture rapide doit utiliser le pointeur de fraîcheur partagé');
assert.match(atomic,/PropertiesService\.getScriptProperties\(\)\.setProperty\(EUC_DEV426_statePropKey_/,
  'chaque transition DIRTY ou READY doit mettre à jour le pointeur partagé');
const scheduled=atomic.slice(atomic.indexOf('function EUC_DEV425_refreshScheduled'),atomic.indexOf('function EUC_DEV425_status'));
assert.match(scheduled,/skipped:'all-ready'/,'le filet de sécurité doit ignorer les snapshots READY');
assert.match(scheduled,/var item=pending\[0\]/,'le filet de sécurité doit reprendre une seule famille par passage');
assert.match(atomic,/targets:\(state\.targets\|\|\[\]\)\.map/,
  'les périodes touchées doivent être conservées dans l’état partagé');
assert.match(atomic,/function EUC_DEV426_rawFamilySnapshot_/,
  'la reconstruction doit réutiliser le snapshot familial durable');
assert.match(atomic,/EUC_DEV190_buildHistoricalDetail_\(annee,t\.classe,t\.periode\)/,
  'seules les périodes touchées ou manquantes doivent être recalculées');
assert.doesNotMatch(atomic.slice(atomic.indexOf('function EUC_DEV425_buildFamily_'),atomic.indexOf('function EUC_DEV425_finishMutation_')),
  /EUC_DEV190J_syncOne/,'la publication ne doit plus dépendre de la table de détails fantôme');
assert.match(atomic,/function EUC_DEV426_finalizeRecovery\(\)/,
  'une reprise déjà synchronisée doit pouvoir être finalisée sans recalcul');
assert.match(atomic,/EUC_DEV427_writeDetails_\(annee,famille,details\)[\s\S]*EUC_DEV424_writeFamily_\(annee,famille,hydrated\)/,
  'les détails doivent être écrits avant l’index familial');
assert.doesNotMatch(atomic.slice(atomic.indexOf('function EUC_DEV425_buildFamily_'),atomic.indexOf('function EUC_DEV425_finishMutation_')),
  /EUC_DEV425_invalidateFamily_\(/,'la publication ne doit pas effacer les caches qu’elle vient de produire');
assert.match(scheduled,/remaining:Math\.max\(0,pending\.length-1\)/,
  'la reprise doit signaler les familles restant à traiter');
assert.doesNotMatch(scheduled,/EUC_DEV425_beginMutation_/,
  'le filet de sécurité ne doit plus invalider toutes les familles toutes les quinze minutes');
assert.match(scheduled,/families:\[item\.famille\]/,
  'le filet de sécurité doit réparer uniquement chaque famille réellement DIRTY');

const ctx={console,Date,JSON,Math,Utilities:{getUuid:()=> 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}};
vm.createContext(ctx);vm.runInContext(atomic,ctx);
ctx.EUC_DEV425_readState_=()=>({status:'DIRTY',revision:'r2'});
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r2'}),false,'DIRTY ne peut jamais être servi comme à jour');
ctx.EUC_DEV425_readState_=()=>({status:'READY',revision:'r2'});
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r1'}),false,'une ancienne révision doit être refusée');
assert.equal(ctx.EUC_DEV425_payloadFresh_('2026-2027','BACPRO',{__dev425Revision:'r2'}),true,'seule la révision READY correspondante est fraîche');

const mutationFiles=[
  'apps-script/EUC_PFMP_DEV225_StatusAutoSave.js',
  'apps-script/EUC_APPRENTISSAGE_PFMP_V172.js',
  'apps-script/EUC_PFMP_DEV420_SituationsEleves.js',
  'apps-script/EUC_PFMP_DEV174.js',
  'apps-script/EUC_PFMP_DEV190U_CleanModules.js',
  'apps-script/EUC_PFMP_DEV285B_ModeFinTerminale.js',
  'apps-script/EUC_SUIVI_PFMP_AffectationsV156.js',
  'apps-script/EUC_SUIVI_PFMP_V156.js',
  'apps-script/EUC_SUIVI_PFMP_FixV161_24.js',
  'apps-script/EUC_CONVENTION_PFMP_AdminWorkflowV144.js',
  'apps-script/EUC_CONVENTION_PFMP_QRPublicV85.js',
  'apps-script/EUC_IMPORT_PFMP_RealService.js',
  'apps-script/EUC_IMPORT_PFMP_ProfClasses.js',
  'apps-script/EUC_PFMP_DEV315_RepairJotFormAccess.js',
  'apps-script/EUC_PFMP_DEV321_Consolidation.js',
  'apps-script/EUC_PFMP_DEV322_DifferentialImport.js',
  'apps-script/EUC_PFMP_DEV326_FastSafeImport.js'
];
mutationFiles.forEach(file=>{
  const source=read(file);
  assert.match(source,/EUC_DEV425_begin(?:Mutation|ImportItems)_/,'début atomique absent de '+file);
  assert.match(source,/EUC_DEV425_finish(?:Mutation|Result|Many)_/,'publication atomique absente de '+file);
});

const trigger=read('apps-script/EUC_PFMP_DEV424_SnapshotPlanifie.js');
assert.match(trigger,/EUC_DEV425_refreshScheduled/);
assert.match(trigger,/EUC_DEV424_INTERVAL_MINUTES_=15/);
assert.match(trigger,/return d\|\|\(\(Number\(b\.id\)\|\|0\)-\(Number\(a\.id\)\|\|0\)\)/,
  'les égalités d’horodatage doivent privilégier l’enregistrement le plus récent');
assert.match(trigger,/old\.slice\(1\)[\s\S]*Actif:false/,
  'une famille déjà identique doit tout de même désactiver ses doublons actifs');
assert.doesNotMatch(atomic,/3pnVrygfNn7c/);

for(const file of ['apps-script/Suivi_Conventions_Public_FamilleClone_V353.html','apps-script/Suivi_Conventions_Admin_FamilleV190L.html']){
  const source=read(file);
  assert.match(source,/querySelectorAll\('\.period\[data-class\]\[data-period\] \.count/,
    'le survol doit être limité à la zone des chiffres');
  assert.match(source,/addEventListener\('pointerenter'/);
  assert.match(source,/if\(cache\[k\]\)\{render\(el,cache\[k\]\);return;\}/,'la bulle préchargée doit rester instantanée');
  assert.match(source,/var periodeId=Number\(p\.id\|\|p\.periodeId\)\|\|0;/,
    'la clé DOM doit utiliser le même identifiant de période que la bulle préchargée');
  assert.match(source,/if\(DATA&&DATA\.__dev422===true\)return;/,
    'un snapshot déjà enrichi ne doit pas déclencher une seconde lecture serveur');
}
const familyUx=read('apps-script/EUC_PFMP_DEV339_FamilleUX.js');
assert.match(familyUx,/EUC_DEV421_FAMILY_CHUNK_/,'le cache familial doit être découpé pour dépasser la limite par entrée');
assert.match(familyUx,/return d\|\|\(\(Number\(b\.id\)\|\|0\)-\(Number\(a\.id\)\|\|0\)\)/,
  'la grille doit départager deux snapshots actifs au même instant par leur identifiant');
assert.match(familyUx,/\(quick\.apprentis\|\|\[\]\)\.forEach/,
  'le badge classe doit partager le décompte apprenti de la bulle');
assert.match(familyUx,/if\(!isPdif\)\{[\s\S]*parcoursDifferencie===true/,
  'les élèves en parcours différencié doivent être exclus des PFMP ordinaires');
const uxCtx={console,Date,JSON,Math};
vm.createContext(uxCtx);vm.runInContext(familyUx,uxCtx);
uxCtx.EUC_DEV387_isPdifPeriod_=p=>/P\.dif/i.test(String(p&&p.libelle||''));
const regular=uxCtx.EUC_DEV422_enrichDetailBatch_({
  periode:{libelle:'PFMP n°1'},
  lignes:[
    {eleveId:1,nom:'DUPONT',prenom:'Lina',parcoursDifferencie:true,statutCode:'CONVENTION_ENREGISTREE'},
    {eleveId:2,nom:'MARTIN',prenom:'Noé',parcoursDifferencie:false,statutCode:'CONVENTION_ENREGISTREE'}
  ]
},'2026-2027','BACPRO',1,10,{accessAvailable:false,appsAvailable:false,affectationsAvailable:false},{});
assert.deepEqual(Array.from(regular.lignes,x=>x.eleveId),[2],
  'une PFMP ordinaire ne doit plus contenir les élèves du parcours différencié');
const pdif=uxCtx.EUC_DEV422_enrichDetailBatch_({
  periode:{libelle:'P.dif.'},
  lignes:[{eleveId:1,nom:'DUPONT',prenom:'Lina',parcoursDifferencie:true,modeFinTerminale:'PARCOURS_DIFF_LYCEE'}]
},'2026-2027','BACPRO',1,11,{accessAvailable:false,appsAvailable:false,affectationsAvailable:false},{});
assert.equal(pdif.lignes.length,1,'la vue P.dif. doit conserver l’élève concerné');
const finalDetail=read('apps-script/EUC_PFMP_DEV416_Performance.js');
assert.match(finalDetail,/EUC_DEV427_readDetail_/,'la page de classe doit lire le détail durable avant tout recalcul');
for(const file of ['apps-script/Suivi_PFMP_Classe_PublicClone_V353.html','apps-script/Suivi_PFMP_Classe_Detail_V156.html']){
  assert.match(read(file),/Suivi PFMP : /,'le titre de détail doit utiliser les deux-points');
}
const publicDetail=read('apps-script/EUC_PFMP_DEV415_PublicAdminExact.js');
assert.match(publicDetail,/#EUC_DEV183_BREADCRUMB\{display:none!important\}/);
assert.match(publicDetail,/EUC_DEV425_PUBLIC_BREADCRUMB_GUARD/);
assert.match(publicDetail,/new MutationObserver\(hideAdminBreadcrumb\)/,'le fil admin recréé tardivement doit rester masqué');
assert.match(publicDetail,/el\.hidden=true/);

console.log('✓ DEV425 : fraîcheur atomique, mutations, bulles et fil d’Ariane public');
