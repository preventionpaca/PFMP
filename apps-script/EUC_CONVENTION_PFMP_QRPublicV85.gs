/** Eucalyptus PFMP — v1.0.0-dev.107 — diagnostic QR détaillé au contrôle jour/mois. */
function EUC_CONVENTION_lireAccesFraisV107_(){var raw=EUC_ENT_grist('get','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records');return (raw.records||[]).map(function(r){var o={id:r.id},f=r.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});}
function EUC_CONVENTION_diagnosticLienV107_(code,token){
  code=String(code||'').trim();token=String(token||'').trim();try{code=decodeURIComponent(code);}catch(e){}try{token=decodeURIComponent(token);}catch(e){}
  if(!code&&!token)throw new Error('[QR107-ENTREE] Référence et jeton absents du formulaire.');
  var rows;try{rows=EUC_CONVENTION_lireAccesFraisV107_();}catch(e2){throw new Error('[QR107-GRIST] Lecture de la table d’accès impossible : '+(e2&&e2.message?e2.message:String(e2)));}
  var hash=token?EUC_CONVENTION_hash_(token):'',refAll=rows.filter(function(r){return code&&String(r.Reference_convention||'').trim()===code;}),tokAll=rows.filter(function(r){return hash&&String(r.Token_hash||'')===hash;}),pairAll=rows.filter(function(r){return code&&hash&&String(r.Reference_convention||'').trim()===code&&String(r.Token_hash||'')===hash;}),pairActive=pairAll.filter(function(r){return r.Revoked!==true;});
  var diag={total:rows.length,ref:refAll.length,token:tokAll.length,couple:pairAll.length,actif:pairActive.length,codeRecu:!!code,tokenRecu:!!token,tokenLongueur:token.length,hash8:hash?hash.substring(0,8):''};
  if(pairActive.length!==1){var revoked=pairAll.filter(function(r){return r.Revoked===true;}).length;throw new Error('[QR107-LIEN] Diagnostic : lignes='+diag.total+', référence='+diag.ref+', jeton='+diag.token+', couple='+diag.couple+', actif='+diag.actif+', révoqué='+revoked+', longueurJeton='+diag.tokenLongueur+', hash8='+diag.hash8+'.');}
  return {acces:pairActive[0],diag:diag};
}
function EUC_CONVENTION_verifierIdentiteCommunV107_(a,jour,mois,diag){
  jour=Number(jour||0);mois=Number(mois||0);if(!a||jour<1||jour>31||mois<1||mois>12)throw new Error('[QR107-ENTREE] Informations de contrôle invalides.');
  var now=Date.now();if(a.Bloque_jusqua&&new Date(a.Bloque_jusqua).getTime()>now)throw new Error('[QR107-BLOQUE] Trop de tentatives. Réessayez plus tard.');
  var eleves;try{eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP');}catch(e){throw new Error('[QR107-ELEVES] Lecture de la table élèves impossible : '+(e&&e.message?e.message:String(e)));}
  var ref=Number(EUC_PFMP_ref_(a.Eleve)),e=eleves.filter(function(x){return Number(x.id)===ref;})[0];if(!e)throw new Error('[QR107-ELEVE] Élève introuvable pour la référence Grist '+ref+'.');
  var iso=EUC_IMPORT_dateExistanteISO_(e.Date_naissance),parts=String(iso||'').split('-');if(parts.length!==3)throw new Error('[QR107-DATE] Date de naissance illisible dans Grist pour cet élève.');
  var ok=Number(parts[2])===jour&&Number(parts[1])===mois;
  if(!ok){var n=Number(a.Tentatives_echec||0)+1,fields={Tentatives_echec:n,Date_derniere_utilisation:new Date().toISOString()};if(n>=5)fields.Bloque_jusqua=new Date(now+30*60*1000).toISOString();EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:fields}]});throw new Error('[QR107-NAISSANCE] Jour ou mois de naissance incorrect. Donnée élève trouvée et lien valide.');}
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_CONVENTION_ACCES_TABLE_)+'/records',{records:[{id:a.id,fields:{Tentatives_echec:0,Bloque_jusqua:null,Date_derniere_utilisation:new Date().toISOString(),Statut:'FORMULAIRE_OUVERT'}}]});
  return {ok:true,diagnostic:'QR107-OK',reference:a.Reference_convention||'',eleve:{nom:e.Nom||'',prenom:e.Prenom_usage||e.Prenom||'',classeConvention:a.Classe_convention_nom||'',anneeConvention:a.Annee_scolaire||'',dateDebut:EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_debut),true),dateFin:EUC_CONVENTION_dateFRV85_(EUC_IMPORT_dateExistanteISO_(a.Date_fin),true)}};
}
function EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois){var d=EUC_CONVENTION_diagnosticLienV107_(code,token);return EUC_CONVENTION_verifierIdentiteCommunV107_(d.acces,jour,mois,d.diag);}

/* Compatibilité avec les anciennes pages encore éventuellement ouvertes. */
function EUC_CONVENTION_verifierIdentiteV106(code,token,jour,mois){return EUC_CONVENTION_verifierIdentiteV107(code,token,jour,mois);}
