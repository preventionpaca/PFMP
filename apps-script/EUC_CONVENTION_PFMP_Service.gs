/** Lycée Les Eucalyptus — PFMP — v1.0.0-dev.120 — filtre strict classe/offre/périodes + validation serveur. */
var EUC_CONVENTION_ACCES_TABLE_='EUC_ACCES_FORMULAIRES_PFMP';

function EUC_CONVENTION_colonne_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_CONVENTION_assurerTableAcces_(){
  var t=EUC_CONVENTION_ACCES_TABLE_,c=EUC_CONVENTION_colonne_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;});
  var cols=[
    c('Token_hash','Empreinte du jeton'),c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Annee_scolaire','Année scolaire'),c('Classe_convention','Classe convention','Ref:Classes'),c('Classe_convention_nom','Classe convention nom'),c('Periode','Période','Ref:Planning_Periodes'),c('Periode_libelle','Période libellé'),c('Date_debut','Date début','Date'),c('Date_fin','Date fin','Date'),
    c('PDIF_periode','Période PDIF','Ref:Planning_Periodes'),c('PDIF_mode','Parcours différencié'),c('Lot_generation','Lot de génération'),
    c('Statut','Statut'),c('Tentatives_echec','Tentatives échouées','Int'),c('Bloque_jusqua','Bloqué jusqu’à','DateTime'),c('Date_creation','Date création','DateTime'),c('Date_derniere_utilisation','Dernière utilisation','DateTime'),c('Auteur','Auteur'),c('Reference_convention','Référence convention'),c('Revoked','Révoqué','Bool')
  ];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});return {tableCreee:true};}
  var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});return {tableCreee:false,colonnesCreees:missing.map(function(x){return x.id;})};
}
function EUC_CONVENTION_token_(){var raw=[Utilities.getUuid(),Utilities.getUuid(),new Date().getTime(),Math.random()].join('|');return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8)).replace(/=+$/,'');}
function EUC_CONVENTION_hash_(v){return EUC_PFMP_hash_(String(v||''));}
function EUC_CONVENTION_norm_(v){return String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function EUC_CONVENTION_maxDate_(a,b){a=String(a||'');b=String(b||'');return !a?b:(!b?a:(a>b?a:b));}

function EUC_CONVENTION_lireElevesAdmin(){
  EUC_IMPORT_exigerAdminTexte_();
  var classes=EUC_IMPORT_chargerClassesCamin_().filter(function(c){return c.actif;}),byNom={};
  classes.forEach(function(c){byNom[EUC_CONVENTION_norm_(c.nom)]=c;if(c.libelle)byNom[EUC_CONVENTION_norm_(c.libelle)]=c;});
  var rows=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  return rows.filter(function(r){return r.Actif!==false;}).map(function(r){
    var classeNom=r.Code_classe_importe||r.Classe_nom||'',cl=byNom[EUC_CONVENTION_norm_(classeNom)];
    return {id:r.id,nom:r.Nom||'',prenom:r.Prenom_usage||r.Prenom||'',dateNaissance:EUC_IMPORT_dateExistanteISO_(r.Date_naissance),classe:classeNom,classeId:cl?cl.id:0,annee:r.Annee_scolaire_code||r.Annee_scolaire||'',numeroNational:r.Numero_national||''};
  }).sort(function(a,b){return String(a.classe).localeCompare(String(b.classe),'fr')||String(a.nom).localeCompare(String(b.nom),'fr')||String(a.prenom).localeCompare(String(b.prenom),'fr');});
}

function EUC_CONVENTION_lireClassesEtPeriodesAdmin(){
  EUC_IMPORT_exigerAdminTexte_();
  var classes=EUC_IMPORT_chargerClassesCamin_().filter(function(c){return c.actif;});
  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes').filter(function(r){return r.Actif!==false;}).map(function(r){return {
    id:r.id,annee:String(r.Annee_scolaire||''),classe:String(r.Classe||''),formation:String(r.Formation||''),niveau:String(r.Niveau||''),groupe:String(r.Groupe||''),debut:EUC_IMPORT_dateExistanteISO_(r.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(r.Date_fin),type:String(r.Type||''),commentaire:String(r.Commentaire||'')
  };}).filter(function(r){return r.debut&&r.fin;});
  var catalogue=EUC_PFMP_chargerReferentiel(),anneesParId={};
  (catalogue.annees||[]).forEach(function(a){anneesParId[String(a.id)]=String(a.code||'');});
  var offres=(catalogue.offres||[]).map(function(o){return {
    id:o.id,
    classeId:Number(o.classeId||0),
    annee:String(anneesParId[String(o.anneeId)]||''),
    diplomeId:Number(o.diplomeId||0),
    diplome:String(o.diplome||''),
    periodeIds:(o.periodes||[]).map(function(p){return Number(p.id||0);}).filter(Boolean)
  };});
  return {classes:classes,periodes:periodes,offres:offres};
}

