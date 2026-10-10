/** PFMP — v1.0.0-dev.340 */
var EUC_DEV340_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';

function EUC_DEV340_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV340_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV340_year_(e){
  var y=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.annee);
  if(y)return y;
  var c=EUC_PFMP_contexteAnneeLectureV155_();
  return EUC_DEV340_txt_(c&&c.active);
}
function EUC_DEV340_accessKey_(annee,classe,periode){
  return 'EUC_DEV418_ACC_'+EUC_DEV340_txt_(annee)+'_'+Number(classe||0)+'_'+Number(periode||0);
}
function EUC_DEV519_flatRecord_(r){
  var f=r&&r.fields||r||{},x={id:Number(r&&r.id||f.id)||0};
  Object.keys(f).forEach(function(k){x[k]=f[k];});
  return x;
}
function EUC_DEV519_referenceRows_(table){
  var rows=[];
  try{
    if(typeof EUC_DEV190G_fastRecords_==='function')rows=EUC_DEV190G_fastRecords_(table,{})||[];
    else if(typeof EUC_IMPORT_lireRecords_==='function')rows=EUC_IMPORT_lireRecords_(table)||[];
  }catch(e){rows=[];}
  return rows.map(EUC_DEV519_flatRecord_);
}
function EUC_DEV520_firstText_(){
  for(var i=0;i<arguments.length;i++){
    var value=EUC_DEV340_txt_(arguments[i]);
    if(value)return value;
  }
  return '';
}
function EUC_DEV520_true_(value){
  if(value===true)return true;
  return ['1','TRUE','VRAI','OUI','YES'].indexOf(EUC_DEV340_txt_(value).toUpperCase())>=0;
}
/* DEV523 — plusieurs générations d'import ont utilisé des identifiants de
 * colonnes différents. La vue de suivi travaille sur une forme canonique afin
 * que les coordonnées déjà présentes dans Grist ne disparaissent pas selon
 * l'origine de la convention (QR, JotForm ou ancien snapshot). */
