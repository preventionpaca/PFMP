/** Lycée Les Eucalyptus — PFMP — v1.0.0-dev.130 — génération convention fiabilisée et diplôme existant conservé. */
var EUC_CONVENTION_ACCES_TABLE_='EUC_ACCES_FORMULAIRES_PFMP';

function EUC_CONVENTION_colonne_(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
function EUC_CONVENTION_assurerTableAcces_(){
  var cache=CacheService.getScriptCache(),schemaKey='EUC_CONVENTION_SCHEMA_V513';
  try{if(cache.get(schemaKey)==='OK')return {cache:true};}catch(eCache){}
  var t=EUC_CONVENTION_ACCES_TABLE_,c=EUC_CONVENTION_colonne_,tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===t;});
  var cols=[
    c('Token_hash','Empreinte du jeton'),c('Request_id','Identifiant de requête'),c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Annee_scolaire','Année scolaire'),c('Classe_convention','Classe convention','Ref:Classes'),c('Classe_convention_nom','Classe convention nom'),c('Periode','Période','Ref:Planning_Periodes'),c('Periode_libelle','Période libellé'),c('Date_debut','Date début','Date'),c('Date_fin','Date fin','Date'),
    c('Scenario_dates','Situation des dates'),c('Date_officielle_debut','Date officielle début','Date'),c('Date_officielle_fin','Date officielle fin','Date'),c('Date_declaree_debut','Date réelle début','Date'),c('Date_declaree_fin','Date réelle fin','Date'),c('Motif_ecart_dates','Motif écart de dates'),
    c('Type_sequence','Type de séquence'),c('Numero_sequence','Numéro de séquence','Int'),c('Convention_origine','Convention d’origine','Ref:EUC_ACCES_FORMULAIRES_PFMP'),c('Convention_remplacement','Convention de remplacement','Ref:EUC_ACCES_FORMULAIRES_PFMP'),
    c('PDIF_periode','Période PDIF','Ref:Planning_Periodes'),c('PDIF_mode','Parcours différencié'),c('Lot_generation','Lot de génération'),
    c('Statut','Statut'),c('Tentatives_echec','Tentatives échouées','Int'),c('Bloque_jusqua','Bloqué jusqu’à','DateTime'),c('Date_creation','Date création','DateTime'),c('Date_derniere_utilisation','Dernière utilisation','DateTime'),c('Auteur','Auteur'),c('Reference_convention','Référence convention'),c('Revoked','Révoqué','Bool')
  ];
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:t,columns:cols}]});try{cache.put(schemaKey,'OK',21600);}catch(eNew){}return {tableCreee:true};}
  var presentes={},current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[];current.forEach(function(x){presentes[x.id]=true;});var missing=cols.filter(function(x){return !presentes[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});try{cache.put(schemaKey,'OK',21600);}catch(ePut){}return {tableCreee:false,colonnesCreees:missing.map(function(x){return x.id;})};
}
function EUC_CONVENTION_token_(){var raw=[Utilities.getUuid(),Utilities.getUuid(),new Date().getTime(),Math.random()].join('|');return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8)).replace(/=+$/,'');}
function EUC_CONVENTION_hash_(v){return EUC_PFMP_hash_(String(v||''));}
function EUC_CONVENTION_norm_(v){return String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function EUC_CONVENTION_maxDate_(a,b){a=String(a||'');b=String(b||'');return !a?b:(!b?a:(a>b?a:b));}
function EUC_CONVENTION_dateISOStricte_(v,label){
  v=String(v||'').trim();
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(v))throw new Error((label||'Date')+' invalide.');
  var p=v.split('-'),d=new Date(Date.UTC(Number(p[0]),Number(p[1])-1,Number(p[2])));
  if(d.getUTCFullYear()!==Number(p[0])||d.getUTCMonth()+1!==Number(p[1])||d.getUTCDate()!==Number(p[2]))throw new Error((label||'Date')+' invalide.');
  return v;
}
function EUC_CONVENTION_validerDatesIndividuelles_(debut,fin,motif){
  debut=EUC_CONVENTION_dateISOStricte_(debut,'Date réelle de début');
  fin=EUC_CONVENTION_dateISOStricte_(fin,'Date réelle de fin');
  if(fin<debut)throw new Error('La date réelle de fin doit être postérieure ou égale à la date de début.');
  motif=String(motif||'').trim();
  if(!motif)throw new Error('Le motif des dates individuelles est obligatoire.');
  return {debut:debut,fin:fin,motif:motif.slice(0,1000)};
}
function EUC_CONVENTION_debutRafraichissementV511_(a,reason){
  if(typeof EUC_DEV425_beginMutation_!=='function')return null;
  try{return EUC_DEV425_beginMutation_({annee:String(a.Annee_scolaire||a.annee||''),classeId:Number(EUC_PFMP_ref_(a.Classe_convention||a.classeId))||0,periodeId:Number(EUC_PFMP_ref_(a.Periode||a.periodeId))||0,reason:reason||'convention'});}catch(e){console.log('DEV511_REFRESH_BEGIN '+String(e&&e.message||e));return null;}
}
function EUC_CONVENTION_finRafraichissementV511_(token){
  if(!token||typeof EUC_DEV425_finishMutation_!=='function')return null;
  try{return EUC_DEV425_finishMutation_(token);}catch(e){console.log('DEV511_REFRESH_FINISH '+String(e&&e.message||e));return {ok:false,error:String(e&&e.message||e)};}
}
function EUC_CONVENTION_requestIdV513_(value){
  value=String(value||'').trim();
  return /^REQ-[A-Za-z0-9_-]{40,180}$/.test(value)?value:'';
}
function EUC_CONVENTION_accesParRequestIdV513_(requestId){
  if(!requestId)return null;var rows=[];
  try{
    if(typeof EUC_DEV190G_fastRecords_==='function')rows=EUC_DEV190G_fastRecords_(EUC_CONVENTION_ACCES_TABLE_,{Request_id:[requestId]})||[];
    else rows=EUC_IMPORT_lireRecords_(EUC_CONVENTION_ACCES_TABLE_)||[];
  }catch(e){rows=[];}
  var row=rows.filter(function(r){return String((r.fields||r).Request_id||'')===requestId;})[0];
  if(!row)return null;var out={id:Number(row.id)||0},f=row.fields||row;Object.keys(f).forEach(function(k){out[k]=f[k];});return out;
}
function EUC_CONVENTION_finaliserRafraichissementV513(token){
  EUC_IMPORT_exigerAdminTexte_();token=token||{};
  var safe={annee:String(token.annee||''),families:(token.families||[]).map(String),targets:(token.targets||[]).map(function(t){return{classe:Number(t.classe)||0,periode:Number(t.periode)||0,famille:String(t.famille||'')};}),revision:String(token.revision||''),reason:String(token.reason||'convention-v513')};
  if(!/^20\d{2}-20\d{2}$/.test(safe.annee)||!safe.revision||!safe.families.length)throw new Error('Jeton de mise à jour invalide.');
  return EUC_CONVENTION_finRafraichissementV511_(safe);
}

