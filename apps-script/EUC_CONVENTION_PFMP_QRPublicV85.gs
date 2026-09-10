/** Eucalyptus PFMP — v1.0.0-dev.111 — QR référence/jeton + contrôle naissance, sans HMAC redondant. */
function EUC_CONVENTION_lireAccesFraisV108_(){var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records');return (raw.records||[]).map(function(r){var o={id:r.id},f=r.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});}
function EUC_CONVENTION_resoudreLienV111_(code,token){
  code=String(code||'').trim();token=String(token||'').trim();
  try{code=decodeURIComponent(code);}catch(e){}try{token=decodeURIComponent(token);}catch(e2){}
  if(!code||!token)throw new Error('[QR111-ENTREE] Paramètres QR incomplets : référence='+(code?1:0)+', jeton='+(token?1:0)+'.');
  var rows;try{rows=EUC_CONVENTION_lireAccesFraisV108_();}catch(err){throw new Error('[QR111-GRIST] Lecture de la table d’accès impossible : '+(err&&err.message?err.message:String(err)));}
  var hash=EUC_CONVENTION_hash_(token),refRows=rows.filter(function(r){return String(r.Reference_convention||'').trim()===code;}),tokRows=rows.filter(function(r){return String(r.Token_hash||'')===hash;}),matches=rows.filter(function(r){return r.Revoked!==true&&String(r.Reference_convention||'').trim()===code&&String(r.Token_hash||'')===hash;});
  if(matches.length!==1)throw new Error('[QR111-LIEN] Diagnostic : lignes='+rows.length+', référence='+refRows.length+', jeton='+tokRows.length+', couple='+matches.length+', longueurJeton='+token.length+', hash8='+hash.substring(0,8)+'.');
  var a=matches[0];if(a.Revoked===true)throw new Error('[QR111-REVOQUE] Cette convention a été révoquée.');return {acces:a,mode:'REFERENCE_JETON',diag:'QR111-LIEN-OK id='+a.id};
}
function EUC_CONVENTION_verifierNaissanceV111_(resolved,jour,mois){
  var a=resolved.acces;jour=Number(jour||0);mois=Number(mois||0);if(jour<1||jour>31||mois<1||mois>12)throw new Error('[QR111-NAISSANCE] Jour ou mois invalide.');
  var now=Date.now();if(a.Bloque_jusqua&&new Date(a.Bloque_jusqua).getTime()>now)throw new Error('[QR111-BLOQUE] Trop de tentatives. Réessayez plus tard.');
  var eleves;try{eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');}catch(e){throw new Error('[QR111-ELEVES] Lecture de la table élèves impossible : '+(e&&e.message?e.message:String(e)));}
  var ref=Number(EUC_PFMP_ref_(a.Eleve)),el=eleves.filter(function(x){return Number(x.id)===ref;})[0];if(!el)throw new Error('[QR111-ELEVE] Élève '+ref+' introuvable.');
  var iso=EUC_IMPORT_dateExistanteISO_(el.Date_naissance),parts=String(iso||'').split('-');if(parts.length!==3)throw new Error('[QR111-DATE] Date de naissance illisible pour l’élève '+ref+'.');
  var ok=Number(parts[2])===jour&&Number(parts[1])===mois;
  if(!ok){var n=Number(a.Tentatives_echec||0)+1,fields={Tentatives_echec:n,Date_derniere_utilisation:new Date().toISOString()};if(n>=5)fields.Bloque_jusqua=new Date(now+30*60*1000).toISOString();EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});throw new Error('[QR111-NAISSANCE] Lien valide, mais jour/mois ne correspondent pas à la date enregistrée.');}
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});
  return {ok:true,diagnostic:resolved.diag+' - NAISSANCE-OK',reference:a.Reference_convention||'',eleve:{nom:el.Nom||'',prenom:el.Prenom_usage||el.Prenom||'',classeConvention:a.Classe_convention_nom||el.Code_classe_importe||el.Classe_nom||'',anneeConvention:a.Annee_scolaire||el.Annee_scolaire_code||el.Annee_scolaire||'',dateDebut:a.Date_debut?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_debut),true):'',dateFin:a.Date_fin?EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_fin),true):''}};
}
function EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois){return EUC_CONVENTION_verifierNaissanceV111_(EUC_CONVENTION_resoudreLienV111_(code,token),jour,mois);}
function EUC_CONVENTION_verifierIdentiteV110(code,token,sig,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV108(aid,code,eid,token,sig,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
function EUC_CONVENTION_verifierIdentiteV106(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV111(code,token,jour,mois);}
