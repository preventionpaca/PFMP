/** Eucalyptus PFMP — v1.0.0-dev.64 — import réel Pronote vers EUC_ELEVES_PFMP. */
var EUC_IMPORT_ELEVES_TABLE_='EUC_ELEVES_PFMP';
function EUC_IMPORT_colonne_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_IMPORT_assurerTableEleves_(){
  var t=EUC_IMPORT_ELEVES_TABLE_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;}),c=EUC_IMPORT_colonne_;
  var cols=[
    c('Identifiant_Pronote','Identifiant Pronote'),c('Numero_Pronote','Numéro Pronote'),c('Numero_national','Numéro national'),c('Identifiant_import','Identifiant import'),
    c('Nom','Nom'),c('Prenom','Prénom'),c('Prenom_usage','Prénom d’usage'),c('Date_naissance','Date de naissance','Date'),
    c('Classe','Classe','Ref:Classes'),c('Code_classe_importe','Code classe importé'),c('Annee_scolaire','Année scolaire','Ref:Annees_Scolaires'),
    c('Professeur_principal','Professeur principal'),c('Source_Pronote','Source Pronote'),c('Source_import','Source de l’import'),
    c('Cle_rapprochement','Clé de rapprochement'),c('Cle_inscription_annuelle','Clé inscription annuelle'),c('Statut_rapprochement','Statut du rapprochement'),
    c('Statut_scolarite','Statut de scolarité'),c('Date_entree','Date d’entrée','Date'),c('Date_sortie','Date de sortie','Date'),
    c('Sortie_confirmee','Sortie confirmée','Bool'),c('Date_derniere_presence_import','Dernière présence dans un import','DateTime'),c('Present_dernier_import','Présent dans le dernier import','Bool'),
    c('Actif','Actif','Bool'),c('Date_creation','Date de création','DateTime'),c('Date_modification','Date de modification','DateTime'),
    c('Identifiant_lot_import','Identifiant du lot d’import'),c('Empreinte_import','Empreinte de l’import'),c('Numero_version','Numéro de version','Int')
  ];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});return {tableCreee:true,colonnesCreees:cols.map(function(x){return x.id;})};}
  var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});
  return {tableCreee:false,colonnesCreees:missing.map(function(x){return x.id;})};
}
function EUC_IMPORT_dateGrist_(iso){if(!iso)return null;var d=new Date(String(iso)+'T00:00:00Z');return isNaN(d.getTime())?null:Math.floor(d.getTime()/1000);}
function EUC_IMPORT_nowGrist_(){return Math.floor(Date.now()/1000);}
function EUC_IMPORT_normaliserCle_(v){return String(v||'').trim().toUpperCase();}
function EUC_IMPORT_cleStableLigne_(r){
  if(r.numeroNational)return 'NN|'+r.numeroNational;
  if(r.ident)return 'I|'+r.ident;
  if(r.numero)return 'N|'+r.numero;
  return 'ID|'+[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');
}
function EUC_IMPORT_lireAnnee_(code){var rows=EUC_IMPORT_lireRecordsBruts_('Annees_Scolaires').filter(function(r){return String((r.fields||{}).Code||'')===String(code);});if(rows.length!==1)throw new Error('Année scolaire '+code+' introuvable ou ambiguë dans Grist.');return rows[0];}
function EUC_IMPORT_indexExistantsReels_(rows,anneeId,source){
  var stable={},identite={};
  (rows||[]).forEach(function(r){var f=r.fields||r;if(Number(f.Annee_scolaire)!==Number(anneeId))return;var src=EUC_IMPORT_normaliserSourcePronote_(f.Source_Pronote||f.Source_import||'');if(src&&src!==source)return;
    function add(k){if(!k)return;(stable[k]=stable[k]||[]).push(r);}add(f.Numero_national?'NN|'+f.Numero_national:'');add(f.Identifiant_Pronote?'I|'+f.Identifiant_Pronote:'');add(f.Numero_Pronote?'N|'+f.Numero_Pronote:'');
    var ik=[EUC_SUIVI_normaliserIdentite_(f.Nom),EUC_SUIVI_normaliserIdentite_(f.Prenom_usage||f.Prenom),EUC_SUIVI_dateISO_(f.Date_naissance)].join('|');(identite[ik]=identite[ik]||[]).push(r);
  });return {stable:stable,identite:identite};
}
function EUC_IMPORT_importerReelTexte(payload){
  var lock=LockService.getScriptLock();if(!lock.tryLock(3000))throw new Error('Un autre import est déjà en cours.');
  try{
    var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};if(payload.confirmation!=='IMPORTER_REELLEMENT_DANS_GRIST')throw new Error('Confirmation explicite requise pour l’import réel.');
    var preview=EUC_IMPORT_previsualiserTexte(payload);if(!preview.pretAValider)throw new Error('Import réel bloqué : la prévisualisation contient encore des anomalies ou classes inconnues.');
    var source=EUC_IMPORT_normaliserSourcePronote_(preview.sourcePronote||'');if(source!=='LP'&&source!=='LGT')throw new Error('Source Pronote LP/LGT non résolue.');
    EUC_IMPORT_assurerTableEleves_();var annee=EUC_IMPORT_lireAnnee_(preview.annee),anneeId=annee.id;
    var parsed=EUC_IMPORT_analyserTexte_(String(payload.texte||''),{annee:preview.annee});EUC_IMPORT_extraireProfesseursPrincipaux_(String(payload.texte||''),parsed);
    var classes=EUC_IMPORT_chargerClassesCamin_(),corrPersist=EUC_IMPORT_chargerCorrespondances_(preview.annee,source);EUC_IMPORT_preparerClasses_(parsed,classes,corrPersist,payload.correspondances||{},payload.classesExclues||[]);
    var classesById={},classesByNom={};classes.forEach(function(c){classesById[String(c.id)]=c;classesByNom[EUC_IMPORT_normaliserCle_(c.nom)]=c;});
    var existing=EUC_IMPORT_lireRecordsBruts_(EUC_IMPORT_ELEVES_TABLE_),idx=EUC_IMPORT_indexExistantsReels_(existing,anneeId,source),posts=[],patches=[],now=EUC_IMPORT_nowGrist_(),lot='PRONOTE-'+source+'-'+preview.annee+'-'+now,seen={};
    parsed.rows.forEach(function(r){if(r._exclueImport||!r.classe||String(r.classe).indexOf('__NON_CORRESPONDUE__')===0)return;var c=classesById[String(r.classeGristId)]||classesByNom[EUC_IMPORT_normaliserCle_(r.classe)];if(!c)return;
      var stable=EUC_IMPORT_cleStableLigne_(r);if(seen[stable])throw new Error('Doublon détecté pendant l’import réel : '+r.nom+' '+r.prenom);seen[stable]=true;
      var cand=idx.stable[stable]||[];if(!cand.length){var ik=[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');cand=idx.identite[ik]||[];}if(cand.length>1)throw new Error('Rapprochement ambigu pendant l’import réel : '+r.nom+' '+r.prenom);
      var common={Identifiant_Pronote:r.ident||'',Numero_Pronote:r.numero||'',Numero_national:r.numeroNational||'',Identifiant_import:stable,Nom:r.nom||'',Prenom:r.prenom||'',Prenom_usage:r.prenom||'',Date_naissance:EUC_IMPORT_dateGrist_(r.naissance),Classe:c.id,Code_classe_importe:r.classePronote||r.classe||'',Annee_scolaire:anneeId,Professeur_principal:r.professeurPrincipal||'',Source_Pronote:source,Source_import:'COPIER_COLLER_PRONOTE',Cle_rapprochement:stable,Cle_inscription_annuelle:[preview.annee,source,stable].join('|'),Statut_rapprochement:'AUTO',Statut_scolarite:r.dateSortie?'SORTI':'PRESENT',Date_entree:EUC_IMPORT_dateGrist_(r.dateEntree),Date_sortie:EUC_IMPORT_dateGrist_(r.dateSortie),Sortie_confirmee:!!r.dateSortie,Date_derniere_presence_import:now,Present_dernier_import:true,Actif:!r.dateSortie,Date_modification:now,Identifiant_lot_import:lot,Empreinte_import:preview.empreinte};
      if(cand.length===1){var old=cand[0],f=old.fields||old;common.Numero_version=(Number(f.Numero_version)||0)+1;patches.push({id:old.id,fields:common});}
      else{common.Date_creation=now;common.Numero_version=1;posts.push({fields:common});}
    });
    if(posts.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_IMPORT_ELEVES_TABLE_)+'/records',{records:posts});if(patches.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_IMPORT_ELEVES_TABLE_)+'/records',{records:patches});
    var reread=EUC_IMPORT_lireRecordsBruts_(EUC_IMPORT_ELEVES_TABLE_),lotCount=reread.filter(function(r){return String((r.fields||{}).Identifiant_lot_import||'')===lot;}).length;if(lotCount!==posts.length+patches.length)throw new Error('Contrôle post-écriture incomplet : '+lotCount+' ligne(s) relue(s) sur '+(posts.length+patches.length)+'.');
    return {ok:true,sourcePronote:source,annee:preview.annee,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length,lot:lot,aucuneSuppression:true,controlePostEcriture:true,auteur:ctx.email||''};
  }finally{lock.releaseLock();}
}
