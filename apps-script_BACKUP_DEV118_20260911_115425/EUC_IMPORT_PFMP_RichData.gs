/** Eucalyptus PFMP — v1.0.0-dev.77 — import Pronote enrichi élèves + responsables. */
var EUC_IMPORT_RESP_TABLE_='EUC_RESPONSABLES_ELEVES_PFMP';

function EUC_IMPORT_idxRich_(headers,aliases){return EUC_IMPORT_indexAlias_(headers,aliases);}
function EUC_IMPORT_vRich_(cells,idx){return idx>=0?String(cells[idx]||'').trim():'';}
function EUC_IMPORT_telRich_(v){return String(v||'').trim();}
function EUC_IMPORT_cmpRich_(v){return String(v===null||v===undefined?'':v).replace(/\s+/g,' ').trim();}
function EUC_IMPORT_boolResp_(v,needle){return EUC_IMPORT_cmpRich_(v).toUpperCase()===needle;}

function EUC_IMPORT_indicesResponsableRich_(headers,n){
  var p='R'+n+' ';
  function ix(){var a=[].slice.call(arguments);return EUC_IMPORT_idxRich_(headers,a.map(function(x){return p+x;}));}
  return {
    niveau:ix('NIV RESP'),civilite:ix('CIVILITE'),nom:ix('NOM'),prenom:ix('PRENOM'),ident:ix('IDENT'),numero:ix('NUMERO'),
    adresse1:ix('ADRES 1'),adresse2:ix('ADRES 2'),adresse3:ix('ADRES 3'),adresse4:ix('ADRES 4'),cp:ix('CP'),ville:ix('VILLE'),pays:ix('PAYS'),
    email:ix('EMAIL'),fixe:ix('FIXENUM','FIXE NUM'),portable:ix('PORTABLENUM','PORTABLE NUM'),bureau:ix('TELBUREAU','TEL BUREAU'),lien:ix('L LIEN','LIEN')
  };
}

