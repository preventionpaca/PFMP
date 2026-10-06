/** PFMP DEV464 — dossier de demande d'apprentissage prérempli. */
var EUC_DEV464_VERSION_='1.0.0-dev.465';
var EUC_DEV464_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';

function EUC_DEV464_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV464_fields_(r){var f=r&&r.fields||r||{};if(r&&r.id!=null&&f.id==null)f.id=r.id;return f;}
function EUC_DEV464_pick_(f,names){for(var i=0;i<names.length;i++){var v=f&&f[names[i]];if(v!==null&&v!==undefined&&EUC_DEV464_t_(v)!=='')return v;}return'';}
function EUC_DEV464_date_(v){
  if(v===null||v===undefined||v==='')return'';
  var d;
  if(v instanceof Date)d=v;
  else if(typeof v==='number')d=new Date(Math.abs(v)<100000000000?v*1000:v);
  else if(/^\d+(?:\.\d+)?$/.test(EUC_DEV464_t_(v))){var n=Number(v);d=new Date(Math.abs(n)<100000000000?n*1000:n);}
  else d=new Date(v);
  if(!d||isNaN(d.getTime()))return EUC_DEV464_t_(v);
  function z(n){return String(n).padStart(2,'0');}
  return z(d.getDate())+'/'+z(d.getMonth()+1)+'/'+d.getFullYear();
}
function EUC_DEV464_admin_(){
  var ctx=typeof EUC_PFMP_contexteAdmin_==='function'?EUC_PFMP_contexteAdmin_():null;
  if(!ctx||!ctx.autorise)throw new Error('Accès administrateur requis.');
  return ctx;
}
function EUC_DEV464_records_(table,filter){
  if(typeof EUC_DEV190G_fastRecords_==='function')return EUC_DEV190G_fastRecords_(table,filter||{})||[];
  return EUC_IMPORT_lireRecordsBruts_(table)||[];
}
function EUC_DEV464_studentIndex(){
  EUC_DEV464_admin_();
  return EUC_DEV464_records_('EUC_ELEVES_PFMP',{}).map(function(r){
    var f=EUC_DEV464_fields_(r),id=Number(r.id||f.id)||0;
    return{id:id,nom:EUC_DEV464_t_(f.Nom),prenom:EUC_DEV464_t_(f.Prenom_usage||f.Prenom),classe:EUC_DEV464_t_(f.Code_classe_importe||f.Classe_nom||f.Classe_snapshot),actif:f.Actif!==false&&f.Present_dernier_import!==false};
  }).filter(function(x){return x.id&&x.actif&&x.nom;}).sort(function(a,b){return(a.nom+' '+a.prenom).localeCompare(b.nom+' '+b.prenom,'fr');});
}
function EUC_DEV464_latest_(rows){
  rows=(rows||[]).slice();
  rows.sort(function(a,b){var af=EUC_DEV464_fields_(a),bf=EUC_DEV464_fields_(b),aa=af.Actif===false?0:1,ba=bf.Actif===false?0:1;return ba-aa+(Number(b.id||bf.id)||0)-(Number(a.id||af.id)||0);});
  return rows[0]||null;
}
function EUC_DEV464_address_(f){
  var lignes=['Adresse_1','Adresse_2','Adresse_3','Adresse_4'].map(function(k){return EUC_DEV464_t_(f&&f[k]);}).filter(Boolean).join(', ');
  return lignes||EUC_DEV464_t_(EUC_DEV464_pick_(f,['Adresse_complete','Adresse']));
}
function EUC_DEV464_currentSchoolYear_(date){
  var d=date instanceof Date?date:new Date(),year=d.getFullYear();
  return d.getMonth()>=6?year+'-'+(year+1):(year-1)+'-'+year;
}
function EUC_DEV464_responsable_(r){var f=EUC_DEV464_fields_(r);return{civilite:EUC_DEV464_t_(f.Civilite),nom:EUC_DEV464_t_(f.Nom),prenom:EUC_DEV464_t_(f.Prenom),lien:EUC_DEV464_t_(f.Lien_avec_eleve),adresse:EUC_DEV464_address_(f),codePostal:EUC_DEV464_t_(EUC_DEV464_pick_(f,['Code_postal','CodePostal','CP'])),ville:EUC_DEV464_t_(f.Ville),pays:EUC_DEV464_t_(f.Pays),telephone:EUC_DEV464_t_(f.Telephone_portable||f.Telephone_fixe||f.Telephone_professionnel),courriel:EUC_DEV464_t_(f.Email||f.Courriel),profession:EUC_DEV464_t_(f.Profession),legal:f.Responsable_legal===true,enCharge:f.Responsable_en_charge===true};}
function EUC_DEV464_studentDossier(studentId){
  EUC_DEV464_admin_();studentId=Number(studentId)||0;if(!studentId)throw new Error('Élève obligatoire.');
  /* La page vient de charger ce même index. La lecture identique est donc
   * servie par le mémo DEV457 et le filtrage de l'identifiant se fait en
   * mémoire, sans dépendre d'un pseudo-filtre Grist sur RowId. */
  var students=EUC_DEV464_records_('EUC_ELEVES_PFMP',{}),record=null;
  students.some(function(r){var f0=EUC_DEV464_fields_(r);if(Number(r.id||f0.id)===studentId){record=r;return true;}return false;});
  if(!record)throw new Error('Élève introuvable.');
  var f=EUC_DEV464_fields_(record);
  var resp=EUC_DEV464_records_('EUC_RESPONSABLES_ELEVES_PFMP',{Eleve:[studentId]}).map(EUC_DEV464_responsable_).sort(function(a,b){return Number(b.legal)-Number(a.legal)||Number(b.enCharge)-Number(a.enCharge);}).slice(0,2);
  var adresseEleve=EUC_DEV464_address_(f),codePostalEleve=EUC_DEV464_t_(EUC_DEV464_pick_(f,['Code_postal','CodePostal','CP'])),villeEleve=EUC_DEV464_t_(f.Ville),paysEleve=EUC_DEV464_t_(f.Pays);
  var adresseResponsable=resp.filter(function(x){return x.legal&&(x.adresse||x.codePostal||x.ville);})[0]||resp.filter(function(x){return x.enCharge&&(x.adresse||x.codePostal||x.ville);})[0]||resp.filter(function(x){return x.adresse||x.codePostal||x.ville;})[0]||{};
  adresseEleve=adresseEleve||adresseResponsable.adresse||'';
  codePostalEleve=codePostalEleve||adresseResponsable.codePostal||'';
  villeEleve=villeEleve||adresseResponsable.ville||'';
  paysEleve=paysEleve||adresseResponsable.pays||'';
  var app=EUC_DEV464_latest_(EUC_DEV464_records_('EUC_APPRENTISSAGE_PFMP',{Eleve:[studentId]})),a=EUC_DEV464_fields_(app);
  var dossier={ok:true,version:EUC_DEV464_VERSION_,eleve:{
    id:studentId,nom:EUC_DEV464_t_(f.Nom),prenom:EUC_DEV464_t_(f.Prenom_usage||f.Prenom),dateNaissance:EUC_DEV464_date_(EUC_DEV464_pick_(f,['Date_naissance','Date_de_naissance'])),lieuNaissance:EUC_DEV464_t_(EUC_DEV464_pick_(f,['Lieu_naissance','Commune_naissance','Ville_naissance'])),nationalite:EUC_DEV464_t_(EUC_DEV464_pick_(f,['Nationalite','Nationalité','Pays_nationalite'])),adresse:adresseEleve,codePostal:codePostalEleve,ville:villeEleve,pays:paysEleve,telephone:EUC_DEV464_t_(f.Telephone_eleve||f.Telephone),courriel:EUC_DEV464_t_(f.Email_eleve||f.Courriel_eleve||f.Courriel||f.Email),ine:EUC_DEV464_t_(EUC_DEV464_pick_(f,['INE','Numero_INE','Numero_national'])),nir:EUC_DEV464_t_(EUC_DEV464_pick_(f,['NIR','Numero_securite_sociale','Numero_securite_sociale_eleve','Numero_securite','SSN'])),classe:EUC_DEV464_t_(f.Code_classe_importe||f.Classe_nom||f.Classe_snapshot),formation:EUC_DEV464_t_(f.Formation_Pronote||f.Diplome_snapshot),annee:EUC_DEV464_t_(EUC_DEV464_pick_(f,['Annee_scolaire_code','Annee_code','Annee_scolaire_libelle']))||EUC_DEV464_currentSchoolYear_(),etablissement:'Lycée Les Eucalyptus'
  },responsables:resp,apprentissage:{
    dateDebut:EUC_DEV464_date_(EUC_DEV464_pick_(a,['Date_debut','Date_contrat_officielle'])),dateFin:EUC_DEV464_date_(a.Date_fin),entreprise:EUC_DEV464_t_(a.Nom_entreprise||a.Entreprise),enseigne:EUC_DEV464_t_(a.Nom_commercial),siret:EUC_DEV464_t_(a.SIRET),adresse:EUC_DEV464_t_(a.Adresse_entreprise||a.Adresse),codePostal:EUC_DEV464_t_(a.Code_postal||a.CodePostal||a.CP),ville:EUC_DEV464_t_(a.Ville),telephone:EUC_DEV464_t_(a.Entreprise_telephone||a.Telephone_entreprise),courriel:EUC_DEV464_t_(a.Entreprise_courriel||a.Courriel_entreprise),responsable:EUC_DEV464_t_(a.Responsable_nom||a.Responsable||a.Nom_responsable_entreprise),tuteur:EUC_DEV464_t_(a.Tuteur_nom||a.Tuteur),telephoneTuteur:EUC_DEV464_t_(a.Tuteur_telephone||a.Telephone_tuteur),courrielTuteur:EUC_DEV464_t_(a.Tuteur_courriel||a.Courriel_tuteur)
  }};
  while(dossier.responsables.length<2)dossier.responsables.push({civilite:'',nom:'',prenom:'',lien:'',adresse:'',codePostal:'',ville:'',pays:'',telephone:'',courriel:'',profession:'',legal:false,enCharge:false});
  return dossier;
}
function EUC_DEV464_afficherDossierApprentissage(e){
  EUC_DEV464_admin_();var t=HtmlService.createTemplateFromFile('Dossier_Apprentissage_DEV464');
  t.config=JSON.stringify({baseUrl:EUC_DEV464_ADMIN_URL_,version:EUC_DEV464_VERSION_});
  return t.evaluate().setTitle('Dossier de demande d’apprentissage').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