function EUC_DEV523_normalizeAccessCompany_(row){
  row=row||{};
  row.Entreprise_siret=EUC_DEV520_firstText_(row.Entreprise_siret,row.Entreprise_siret_snapshot,row.SIRET,row.Siret,row.SIRET_normalise,row.SIRET_brut);
  row.Entreprise_raison_sociale=EUC_DEV520_firstText_(row.Entreprise_raison_sociale,row.Entreprise_raison_sociale_snapshot,row.Raison_sociale,row.Entreprise_saisie,row.Nom_entreprise);
  row.Entreprise_enseigne=EUC_DEV520_firstText_(row.Entreprise_enseigne,row.Entreprise_enseigne_snapshot,row.Nom_commercial,row.Enseigne);
  row.Entreprise_adresse=EUC_DEV520_firstText_(row.Entreprise_adresse,row.Entreprise_adresse_snapshot,row.Adresse_entreprise,row.Adresse);
  row.Entreprise_complement=EUC_DEV520_firstText_(row.Entreprise_complement,row.Entreprise_complement_adresse_snapshot,row.Complement_adresse_entreprise,row.Complement_adresse);
  row.Entreprise_code_postal=EUC_DEV520_firstText_(row.Entreprise_code_postal,row.Entreprise_code_postal_snapshot,row.CP_entreprise,row.Code_postal,row.CodePostal,row.CP);
  row.Entreprise_commune=EUC_DEV520_firstText_(row.Entreprise_commune,row.Entreprise_commune_snapshot,row.Ville_entreprise,row.Ville,row.Commune);
  row.Entreprise_pays=EUC_DEV520_firstText_(row.Entreprise_pays,row.Entreprise_pays_snapshot,row.Pays_entreprise,row.Pays);
  row.Entreprise_telephone=EUC_DEV520_firstText_(row.Entreprise_telephone,row.Entreprise_telephone_snapshot,row.Telephone_entreprise,row.Telephone_societe,row.Telephone);
  row.Entreprise_courriel=EUC_DEV520_firstText_(row.Entreprise_courriel,row.Entreprise_courriel_snapshot,row.Courriel_entreprise,row.Email_entreprise,row.Email_societe,row.Courriel,row.Email);
  return row;
}
function EUC_DEV520_normalizeResponsible_(row){
  row=EUC_DEV523_normalizeAccessCompany_(row||{});
  row.Responsable_nom=EUC_DEV520_firstText_(row.Responsable_nom,row.Responsable,row.Nom_responsable_entreprise,row.Nom_responsable,row.Nom_representant,row.Representant_nom,row.Responsable_legal_nom);
  row.Responsable_prenom=EUC_DEV520_firstText_(row.Responsable_prenom,row.Prenom_responsable_entreprise,row.Prenom_responsable,row.Prenom_representant,row.Representant_prenom,row.Responsable_legal_prenom);
  row.Responsable_telephone=EUC_DEV520_firstText_(row.Responsable_telephone,row.Telephone_responsable,row.Responsable_tel,row.Telephone_responsable_entreprise,row.Telephone_representant,row.Representant_telephone);
  row.Responsable_courriel=EUC_DEV520_firstText_(row.Responsable_courriel,row.Courriel_responsable,row.Email_responsable,row.Responsable_email,row.Email_responsable_entreprise,row.Courriel_representant,row.Email_representant,row.Representant_courriel);
  if(EUC_DEV520_true_(row.Tuteur_est_responsable)){
    row.Responsable_nom=EUC_DEV520_firstText_(row.Responsable_nom,row.Tuteur_nom);
    row.Responsable_prenom=EUC_DEV520_firstText_(row.Responsable_prenom,row.Tuteur_prenom);
    row.Responsable_telephone=EUC_DEV520_firstText_(row.Responsable_telephone,row.Tuteur_telephone);
    row.Responsable_courriel=EUC_DEV520_firstText_(row.Responsable_courriel,row.Tuteur_courriel);
  }
  return row;
}
function EUC_DEV520_isResponsibleContact_(contact){
  var role=EUC_DEV340_txt_(contact&&(contact.Type_contact||contact.Type||contact.Fonction));
  try{role=role.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(e){}
  return /RESPONSABLE|REPRESENTANT|SIGNATAIRE|DIRIGEANT|DIRECTION|GERANT/i.test(role);
}
function EUC_DEV533_companySubmissionComplete_(row){
  row=EUC_DEV520_normalizeResponsible_(row||{});
  var hasCompanyId=EUC_DEV340_txt_(row.Entreprise_siret).replace(/\D/g,'').length===14||!!EUC_DEV340_txt_(row.Entreprise_nis);
  var required=[
    row.Entreprise_raison_sociale,row.Entreprise_adresse,row.Entreprise_code_postal,row.Entreprise_commune,
    row.Responsable_nom,row.Responsable_prenom,row.Responsable_fonction,row.Responsable_telephone,row.Responsable_courriel,
    row.Tuteur_nom,row.Tuteur_prenom,row.Tuteur_fonction,row.Tuteur_telephone,row.Tuteur_courriel
  ];
  return hasCompanyId&&required.every(function(value){return !!EUC_DEV340_txt_(value);});
}
/* DEV519 — les anciennes conventions peuvent ne conserver que les références
 * vers la fiche entreprise et son contact. L'enrichissement est groupé : au
 * plus une lecture des entreprises et une lecture des contacts pour toute la
 * famille, jamais une requête Grist par élève. Les instantanés portés par la
 * convention restent prioritaires afin de préserver l'historique signé. */
function EUC_DEV519_enrichAccessCompanyContacts_(rows){
  rows=(rows||[]).map(function(row){return EUC_DEV520_normalizeResponsible_(EUC_DEV519_flatRecord_(row));});
  var needsCompanies=false,needsContacts=false;
  rows.forEach(function(a){
    var companyId=EUC_DEV340_ref_(a.Entreprise),contactId=EUC_DEV340_ref_(a.Contact_entreprise);
    var siret=EUC_DEV340_txt_(a.Entreprise_siret||a.Entreprise_siret_snapshot).replace(/\D/g,'');
    if((companyId||siret)&&(
      !(EUC_DEV340_txt_(a.Entreprise_telephone)||EUC_DEV340_txt_(a.Entreprise_telephone_snapshot))||
      !(EUC_DEV340_txt_(a.Entreprise_courriel)||EUC_DEV340_txt_(a.Entreprise_courriel_snapshot))
    ))needsCompanies=true;
    if((contactId||companyId||siret)&&(
      !(EUC_DEV340_txt_(a.Responsable_nom)||EUC_DEV340_txt_(a.Responsable_prenom))||
      !EUC_DEV340_txt_(a.Responsable_telephone)||!EUC_DEV340_txt_(a.Responsable_courriel)
    ))needsContacts=true;
  });
  var companies={},companiesBySiret={},contacts={},contactsByCompany={};
  if(needsCompanies||needsContacts)EUC_DEV519_referenceRows_('EUC_ENTREPRISES').forEach(function(x){
    var id=Number(x.id)||0,siret=EUC_DEV340_txt_(x.SIRET).replace(/\D/g,'');
    if(id)companies[id]=x;if(siret)companiesBySiret[siret]=x;
  });
  if(needsContacts)EUC_DEV519_referenceRows_('EUC_CONTACTS_ENTREPRISES').forEach(function(x){
    var id=Number(x.id)||0,companyId=EUC_DEV340_ref_(x.Entreprise);
    if(id)contacts[id]=x;
    if(companyId&&x.Actif!==false)(contactsByCompany[companyId]=contactsByCompany[companyId]||[]).push(x);
  });
  rows.forEach(function(a){
    var siret=EUC_DEV340_txt_(a.Entreprise_siret||a.Entreprise_siret_snapshot).replace(/\D/g,'');
    var company=companies[EUC_DEV340_ref_(a.Entreprise)]||companiesBySiret[siret]||{};
    var contact=contacts[EUC_DEV340_ref_(a.Contact_entreprise)]||{};
    var companyContacts=contactsByCompany[Number(company.id)||0]||[];
    if(!Number(contact.id)){
      var responsibleContacts=companyContacts.filter(EUC_DEV520_isResponsibleContact_);
      if(responsibleContacts.length===1)contact=responsibleContacts[0];
      else if(!responsibleContacts.length&&companyContacts.length===1)contact=companyContacts[0];
    }
    a.Entreprise_telephone=EUC_DEV340_txt_(a.Entreprise_telephone)||EUC_DEV340_txt_(a.Entreprise_telephone_snapshot)||EUC_DEV340_txt_(company.Telephone)||EUC_DEV340_txt_(company.Telephone_2);
    a.Entreprise_courriel=EUC_DEV340_txt_(a.Entreprise_courriel)||EUC_DEV340_txt_(a.Entreprise_courriel_snapshot)||EUC_DEV340_txt_(company.Courriel);
    a.Responsable_nom=EUC_DEV520_firstText_(a.Responsable_nom,contact.Nom,company.Responsable_nom,company.Responsable,company.Nom_responsable_entreprise);
    a.Responsable_prenom=EUC_DEV520_firstText_(a.Responsable_prenom,contact.Prenom,company.Responsable_prenom,company.Prenom_responsable_entreprise);
    a.Responsable_telephone=EUC_DEV520_firstText_(a.Responsable_telephone,contact.Telephone_direct,contact.Telephone,company.Responsable_telephone,company.Telephone_responsable);
    a.Responsable_courriel=EUC_DEV520_firstText_(a.Responsable_courriel,contact.Courriel_direct,contact.Courriel,company.Responsable_courriel,company.Courriel_responsable);
    EUC_DEV520_normalizeResponsible_(a);
  });
  /* DEV528 : les imports JotForm historiques ont garde le responsable dans
   * Raw_JSON sans le recopier dans l'acces convention. Le repli est groupe,
   * strictement en lecture seule et ne s'applique qu'aux champs manquants. */
  if(typeof EUC_DEV528_enrichJotformContacts_==='function'){
    try{rows=EUC_DEV528_enrichJotformContacts_(rows)||rows;}catch(eJotform){}
  }
  return rows;
}
function EUC_DEV340_compactAccess_(a){
  a=EUC_DEV520_normalizeResponsible_(a||{});
  return {
    id:Number(a.id)||0,Eleve:a.Eleve,Annee_scolaire:EUC_DEV340_txt_(a.Annee_scolaire),
    Classe_convention:a.Classe_convention,Periode:a.Periode,
    Statut:a.Statut,Statut_administratif:a.Statut_administratif,
    Revoked:a.Revoked===true,Supprimee_admin:a.Supprimee_admin===true,
    Date_debut:EUC_IMPORT_dateExistanteISO_(a.Date_debut),Date_fin:EUC_IMPORT_dateExistanteISO_(a.Date_fin),Date_fin_reelle:EUC_IMPORT_dateExistanteISO_(a.Date_fin_reelle),
    Date_interruption:a.Date_interruption||'',Motif_interruption:EUC_DEV340_txt_(a.Motif_interruption),
    Type_sequence:EUC_DEV340_txt_(a.Type_sequence),Numero_sequence:Number(a.Numero_sequence)||1,
    Convention_origine:a.Convention_origine,Convention_remplacement:a.Convention_remplacement,
    Reference_convention:EUC_DEV340_txt_(a.Reference_convention),
    Numero_enregistrement:EUC_DEV340_txt_(a.Numero_enregistrement),
    Entreprise_raison_sociale:EUC_DEV340_txt_(a.Entreprise_raison_sociale),
    Entreprise_enseigne:EUC_DEV340_txt_(a.Entreprise_enseigne),
    Entreprise_adresse:EUC_DEV340_txt_(a.Entreprise_adresse),
    Entreprise_complement:EUC_DEV340_txt_(a.Entreprise_complement),
    Entreprise_code_postal:EUC_DEV340_txt_(a.Entreprise_code_postal),
    Entreprise_commune:EUC_DEV340_txt_(a.Entreprise_commune),
    Entreprise_pays:EUC_DEV340_txt_(a.Entreprise_pays),
    Entreprise:a.Entreprise,Contact_entreprise:a.Contact_entreprise,
    Entreprise_siret:EUC_DEV340_txt_(a.Entreprise_siret)||EUC_DEV340_txt_(a.Entreprise_siret_snapshot),
    Entreprise_telephone:EUC_DEV340_txt_(a.Entreprise_telephone)||EUC_DEV340_txt_(a.Entreprise_telephone_snapshot),
    Entreprise_courriel:EUC_DEV340_txt_(a.Entreprise_courriel)||EUC_DEV340_txt_(a.Entreprise_courriel_snapshot),
    Responsable_nom:EUC_DEV340_txt_(a.Responsable_nom),
    Responsable_prenom:EUC_DEV340_txt_(a.Responsable_prenom),
    Responsable_telephone:EUC_DEV340_txt_(a.Responsable_telephone),
    Responsable_courriel:EUC_DEV340_txt_(a.Responsable_courriel),
    Tuteur_est_responsable:EUC_DEV520_true_(a.Tuteur_est_responsable),
    Tuteur_nom:EUC_DEV340_txt_(a.Tuteur_nom),
    Tuteur_prenom:EUC_DEV340_txt_(a.Tuteur_prenom),
    Tuteur_telephone:EUC_DEV340_txt_(a.Tuteur_telephone),
    Tuteur_courriel:EUC_DEV340_txt_(a.Tuteur_courriel)
  };
}
function EUC_DEV394_BASE_EUC_DEV340_accessRows_(annee,classe,periode){
  var cache=CacheService.getScriptCache(),key=EUC_DEV340_accessKey_(annee,classe,periode),got=cache.get(key);
  if(got){try{return JSON.parse(got);}catch(e){}}
  var rows=EUC_DEV519_enrichAccessCompanyContacts_(EUC_CONVENTION_lireAccesFraisV108_()||[]).filter(function(a){
    if(EUC_DEV340_ref_(a.Classe_convention)!==Number(classe))return false;
    if(Number(periode)>0&&EUC_DEV340_ref_(a.Periode)!==Number(periode))return false;
    var y=EUC_DEV340_txt_(a.Annee_scolaire);
    return !annee||!y||y===annee;
  }).map(EUC_DEV340_compactAccess_);
  try{cache.put(key,JSON.stringify(rows),45);}catch(e){}
  return rows;
}
function EUC_DEV394_BASE_EUC_DEV340_primeAccessIndex_(annee,data){
  var classes=(data&&data.classes)||[],wanted={};
  classes.forEach(function(c){
    var cid=Number(c.classeId||c.id)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id)||0;
      if(cid>0&&pid>0)wanted[cid+'|'+pid]=[];
    });
  });
  if(!Object.keys(wanted).length)return {ok:true,keys:0};
  EUC_DEV519_enrichAccessCompanyContacts_(EUC_CONVENTION_lireAccesFraisV108_()||[]).forEach(function(a){
    var y=EUC_DEV340_txt_(a.Annee_scolaire);
    if(annee&&y&&y!==annee)return;
    var k=EUC_DEV340_ref_(a.Classe_convention)+'|'+EUC_DEV340_ref_(a.Periode);
    if(wanted[k])wanted[k].push(EUC_DEV340_compactAccess_(a));
  });
  var cache=CacheService.getScriptCache(),n=0;
  Object.keys(wanted).forEach(function(k){
    var p=k.split('|');
    try{
      cache.put(EUC_DEV340_accessKey_(annee,Number(p[0]),Number(p[1])),JSON.stringify(wanted[k]),45);
      n++;
    }catch(e){}
  });
  return {ok:true,keys:n};
}
function EUC_DEV340_status_(a){
  var early=EUC_DEV340_txt_(a&&(a.Statut_administratif||a.Statut)).toUpperCase();
  if(a&&early==='A_COMPLETER_ENTREPRISE'&&a.Revoked!==true&&a.Supprimee_admin!==true&&EUC_DEV533_companySubmissionComplete_(a)){
    return {code:'ENREGISTREE',libelle:'Convention enregistrée',active:true,covered:true,repairedStaleStatus:true};
  }
  if(typeof EUC_V50_statutDetail_==='function'){
    try{return EUC_V50_statutDetail_(a);}catch(e){}
  }
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false};
  if(a.Supprimee_admin===true)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false,covered:false};
  var s=early;
  if(s.indexOf('ANNULEE')>=0)return {code:'ANNULEE',libelle:'Annulée',active:false,covered:false};
  if(s.indexOf('INTERROMP')>=0)return {code:'INTERROMPUE',libelle:'Interrompue',active:false,covered:false};
  if(a.Revoked===true)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false,covered:false};
  if(s==='A_COMPLETER_ENTREPRISE')return {code:'A_COMPLETER_ENTREPRISE',libelle:'À compléter par l’entreprise',active:true,covered:false};
  return {code:'AVEC_CONVENTION',libelle:'Avec convention',active:true,covered:true};
}
function EUC_DEV340_address_(a){
  if(!a)return '';
  if(typeof EUC_V155_adresseEntreprise_==='function'){
    try{return EUC_V155_adresseEntreprise_(a)||'';}catch(e){}
  }
  return [
    EUC_DEV340_txt_(a.Entreprise_adresse),
    EUC_DEV340_txt_(a.Entreprise_complement),
    [EUC_DEV340_txt_(a.Entreprise_code_postal),EUC_DEV340_txt_(a.Entreprise_commune)].filter(Boolean).join(' '),
    EUC_DEV340_txt_(a.Entreprise_pays)
  ].filter(Boolean).join(' · ');
}
function EUC_DEV340_contact_(a){
  if(!a)return '';
  EUC_DEV520_normalizeResponsible_(a);
  var r=[EUC_DEV340_txt_(a.Responsable_prenom),EUC_DEV340_txt_(a.Responsable_nom)].filter(Boolean).join(' ').trim();
  return [
    r,
    EUC_DEV520_firstText_(a.Responsable_telephone,a.Entreprise_telephone),
    EUC_DEV520_firstText_(a.Responsable_courriel,a.Entreprise_courriel)
  ].filter(Boolean).join(' · ');
}
function EUC_DEV340_tuteur_(a){
  if(!a)return '';
  if(typeof EUC_V50_tuteur_==='function'){try{return EUC_V50_tuteur_(a)||'';}catch(e){}}
  var n=[EUC_DEV340_txt_(a.Tuteur_prenom),EUC_DEV340_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  return [n,EUC_DEV340_txt_(a.Tuteur_telephone),EUC_DEV340_txt_(a.Tuteur_courriel)].filter(Boolean).join(' · ');
}
function EUC_DEV394_BASE_EUC_DEV340_enrichConventions_(detail,annee,classe,periode){
  detail=detail||{};
  if(!Array.isArray(detail.lignes))return detail;
  var rows=EUC_DEV340_accessRows_(annee,classe,periode),by={};
  rows.forEach(function(a){var eid=EUC_DEV340_ref_(a.Eleve);if(eid)(by[eid]||(by[eid]=[])).push(a);});
  var avec=0,ann=0,intp=0;
  detail.lignes.forEach(function(x){
    var list=(by[Number(x.eleveId)]||[]).slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});
    var actif=null;
    for(var i=0;i<list.length;i++){if(EUC_DEV340_status_(list[i]).active){actif=list[i];break;}}
    var dernier=actif||list[0]||null,st=EUC_DEV340_status_(dernier);
    x.historiqueConventions=typeof EUC_DEV534_compactHistory_==='function'?EUC_DEV534_compactHistory_(list):list;
    var covered=!!(actif&&st.covered!==false);
    x.sequenceId=dernier?Number(dernier.id)||0:0;
    x.conventionId=covered?Number(actif.id)||0:0;
    x.convention=covered;
    x.numero=actif?(typeof EUC_ADMIN_WORKFLOW_numeroV144_==='function'?EUC_ADMIN_WORKFLOW_numeroV144_(actif):EUC_DEV340_txt_(actif.Numero_enregistrement||actif.Reference_convention)):'';
    x.statutCode=st.code;x.statut=st.libelle;
    if(dernier){
      x.entreprise=EUC_DEV340_txt_(dernier.Entreprise_raison_sociale)||EUC_DEV340_txt_(dernier.Entreprise_enseigne);
      x.adresseEntreprise=EUC_DEV340_address_(dernier);
      x.contactEntreprise=EUC_DEV340_contact_(dernier);
      x.tuteurEntreprise=EUC_DEV340_tuteur_(dernier);
      x.telephoneEntreprise=EUC_DEV340_txt_(dernier.Entreprise_telephone)||EUC_DEV340_txt_(dernier.Responsable_telephone)||EUC_DEV340_txt_(dernier.Tuteur_telephone);
      x.courrielEntreprise=EUC_DEV340_txt_(dernier.Entreprise_courriel)||EUC_DEV340_txt_(dernier.Responsable_courriel)||EUC_DEV340_txt_(dernier.Tuteur_courriel);
      x.telephoneTuteur=EUC_DEV340_txt_(dernier.Tuteur_telephone);
      x.courrielTuteur=EUC_DEV340_txt_(dernier.Tuteur_courriel);
    }else{
      x.entreprise='';x.adresseEntreprise='';x.contactEntreprise='';x.tuteurEntreprise='';
      x.telephoneEntreprise='';x.courrielEntreprise='';x.telephoneTuteur='';x.courrielTuteur='';
    }
    if(covered)avec++;
    if(st.code==='ANNULEE')ann++;
    if(st.code==='INTERROMPUE')intp++;
  });
  detail.stats=detail.stats||{};
  detail.stats.total=detail.lignes.length;
  detail.stats.avecConvention=avec;
  detail.stats.annulees=ann;
  detail.stats.interrompues=intp;
  detail.stats.sansConvention=Math.max(0,detail.lignes.length-avec-ann-intp);
  return detail;
}
function EUC_DEV340_appRows_(){
  var cache=CacheService.getScriptCache(),key='EUC_DEV418_APP_ROWS',got=cache.get(key);
  if(got){try{return JSON.parse(got);}catch(e){}}
  var rows=[];
  try{rows=EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];}catch(e){rows=[];}
  try{cache.put(key,JSON.stringify(rows),90);}catch(e){}
  return rows;
}
function EUC_DEV394_BASE_EUC_DEV340_enrichApprentis_(detail){
  detail=detail||{};
  var rows=EUC_DEV340_appRows_();
  var debut=detail.periode&&(detail.periode.debut||detail.periode.Date_debut);
  var fin=detail.periode&&(detail.periode.fin||detail.periode.Date_fin);
  var ap=0,mx=0,avec=0,sans=0,ann=0,intp=0;
  (detail.lignes||[]).forEach(function(x){
    var st={code:'SCOLAIRE'};
    try{st=EUC_APP172_eval(rows,x.eleveId,debut,fin)||st;}catch(e){}
    x.statutApprentissage=st.code;x.apprenti=st.code==='APPRENTI';x.statutMixte=st.code==='MIXTE';
    if(x.apprenti){
      ap++;x.statutCode='APPRENTI';x.statut='APPRENTI';x.convention=false;x.conventionId=0;
      if(st.record){
        x.dateContrat=EUC_DEV340_txt_(st.record.debut)||x.dateContrat||'';
        if(!EUC_DEV340_txt_(x.entreprise))x.entreprise=EUC_DEV340_txt_(st.record.entreprise);
        if(!EUC_DEV340_txt_(x.tuteurEntreprise))x.tuteurEntreprise=[st.record.tuteur,st.record.tel,st.record.mail].filter(Boolean).join(' · ');
      }
      return;
    }
    if(x.statutMixte)mx++;
    var c=EUC_DEV340_txt_(x.statutCode||x.statut).toUpperCase();
    if(c.indexOf('ANNULEE')>=0)ann++;
    else if(c.indexOf('INTERROMP')>=0)intp++;
    else if(Number(x.conventionId)>0)avec++;
    else sans++;
  });
  detail.stats=detail.stats||{};
  detail.stats.total=(detail.lignes||[]).length;detail.stats.apprentis=ap;detail.stats.mixtes=mx;
  detail.stats.avecConvention=avec;detail.stats.sansConvention=sans;
  detail.stats.annulees=ann;detail.stats.interrompues=intp;
  detail.stats.scolairesAttendus=Math.max(0,detail.stats.total-ap-mx);
  return detail;
}
function EUC_DEV340_isPdif_(detail){
  var p=detail&&detail.periode||{},s=EUC_DEV340_txt_(p.libelle||p.code).toUpperCase();
  return p.isPdif===true||p.pdif===true||s.indexOf('P.DIF')>=0||s.indexOf('PDIF')>=0||s.indexOf('DIFF')>=0;
}
function EUC_DEV394_BASE_EUC_DEV340_familyData_(annee,famille){
  var d=null;
  if(typeof EUC_DEV339_familyData_==='function'){
    try{d=EUC_DEV339_familyData_(annee,famille);if(d&&Array.isArray(d.classes)&&d.classes.length){d.ready=true;return d;}}catch(e){}
  }
  if(typeof EUC_APP172_chargerFamille==='function'){
    try{d=EUC_APP172_chargerFamille({annee:annee,famille:famille});if(d&&Array.isArray(d.classes)&&d.classes.length){d.ready=true;d.source='APP172';return d;}}catch(e2){}
  }
  if(typeof EUC_DEV190G1_fastFamilyIndex==='function'){
    try{var f=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});if(f&&f.ready&&f.payload){d=f.payload;d.ready=true;d.source='FAST_INDEX';return d;}}catch(e3){}
  }
  return {ok:true,ready:false,annee:annee,famille:famille,classes:[],source:'NONE'};
}
function EUC_DEV394_BASE_EUC_DEV340_afficherFamille(e){
  /* DEV506 : ce routeur est prioritaire dans EDT. Il doit donc déléguer à la
   * coque asynchrone DEV504 avant toute lecture du snapshot Grist. Sans cette
   * délégation, une recette neuve qui ne possède pas encore
   * EUC_SUIVI_PFMP_INDEX renvoie une page d'erreur Apps Script dès le clic sur
   * « Voir les classes », alors que le chargeur client sait présenter un état
   * vide ou une erreur récupérable. */
  if(typeof EUC_DEV339_afficherFamille==='function'){
    return EUC_DEV339_afficherFamille(e);
  }
  var annee=EUC_DEV340_year_(e),famille=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var data=EUC_DEV340_familyData_(annee,famille);
  /* La page famille doit être rendue dès que son snapshot est prêt.
   * Le préchauffage global relisait tous les accès avant le premier octet et
   * ajoutait plusieurs secondes. Le contrôle rapide charge désormais une
   * seule classe à la demande et réutilise le cache final. */
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});t.dataJson=JSON.stringify(data||{});t.baseUrl=EUC_DEV340_ADMIN_URL_;
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV340_afficherAdminClasse(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var annee=EUC_DEV340_year_(e),famille=EUC_DEV340_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
  var classe=Number(e&&e.parameter&&e.parameter.classe)||0,periode=Number(e&&e.parameter&&e.parameter.periode)||0;
  if(!classe||!periode)throw new Error('Classe ou période manquante.');
  var r=EUC_DEV190I_readOne({annee:annee,famille:famille,classe:classe,periode:periode});
  var detail=(r&&r.ready&&r.detail)?r.detail:EUC_SUIVI_CLASSE_detailF18_(annee,classe,periode);
  detail=EUC_DEV340_enrichConventions_(detail,annee,classe,periode);
  detail=EUC_DEV340_enrichApprentis_(detail);
  if(EUC_DEV340_isPdif_(detail)&&typeof EUC_DEV291_enrichDetail_==='function'){
    try{detail=EUC_DEV291_enrichDetail_(detail,annee,famille,classe)||detail;}catch(e){}
  }
  if(typeof EUC_V51_numeroPeriodes_==='function'){try{detail=EUC_V51_numeroPeriodes_(detail)||detail;}catch(e2){}}
  var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  t.config=JSON.stringify({baseUrl:EUC_DEV340_ADMIN_URL_});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(detail);
  if(typeof EUC_DEV186_breadcrumbHtml_==='function'){try{t.dev186BreadcrumbHtml=EUC_DEV186_breadcrumbHtml_(detail,annee);}catch(e3){t.dev186BreadcrumbHtml='';}}else t.dev186BreadcrumbHtml='';
  return t.evaluate().setTitle('Suivi PFMP — '+((detail.classe&&detail.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_DEV340_familyData_(){
  var __t=Date.now();
  try{
    var d=EUC_DEV394_BASE_EUC_DEV340_familyData_.apply(this,arguments);
    /* DEV445 : le snapshot planifié DEV424 contient déjà les situations
     * administratives et les compteurs rapides. Les rejouer sur le chemin de
     * consultation provoquait deux lectures Grist supplémentaires à froid. */
    if(d&&d.__dev424Enriched===true)return d;
    return typeof EUC_DEV420_enrichFamily_==='function'
      ?EUC_DEV420_enrichFamily_(d,arguments[0],arguments[1])
      :d;
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_familyData_',Date.now()-__t);
  }
}


function EUC_DEV340_primeAccessIndex_(){
  // EUC_DEV395_CACHE_AWARE_ACCESS_BEGIN
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_primeAccessIndex_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_(
      'EUC_DEV340_primeAccessIndex_',
      Date.now()-__t
    );
  }
  // EUC_DEV395_CACHE_AWARE_ACCESS_END
}


function EUC_DEV398_BASE_EUC_DEV340_accessRows_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_accessRows_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_accessRows_',Date.now()-__t);
  }
}


function EUC_DEV340_enrichConventions_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_enrichConventions_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_enrichConventions_',Date.now()-__t);
  }
}


function EUC_DEV340_enrichApprentis_(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_enrichApprentis_.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_enrichApprentis_',Date.now()-__t);
  }
}


function EUC_DEV340_afficherFamille(){
  EUC_DEV394_begin_('suivi-conventions-famille');
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_DEV340_afficherFamille.apply(this,arguments);
  } finally {
    EUC_DEV394_finish_('EUC_DEV340_afficherFamille',Date.now()-__t);
  }
}

function EUC_DEV340_accessRows_(annee,classe,periode){
  var __t=Date.now();
  try{
    var y=String(annee||'').trim();
    if(y){
      var persisted=EUC_DEV398_getPersistentAccess_(y,classe,periode);
      if(persisted)return persisted;
    }
    var rows=EUC_DEV398_BASE_EUC_DEV340_accessRows_.apply(this,arguments);
    if(y&&Array.isArray(rows))EUC_DEV398_putPersistentAccess_(y,classe,periode,rows);
    return rows;
  } finally {
    EUC_DEV394_mark_('EUC_DEV340_accessRows_',Date.now()-__t);
  }
}
