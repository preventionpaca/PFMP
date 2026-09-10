/** Eucalyptus PFMP — v1.0.0-dev.108 — QR par ID d'accès + signature HMAC + diagnostic explicite. */
function EUC_CONVENTION_lireAccesFraisV108_(){var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records');return (raw.records||[]).map(function(r){var o={id:r.id},f=r.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});}
function EUC_CONVENTION_signatureEgaleV108_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;var x=0;for(var i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
function EUC_CONVENTION_resoudreLienV108_(aid,code,eid,token,sig){
  aid=Number(aid||0);eid=Number(eid||0);code=String(code||'').trim();token=String(token||'').trim();sig=String(sig||'').trim();
  try{code=decodeURIComponent(code);}catch(e){}try{token=decodeURIComponent(token);}catch(e2){}try{sig=decodeURIComponent(sig);}catch(e3){}
  if(!aid||!eid||!code||!token||!sig)throw new Error('[QR108-ENTREE] Paramètres QR incomplets : aid='+aid+', eid='+eid+', référence='+(code?1:0)+', jeton='+(token?1:0)+', signature='+(sig?1:0)+'.');
  var attendu=EUC_CONVENTION_qrSignatureV108_(aid,code,eid,token);if(!EUC_CONVENTION_signatureEgaleV108_(attendu,sig))throw new Error('[QR108-SIGNATURE] Signature du QR invalide. Le lien a été altéré ou provient d’une ancienne génération.');
  var rows;try{rows=EUC_CONVENTION_lireAccesFraisV108_();}catch(err){throw new Error('[QR108-GRIST] Lecture de la table d’accès impossible : '+(err&&err.message?err.message:String(err)));}
  var byId=rows.filter(function(r){return Number(r.id)===aid;}),hash=EUC_CONVENTION_hash_(token);
  if(byId.length===1){var a=byId[0];if(a.Revoked===true)throw new Error('[QR108-REVOQUE] Cette convention a été révoquée.');if(String(a.Reference_convention||'').trim()!==code)throw new Error('[QR108-REFERENCE] ID '+aid+' trouvé mais référence différente.');if(String(a.Token_hash||'')!==hash)throw new Error('[QR108-JETON] ID '+aid+' trouvé mais empreinte du jeton différente.');if(Number(EUC_PFMP_ref_(a.Eleve))!==eid)throw new Error('[QR108-ELEVE] ID '+aid+' trouvé mais élève différent.');return {acces:a,mode:'ID_GRIST',diag:'QR108-ID-OK'};}
  /* Filet de sécurité signé : le QR prouve son authenticité même si la ligne n'est pas visible dans cette lecture Grist. */
  var ref=rows.filter(function(r){return String(r.Reference_convention||'').trim()===code;}).length,tok=rows.filter(function(r){return String(r.Token_hash||'')===hash;}).length;
  return {acces:{id:0,Eleve:eid,Reference_convention:code,Classe_convention_nom:'',Annee_scolaire:'',Date_debut:'',Date_fin:'',Revoked:false,Tentatives_echec:0},mode:'SIGNATURE_SECOURS',diag:'QR108-SECOURS aid='+aid+', lignes='+rows.length+', ref='+ref+', jeton='+tok};
}
function EUC_CONVENTION_verifierNaissanceV108_(resolved,jour,mois){
  var a=resolved.acces;jour=Number(jour||0);mois=Number(mois||0);if(jour<1||jour>31||mois<1||mois>12)throw new Error('[QR108-NAISSANCE] Jour ou mois invalide.');
  var now=Date.now();if(a.Bloque_jusqua&&new Date(a.Bloque_jusqua).getTime()>now)throw new Error('[QR108-BLOQUE] Trop de tentatives. Réessayez plus tard.');
  var eleves;try{eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');}catch(e){throw new Error('[QR108-ELEVES] Lecture de la table élèves impossible : '+(e&&e.message?e.message:String(e)));}
  var ref=Number(EUC_PFMP_ref_(a.Eleve)),el=eleves.filter(function(x){return Number(x.id)===ref;})[0];if(!el)throw new Error('[QR108-ELEVE] Élève '+ref+' introuvable.');
  var iso=EUC_IMPORT_dateExistanteISO_(el.Date_naissance),parts=String(iso||'').split('-');if(parts.length!==3)throw new Error('[QR108-DATE] Date de naissance illisible pour l’élève '+ref+'.');
  var ok=Number(parts[2])===jour&&Number(parts[1])===mois;
  if(!ok){if(a.id){var n=Number(a.Tentatives_echec||0)+1,fields={Tentatives_echec:n,Date_derniere_utilisation:new Date().toISOString()};if(n>=5)fields.Bloque_jusqua=new Date(now+30*60*1000).toISOString();EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});}throw new Error('[QR108-NAISSANCE] Lien valide, mais jour/mois ne correspondent pas à la date enregistrée.');}
  if(a.id)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});
  return {ok:true,diagnostic:resolved.diag+' - NAISSANCE-OK',reference:a.Reference_convention||'',eleve:{nom:el.Nom||'',prenom:el.Prenom_usage||el.Prenom||'',classeConvention:a.Classe_convention_nom||el.Code_classe_importe||el.Classe_nom||'',anneeConvention:a.Annee_scolaire||el.Annee_scolaire_code||el.Annee_scolaire||'',dateDebut:a.Date_debut?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_debut),true):'',dateFin:a.Date_fin?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_fin),true):''}};
}
function EUC_CONVENTION_verifierIdentiteV108(aid,code,eid,token,sig,jour,mois){return EUC_CONVENTION_verifierNaissanceV108_(EUC_CONVENTION_resoudreLienV108_(aid,code,eid,token,sig),jour,mois);}
function EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois){throw new Error('[QR108-ANCIEN] Cette convention utilise un ancien QR. Régénérez-la avec DEV.108.');}
function EUC_CONVENTION_verifierIdentiteV106(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois);}