function EUC_CONVENTION_offrePourClasse_(meta,classeId,annee){
  classeId=Number(classeId||0);annee=String(annee||'').trim();
  return (meta&&meta.offres||[]).filter(function(o){return Number(o.classeId)===classeId&&(!annee||String(o.annee)===annee);})[0]||null;
}
function EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,label){
  var offre=EUC_CONVENTION_offrePourClasse_(meta,classeId,annee),pid=Number(periodeId||0);
  if(!offre)throw new Error('Aucune offre de formation PFMP active trouvée pour cette classe et cette année.');
  if((offre.periodeIds||[]).map(Number).indexOf(pid)<0)throw new Error((label||'Période')+' non autorisée pour cette classe et cette année.');
  return offre;
}

function EUC_CONVENTION_preparerRecordAcces_(ctx,eleve,cl,p,annee,opt){
  opt=opt||{};var pdif=opt.pdif||null,pdifMode=String(opt.pdifMode||'').toUpperCase(),lot=String(opt.lot||'');
  var fin=(pdif&&pdifMode==='ENTREPRISE')?EUC_CONVENTION_maxDate_(p.fin,pdif.fin):p.fin;
  var token=EUC_CONVENTION_token_(),hash=EUC_CONVENTION_hash_(token),now=new Date().toISOString(),ref='PFMP-'+annee.replace('-','')+'-'+eleve.id+'-'+String(new Date().getTime()).slice(-6)+'-'+String(Math.floor(Math.random()*90)+10);
  var lib=p.type+' '+p.debut+' → '+p.fin;if(pdif&&pdifMode==='ENTREPRISE')lib+=' + '+pdif.type+' '+pdif.debut+' → '+pdif.fin+' en entreprise';
  return {token:token,reference:ref,dateFin:fin,record:{fields:{Token_hash:hash,Eleve:eleve.id,Annee_scolaire:annee,Classe_convention:cl.id,Classe_convention_nom:cl.nom,Periode:p.id,Periode_libelle:lib,Date_debut:p.debut,Date_fin:fin,PDIF_periode:pdif?pdif.id:null,PDIF_mode:pdifMode||'',Lot_generation:lot,Statut:'CONVENTION_GENEREE',Tentatives_echec:0,Bloque_jusqua:null,Date_creation:now,Date_derniere_utilisation:null,Auteur:ctx.email||'',Reference_convention:ref,Revoked:false}}};
}

function EUC_CONVENTION_preparerAcces(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var eleveId=Number(payload.eleveId||0),classeId=Number(payload.classeConventionId||0),periodeId=Number(payload.periodeId||0),pdifId=Number(payload.pdifPeriodeId||0),pdifMode=String(payload.pdifMode||''),annee=String(payload.anneeConvention||'').trim();
  if(!eleveId||!classeId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Élève, classe de convention, période et année scolaire sont obligatoires.');
  var eleves=EUC_CONVENTION_lireElevesAdmin(),eleve=eleves.filter(function(e){return e.id===eleveId;})[0];if(!eleve)throw new Error('Élève introuvable.');var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),cl=meta.classes.filter(function(c){return c.id===classeId;})[0],p=meta.periodes.filter(function(x){return x.id===periodeId;})[0],pdif=pdifId?meta.periodes.filter(function(x){return x.id===pdifId;})[0]:null;if(!cl||!p)throw new Error('Classe ou période introuvable.');EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,'Période officielle');if(pdif)EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,pdifId,'Période PDIF');
  EUC_CONVENTION_assurerTableAcces_();var a=EUC_CONVENTION_preparerRecordAcces_(ctx,eleve,cl,p,annee,{pdif:pdif,pdifMode:pdifMode});EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[a.record]});
  var base=ScriptApp.getService().getUrl();return {ok:true,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),eleve:eleve,classeConvention:cl,periode:p,anneeConvention:annee,pdifMode:pdifMode};
}