function EUC_CONVENTION_lireElevesAdmin(){
  EUC_IMPORT_exigerAdminTexte_();
  var classes=EUC_IMPORT_chargerClassesCamin_().filter(function(c){return c.actif;}),byNom={},byId={};
  classes.forEach(function(c){byId[String(c.id)]=c;byNom[EUC_CONVENTION_norm_(c.nom)]=c;if(c.libelle)byNom[EUC_CONVENTION_norm_(c.libelle)]=c;});
  var rows=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');
  return rows.filter(function(r){return r.Actif!==false;}).map(function(r){
    var classeRef=EUC_PFMP_ref_(r.Classe),clRef=byId[String(classeRef)]||null;
    var classeNom=r.Code_classe_importe||r.Classe_nom||(clRef&&clRef.nom)||'',cl=byNom[EUC_CONVENTION_norm_(classeNom)]||clRef;
    return {id:r.id,nom:r.Nom||'',prenom:r.Prenom_usage||r.Prenom||'',dateNaissance:EUC_IMPORT_dateExistanteISO_(r.Date_naissance),classe:classeNom,classeId:cl?cl.id:0,annee:r.Annee_scolaire_code||r.Annee_scolaire||'',numeroNational:r.Numero_national||''};
  }).sort(function(a,b){return String(a.classe).localeCompare(String(b.classe),'fr')||String(a.nom).localeCompare(String(b.nom),'fr')||String(a.prenom).localeCompare(String(b.prenom),'fr');});
}

