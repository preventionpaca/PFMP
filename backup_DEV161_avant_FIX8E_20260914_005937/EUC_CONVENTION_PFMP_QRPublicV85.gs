/** Eucalyptus PFMP — v1.0.0-dev.138 — parcours QR + entreprise sur une page unique. */
function EUC_CONVENTION_lireAccesFraisV108_(){var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records');return (raw.records||[]).map(function(r){var o={id:r.id},f=r.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});}
function EUC_CONVENTION_resoudreLienV113_(rid){rid=Number(rid||0);if(!Number.isInteger(rid)||rid<=0)throw new Error('[QR117-ENTREE] Identifiant d’accès invalide : '+String(rid||'')+'.');var rows;try{rows=EUC_CONVENTION_lireAccesFraisV108_();}catch(err){throw new Error('[QR117-GRIST] Lecture de la table d’accès impossible : '+(err&&err.message?err.message:String(err)));}var matches=rows.filter(function(r){return Number(r.id)===rid;});if(matches.length!==1)throw new Error('[QR117-ID] Diagnostic : lignes='+rows.length+', rid='+rid+', trouvé='+matches.length+'.');var a=matches[0];if(a.Revoked===true)throw new Error('[QR117-REVOQUE] Cette convention a été révoquée.');return {acces:a,mode:'GRIST_ID',diag:'QR117-ID-OK rid='+rid};}
function EUC_CONVENTION_resumeSecretV134_(){
  var p=PropertiesService.getScriptProperties(),
      k='EUC_QR_RESUME_SECRET_V134',
      s=String(p.getProperty(k)||'');
  if(!s){
    s=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
    p.setProperty(k,s);
  }
  return s;
}

function EUC_CONVENTION_resumeSignatureV134_(payload){
  var bytes=Utilities.computeHmacSha256Signature(
    String(payload||''),
    EUC_CONVENTION_resumeSecretV134_(),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes);
}

function EUC_CONVENTION_creerRepriseV117_(rid){
  rid=Number(rid||0);
  if(!Number.isInteger(rid)||rid<=0)
    throw new Error('Identifiant de reprise invalide.');

  var body={
    rid:rid,
    exp:Date.now()+(60*60*1000)
  };

  var payload=Utilities.base64EncodeWebSafe(
    JSON.stringify(body),
    Utilities.Charset.UTF_8
  );

  var sig=EUC_CONVENTION_resumeSignatureV134_(payload);

  return payload+'.'+sig;
}

function EUC_CONVENTION_lireRepriseV117_(token){
  token=String(token||'').trim();

  if(!token)
    throw new Error('Session de reprise absente.');

  var parts=token.split('.');

  if(parts.length!==2)
    throw new Error('Session de reprise invalide.');

  var payload=parts[0],
      sig=parts[1],
      attendu=EUC_CONVENTION_resumeSignatureV134_(payload);

  if(sig!==attendu)
    throw new Error('Session de reprise non authentifiée.');

  var raw;

  try{
    raw=Utilities.newBlob(
      Utilities.base64DecodeWebSafe(payload)
    ).getDataAsString('UTF-8');
  }catch(e){
    throw new Error('Session de reprise illisible.');
  }

  var o;

  try{
    o=JSON.parse(raw);
  }catch(e){
    throw new Error('Session de reprise invalide.');
  }

  var rid=Number(o.rid||0),
      exp=Number(o.exp||0);

  if(!rid)
    throw new Error('Session de reprise sans identifiant.');

  if(!exp || Date.now()>exp)
    throw new Error('La session de reprise a expiré. Rescannez le QR code.');

  return EUC_CONVENTION_resoudreLienV113_(rid).acces;
}
function EUC_CONVENTION_verifierNaissanceV113_(resolved,jour,mois){var a=resolved.acces;jour=Number(jour||0);mois=Number(mois||0);if(jour<1||jour>31||mois<1||mois>12)throw new Error('[QR117-NAISSANCE] Jour ou mois invalide.');var eleves;try{eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');}catch(e){throw new Error('[QR117-ELEVES] Lecture de la table élèves impossible : '+(e&&e.message?e.message:String(e)));}var ref=Number(EUC_PFMP_ref_(a.Eleve)),el=eleves.filter(function(x){return Number(x.id)===ref;})[0];if(!el)throw new Error('[QR117-ELEVE] Élève '+ref+' introuvable.');var iso=EUC_IMPORT_dateExistanteISO_(el.Date_naissance),parts=String(iso||'').split('-');if(parts.length!==3)throw new Error('[QR117-DATE] Date de naissance illisible pour l’élève '+ref+'.');if(Number(parts[2])!==jour||Number(parts[1])!==mois)throw new Error('[QR117-NAISSANCE] Accès trouvé, mais jour/mois ne correspondent pas à la date enregistrée.');EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});var resume=EUC_CONVENTION_creerRepriseV117_(a.id);return {ok:true,diagnostic:resolved.diag+' - NAISSANCE-OK',accessId:a.id,reference:a.Reference_convention||'',resume:resume,continuationUrl:'',
entreprise:{
  siret:a.Entreprise_siret||'',
  raisonSociale:a.Entreprise_raison_sociale||'',
  enseigne:a.Entreprise_enseigne||'',
  adresse:a.Entreprise_adresse||'',
  complement:a.Entreprise_complement||'',
  codePostal:a.Entreprise_code_postal||'',
  commune:a.Entreprise_commune||'',
  pays:a.Entreprise_pays||'France'
},
responsable:{
  nom:a.Responsable_nom||'',
  prenom:a.Responsable_prenom||'',
  fonction:a.Responsable_fonction||'',
  telephone:a.Responsable_telephone||'',
  courriel:a.Responsable_courriel||''
},
tuteur:{
  estResponsable:a.Tuteur_est_responsable===true,
  nom:a.Tuteur_nom||'',
  prenom:a.Tuteur_prenom||'',
  fonction:a.Tuteur_fonction||'',
  telephone:a.Tuteur_telephone||'',
  courriel:a.Tuteur_courriel||''
},
eleve:{nom:el.Nom||'',prenom:el.Prenom_usage||el.Prenom||'',classeConvention:a.Classe_convention_nom||el.Code_classe_importe||el.Classe_nom||'',anneeConvention:a.Annee_scolaire||el.Annee_scolaire_code||el.Annee_scolaire||'',dateDebut:a.Date_debut?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_debut),true):'',dateFin:a.Date_fin?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_fin),true):''}};}
function EUC_CONVENTION_verifierIdentiteV113(rid,jour,mois){return EUC_CONVENTION_verifierNaissanceV113_(EUC_CONVENTION_resoudreLienV113_(rid),jour,mois);}
function EUC_CONVENTION_assurerColonnesEntrepriseV117_(){var t=EUC_CONVENTION_ACCES_TABLE_,cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(t)+'/columns').columns||[],p={};cols.forEach(function(c){p[c.id]=true;});var defs=[['Entreprise_siret','SIRET entreprise','Text'],['Entreprise_nis','NIS Monaco','Text'],['Entreprise_identifiant_type','Type identifiant entreprise','Text'],['Entreprise_validation_statut','Statut validation entreprise','Text'],['Entreprise_raison_sociale','Raison sociale entreprise','Text'],['Entreprise_enseigne','Enseigne entreprise','Text'],['Entreprise_adresse','Adresse entreprise','Text'],['Entreprise_complement','Complément adresse entreprise','Text'],['Entreprise_code_postal','Code postal entreprise','Text'],['Entreprise_commune','Commune entreprise','Text'],['Entreprise_pays','Pays entreprise','Text'],['Responsable_nom','Nom responsable','Text'],['Responsable_prenom','Prénom responsable','Text'],['Responsable_fonction','Fonction responsable','Text'],['Responsable_telephone','Téléphone responsable','Text'],['Responsable_courriel','Courriel responsable','Text'],['Tuteur_est_responsable','Tuteur = responsable','Bool'],['Tuteur_nom','Nom tuteur','Text'],['Tuteur_prenom','Prénom tuteur','Text'],['Tuteur_fonction','Fonction tuteur','Text'],['Tuteur_telephone','Téléphone tuteur','Text'],['Tuteur_courriel','Courriel tuteur','Text'],['Date_saisie_entreprise','Date saisie entreprise','DateTime']];var missing=defs.filter(function(d){return !p[d[0]];}).map(function(d){return {id:d[0],fields:{label:d[1],type:d[2]}};});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/columns',{columns:missing});}
function EUC_CONVENTION_repriseEntrepriseV117(token){var a=EUC_CONVENTION_lireRepriseV117_(token);var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP'),e=eleves.filter(function(x){return Number(x.id)===Number(EUC_PFMP_ref_(a.Eleve));})[0];if(!e)throw new Error('Élève introuvable.');return {ok:true,accessId:a.id,reference:a.Reference_convention||'',eleve:{nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',classe:a.Classe_convention_nom||'',annee:a.Annee_scolaire||''},entreprise:{siret:a.Entreprise_siret||'',raisonSociale:a.Entreprise_raison_sociale||'',enseigne:a.Entreprise_enseigne||'',adresse:a.Entreprise_adresse||'',complement:a.Entreprise_complement||'',codePostal:a.Entreprise_code_postal||'',commune:a.Entreprise_commune||'',pays:a.Entreprise_pays||'France'},responsable:{nom:a.Responsable_nom||'',prenom:a.Responsable_prenom||'',fonction:a.Responsable_fonction||'',telephone:a.Responsable_telephone||'',courriel:a.Responsable_courriel||''},tuteur:{estResponsable:function EUC_CONVENTION_enregistrerEntrepriseV117(token,d){var a=EUC_CONVENTION_lireRepriseV117_(token);d=d||{};function txt(v,n){return String(v==null?'':v).trim().replace(/[<>]/g,'').slice(0,n||500);}var pays=txt(d.entreprisePays,100)||'France',siret=txt(d.entrepriseSiret,30),raison=txt(d.entrepriseRaisonSociale,250),adresse=txt(d.entrepriseAdresse,300),commune=txt(d.entrepriseCommune,150),respNom=txt(d.responsableNom,150),tuteurEst=d.tuteurEstResponsable===true||String(d.tuteurEstResponsable)==='true';var estMonaco=pays.toLowerCase()==='monaco',nis=estMonaco?siret:'';if(pays.toLowerCase()==='france'&&!siret)throw new Error('Le SIRET est obligatoire pour une entreprise française.');if(!raison||!adresse||!commune||!respNom)throw new Error('Raison sociale, adresse, commune et nom du responsable sont obligatoires.');var tNom=tuteurEst?respNom:txt(d.tuteurNom,150);if(!tNom)throw new Error('Le nom du tuteur est obligatoire.');var anneeTxt=String(a.Annee_scolaire||'').trim(),anneeDebut=(anneeTxt.match(/20\d{2}/)||['PFMP'])[0],numeroEnregistrement=String(a.Numero_enregistrement||'').trim()||('PFMP-'+anneeDebut+'-'+String(Number(a.id||0)).padStart(6,'0'));var fields={Entreprise_siret:estMonaco?'':siret,Entreprise_nis:nis,Entreprise_identifiant_type:estMonaco?'NIS':'SIRET',Entreprise_validation_statut:estMonaco?'A_VALIDER':'VALIDE',Entreprise_raison_sociale:raison,Entreprise_enseigne:txt(d.entrepriseEnseigne,250),Entreprise_adresse:adresse,Entreprise_complement:txt(d.entrepriseComplement,250),Entreprise_code_postal:txt(d.entrepriseCodePostal,20),Entreprise_commune:commune,Entreprise_pays:pays,Responsable_nom:respNom,Responsable_prenom:txt(d.responsablePrenom,150),Responsable_fonction:txt(d.responsableFonction,200),Responsable_telephone:txt(d.responsableTelephone,50),Responsable_courriel:txt(d.responsableCourriel,250),Tuteur_est_responsable:tuteurEst,Tuteur_nom:tuteurEst?respNom:tNom,Tuteur_prenom:tuteurEst?txt(d.responsablePrenom,150):txt(d.tuteurPrenom,150),Tuteur_fonction:tuteurEst?txt(d.responsableFonction,200):txt(d.tuteurFonction,200),Tuteur_telephone:tuteurEst?txt(d.responsableTelephone,50):txt(d.tuteurTelephone,50),Tuteur_courriel:tuteurEst?txt(d.responsableCourriel,250):txt(d.tuteurCourriel,250),Date_saisie_entreprise:new Date().toISOString(),Statut:'ENTREPRISE_SAISIE',Date_derniere_utilisation:new Date().toISOString()};EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});if(estMonaco){try{EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d);}catch(monacoErr){console.log('MONACO_REF_WARNING '+String(monacoErr&&monacoErr.message||monacoErr));}}if(pays.toLowerCase()==='monaco'){try{EUC_V1617_enregistrerEntrepriseMonaco({nis:siret,raisonSociale:raison,enseigne:txt(d.entrepriseEnseigne,250),adresse:adresse,complement:txt(d.entrepriseComplement,250),codePostal:txt(d.entrepriseCodePostal,20),commune:commune,rci:txt(d.entrepriseRci,100)});}catch(monacoErr){}}var notif={};
try{notif=EUC_CONVENTION_apresEnregistrementV143_(a.id,numeroEnregistrement);}
catch(err143){notif={envoye:false,erreur:String(err143&&err143.message?err143.message:err143)};}
return {ok:true,return {ok:true,reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}
reference:a.Reference_convention||'',numeroEnregistrement:numeroEnregistrement,message:'Informations entreprise enregistrées.',notification:notif};}
/* Compatibilité anciens appels. */
function EUC_CONVENTION_verifierIdentiteV112(code,cle,jour,mois){var rows=EUC_CONVENTION_lireAccesFraisV108_(),m=rows.filter(function(r){return r.Revoked!==true&&String(r.Reference_convention||'').trim()===String(code||'').trim()&&String(r.Token_hash||'').trim()===String(cle||'').trim();});if(m.length!==1)throw new Error('[QR117-ANCIEN] Ancien QR non résolu. Régénérez la convention.');return EUC_CONVENTION_verifierIdentiteV113(m[0].id,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV112(code,EUC_CONVENTION_hash_(String(token||'')),jour,mois);}
function EUC_CONVENTION_verifierIdentiteV110(code,token,sig,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV108(aid,code,eid,token,sig,jour,mois){return aid?EUC_CONVENTION_verifierIdentiteV113(aid,jour,mois):EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV106(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
