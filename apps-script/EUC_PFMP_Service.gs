/** Eucalyptus PFMP — v1.0.0-dev.26 — services de recette, écritures simulées. */
var EUC_PFMP_SUBMISSION_COLUMNS = [
  'Reference','Date_creation','Date_modification','Annee_scolaire','Annee_libelle_snapshot','Statut_jeune','Diplome','Diplome_snapshot','Classe','Classe_snapshot','Offre_formation','Periode_officielle','Periode_snapshot','Date_officielle_debut','Date_officielle_fin','Dates_conformes','Scenario_dates','Date_declaree_debut','Date_declaree_fin','Motif','Commentaire_jeune','Jeune_nom','Jeune_prenom','Jeune_date_naissance','Jeune_telephone','Jeune_courriel','Jeune_adresse','Jeune_complement_adresse','Jeune_code_postal','Jeune_commune','Entreprise','Entreprise_siret_snapshot','Entreprise_raison_sociale_snapshot','Entreprise_enseigne_snapshot','Entreprise_nom_usage_snapshot','Entreprise_adresse_snapshot','Entreprise_commune_snapshot','Entreprise_confirmee','Entreprise_telephone_snapshot','Entreprise_courriel_snapshot','Contact_entreprise','Responsable_nom','Responsable_fonction','Responsable_telephone','Responsable_courriel','Tuteur_nom','Tuteur_fonction','Tuteur_telephone','Tuteur_courriel','Statut_administratif','Valide_par','Date_validation','Commentaire_administratif','Etat_courriel_admin','Date_courriel_admin','Erreur_courriel_admin','Etat_courriel_jeune','Empreinte_doublon','Nonce_hash','Auteur_technique','Version_formulaire','Entreprise_complement_adresse_snapshot','Entreprise_code_postal_snapshot','Entreprise_pays_snapshot'
];

function EUC_PFMP_lireTable_(table) {
  var r=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records');
  return r.records||[];
}
function EUC_PFMP_ref_(v) { return Array.isArray(v)?Number(v[0]||0):Number(v||0); }
function EUC_PFMP_dateIso_(v) {
  if(!v)return '';
  if(typeof v==='number')return new Date(v*1000).toISOString().slice(0,10);
  return String(v).slice(0,10);
}
function EUC_PFMP_chargerReferentiel() {
  EUC_ENT_controlerAccesUtilisateur_(); EUC_ENT_controlerCibleRecette_();
  var annees=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.annees).filter(function(r){return r.fields.Active===true;});
  var diplomes=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.diplomes), classes=EUC_PFMP_lireTable_('Classes');
  var offres=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.offres).filter(function(r){return r.fields.Actif===true&&r.fields.Afficher_formulaire_PFMP===true;});
  var relations=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.relations).filter(function(r){return r.fields.Active===true;});
  var periodes=EUC_PFMP_lireTable_(EUC_PFMP_TABLES.periodes);
  if(offres.length!==38)throw new Error('Référentiel PFMP incohérent : 38 classes visibles attendues, '+offres.length+' trouvées.');
  var dBy={},cBy={},pBy={}; diplomes.forEach(function(r){dBy[r.id]=r;});classes.forEach(function(r){cBy[r.id]=r;});periodes.forEach(function(r){pBy[r.id]=r;});
  var periodIdsByOffer={}; relations.forEach(function(r){var o=EUC_PFMP_ref_(r.fields.Offre_formation),p=EUC_PFMP_ref_(r.fields.Periode);if(!periodIdsByOffer[o])periodIdsByOffer[o]=[];periodIdsByOffer[o].push(p);});
  return {version:EUC_PFMP_VERSION,annees:annees.map(function(r){return {id:r.id,code:r.fields.Code||r.fields.Libelle||''};}),offres:offres.sort(function(a,b){return Number(a.fields.Ordre||0)-Number(b.fields.Ordre||0);}).map(function(r){
    var d=dBy[EUC_PFMP_ref_(r.fields.Diplome)],cl=cBy[EUC_PFMP_ref_(r.fields.Classe)];
    return {id:r.id,anneeId:EUC_PFMP_ref_(r.fields.Annee_scolaire),diplomeId:d?d.id:null,diplome:r.fields.Libelle_affichage||(d?d.fields.Libelle||d.fields.Code:'Formation à préciser'),classeId:cl?cl.id:null,classe:r.fields.Code_classe||cl&&((cl.fields.Libelle||cl.fields.Nom))||'',periodes:(periodIdsByOffer[r.id]||[]).map(function(id){var p=pBy[id];return p?{id:p.id,libelle:p.fields.Libelle_periode||p.fields.Type||'Période officielle',debut:EUC_PFMP_dateIso_(p.fields.Date_debut),fin:EUC_PFMP_dateIso_(p.fields.Date_fin)}:null;}).filter(Boolean)};
  })};
}