function EUC_IMPORT_analyserTexteComplet_(text,options){
  var parsed=EUC_IMPORT_analyserTexte_(text,options),lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(function(x){return x.trim();});
  if(lines.length<2)return parsed;
  var sep=EUC_IMPORT_detecterSeparateur_(lines[0]),headers=EUC_IMPORT_lireCSV_(lines[0],sep).map(EUC_IMPORT_normaliserEntete_);
  var ix={
    adresse1:EUC_IMPORT_idxRich_(headers,['ADRES 1']),adresse2:EUC_IMPORT_idxRich_(headers,['ADRES 2']),adresse3:EUC_IMPORT_idxRich_(headers,['ADRES 3']),adresse4:EUC_IMPORT_idxRich_(headers,['ADRES 4']),
    cp:EUC_IMPORT_idxRich_(headers,['CP']),ville:EUC_IMPORT_idxRich_(headers,['VILLE']),pays:EUC_IMPORT_idxRich_(headers,['PAYS']),email:EUC_IMPORT_idxRich_(headers,['EMAIL']),
    portable:EUC_IMPORT_idxRich_(headers,['PORTABLENUM','PORTABLE NUM']),portableComplet:EUC_IMPORT_idxRich_(headers,['PORTABLECOMPLET','PORTABLE COMPLET']),apFormation:EUC_IMPORT_idxRich_(headers,['AP FORMATION'])
  };
  var rix=[];for(var j=1;j<=5;j++)rix.push(EUC_IMPORT_indicesResponsableRich_(headers,j));
  var byLine={};(parsed.rows||[]).forEach(function(r){byLine[String(r.ligne)]=r;});
  for(var n=1;n<lines.length;n++){
    var r=byLine[String(n+1)];if(!r)continue;var c=EUC_IMPORT_lireCSV_(lines[n],sep);
    r.adresse1=EUC_IMPORT_vRich_(c,ix.adresse1);r.adresse2=EUC_IMPORT_vRich_(c,ix.adresse2);r.adresse3=EUC_IMPORT_vRich_(c,ix.adresse3);r.adresse4=EUC_IMPORT_vRich_(c,ix.adresse4);
    r.cp=EUC_IMPORT_vRich_(c,ix.cp);r.ville=EUC_IMPORT_vRich_(c,ix.ville);r.pays=EUC_IMPORT_vRich_(c,ix.pays);r.emailEleve=EUC_IMPORT_vRich_(c,ix.email);
    r.telephoneEleve=EUC_IMPORT_telRich_(EUC_IMPORT_vRich_(c,ix.portableComplet)||EUC_IMPORT_vRich_(c,ix.portable));r.formationPronote=r.formation||EUC_IMPORT_vRich_(c,ix.apFormation);
    r.responsables=[];
    rix.forEach(function(x,k){var nom=EUC_IMPORT_vRich_(c,x.nom),prenom=EUC_IMPORT_vRich_(c,x.prenom),niveau=EUC_IMPORT_vRich_(c,x.niveau),ident=EUC_IMPORT_vRich_(c,x.ident),numero=EUC_IMPORT_vRich_(c,x.numero);if(!nom&&!prenom&&!niveau&&!ident&&!numero)return;
      r.responsables.push({rang:'R'+(k+1),niveau:niveau,civilite:EUC_IMPORT_vRich_(c,x.civilite),nom:nom,prenom:prenom,ident:ident,numero:numero,adresse1:EUC_IMPORT_vRich_(c,x.adresse1),adresse2:EUC_IMPORT_vRich_(c,x.adresse2),adresse3:EUC_IMPORT_vRich_(c,x.adresse3),adresse4:EUC_IMPORT_vRich_(c,x.adresse4),cp:EUC_IMPORT_vRich_(c,x.cp),ville:EUC_IMPORT_vRich_(c,x.ville),pays:EUC_IMPORT_vRich_(c,x.pays),email:EUC_IMPORT_vRich_(c,x.email),fixe:EUC_IMPORT_telRich_(EUC_IMPORT_vRich_(c,x.fixe)),portable:EUC_IMPORT_telRich_(EUC_IMPORT_vRich_(c,x.portable)),bureau:EUC_IMPORT_telRich_(EUC_IMPORT_vRich_(c,x.bureau)),lien:EUC_IMPORT_vRich_(c,x.lien),responsableLegal:EUC_IMPORT_boolResp_(niveau,'LEGAL'),responsableEnCharge:EUC_IMPORT_boolResp_(niveau,'EN CHARGE')});
    });
  }
  parsed.importComplet=true;parsed.responsablesLus=(parsed.rows||[]).reduce(function(s,r){return s+(r.responsables||[]).length;},0);
  return parsed;
}