function EUC_CONVENTION_lireClassesEtPeriodesAdmin(){
  EUC_IMPORT_exigerAdminTexte_();
  var classes=EUC_IMPORT_chargerClassesCamin_().filter(function(c){return c.actif;});
  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes').filter(function(r){return r.Actif!==false;}).map(function(r){return {
    id:r.id,annee:String(r.Annee_scolaire||''),classe:String(r.Classe||''),classePfmp:String(r.Classe_PFMP||''),classesConcernees:Array.isArray(r.Classes_concernees)?r.Classes_concernees.slice():[],formation:String(r.Formation||''),niveau:String(r.Niveau||''),groupe:String(r.Groupe||''),debut:EUC_IMPORT_dateExistanteISO_(r.Date_debut),fin:EUC_IMPORT_dateExistanteISO_(r.Date_fin),type:String(r.Type||''),commentaire:String(r.Commentaire||'')
  };}).filter(function(r){return r.debut&&r.fin;});
  return {classes:classes,periodes:periodes};
}

function EUC_CONVENTION_periodeCompatibleClasse_(p,c){
  if(!p||!c)return false;
  var ids=Array.isArray(p.classesConcernees)?p.classesConcernees:[];
  return ids.some(function(id){return Number(EUC_PFMP_ref_(id))===Number(c.id);});
}
function EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,label){
  var cl=(meta.classes||[]).filter(function(c){return Number(c.id)===Number(classeId);})[0];
  var p=(meta.periodes||[]).filter(function(x){return Number(x.id)===Number(periodeId);})[0];
  if(!cl||!p)throw new Error('Classe ou période introuvable.');
  if(annee&&String(p.annee||'')!==String(annee))throw new Error((label||'Période')+' hors de l’année scolaire choisie.');
  if(!Array.isArray(p.classesConcernees)||!p.classesConcernees.length)throw new Error((label||'Période')+' non exploitable : Classes_concernees est vide dans Planning_Periodes.');
  if(!EUC_CONVENTION_periodeCompatibleClasse_(p,cl))throw new Error((label||'Période')+' non autorisée pour la classe "'+String(cl.nom||cl.libelle||classeId)+'" selon Planning_Periodes.Classes_concernees.');
  return true;
}

function EUC_CONVENTION_preparerRecordAcces_(ctx,eleve,cl,p,annee,opt){
  opt=opt||{};var pdif=opt.pdif||null,pdifMode=String(opt.pdifMode||'').toUpperCase(),lot=String(opt.lot||'');
  var finOfficielle=(pdif&&pdifMode==='ENTREPRISE')?EUC_CONVENTION_maxDate_(p.fin,pdif.fin):p.fin;
  var scenario=String(opt.scenarioDates||'DATES_OFFICIELLES').trim().toUpperCase(),debutReel=String(opt.dateDeclareeDebut||p.debut),finReelle=String(opt.dateDeclareeFin||finOfficielle),motif=String(opt.motifEcartDates||'').trim();
  if(scenario!=='DATES_OFFICIELLES'){
    var dates=EUC_CONVENTION_validerDatesIndividuelles_(debutReel,finReelle,motif);
    debutReel=dates.debut;finReelle=dates.fin;motif=dates.motif;
  }else{
    debutReel=p.debut;finReelle=finOfficielle;motif='';
  }
  var requestId=EUC_CONVENTION_requestIdV513_(opt.requestId),token=requestId||EUC_CONVENTION_token_(),hash=EUC_CONVENTION_hash_(token),now=new Date().toISOString(),ref='PFMP-'+annee.replace('-','')+'-'+eleve.id+'-'+String(new Date().getTime()).slice(-6)+'-'+String(Math.floor(Math.random()*90)+10);
  var lib=p.type+' '+p.debut+' → '+p.fin;if(pdif&&pdifMode==='ENTREPRISE')lib+=' + '+pdif.type+' '+pdif.debut+' → '+pdif.fin+' en entreprise';
  var fields={Token_hash:hash,Request_id:requestId,Eleve:eleve.id,Annee_scolaire:annee,Classe_convention:cl.id,Classe_convention_nom:cl.nom,Periode:p.id,Periode_libelle:lib,Date_debut:debutReel,Date_fin:finReelle,Scenario_dates:scenario,Date_officielle_debut:p.debut,Date_officielle_fin:finOfficielle,Date_declaree_debut:debutReel,Date_declaree_fin:finReelle,Motif_ecart_dates:motif,Type_sequence:String(opt.typeSequence||'INITIALE'),Numero_sequence:Number(opt.numeroSequence||1),Convention_origine:Number(opt.conventionOrigine||0)||null,PDIF_periode:pdif?pdif.id:null,PDIF_mode:pdifMode||'',Lot_generation:lot,Statut:'CONVENTION_GENEREE',Tentatives_echec:0,Bloque_jusqua:null,Date_creation:now,Date_derniere_utilisation:null,Auteur:ctx.email||'',Reference_convention:ref,Revoked:false};
  if(opt.statutAdministratif)fields.Statut_administratif=String(opt.statutAdministratif);
  return {token:token,reference:ref,dateDebut:debutReel,dateFin:finReelle,record:{fields:fields}};
}