function EUC_PFMP_listerContactsEntreprise(entrepriseId) {
  EUC_ENT_controlerAccesUtilisateur_(); entrepriseId=Number(entrepriseId||0); if(!entrepriseId)return [];
  return EUC_PFMP_lireTable_(EUC_PFMP_TABLES.contacts).filter(function(r){return EUC_PFMP_ref_(r.fields.Entreprise)===entrepriseId&&r.fields.Actif!==false;}).map(function(r){return {id:r.id,nom:[r.fields.Prenom,r.fields.Nom].filter(Boolean).join(' '),fonction:r.fields.Fonction||'',telephone:r.fields.Telephone_direct||'',courriel:r.fields.Courriel_direct||''};});
}
function EUC_PFMP_nettoyer_(v,max) { return String(v==null?'':v).trim().replace(/[<>]/g,'').slice(0,max||5000); }
function EUC_PFMP_normaliserPays_(p){return EUC_PFMP_nettoyer_(p,100).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function EUC_PFMP_formaterTelephone_(chiffres){return String(chiffres).replace(/(\d{2})(?=\d)/g,'$1 ').trim();}
function EUC_PFMP_validerTelephone_(valeur,pays,obligatoire){
  var brut=EUC_PFMP_nettoyer_(valeur,40);if(!brut)return obligatoire?{valide:false,message:'Téléphone obligatoire.'}:{valide:true,normalise:''};
  if(!/^[0-9 .()\-]+$/.test(brut)||brut.indexOf('+')>=0)return {valide:false,message:'Le téléphone contient des caractères interdits.'};
  var ouvert=(brut.match(/\(/g)||[]).length,ferme=(brut.match(/\)/g)||[]).length;if(ouvert!==ferme||ouvert>1)return {valide:false,message:'Parenthèses téléphoniques invalides.'};
  var chiffres=brut.replace(/[ .()\-]/g,''),p=EUC_PFMP_normaliserPays_(pays);
  if(p==='france'){if(!/^0[1-9]\d{8}$/.test(chiffres))return {valide:false,message:'Format France attendu : 10 chiffres commençant par 01 à 09.'};}
  else if(p==='monaco'){var fixe=/^(?:87\d{6}|9\d{7})$/.test(chiffres),mobileCourt=/^(?:3\d{7}|(?:44|45|46)\d{6})$/.test(chiffres),mobileNational=/^0[67]\d{8}$/.test(chiffres),mobileLong=/^2\d{11}$/.test(chiffres);if(!(fixe||mobileCourt||mobileNational||mobileLong))return {valide:false,message:'Numéro national monégasque invalide.'};}
  else if(!/^\d{6,15}$/.test(chiffres))return {valide:false,message:'Le téléphone national doit contenir de 6 à 15 chiffres.'};
  return {valide:true,normalise:EUC_PFMP_formaterTelephone_(chiffres)};
}
function EUC_PFMP_validerTelephoneProfessionnel_(valeur,pays){var national=EUC_PFMP_validerTelephone_(valeur,pays,false);if(national.valide||!EUC_PFMP_nettoyer_(valeur,40)||EUC_PFMP_normaliserPays_(pays)==='france')return national;return EUC_PFMP_validerTelephone_(valeur,'France',false);}
function EUC_PFMP_validerCoordonnees_(d) {
  var erreurs=[];
  ['jeuneNom','jeunePrenom','jeuneDateNaissance','jeuneTelephone','jeuneCourriel','jeuneAdresse','jeuneCodePostal','jeuneCommune'].forEach(function(k){if(!EUC_PFMP_nettoyer_(d[k],500))erreurs.push(k+' obligatoire.');});
  if(d.jeuneCourriel&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.jeuneCourriel))erreurs.push('Adresse électronique du jeune invalide.');
  var tel=EUC_PFMP_validerTelephone_(d.jeuneTelephone,'France',true);if(!tel.valide)erreurs.push('Téléphone du jeune invalide : '+tel.message);else d.jeuneTelephone=tel.normalise;
  if(d.jeuneCodePostal&&!/^[0-9A-Z -]{4,10}$/i.test(d.jeuneCodePostal))erreurs.push('Code postal invalide.');
  return erreurs;
}
function EUC_PFMP_validerDonnees_(d) {
  var e=EUC_PFMP_validerCoordonnees_(d);
  if(d.statutJeune==='Scolaire'&&d.scenarioDates==='Dates officielles')d.motif='';
  if(['Scolaire','Apprenti'].indexOf(d.statutJeune)<0)e.push('Votre statut est obligatoire.');
  if(!Number(d.offreId))e.push('Classe obligatoire.');
  if(d.statutJeune==='Scolaire'&&!Number(d.periodeId))e.push('Période officielle obligatoire.');
  if(!d.dateDeclareeDebut||!d.dateDeclareeFin)e.push('Dates déclarées obligatoires.');
  if(d.dateDeclareeDebut&&d.dateDeclareeFin&&d.dateDeclareeDebut>d.dateDeclareeFin)e.push('La date de fin doit suivre la date de début.');
  var scenarios=['Dates officielles','Début retardé','Autre situation exceptionnelle'];
  if(d.statutJeune==='Scolaire'&&scenarios.indexOf(d.scenarioDates)<0)e.push('Situation de dates non autorisée.');
  if(d.statutJeune==='Scolaire'&&d.scenarioDates==='Dates officielles'&&(d.dateDeclareeDebut!==d.dateOfficielleDebut||d.dateDeclareeFin!==d.dateOfficielleFin))e.push('Les dates réelles doivent correspondre aux dates officielles.');
  if(d.statutJeune==='Scolaire'&&d.scenarioDates==='Début retardé'&&d.dateDeclareeFin!==d.dateOfficielleFin)e.push('La fin doit rester la date officielle en cas de début retardé.');
  if(d.statutJeune==='Scolaire'&&d.scenarioDates!=='Dates officielles'&&!EUC_PFMP_nettoyer_(d.motif,1000))e.push('Motif obligatoire pour cette situation.');
  if(!d.entrepriseConfirmee)e.push('Vous devez confirmer le bon établissement.');
  var pays=EUC_PFMP_nettoyer_(d.entreprisePays,100);
  if(!pays)e.push('Pays de l’entreprise obligatoire.');
  if(pays.toLowerCase()==='france'&&!EUC_PFMP_nettoyer_(d.entrepriseSiret,20))e.push('SIRET obligatoire pour une entreprise française.');
  ['entrepriseRaisonSociale','entrepriseAdresse','entrepriseCommune','responsableNom'].forEach(function(k){if(!EUC_PFMP_nettoyer_(d[k],500))e.push(k+' obligatoire.');});
  [['responsableTelephone','responsable'],['tuteurTelephone','tuteur']].forEach(function(item){var t=EUC_PFMP_validerTelephoneProfessionnel_(d[item[0]],pays);if(!t.valide)e.push('Téléphone du '+item[1]+' invalide pour le pays de l’entreprise et pour la France.');else d[item[0]]=t.normalise;});
  if(!EUC_PFMP_nettoyer_(d.tuteurNom,150))e.push('Nom du tuteur obligatoire.');
  if(EUC_PFMP_nettoyer_(d.honeypot,100))e.push('Soumission refusée.');
  if(Number(d.elapsedMs||0)<3000)e.push('Formulaire envoyé trop rapidement.');
  if(!EUC_PFMP_nettoyer_(d.nonce,200))e.push('Nonce absent.');
  if(e.length)throw new Error(e.join(' ')); return true;
}
function EUC_PFMP_nomComplet_(prenom,nom){return [EUC_PFMP_nettoyer_(prenom,150),EUC_PFMP_nettoyer_(nom,150)].filter(Boolean).join(' ');}
function EUC_PFMP_preparerContactsSimules_(d){
  var responsable={prenom:EUC_PFMP_nettoyer_(d.responsablePrenom,150),nom:EUC_PFMP_nettoyer_(d.responsableNom,150),fonction:EUC_PFMP_nettoyer_(d.responsableFonction,250),telephone:EUC_PFMP_nettoyer_(d.responsableTelephone,30),courriel:EUC_PFMP_nettoyer_(d.responsableCourriel,250),roles:['Responsable']};
  if(d.tuteurEstResponsable){responsable.roles.push('Tuteur');return [responsable];}
  return [responsable,{prenom:EUC_PFMP_nettoyer_(d.tuteurPrenom,150),nom:EUC_PFMP_nettoyer_(d.tuteurNom,150),fonction:EUC_PFMP_nettoyer_(d.tuteurFonction,250),telephone:EUC_PFMP_nettoyer_(d.tuteurTelephone,30),courriel:EUC_PFMP_nettoyer_(d.tuteurCourriel,250),roles:['Tuteur']}];
}
function EUC_PFMP_validerReferentielSelection_(d) {
  var catalogue=EUC_PFMP_chargerReferentiel(), offre=catalogue.offres.filter(function(o){return o.id===Number(d.offreId);})[0];
  if(!offre)throw new Error('Classe absente du référentiel PFMP actif.');
  if(offre.anneeId!==Number(d.anneeId))throw new Error('Année scolaire incohérente avec la classe.');
  var periode=null;if(d.statutJeune==='Scolaire'){periode=offre.periodes.filter(function(p){return p.id===Number(d.periodeId);})[0];if(!periode)throw new Error('Période non autorisée pour cette classe.');}
  d.classeId=offre.classeId;d.classeLibelle=offre.classe;d.diplomeId=offre.diplomeId;d.diplomeLibelle=offre.diplome;
  if(periode){d.periodeLibelle=periode.libelle;d.dateOfficielleDebut=periode.debut;d.dateOfficielleFin=periode.fin;if(d.scenarioDates==='Dates officielles'){d.datesConformes=true;d.dateDeclareeDebut=periode.debut;d.dateDeclareeFin=periode.fin;}else d.datesConformes=false;}
  return true;
}
function EUC_PFMP_hash_(value) {
  if(typeof Utilities!=='undefined'&&Utilities.computeDigest){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8).map(function(b){return ('0'+((b<0?b+256:b).toString(16))).slice(-2);}).join('');}
  var h=2166136261,s=String(value);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ('00000000'+(h>>>0).toString(16)).slice(-8);
}
function EUC_PFMP_verifierTurnstile_(token,expectedAction) {
  var c=EUC_PFMP_lireConfiguration_(); if(!token)throw new Error('CAPTCHA absent.');
  var cache=CacheService.getScriptCache(), replay='pfmp-captcha-'+EUC_PFMP_hash_(token); if(cache.get(replay))throw new Error('CAPTCHA déjà utilisé.');
  var rep=UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'post',muteHttpExceptions:true,payload:{secret:c.EUC_PFMP_TURNSTILE_SECRET_KEY,response:token}});
  if(rep.getResponseCode()!==200)throw new Error('CAPTCHA indisponible.'); var data=JSON.parse(rep.getContentText()||'{}');
  if(!data.success)throw new Error((data['error-codes']||[]).indexOf('timeout-or-duplicate')>=0?'CAPTCHA expiré ou déjà utilisé.':'CAPTCHA invalide.');
  if(data.action!==expectedAction)throw new Error('Action CAPTCHA invalide.');
  if(c.EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME&&data.hostname!==c.EUC_PFMP_TURNSTILE_EXPECTED_HOSTNAME)throw new Error('Nom d’hôte CAPTCHA invalide.');
  cache.put(replay,'1',600); return true;
}
function EUC_PFMP_verifierTurnstileRecette_(token,expectedAction) {
  var modes=EUC_PFMP_modesSecurite_();
  if(modes.turnstileConfigure)return EUC_PFMP_verifierTurnstile_(token,expectedAction)&&'VALIDE';
  if(modes.submission==='LIVE')throw new Error('CAPTCHA réel obligatoire avant toute soumission LIVE.');
  return 'NON_CONFIGURE_RECETTE';
}
function EUC_PFMP_reference_(d,now) { return 'PFMP-'+String(now.getTime())+'-'+EUC_PFMP_hash_([d.jeuneNom,d.jeunePrenom,d.entrepriseSiret,d.offreId].join('|')).slice(0,8).toUpperCase(); }
function EUC_PFMP_mapper61Colonnes_(d,ctx) {
  if(d.statutJeune==='Scolaire'&&d.scenarioDates==='Dates officielles')d.motif='';
  var conforme=d.statutJeune==='Scolaire'&&d.datesConformes===true, now=ctx.now, ref=ctx.reference;
  var f={Reference:ref,Date_creation:now,Date_modification:now,Annee_scolaire:Number(d.anneeId)||null,Annee_libelle_snapshot:EUC_PFMP_nettoyer_(d.anneeLibelle,50),Statut_jeune:d.statutJeune,Diplome:Number(d.diplomeId)||null,Diplome_snapshot:EUC_PFMP_nettoyer_(d.diplomeLibelle,250),Classe:Number(d.classeId)||null,Classe_snapshot:EUC_PFMP_nettoyer_(d.classeLibelle,100),Offre_formation:Number(d.offreId)||null,Periode_officielle:d.statutJeune==='Scolaire'?Number(d.periodeId)||null:null,Periode_snapshot:EUC_PFMP_nettoyer_(d.periodeLibelle,250),Date_officielle_debut:d.dateOfficielleDebut||null,Date_officielle_fin:d.dateOfficielleFin||null,Dates_conformes:conforme,Scenario_dates:d.statutJeune==='Apprenti'?'Dates libres apprenti':EUC_PFMP_nettoyer_(d.scenarioDates,100),Date_declaree_debut:d.dateDeclareeDebut,Date_declaree_fin:d.dateDeclareeFin,Motif:EUC_PFMP_nettoyer_(d.motif,1000),Commentaire_jeune:EUC_PFMP_nettoyer_(d.commentaireJeune,5000),Jeune_nom:EUC_PFMP_nettoyer_(d.jeuneNom,150),Jeune_prenom:EUC_PFMP_nettoyer_(d.jeunePrenom,150),Jeune_date_naissance:d.jeuneDateNaissance,Jeune_telephone:EUC_PFMP_nettoyer_(d.jeuneTelephone,30),Jeune_courriel:EUC_PFMP_nettoyer_(d.jeuneCourriel,250),Jeune_adresse:EUC_PFMP_nettoyer_(d.jeuneAdresse,500),Jeune_complement_adresse:EUC_PFMP_nettoyer_(d.jeuneComplementAdresse,250),Jeune_code_postal:EUC_PFMP_nettoyer_(d.jeuneCodePostal,10),Jeune_commune:EUC_PFMP_nettoyer_(d.jeuneCommune,150),Entreprise:Number(d.entrepriseId)||null,Entreprise_siret_snapshot:EUC_PFMP_nettoyer_(d.entrepriseSiret,14),Entreprise_raison_sociale_snapshot:EUC_PFMP_nettoyer_(d.entrepriseRaisonSociale,250),Entreprise_enseigne_snapshot:EUC_PFMP_nettoyer_(d.entrepriseEnseigne,250),Entreprise_nom_usage_snapshot:EUC_PFMP_nettoyer_(d.entrepriseNomUsage,250),Entreprise_adresse_snapshot:EUC_PFMP_nettoyer_(d.entrepriseAdresse,500),Entreprise_commune_snapshot:EUC_PFMP_nettoyer_(d.entrepriseCommune,150),Entreprise_confirmee:!!d.entrepriseConfirmee,Entreprise_telephone_snapshot:'',Entreprise_courriel_snapshot:'',Contact_entreprise:Number(d.contactEntrepriseId)||null,Responsable_nom:EUC_PFMP_nomComplet_(d.responsablePrenom,d.responsableNom),Responsable_fonction:EUC_PFMP_nettoyer_(d.responsableFonction,250),Responsable_telephone:EUC_PFMP_nettoyer_(d.responsableTelephone,30),Responsable_courriel:EUC_PFMP_nettoyer_(d.responsableCourriel,250),Tuteur_nom:EUC_PFMP_nomComplet_(d.tuteurPrenom,d.tuteurNom),Tuteur_fonction:EUC_PFMP_nettoyer_(d.tuteurFonction,250),Tuteur_telephone:EUC_PFMP_nettoyer_(d.tuteurTelephone,30),Tuteur_courriel:EUC_PFMP_nettoyer_(d.tuteurCourriel,250),Statut_administratif:d.statutJeune==='Apprenti'?'Enregistré':(conforme?'Conforme au calendrier':'Dérogation à vérifier'),Valide_par:'',Date_validation:null,Commentaire_administratif:'',Etat_courriel_admin:'Simulation prête',Date_courriel_admin:null,Erreur_courriel_admin:'',Etat_courriel_jeune:ctx.studentConfirmation?'Simulation prête':'Non demandé',Empreinte_doublon:ctx.fingerprint,Nonce_hash:ctx.nonceHash,Auteur_technique:ctx.author,Version_formulaire:EUC_PFMP_VERSION,Entreprise_complement_adresse_snapshot:EUC_PFMP_nettoyer_(d.entrepriseComplementAdresse,250),Entreprise_code_postal_snapshot:EUC_PFMP_nettoyer_(d.entrepriseCodePostal,30),Entreprise_pays_snapshot:EUC_PFMP_nettoyer_(d.entreprisePays,100)};
  var out={};EUC_PFMP_SUBMISSION_COLUMNS.forEach(function(k){out[k]=Object.prototype.hasOwnProperty.call(f,k)?f[k]:null;});return out;
}
function EUC_PFMP_echapperHtml_(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function EUC_PFMP_preparerCourriels_(fields,config) {
  var subject='[PFMP] '+fields.Classe_snapshot+' — '+fields.Jeune_nom+' '+fields.Jeune_prenom+' — '+fields.Entreprise_raison_sociale_snapshot+' — '+fields.Statut_jeune;
  var rows=[['Référence',fields.Reference],['Identité',fields.Jeune_nom+' '+fields.Jeune_prenom],['Naissance',fields.Jeune_date_naissance],['Téléphone jeune',fields.Jeune_telephone],['Courriel jeune',fields.Jeune_courriel],['Classe',fields.Classe_snapshot],['Période',fields.Periode_snapshot],['Dates officielles',(fields.Date_officielle_debut||'—')+' → '+(fields.Date_officielle_fin||'—')],['Dates déclarées',fields.Date_declaree_debut+' → '+fields.Date_declaree_fin],['Scénario',fields.Scenario_dates],['Entreprise',fields.Entreprise_raison_sociale_snapshot],['SIRET',fields.Entreprise_siret_snapshot],['Responsable',fields.Responsable_nom+' — '+fields.Responsable_telephone+' — '+fields.Responsable_courriel],['Tuteur',fields.Tuteur_nom+' — '+fields.Tuteur_telephone+' — '+fields.Tuteur_courriel],['Statut',fields.Statut_administratif]];
  var html='<h1>Demande PFMP</h1><table>'+rows.map(function(r){return '<tr><th>'+EUC_PFMP_echapperHtml_(r[0])+'</th><td>'+EUC_PFMP_echapperHtml_(r[1])+'</td></tr>';}).join('')+'</table>';
  var mails=[{to:config.EUC_PFMP_NOTIFICATION_EMAIL,subject:subject,htmlBody:html,simulation:true}];
  if(String(config.EUC_PFMP_SEND_STUDENT_CONFIRMATION).toLowerCase()==='true')mails.push({to:fields.Jeune_courriel,subject:'Confirmation '+fields.Reference,htmlBody:html,simulation:true});return mails;
}
function EUC_PFMP_executerPipelineSimule_(fields,mails,adapter) {
  adapter=adapter||{write:function(){return {id:'simulation'};},send:function(){return true;}};
  var written=adapter.write(fields), result={ecritureSimulee:true,id:written&&written.id||'simulation',courriel:'Simulation réussie',erreurCourriel:''};
  try{mails.forEach(function(mail){adapter.send(mail);});}
  catch(e){result.courriel='Erreur après écriture simulée';result.erreurCourriel=EUC_PFMP_nettoyer_(e&&e.message||String(e),500);}
  return result;
}
function EUC_PFMP_simulerSoumission(donnees) {
  EUC_ENT_controlerAccesUtilisateur_(); EUC_ENT_controlerCibleRecette_(); EUC_PFMP_validerDonnees_(donnees||{});
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Une autre soumission est en cours. Réessayez.');
  try{
    EUC_PFMP_validerReferentielSelection_(donnees); EUC_PFMP_validerDonnees_(donnees);
    var modes=EUC_PFMP_modesSecurite_(),captcha=EUC_PFMP_verifierTurnstileRecette_(donnees.turnstileToken,'pfmp_submit');
    var cache=CacheService.getScriptCache(),nonceHash=EUC_PFMP_hash_(donnees.nonce),nonceKey='pfmp-nonce-'+nonceHash;if(cache.get(nonceKey))throw new Error('Cette soumission a déjà été traitée.');
    var now=new Date(),fingerprint=EUC_PFMP_hash_([donnees.jeuneNom,donnees.jeunePrenom,donnees.jeuneDateNaissance,donnees.offreId,donnees.entrepriseSiret,donnees.dateDeclareeDebut,donnees.dateDeclareeFin].join('|'));
    var duplicateKey='pfmp-duplicate-'+fingerprint;if(cache.get(duplicateKey))throw new Error('Une soumission identique a déjà été préparée récemment.');
    var config=EUC_PFMP_lireConfiguration_(),ctx={now:now,reference:EUC_PFMP_reference_(donnees,now),fingerprint:fingerprint,nonceHash:nonceHash,author:String(Session.getActiveUser().getEmail()||''),studentConfirmation:String(config.EUC_PFMP_SEND_STUDENT_CONFIRMATION).toLowerCase()==='true'};
    var fields=EUC_PFMP_mapper61Colonnes_(donnees,ctx),mails=EUC_PFMP_preparerCourriels_(fields,config),pipeline=EUC_PFMP_executerPipelineSimule_(fields,mails);
    cache.put(nonceKey,'1',600);cache.put(duplicateKey,'1',300);
    return {simulation:true,modeSoumission:modes.submission,modeCourriel:modes.email,captcha:captcha,reference:fields.Reference,statut:fields.Statut_administratif,columns:Object.keys(fields).length,fields:fields,contacts:EUC_PFMP_preparerContactsSimules_(donnees),courriels:mails,pipeline:pipeline};
  }finally{lock.releaseLock();}
}