function EUC_IMPORT_cleResponsableRich_(resp){
  if(resp.ident)return 'I|'+resp.ident;if(resp.numero)return 'N|'+resp.numero;
  return 'ID|'+[EUC_SUIVI_normaliserIdentite_(resp.nom),EUC_SUIVI_normaliserIdentite_(resp.prenom),EUC_IMPORT_cmpRich_(resp.lien),EUC_IMPORT_cmpRich_(resp.niveau)].join('|');
}
function EUC_IMPORT_indexEtudiantPreviewRich_(existing){
  var stable={},identity={};(existing||[]).forEach(function(e){function add(k){if(k)(stable[k]=stable[k]||[]).push(e);}add(e.Numero_national?'NN|'+e.Numero_national:'');add(e.Identifiant_Pronote?'I|'+e.Identifiant_Pronote:'');add(e.Numero_Pronote?'N|'+e.Numero_Pronote:'');var ik=[EUC_SUIVI_normaliserIdentite_(e.Nom),EUC_SUIVI_normaliserIdentite_(e.Prenom_usage||e.Prenom),EUC_IMPORT_dateExistanteISO_(e.Date_naissance)].join('|');(identity[ik]=identity[ik]||[]).push(e);});return {stable:stable,identity:identity};
}
function EUC_IMPORT_trouverEtudiantPreviewRich_(idx,r){var cand=[];if(r.numeroNational)cand=idx.stable['NN|'+r.numeroNational]||[];if(!cand.length&&r.ident)cand=idx.stable['I|'+r.ident]||[];if(!cand.length&&r.numero)cand=idx.stable['N|'+r.numero]||[];if(!cand.length){var ik=[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');cand=idx.identity[ik]||[];}return cand.length===1?cand[0]:null;}
function EUC_IMPORT_champsEleveRich_(r){return {Adresse_1:r.adresse1||'',Adresse_2:r.adresse2||'',Adresse_3:r.adresse3||'',Adresse_4:r.adresse4||'',Code_postal:r.cp||'',Ville:r.ville||'',Pays:r.pays||'',Email_eleve:r.emailEleve||'',Telephone_eleve:r.telephoneEleve||'',Formation_Pronote:r.formationPronote||''};}
function EUC_IMPORT_diffObjRich_(old,neu){var out=[];Object.keys(neu).forEach(function(k){if(EUC_IMPORT_cmpRich_(old&&old[k])!==EUC_IMPORT_cmpRich_(neu[k]))out.push(k);});return out;}
function EUC_IMPORT_previsualiserComplet_(parsed,existing,offers,imports,responsablesExistants){
  var p=EUC_IMPORT_previsualiser_(parsed,existing,offers,imports),idx=EUC_IMPORT_indexEtudiantPreviewRich_(existing),modsByLine={};(p.modifications||[]).forEach(function(m){modsByLine[String(m.ligne)]=m;});
  var respByEleve={};(responsablesExistants||[]).forEach(function(x){var id=Number(x.Eleve&&x.Eleve[1]!==undefined?x.Eleve[1]:x.Eleve)||0;if(!id)return;(respByEleve[id]=respByEleve[id]||[]).push(x);});
  p.compteurs.responsablesLus=parsed.responsablesLus||0;p.compteurs.responsablesNouveaux=0;p.compteurs.responsablesModifies=0;p.compteurs.responsablesInchanges=0;
  (parsed.rows||[]).forEach(function(r){if(r._exclueImport||!r.classe||String(r.classe).indexOf('__NON_CORRESPONDUE__')===0)return;var e=EUC_IMPORT_trouverEtudiantPreviewRich_(idx,r);if(!e)return;
    var changed=EUC_IMPORT_diffObjRich_(e,EUC_IMPORT_champsEleveRich_(r)),respChanged=false,existingResp=respByEleve[Number(e.id)]||[],respIndex={};existingResp.forEach(function(x){respIndex[String(x.Cle_responsable||'')]=x;});
    (r.responsables||[]).forEach(function(resp){var key=EUC_IMPORT_cleResponsableRich_(resp),old=respIndex[key],neu={Rang_responsable:resp.rang,Type_responsabilite:resp.niveau,Civilite:resp.civilite,Nom:resp.nom,Prenom:resp.prenom,Lien_avec_eleve:resp.lien,Adresse_1:resp.adresse1,Adresse_2:resp.adresse2,Adresse_3:resp.adresse3,Adresse_4:resp.adresse4,Code_postal:resp.cp,Ville:resp.ville,Pays:resp.pays,Email:resp.email,Telephone_fixe:resp.fixe,Telephone_portable:resp.portable,Telephone_professionnel:resp.bureau,Responsable_legal:resp.responsableLegal,Responsable_en_charge:resp.responsableEnCharge};if(!old){p.compteurs.responsablesNouveaux++;respChanged=true;}else if(EUC_IMPORT_diffObjRich_(old,neu).length){p.compteurs.responsablesModifies++;respChanged=true;}else p.compteurs.responsablesInchanges++;});
    if(changed.length){p.compteurs.changementsCoordonnees=(Number(p.compteurs.changementsCoordonnees)||0)+1;}
    if(changed.length||respChanged){var m=modsByLine[String(r.ligne)];if(m){m.champsModifies=(m.champsModifies||[]).concat(changed);if(respChanged)m.responsablesModifies=true;}else{p.compteurs.inchanges=Math.max(0,(Number(p.compteurs.inchanges)||0)-1);p.compteurs.misesAJour=(Number(p.compteurs.misesAJour)||0)+1;m={ligne:r.ligne,nom:r.nom,prenom:r.prenom,type:changed.length?'MISE_A_JOUR_COORDONNEES':'MISE_A_JOUR_RESPONSABLES',classeAvant:String(e.Code_classe_importe||''),classeApres:r.classe,champsModifies:changed,responsablesModifies:respChanged,motif:changed.length?'Coordonnées élève modifiées dans Pronote.':'Responsable(s) modifié(s) dans Pronote.'};p.modifications.push(m);modsByLine[String(r.ligne)]=m;}
    }
  });
  return p;
}

function EUC_IMPORT_colRich_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_IMPORT_assurerSchemaRich_(){
  EUC_IMPORT_assurerTableEleves_();var c=EUC_IMPORT_colRich_,t=EUC_IMPORT_ELEVES_TABLE_,cols=[c('Adresse_1','Adresse 1'),c('Adresse_2','Adresse 2'),c('Adresse_3','Adresse 3'),c('Adresse_4','Adresse 4'),c('Code_postal','Code postal'),c('Ville','Ville'),c('Pays','Pays'),c('Email_eleve','E-mail élève'),c('Telephone_eleve','Téléphone élève'),c('Formation_Pronote','Formation Pronote')];
  var present={};(EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[]).forEach(function(x){present[x.id]=true;});var missing=cols.filter(function(x){return !present[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});
  var tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===EUC_IMPORT_RESP_TABLE_});var rc=[c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Eleve_IDENT_PRONOTE','IDENT Pronote élève'),c('Rang_responsable','Rang responsable'),c('Cle_responsable','Clé responsable'),c('Identifiant_Pronote','IDENT Pronote responsable'),c('Numero_Pronote','Numéro Pronote responsable'),c('Type_responsabilite','Type de responsabilité'),c('Civilite','Civilité'),c('Nom','Nom'),c('Prenom','Prénom'),c('Lien_avec_eleve','Lien avec élève'),c('Adresse_1','Adresse 1'),c('Adresse_2','Adresse 2'),c('Adresse_3','Adresse 3'),c('Adresse_4','Adresse 4'),c('Code_postal','Code postal'),c('Ville','Ville'),c('Pays','Pays'),c('Email','E-mail'),c('Telephone_fixe','Téléphone fixe'),c('Telephone_portable','Téléphone portable'),c('Telephone_professionnel','Téléphone professionnel'),c('Responsable_legal','Responsable légal','Bool'),c('Responsable_en_charge','Responsable en charge','Bool'),c('Source_Pronote','Source Pronote'),c('Date_derniere_synchro','Dernière synchro','DateTime')];
  if(!exists)EUC_ENT_grist('post','/tables',{tables:[{id:EUC_IMPORT_RESP_TABLE_,columns:rc}]});else{var rp={};(EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_IMPORT_RESP_TABLE_)+'/columns').columns||[]).forEach(function(x){rp[x.id]=true;});var rm=rc.filter(function(x){return !rp[x.id];});if(rm.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_IMPORT_RESP_TABLE_)+'/columns',{columns:rm});}
}
function EUC_IMPORT_recordFieldsRich_(r,c,anneeId,source,stable,preview,now,lot){return Object.assign({Identifiant_Pronote:r.ident||'',Numero_Pronote:r.numero||'',Numero_national:r.numeroNational||'',Identifiant_import:stable,Nom:r.nom||'',Prenom:r.prenom||'',Prenom_usage:r.prenom||'',Date_naissance:EUC_IMPORT_dateGrist_(r.naissance),Classe:c.id,Code_classe_importe:r.classePronote||r.classe||'',Annee_scolaire:anneeId,Professeur_principal:r.professeurPrincipal||'',Source_Pronote:source,Source_import:'COPIER_COLLER_PRONOTE_COMPLET',Cle_rapprochement:stable,Cle_inscription_annuelle:[preview.annee,source,stable].join('|'),Statut_rapprochement:'AUTO',Statut_scolarite:r.dateSortie?'SORTI':'PRESENT',Date_entree:EUC_IMPORT_dateGrist_(r.dateEntree),Date_sortie:EUC_IMPORT_dateGrist_(r.dateSortie),Sortie_confirmee:!!r.dateSortie,Date_derniere_presence_import:now,Present_dernier_import:true,Actif:!r.dateSortie,Date_modification:now,Identifiant_lot_import:lot,Empreinte_import:preview.empreinte},EUC_IMPORT_champsEleveRich_(r));}
function EUC_IMPORT_respFieldsRich_(studentId,studentIdent,resp,source,now){return {Eleve:studentId,Eleve_IDENT_PRONOTE:studentIdent||'',Rang_responsable:resp.rang||'',Cle_responsable:EUC_IMPORT_cleResponsableRich_(resp),Identifiant_Pronote:resp.ident||'',Numero_Pronote:resp.numero||'',Type_responsabilite:resp.niveau||'',Civilite:resp.civilite||'',Nom:resp.nom||'',Prenom:resp.prenom||'',Lien_avec_eleve:resp.lien||'',Adresse_1:resp.adresse1||'',Adresse_2:resp.adresse2||'',Adresse_3:resp.adresse3||'',Adresse_4:resp.adresse4||'',Code_postal:resp.cp||'',Ville:resp.ville||'',Pays:resp.pays||'',Email:resp.email||'',Telephone_fixe:resp.fixe||'',Telephone_portable:resp.portable||'',Telephone_professionnel:resp.bureau||'',Responsable_legal:!!resp.responsableLegal,Responsable_en_charge:!!resp.responsableEnCharge,Source_Pronote:source,Date_derniere_synchro:now};}