function EUC_CONVENTION_preparerAcces(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var eleveId=Number(payload.eleveId||0),classeId=Number(payload.classeConventionId||0),periodeId=Number(payload.periodeId||0),pdifId=Number(payload.pdifPeriodeId||0),pdifMode=String(payload.pdifMode||''),annee=String(payload.anneeConvention||'').trim();
  if(!eleveId||!classeId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Élève, classe de convention, période et année scolaire sont obligatoires.');
  var eleves=EUC_CONVENTION_lireElevesAdmin(),eleve=eleves.filter(function(e){return e.id===eleveId;})[0];if(!eleve)throw new Error('Élève introuvable.');var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),cl=meta.classes.filter(function(c){return c.id===classeId;})[0],p=meta.periodes.filter(function(x){return x.id===periodeId;})[0],pdif=pdifId?meta.periodes.filter(function(x){return x.id===pdifId;})[0]:null;if(!cl||!p)throw new Error('Classe ou période introuvable.');EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,periodeId,'Période officielle');if(pdif)EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeId,annee,pdifId,'Période PDIF');
  var scenario=String(payload.scenarioDates||'DATES_OFFICIELLES').trim().toUpperCase();
  if(['DATES_OFFICIELLES','DEBUT_RETARDE','DATES_INDIVIDUELLES'].indexOf(scenario)<0)throw new Error('Situation de dates inconnue.');
  var requestId=EUC_CONVENTION_requestIdV513_(payload.requestId),existing=null,a,requestLock=requestId?LockService.getScriptLock():null;
  if(requestLock&&!requestLock.tryLock(10000))throw new Error('Une génération identique est déjà en cours. Patientez quelques secondes puis relancez.');
  try{
    EUC_CONVENTION_assurerTableAcces_();existing=EUC_CONVENTION_accesParRequestIdV513_(requestId);
    if(existing){
      if(Number(EUC_PFMP_ref_(existing.Eleve))!==eleveId||Number(EUC_PFMP_ref_(existing.Classe_convention))!==classeId||Number(EUC_PFMP_ref_(existing.Periode))!==periodeId)throw new Error('Cette requête de génération correspond déjà à une autre convention. Rechargez la page.');
      a={token:requestId,reference:String(existing.Reference_convention||''),dateDebut:EUC_IMPORT_dateExistanteISO_(existing.Date_debut),dateFin:EUC_IMPORT_dateExistanteISO_(existing.Date_fin)};
    }else{
      a=EUC_CONVENTION_preparerRecordAcces_(ctx,eleve,cl,p,annee,{pdif:pdif,pdifMode:pdifMode,scenarioDates:scenario,dateDeclareeDebut:payload.dateDeclareeDebut,dateDeclareeFin:payload.dateDeclareeFin,motifEcartDates:payload.motifEcartDates,requestId:requestId});
      EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[a.record]});
    }
  }finally{if(requestLock)try{requestLock.releaseLock();}catch(eLock){}}
  /* Toute convention modifie les compteurs, y compris avec les dates
   * officielles. Le recalcul complet ne bloque plus cette requête : le client
   * le finalise séparément et le déclencheur DEV425 sert de filet de sécurité. */
  var refresh=EUC_CONVENTION_debutRafraichissementV511_({Annee_scolaire:annee,Classe_convention:cl.id,Periode:p.id},existing?'reprise-idempotente':'creation-convention');
  var base=ScriptApp.getService().getUrl();return {ok:true,idempotent:!!existing,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),eleve:eleve,classeConvention:cl,periode:p,anneeConvention:annee,pdifMode:pdifMode,scenarioDates:scenario,dateDebut:a.dateDebut,dateFin:a.dateFin,refreshToken:refresh};
}

