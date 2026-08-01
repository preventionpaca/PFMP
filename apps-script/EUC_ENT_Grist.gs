/** Eucalyptus Entreprises SIRET — v1.0.0-dev.8 */
function EUC_ENT_grist(methode,chemin,corps) {
  EUC_ENT_controlerCibleRecette_();
  var c=EUC_ENT_lireConfiguration(); if(!c.EUC_ENT_GRIST_API_URL||!c.EUC_ENT_GRIST_DOC_ID||!c.EUC_ENT_GRIST_API_KEY) throw new Error('Configuration Grist incomplète.');
  var url=c.EUC_ENT_GRIST_API_URL.replace(/\/$/,'')+'/api/docs/'+encodeURIComponent(c.EUC_ENT_GRIST_DOC_ID)+chemin;
  var o={method:methode,muteHttpExceptions:true,headers:{Authorization:'Bearer '+c.EUC_ENT_GRIST_API_KEY,Accept:'application/json'}};
  if(corps){o.contentType='application/json';o.payload=JSON.stringify(corps);} var r=UrlFetchApp.fetch(url,o), code=r.getResponseCode();
  if(code<200||code>=300) throw new Error('Grist indisponible ou requête refusée ('+code+').'); return JSON.parse(r.getContentText()||'{}');
}
function EUC_ENT_verifierDoublonGrist(siret) {
  var c=EUC_ENT_lireConfiguration(); if(!c.EUC_ENT_GRIST_API_KEY) return null;
  var t=c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES'; var q='/tables/'+encodeURIComponent(t)+'/records?filter='+encodeURIComponent(JSON.stringify({SIRET:[siret]}));
  var d=EUC_ENT_grist('get',q); return d.records&&d.records.length?Object.assign({id:d.records[0].id},d.records[0].fields):null;
}
function EUC_ENT_enregistrerEntreprise(donnees) {
  EUC_ENT_controlerAccesUtilisateur_();
  var v=EUC_ENT_validerSiret(donnees&&donnees.siret); if(!v.valide) throw new Error(v.message);
  var verrou=LockService.getScriptLock();
  if(!verrou.tryLock(10000)) throw new Error('Un autre enregistrement est en cours. Réessayez.');
  try {
    if(EUC_ENT_verifierDoublonGrist(v.siret)) throw new Error('Ce SIRET existe déjà dans Grist.');
    var c=EUC_ENT_lireConfiguration(), t=c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES';
    var champs=EUC_ENT_preparerChampsEntreprise(donnees,v.siret);
    return EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/records',{records:[{fields:champs}]});
  } finally { verrou.releaseLock(); }
}
function EUC_ENT_preparerChampsEntreprise(d,s){return {SIRET:s,SIREN:s.slice(0,9),Raison_sociale:EUC_ENT_nettoyerTexte(d.raisonSociale,250),Enseigne:EUC_ENT_nettoyerTexte(d.enseigne,250),Etat:EUC_ENT_nettoyerTexte(d.etat,20),Adresse_complete:EUC_ENT_nettoyerTexte(d.adresseComplete,500),Code_postal:EUC_ENT_nettoyerTexte(d.codePostal,10),Commune:EUC_ENT_nettoyerTexte(d.commune,150),Telephone:EUC_ENT_nettoyerTexte(d.telephone,30),Courriel:EUC_ENT_nettoyerTexte(d.courriel,250),Site_web:EUC_ENT_nettoyerTexte(d.siteWeb,500),Accueil_eleves:!!d.accueilEleves,Statut_relation:EUC_ENT_nettoyerTexte(d.statutRelation,100),Commentaire_interne:EUC_ENT_nettoyerTexte(d.commentaireInterne,5000),Origine_creation:'Formulaire Web App'};}

function EUC_ENT_enregistrerOuModifierEntreprise(donnees) {
  var id=Number(donnees&&donnees.gristId||0);
  if(id) return EUC_ENT_modifierEntreprise(id,donnees);
  var creation=EUC_ENT_enregistrerEntreprise(donnees);
  var entrepriseId=creation&&creation.records&&creation.records[0]&&creation.records[0].id;
  if(entrepriseId&&donnees&&EUC_ENT_nettoyerTexte(donnees.contactNom,150)) EUC_ENT_enregistrerContact(entrepriseId,donnees);
  return {operation:'creation',entrepriseId:entrepriseId||null};
}

function EUC_ENT_modifierEntreprise(id,donnees) {
  EUC_ENT_controlerAccesUtilisateur_();
  if(!Number.isInteger(id)||id<=0) throw new Error('Identifiant Grist invalide.');
  var v=EUC_ENT_validerSiret(donnees&&donnees.siret); if(!v.valide) throw new Error(v.message);
  var c=EUC_ENT_lireConfiguration(), t=c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES';
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(t)+'/records',{records:[{id:id,fields:EUC_ENT_preparerChampsEntreprise(donnees,v.siret)}]});
  return {operation:'modification',entrepriseId:id};
}

function EUC_ENT_enregistrerContact(entrepriseId,donnees) {
  EUC_ENT_controlerAccesUtilisateur_();
  entrepriseId=Number(entrepriseId); if(!Number.isInteger(entrepriseId)||entrepriseId<=0) throw new Error('Référence entreprise invalide.');
  var c=EUC_ENT_lireConfiguration(), t=c.EUC_ENT_TABLE_CONTACTS||'EUC_CONTACTS_ENTREPRISES';
  var champs={Entreprise:entrepriseId,Civilite:EUC_ENT_nettoyerTexte(donnees.contactCivilite,30),Prenom:EUC_ENT_nettoyerTexte(donnees.contactPrenom,150),Nom:EUC_ENT_nettoyerTexte(donnees.contactNom,150),Fonction:EUC_ENT_nettoyerTexte(donnees.contactFonction,250),Telephone_direct:EUC_ENT_nettoyerTexte(donnees.contactTelephone,30),Courriel_direct:EUC_ENT_nettoyerTexte(donnees.contactCourriel,250),Type_contact:EUC_ENT_nettoyerTexte(donnees.contactType,100),Origine_donnee:'Formulaire Web App',Actif:true,Commentaire:EUC_ENT_nettoyerTexte(donnees.contactCommentaire,1000)};
  return EUC_ENT_grist('post','/tables/'+encodeURIComponent(t)+'/records',{records:[{fields:champs}]});
}