function EUC_IMPORT_importerReelCompletTexte(payload){
  var lock=LockService.getScriptLock();if(!lock.tryLock(3000))throw new Error('Un autre import est déjà en cours.');
  try{
    var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};if(payload.confirmation!=='IMPORTER_REELLEMENT_DANS_GRIST')throw new Error('Confirmation explicite requise pour l’import réel.');
    var preview=EUC_IMPORT_previsualiserTexte(payload);if(!preview.pretAValider)throw new Error('Import réel bloqué : anomalies ou classes inconnues.');var actions=(Number(preview.compteurs.nouveaux)||0)+(Number(preview.compteurs.misesAJour)||0)+(Number(preview.compteurs.reactives)||0);if(actions===0)throw new Error('Import inutile : aucune création ni mise à jour détectée.');
    var source=EUC_IMPORT_normaliserSourcePronote_(preview.sourcePronote||'');if(source!=='LP'&&source!=='LGT')throw new Error('Source Pronote LP/LGT non résolue.');EUC_IMPORT_assurerSchemaRich_();
    var annee=EUC_IMPORT_lireAnnee_(preview.annee),anneeId=annee.id,parsed=EUC_IMPORT_analyserTexteComplet_(String(payload.texte||''),{annee:preview.annee});EUC_IMPORT_extraireProfesseursPrincipaux_(String(payload.texte||''),parsed);
    var classes=EUC_IMPORT_chargerClassesCamin_(),corrPersist=EUC_IMPORT_chargerCorrespondances_(preview.annee,source);EUC_IMPORT_preparerClasses_(parsed,classes,corrPersist,payload.correspondances||{},payload.classesExclues||[]);var classesById={},classesByNom={};classes.forEach(function(c){classesById[String(c.id)]=c;classesByNom[EUC_IMPORT_normaliserCle_(c.nom)]=c;});
    var existing=EUC_IMPORT_lireRecordsBruts_(EUC_IMPORT_ELEVES_TABLE_),idx=EUC_IMPORT_indexExistantsReels_(existing,anneeId,source),posts=[],patches=[],now=EUC_IMPORT_nowGrist_(),lot='PRONOTE-COMPLET-'+source+'-'+preview.annee+'-'+now,seen={};
    parsed.rows.forEach(function(r){if(r._exclueImport||!r.classe||String(r.classe).indexOf('__NON_CORRESPONDUE__')===0)return;var c=classesById[String(r.classeGristId)]||classesByNom[EUC_IMPORT_normaliserCle_(r.classe)];if(!c)return;var stable=EUC_IMPORT_cleStableLigne_(r);if(seen[stable])throw new Error('Doublon détecté : '+r.nom+' '+r.prenom);seen[stable]=true;var cand=idx.stable[stable]||[];if(!cand.length){var ik=[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');cand=idx.identite[ik]||[];}if(cand.length>1)throw new Error('Rapprochement ambigu : '+r.nom+' '+r.prenom);var common=EUC_IMPORT_recordFieldsRich_(r,c,anneeId,source,stable,preview,now,lot);
      if(cand.length===1){var old=cand[0],f=old.fields||old,diff=EUC_IMPORT_diffObjRich_(f,common);['Date_modification','Identifiant_lot_import','Empreinte_import'].forEach(function(k){var i=diff.indexOf(k);if(i>=0)diff.splice(i,1);});if(diff.length){common.Numero_version=(Number(f.Numero_version)||0)+1;patches.push({id:old.id,fields:common});}}
      else{common.Date_creation=now;common.Numero_version=1;posts.push({fields:common});}
    });
    if(posts.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_IMPORT_ELEVES_TABLE_)+'/records',{records:posts});if(patches.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_IMPORT_ELEVES_TABLE_)+'/records',{records:patches});
    var reread=EUC_IMPORT_lireRecordsBruts_(EUC_IMPORT_ELEVES_TABLE_),studentIdx=EUC_IMPORT_indexExistantsReels_(reread,anneeId,source),respExisting=EUC_IMPORT_lireRecordsBruts_(EUC_IMPORT_RESP_TABLE_),respByStudentKey={},respPosts=[],respPatches=[];respExisting.forEach(function(rr){var f=rr.fields||{},sid=Number(f.Eleve)||0,key=sid+'|'+String(f.Cle_responsable||'');if(sid&&f.Cle_responsable)respByStudentKey[key]=rr;});
    parsed.rows.forEach(function(r){if(r._exclueImport||!r.classe||String(r.classe).indexOf('__NON_CORRESPONDUE__')===0)return;var stable=EUC_IMPORT_cleStableLigne_(r),cand=studentIdx.stable[stable]||[];if(!cand.length){var ik=[EUC_SUIVI_normaliserIdentite_(r.nom),EUC_SUIVI_normaliserIdentite_(r.prenom),String(r.naissance||'')].join('|');cand=studentIdx.identite[ik]||[];}if(cand.length!==1)return;var sid=cand[0].id;(r.responsables||[]).forEach(function(resp){var nf=EUC_IMPORT_respFieldsRich_(sid,r.ident||'',resp,source,now),key=sid+'|'+nf.Cle_responsable,old=respByStudentKey[key];if(!old)respPosts.push({fields:nf});else if(EUC_IMPORT_diffObjRich_(old.fields||old,nf).filter(function(k){return k!=='Date_derniere_synchro';}).length)respPatches.push({id:old.id,fields:nf});});});
    if(respPosts.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_IMPORT_RESP_TABLE_)+'/records',{records:respPosts});if(respPatches.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_IMPORT_RESP_TABLE_)+'/records',{records:respPatches});
    return {ok:true,sourcePronote:source,annee:preview.annee,crees:posts.length,misAJour:patches.length,total:posts.length+patches.length,responsablesCrees:respPosts.length,responsablesMisAJour:respPatches.length,lot:lot,aucuneSuppression:true,auteur:ctx.email||''};
  }finally{lock.releaseLock();}
}