function EUC_CONVENTION_preparerAccesClasse(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var classeElevesId=Number(payload.classeElevesId||0),classeConventionId=Number(payload.classeConventionId||0),periodeId=Number(payload.periodeId||0),pdifId=Number(payload.pdifPeriodeId||0),annee=String(payload.anneeConvention||'').trim(),parcours=payload.parcoursDifferencie||{};
  if(!classeElevesId||!classeConventionId||!periodeId||!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Classe d’élèves, classe de convention, période et année scolaire sont obligatoires.');
  var eleves=EUC_CONVENTION_lireElevesAdmin().filter(function(e){return Number(e.classeId)===classeElevesId;});if(!eleves.length)throw new Error('Aucun élève actif trouvé dans cette classe.');
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),cl=meta.classes.filter(function(c){return c.id===classeConventionId;})[0],p=meta.periodes.filter(function(x){return x.id===periodeId;})[0],pdif=pdifId?meta.periodes.filter(function(x){return x.id===pdifId;})[0]:null;if(!cl||!p)throw new Error('Classe de convention ou période introuvable.');EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeConventionId,annee,periodeId,'Période officielle');if(pdif)EUC_CONVENTION_verifierPeriodeAutorisee_(meta,classeConventionId,annee,pdifId,'Période PDIF');
  var lot='LOT-'+Utilities.getUuid(),records=[],items=[],base=ScriptApp.getService().getUrl();EUC_CONVENTION_assurerTableAcces_();
  eleves.forEach(function(e){var mode=String(parcours[String(e.id)]||'').toUpperCase();if(pdif&&mode!=='LYCEE'&&mode!=='ENTREPRISE')throw new Error('Parcours différencié à préciser pour '+e.nom+' '+e.prenom+'.');var a=EUC_CONVENTION_preparerRecordAcces_(ctx,e,cl,p,annee,{pdif:pdif,pdifMode:mode,lot:lot});records.push(a.record);items.push({eleveId:e.id,nom:e.nom,prenom:e.prenom,dateNaissance:e.dateNaissance,reference:a.reference,token:a.token,urlFormulaire:base+'?page=pfmp&token='+encodeURIComponent(a.token),urlImpression:base+'?page=convention-pfmp-print&token='+encodeURIComponent(a.token),annee:annee,classe:cl.nom,debut:p.debut,fin:a.dateFin,pdifMode:mode,pdif:pdif?{type:pdif.type,debut:pdif.debut,fin:pdif.fin}:null});});
  EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:records});
  var refresh=EUC_CONVENTION_debutRafraichissementV511_({Annee_scolaire:annee,Classe_convention:cl.id,Periode:p.id},'creation-lot-conventions');
  CacheService.getScriptCache().put('EUC_CONV_LOT_'+lot,JSON.stringify({lot:lot,classe:cl.nom,annee:annee,periode:p,items:items}),21600);
  return {ok:true,total:items.length,lot:lot,classeElevesId:classeElevesId,classeConvention:cl.nom,periode:p,anneeConvention:annee,items:items,urlImpressionLot:base+'?page=conventions-pfmp-batch-print&lot='+encodeURIComponent(lot),refreshToken:refresh};
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