function EUC_CONVENTION_preparerAccesClasse(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var classeElevesId=Number(payload.classeElevesId||0),classeConventionId=Number(payload.classeConventionId||0),periodeId=Number(payload.periodeId||0),pdifId=Number(payload.pdifPeriodeId||0),annee=String(payload.anneeConvention||'').trim(),parcours=payload.parcoursDifferencie||{};
  if(!classeElevesId||!classeConventionId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Classe d’élèves, classe de convention, période et année scolaire sont obligatoires.');
  var eleves=EUC_CONVENTION_lireElevesAdmin().filter(function(e){return Number(e.classeId)===classeElevesId;});if(!eleves.length)throw new Error('Aucun élève actif trouvé dans cette classe.');
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),cl=meta.classes.filter(function(c){return c.id===classeConventionId;})[0],p=meta.periodes.filter(function(x){return x.id===periodeId;})[0],pdif=pdifId?meta.periodes.filter(function(x){return x.id===pdifId;})[0]:null;if(!cl||!p)throw new Error('Classe de convention ou période introuvable.');EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeConventionId,annee,periodeId,'Période officielle');if(pdif)EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeConventionId,annee,pdifId,'Période PDIF');
  var lot='LOT-'+Utilities.getUuid(),records=[],items=[],base=ScriptApp.getService().getUrl();EUC_CONVENTION_assurerTableAcces_();
  eleves.forEach(function(e){var mode=String(parcours[String(e.id)]||'').toUpperCase();if(pdif&&mode!=='LYCEE'&&mode!=='ENTREPRISE')throw new Error('Parcours différencié à préciser pour '+e.nom+' '+e.prenom+'.');var a=EUC_CONVENTION_preparerRecordAcces_(ctx,e,cl,p,annee,{pdif:pdif,pdifMode:mode,lot:lot});records.push(a.record);items.push({eleveId:e.id,nom:e.nom,prenom:e.prenom,dateNaissance:e.dateNaissance,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),annee:annee,classe:cl.nom,debut:p.debut,fin:a.dateFin,pdifMode:mode,pdif:pdif?{type:pdif.type,debut:pdif.debut,fin:pdif.fin}:null});});
  EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:records});
  CacheService.getScriptCache().put('EUC_CONV_LOT_'+lot,JSON.stringify({lot:lot,classe:cl.nom,annee:annee,periode:p,items:items}),21600);
  return {ok:true,total:items.length,lot:lot,classeElevesId:classeElevesId,classeConvention:cl.nom,periode:p,anneeConvention:annee,items:items,urlImpressionLot:base+'?page=conventions-pfmp-batch-print&lot='+encodeURIComponent(lot)};
}

function EUC_CONVENTION_donneesImpressionLot(lot){
  EUC_IMPORT_exigerAdminTexte_();lot=String(lot||'').trim();if(!lot)throw new Error('Lot manquant.');var raw=CacheService.getScriptCache().get('EUC_CONV_LOT_'+lot);if(!raw)throw new Error('Le lot d’impression a expiré. Régénérez les conventions de la classe.');return JSON.parse(raw);
}

function EUC_CONVENTION_trouverAccesParToken_(token){var hash=EUC_CONVENTION_hash_(token),rows=EUC_IMPORT_lireRecords_(EUC_CONVENTION_ACCES_TABLE_),r=rows.filter(function(x){return x.Token_hash===hash&&x.Revoked!==true;})[0];if(!r)throw new Error('Lien de convention invalide ou révoqué.');return r;}
function EUC_CONVENTION_contextFormulaire_(a,e){
  var catalogue=EUC_PFMP_chargerReferentiel(),annee=catalogue.annees.filter(function(x){return String(x.code)===String(a.Annee_scolaire||'');})[0],classeId=EUC_PFMP_ref_(a.Classe_convention),offre=catalogue.offres.filter(function(o){return o.classeId===classeId&&(!annee||o.anneeId===annee.id);})[0],periodeId=0;if(offre){var d=EUC_IMPORT_dateExistanteISO_(a.Date_debut),p=(offre.periodes||[]).filter(function(x){return x.debut===d;})[0];if(p)periodeId=p.id;}
  return {eleveId:e.id,numeroNational:e.Numero_national||'',nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',dateNaissance:EUC_IMPORT_dateExistanteISO_(e.Date_naissance),anneeId:annee?annee.id:0,offreId:offre?offre.id:0,periodeId:periodeId,classeConvention:a.Classe_convention_nom||'',anneeConvention:a.Annee_scolaire||'',dateDebut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),dateFin:EUC_IMPORT_dateExistanteISO_(a.Date_fin)};
}
function EUC_CONVENTION_verifierIdentite(token,jour,mois){
  token=String(token||'').trim();jour=Number(jour||0);mois=Number(mois||0);if(!token||jour<1||jour>31||mois<1||mois>12)throw new Error('Informations de contrôle invalides.');var a=EUC_CONVENTION_trouverAccesParToken_(token),now=Date.now();if(a.Bloque_jusqua&&new Date(a.Bloque_jusqua).getTime()>now)throw new Error('Trop de tentatives. Réessayez plus tard.');var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),e=eleves.filter(function(x){return x.id===EUC_PFMP_ref_(a.Eleve);})[0];if(!e)throw new Error('Élève introuvable.');var iso=EUC_IMPORT_dateExistanteISO_(e.Date_naissance),parts=iso.split('-'),ok=parts.length===3&&Number(parts[2])===jour&&Number(parts[1])===mois;
  if(!ok){var n=Number(a.Tentatives_echec||0)+1,fields={Tentatives_echec:n,Date_derniere_utilisation:new Date().toISOString()};if(n>=5)fields.Bloque_jusqua=new Date(now+30*60*1000).toISOString();EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});throw new Error('Vérification impossible. Contrôlez le jour et le mois de naissance.');}
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});var c=EUC_CONVENTION_contextFormulaire_(a,e);return {ok:true,reference:a.Reference_convention||'',eleve:c};
}
function EUC_CONVENTION_validerTokenSoumission_(token,d){if(!token)return true;var a=EUC_CONVENTION_trouverAccesParToken_(token);if(EUC_PFMP_ref_(a.Eleve)!==Number(d.jeuneEleveId||0))throw new Error('Le lien QR ne correspond pas à cet élève.');if(EUC_PFMP_ref_(a.Classe_convention)!==Number(d.classeId||0))throw new Error('La classe de convention ne correspond pas au lien QR.');if(EUC_PFMP_ref_(a.Periode)&&Number(d.periodeId||0)&&EUC_PFMP_ref_(a.Periode)!==Number(d.periodeId||0))throw new Error('La période ne correspond pas au lien QR.');return true;}
function EUC_CONVENTION_donneesImpression(token){var a=EUC_CONVENTION_trouverAccesParToken_(token),rows=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),e=rows.filter(function(x){return x.id===EUC_PFMP_ref_(a.Eleve);})[0];if(!e)throw new Error('Élève introuvable.');var pdifMode=String(a.PDIF_mode||'');return {reference:a.Reference_convention||'',token:String(token||''),formUrl:ScriptApp.getService().getUrl()+'?page=pfmp&token='+encodeURIComponent(token),annee:a.Annee_scolaire||'',classe:a.Classe_convention_nom||'',debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),pdifMode:pdifMode,eleve:{nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',dateNaissance:EUC_IMPORT_dateExistanteISO_(e.Date_naissance),telephone:e.Telephone||'',courriel:e.Courriel||''}};}
