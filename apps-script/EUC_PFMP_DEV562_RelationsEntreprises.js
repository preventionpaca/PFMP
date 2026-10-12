/**
 * DEV562 — référentiel léger de la relation lycée–entreprise.
 *
 * Les conventions restent les sources historiques. Cette couche ne les
 * réécrit jamais : elle ajoute les corrections validées par un administrateur,
 * le profil éditorial de l'entreprise et un journal d'actions. Les fichiers
 * restent dans Drive ; Grist ne conserve que leurs identifiants et métadonnées.
 */
var EUC_DEV562_PROFILE_TABLE_='EUC_ENTREPRISES_PROFILS';
var EUC_DEV562_CONTACT_TABLE_='EUC_ENTREPRISES_CONTACTS_CORRECTIONS';
var EUC_DEV562_RELATION_TABLE_='EUC_RELATIONS_ENTREPRISES';
var EUC_DEV563_CATEGORY_TABLE_='EUC_RELATIONS_ENTREPRISES_CATEGORIES';
var EUC_DEV562_MEDIA_FOLDER_PROP_='EUC_DEV562_MEDIA_FOLDER_ID';
var EUC_DEV562_RELATION_FOLDER_PROP_='EUC_DEV562_RELATION_FOLDER_ID';
var EUC_DEV562_CONTACT_ROWS_MEMO_={revision:'',rows:null};
var EUC_DEV563_CATEGORY_ROWS_MEMO_=null;

function EUC_DEV562_col_(id,label,type){return{id:id,fields:{label:label,type:type||'Text'}};}
function EUC_DEV562_ensureTable_(table,defs){
  var tables=EUC_ENT_grist('get','/tables').tables||[],exists=tables.some(function(x){return x.id===table;}),columns=defs.map(function(d){return EUC_DEV562_col_(d[0],d[1],d[2]);});
  if(!exists){EUC_ENT_grist('post','/tables',{tables:[{id:table,columns:columns}]});return;}
  var current=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[],have={};current.forEach(function(x){have[x.id]=true;});var missing=columns.filter(function(x){return!have[x.id];});if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
}
function EUC_DEV562_ensureProfileTable_(){EUC_DEV562_ensureTable_(EUC_DEV562_PROFILE_TABLE_,[
  ['Cle_entreprise','Clé entreprise'],['SIRET','SIRET'],['Entreprise','Entreprise'],['Adresse','Adresse'],['Site_internet','Site internet'],['Logo_drive_file_id','Logo Drive'],['Logo_mime_type','Type MIME du logo'],['Logo_nom_fichier','Nom du logo'],['Logo_droit_diffusion','Droit de diffusion du logo','Bool'],['Actif','Actif','Bool'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par']
]);}
function EUC_DEV562_ensureContactTable_(){EUC_DEV562_ensureTable_(EUC_DEV562_CONTACT_TABLE_,[
  ['Cle_entreprise','Clé entreprise'],['SIRET','SIRET'],['Entreprise','Entreprise'],['Adresse','Adresse'],['Role_contact','Rôle du contact'],['Cle_contact_source','Clé du contact source'],['Nom_source','Nom saisi à l’origine'],['Nom_corrige','Nom corrigé'],['Actif','Actif','Bool'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par']
]);}
function EUC_DEV562_ensureRelationTable_(){EUC_DEV562_ensureTable_(EUC_DEV562_RELATION_TABLE_,[
  ['Action_uid','Identifiant de l’action'],['Cle_entreprise','Clé entreprise'],['SIRET','SIRET'],['Entreprise','Entreprise'],['Adresse','Adresse'],['Date_action','Date de l’action','Date'],['Categorie','Catégorie'],['Titre','Titre'],['Description','Description'],['Lieu','Lieu'],['Classes_diplomes','Classes ou diplômes'],['Lien_linkedin','Lien LinkedIn'],['Lien_instagram','Lien Instagram'],['Lien_site_lycee','Lien site du lycée'],['Lien_autre','Autre lien'],['Drive_folder_id','Dossier Drive'],['Visibilite','Visibilité'],['Statut','Statut'],['Actif','Actif','Bool'],['Created_at','Date de création','DateTime'],['Created_by','Créé par'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par']
]);}
function EUC_DEV563_ensureCategoryTable_(){EUC_DEV562_ensureTable_(EUC_DEV563_CATEGORY_TABLE_,[
  ['Code_categorie','Code de la catégorie'],['Libelle','Libellé'],['Visible_administration','Visible par l’administration','Bool'],['Visible_professeurs','Visible par les professeurs','Bool'],['Visible_familles','Visible par les élèves et familles','Bool'],['Actif','Actif','Bool'],['Ordre','Ordre','Int'],['Updated_at','Date de modification','DateTime'],['Updated_by','Modifié par']
]);}
function EUC_DEV562_companyKey_(q){q=q||{};return EUC_DEV538_t_(q.identity)||EUC_DEV538_companyIdentity_(q.entreprise,q.adresse,q.siret);}
function EUC_DEV562_matchCompany_(row,q){var f=EUC_DEV538_fields_(row),key=EUC_DEV562_companyKey_(q),sir=EUC_DEV538_t_(q&&q.siret).replace(/\D/g,''),rowSir=EUC_DEV538_t_(f.SIRET).replace(/\D/g,'');return f.Actif!==false&&((key&&EUC_DEV538_t_(f.Cle_entreprise)===key)||(sir&&sir===rowSir));}
function EUC_DEV562_url_(value,optional){var s=EUC_DEV538_t_(value);if(!s&&optional)return'';if(!/^https:\/\//i.test(s)&&!/^http:\/\//i.test(s))throw new Error('Le lien doit commencer par https:// ou http://.');return s.slice(0,1000);}
function EUC_DEV562_trim_(value,max){return EUC_DEV538_t_(value).slice(0,max||500);}
function EUC_DEV562_prettyName_(value){
  var small={de:1,du:1,des:1,la:1,le:1,van:1,von:1};
  function part(x,index){if(!x)return'';if(/^[A-Za-zÀ-ÖØ-öø-ÿ]\.?$/.test(x))return x.toUpperCase();var low=x.toLocaleLowerCase('fr-FR');if(index&&small[low])return low;return low.charAt(0).toLocaleUpperCase('fr-FR')+low.slice(1);}
  return EUC_DEV538_t_(value).replace(/^([A-Za-zÀ-ÖØ-öø-ÿ])\.([A-Za-zÀ-ÖØ-öø-ÿ])/,'$1. $2').replace(/\s+/g,' ').split(' ').map(function(word,i){var chunks=word.split(/([-'])/);return chunks.map(function(x,j){return x==='-'||x==="'"?x:part(x,i+j);}).join('');}).join(' ');
}
/* Normalisation typographique uniquement : elle ne tente jamais de deviner
 * qu'une graphie voisine désigne la même personne. Les corrections métier
 * restent des surcharges explicites et réversibles dans la table dédiée. */
function EUC_DEV563_personName_(value){return EUC_DEV562_prettyName_(value);}
function EUC_DEV562_hash_(value){var raw=EUC_DEV538_t_(value),h=2166136261;for(var i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function EUC_DEV562_contactKey_(contact){contact=contact||{};return EUC_DEV562_hash_([EUC_DEV538_norm_(contact.nom),(contact.telephones||[]).map(EUC_DEV547_phoneKey_).sort().join(','),(contact.courriels||[]).map(EUC_DEV547_emailKey_).sort().join(',')].join('|'));}
function EUC_DEV562_contactRows_(){
  /* Les globales Apps Script sont recréées pour chaque exécution. Il ne faut
   * donc surtout pas relire la révision dans la boucle des entreprises : avec
   * deux rôles et plus de cent sociétés, cela provoquait plusieurs centaines
   * d'accès PropertiesService et faisait dépasser le délai du book à froid. */
  if(EUC_DEV562_CONTACT_ROWS_MEMO_.rows!==null)return EUC_DEV562_CONTACT_ROWS_MEMO_.rows;
  var revision=typeof EUC_DEV457_revision_==='function'?EUC_DEV457_revision_(EUC_DEV562_CONTACT_TABLE_):'LOCAL',rows=EUC_DEV538_optionalRecords_(EUC_DEV562_CONTACT_TABLE_,{});
  EUC_DEV562_CONTACT_ROWS_MEMO_={revision:revision,rows:rows};return rows;
}
function EUC_DEV562_applyContactCorrections_(company,contacts,role){
  var rows=EUC_DEV562_contactRows_().filter(function(r){var f=EUC_DEV538_fields_(r);return EUC_DEV562_matchCompany_(r,company)&&EUC_DEV538_t_(f.Role_contact).toUpperCase()===role;});
  var displayed=(contacts||[]).map(function(c){var key=EUC_DEV562_contactKey_(c),match=rows.filter(function(r){return EUC_DEV538_t_(EUC_DEV538_fields_(r).Cle_contact_source)===key;}).sort(function(a,b){return EUC_DEV538_n_(b.id)-EUC_DEV538_n_(a.id);})[0],source=EUC_DEV538_t_(c.nom),corrected=match?EUC_DEV538_t_(EUC_DEV538_fields_(match).Nom_corrige):'';c.sourceNom=source;c.contactKey=key;c.nom=EUC_DEV562_prettyName_(corrected||source);c.nomCorrige=!!corrected;return c;}),merged=[];
  displayed.forEach(function(c){var same=merged.filter(function(x){return EUC_DEV538_norm_(x.nom)===EUC_DEV538_norm_(c.nom)&&(x.nomCorrige||c.nomCorrige);})[0];if(!same){merged.push(c);return;}same.telephones=Array.from(new Set((same.telephones||[]).concat(c.telephones||[])));same.courriels=Array.from(new Set((same.courriels||[]).concat(c.courriels||[])));same.annees=Array.from(new Set((same.annees||[]).concat(c.annees||[]))).sort(function(a,b){return b.localeCompare(a,'fr');});same.annee=same.annees[0]||same.annee||c.annee;same.telephone=same.telephones.join(' · ');same.courriel=same.courriels.join(' · ');same.sourceNom=[same.sourceNom,c.sourceNom].filter(Boolean).join(' · ');same.nomCorrige=true;});return merged;
}
function EUC_DEV562_saveContactCorrection(q){
  var ctx=EUC_DEV538_admin_();q=q||{};var companyKey=EUC_DEV562_companyKey_(q),role=EUC_DEV538_t_(q.role).toUpperCase(),contactKey=EUC_DEV562_trim_(q.contactKey,80),source=EUC_DEV562_trim_(q.nomSource,200),corrected=EUC_DEV562_prettyName_(EUC_DEV562_trim_(q.nomCorrige,200));if(!companyKey||['RESPONSABLE','TUTEUR'].indexOf(role)<0||!contactKey||!corrected)throw new Error('Correction de contact incomplète.');
  EUC_DEV562_ensureContactTable_();var now=new Date().toISOString(),rows=EUC_DEV562_contactRows_(),existing=rows.filter(function(r){var f=EUC_DEV538_fields_(r);return EUC_DEV562_matchCompany_(r,q)&&EUC_DEV538_t_(f.Role_contact).toUpperCase()===role&&EUC_DEV538_t_(f.Cle_contact_source)===contactKey;})[0],fields={Cle_entreprise:companyKey,SIRET:EUC_DEV538_t_(q.siret).replace(/\D/g,''),Entreprise:EUC_DEV562_trim_(q.entreprise,250),Adresse:EUC_DEV562_trim_(q.adresse,500),Role_contact:role,Cle_contact_source:contactKey,Nom_source:source,Nom_corrige:corrected,Actif:true,Updated_at:now,Updated_by:EUC_DEV538_t_(ctx.email)},record={fields:fields},method='post';if(existing){record.id=existing.id;method='patch';}EUC_ENT_grist(method,'/tables/'+EUC_DEV562_CONTACT_TABLE_+'/records',{records:[record]});return{ok:true,nom:corrected};
}
function EUC_DEV562_profileRows_(){return EUC_DEV538_optionalRecords_(EUC_DEV562_PROFILE_TABLE_,{});}
function EUC_DEV562_profileRow_(q){return EUC_DEV562_profileRows_().filter(function(r){return EUC_DEV562_matchCompany_(r,q);}).sort(function(a,b){return EUC_DEV538_n_(b.id)-EUC_DEV538_n_(a.id);})[0]||null;}
function EUC_DEV562_folder_(prop,name){var p=PropertiesService.getScriptProperties(),id=p.getProperty(prop)||'';if(id){try{return DriveApp.getFolderById(id);}catch(e){}}var root=DriveApp.getRootFolder(),it=root.getFoldersByName(name),folder=it.hasNext()?it.next():root.createFolder(name);p.setProperty(prop,folder.getId());return folder;}
function EUC_DEV562_logo_(row,publicOnly){var f=row&&EUC_DEV538_fields_(row);if(!f||!f.Logo_drive_file_id||publicOnly&&!EUC_DEV538_bool_(f.Logo_droit_diffusion))return null;try{var file=DriveApp.getFileById(EUC_DEV538_t_(f.Logo_drive_file_id)),blob=file.getBlob(),mime=EUC_DEV538_t_(blob.getContentType()||f.Logo_mime_type);return{mime:mime,data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes())};}catch(e){return null;}}
function EUC_DEV562_relationRows_(){return EUC_DEV538_optionalRecords_(EUC_DEV562_RELATION_TABLE_,{});}
function EUC_DEV562_categories_(){return{VISITE_ENTREPRISE:'Visite d’entreprise',INTERVENTION_LYCEE:'Intervention au lycée',FORUM_ORIENTATION:'Forum ou orientation',ACCUEIL_STAGE_APPRENTISSAGE:'Accueil en stage ou apprentissage',JURY_EXAMEN:'Jury ou examen',RECRUTEMENT_JOB_DATING:'Recrutement ou job dating',DON_PRET_MATERIEL:'Don ou prêt de matériel',MECENAT_TAXE_APPRENTISSAGE:'Mécénat ou taxe d’apprentissage',FORMATION_VEILLE:'Formation ou veille métier',PROJET_PEDAGOGIQUE:'Projet pédagogique',PRESTATION_FABRICATION:'Prestation ou fabrication',CONVENTION_PARTENARIAT:'Convention ou partenariat',CONCOURS_EVENEMENT:'Concours ou événement',AUTRE:'Autre action'};}
function EUC_DEV563_categoryRows_(){if(EUC_DEV563_CATEGORY_ROWS_MEMO_!==null)return EUC_DEV563_CATEGORY_ROWS_MEMO_;EUC_DEV563_CATEGORY_ROWS_MEMO_=EUC_DEV538_optionalRecords_(EUC_DEV563_CATEGORY_TABLE_,{});return EUC_DEV563_CATEGORY_ROWS_MEMO_;}
function EUC_DEV563_categorySettings_(){
  var defs=EUC_DEV562_categories_(),latest={};
  EUC_DEV563_categoryRows_().forEach(function(row){var f=EUC_DEV538_fields_(row),code=EUC_DEV538_t_(f.Code_categorie).toUpperCase();if(!defs[code]||f.Actif===false)return;if(!latest[code]||EUC_DEV538_n_(row.id)>EUC_DEV538_n_(latest[code].id))latest[code]=row;});
  return Object.keys(defs).map(function(code,index){var row=latest[code],f=row?EUC_DEV538_fields_(row):{};return{code:code,label:defs[code],visibleAdministration:true,visibleProfesseurs:!!(row&&EUC_DEV538_bool_(f.Visible_professeurs)),visibleFamilles:!!(row&&EUC_DEV538_bool_(f.Visible_familles)),configured:!!row,ordre:row&&isFinite(Number(f.Ordre))?Number(f.Ordre):index+1};}).sort(function(a,b){return a.ordre-b.ordre||a.label.localeCompare(b.label,'fr');});
}
function EUC_DEV563_categorySettingMap_(){var out={};EUC_DEV563_categorySettings_().forEach(function(x){out[x.code]=x;});return out;}
function EUC_DEV563_actionVisible_(fields,scope,settings){
  if(scope==='ADMIN')return true;
  var status=EUC_DEV538_t_(fields.Statut).toUpperCase(),visibility=EUC_DEV538_t_(fields.Visibilite).toUpperCase()||'ADMIN',category=EUC_DEV538_t_(fields.Categorie).toUpperCase(),setting=settings[category];
  if(status!=='PUBLIE'||!setting||visibility==='ADMIN')return false;
  if(scope==='PUBLIC')return setting.visibleFamilles===true&&(visibility==='HERITEE'||visibility==='PUBLIC');
  return setting.visibleProfesseurs===true&&['HERITEE','PERSONNELS','PUBLIC'].indexOf(visibility)>=0;
}
function EUC_DEV563_categorySettings(){EUC_DEV538_admin_();return{ok:true,categories:EUC_DEV563_categorySettings_()};}
function EUC_DEV563_saveCategorySettings(q){
  var ctx=EUC_DEV538_admin_(),defs=EUC_DEV562_categories_(),input=q&&Array.isArray(q.categories)?q.categories:[],byCode={};
  input.forEach(function(x){var code=EUC_DEV538_t_(x&&x.code).toUpperCase();if(!defs[code]||byCode[code])throw new Error('Catégorie inconnue ou dupliquée.');byCode[code]=x;});
  if(Object.keys(byCode).length!==Object.keys(defs).length)throw new Error('Toutes les catégories doivent être présentes avant enregistrement.');
  EUC_DEV563_ensureCategoryTable_();EUC_DEV563_CATEGORY_ROWS_MEMO_=null;var existing={};EUC_DEV563_categoryRows_().forEach(function(row){var f=EUC_DEV538_fields_(row),code=EUC_DEV538_t_(f.Code_categorie).toUpperCase();if(defs[code]&&(!existing[code]||EUC_DEV538_n_(row.id)>EUC_DEV538_n_(existing[code].id)))existing[code]=row;});
  var now=new Date().toISOString(),patches=[],creates=[];Object.keys(defs).forEach(function(code,index){var x=byCode[code],fields={Code_categorie:code,Libelle:defs[code],Visible_administration:true,Visible_professeurs:x.visibleProfesseurs===true,Visible_familles:x.visibleFamilles===true,Actif:true,Ordre:index+1,Updated_at:now,Updated_by:EUC_DEV538_t_(ctx.email)};if(existing[code])patches.push({id:existing[code].id,fields:fields});else creates.push({fields:fields});});
  if(patches.length)EUC_ENT_grist('patch','/tables/'+EUC_DEV563_CATEGORY_TABLE_+'/records',{records:patches});if(creates.length)EUC_ENT_grist('post','/tables/'+EUC_DEV563_CATEGORY_TABLE_+'/records',{records:creates});EUC_DEV563_CATEGORY_ROWS_MEMO_=null;return{ok:true,categories:EUC_DEV563_categorySettings_()};
}
function EUC_DEV562_safeEvent_(row,admin){var f=EUC_DEV538_fields_(row),cat=EUC_DEV538_t_(f.Categorie).toUpperCase(),links=[['LinkedIn',f.Lien_linkedin],['Instagram',f.Lien_instagram],['Site du lycée',f.Lien_site_lycee],['Autre lien',f.Lien_autre]].filter(function(x){return /^https?:\/\//i.test(EUC_DEV538_t_(x[1]));}).map(function(x){return{label:x[0],url:EUC_DEV538_t_(x[1])};}),out={id:EUC_DEV538_n_(row.id),date:EUC_DEV538_iso_(f.Date_action),categorie:cat,categorieLabel:EUC_DEV562_categories_()[cat]||'Autre action',titre:EUC_DEV538_t_(f.Titre),description:EUC_DEV538_t_(f.Description),lieu:EUC_DEV538_t_(f.Lieu),classesDiplomes:EUC_DEV538_t_(f.Classes_diplomes),liens:links,visibilite:EUC_DEV538_t_(f.Visibilite),statut:EUC_DEV538_t_(f.Statut)};if(admin&&f.Drive_folder_id)out.driveUrl='https://drive.google.com/drive/folders/'+encodeURIComponent(EUC_DEV538_t_(f.Drive_folder_id));return out;}
function EUC_DEV562_profileData_(q,scope){var row=EUC_DEV562_profileRow_(q),f=row?EUC_DEV538_fields_(row):{},settings=EUC_DEV563_categorySettingMap_(),events=EUC_DEV562_relationRows_().filter(function(r){return EUC_DEV562_matchCompany_(r,q)&&EUC_DEV563_actionVisible_(EUC_DEV538_fields_(r),scope,settings);}).sort(function(a,b){var af=EUC_DEV538_fields_(a),bf=EUC_DEV538_fields_(b);return EUC_DEV538_t_(bf.Date_action).localeCompare(EUC_DEV538_t_(af.Date_action),'fr')||EUC_DEV538_n_(b.id)-EUC_DEV538_n_(a.id);}).map(function(x){return EUC_DEV562_safeEvent_(x,scope==='ADMIN');}),out={ok:true,site:EUC_DEV538_t_(f.Site_internet),logo:EUC_DEV562_logo_(row,scope==='PUBLIC'),actions:events,categories:EUC_DEV562_categories_()};if(scope==='ADMIN')out.categorySettings=EUC_DEV563_categorySettings_();return out;}
function EUC_DEV562_companyProfile(q){var scope='PUBLIC';try{if(EUC_DEV538_admin_())scope='ADMIN';}catch(e){if(EUC_DEV538_staffAllowed_())scope='STAFF';}if(scope==='PUBLIC'&&!EUC_DEV538_staffAllowed_())throw new Error('Accès réservé aux personnels authentifiés.');return EUC_DEV562_profileData_(q,scope);}
function EUC_DEV562_publicCompanyProfile(q){return EUC_DEV562_profileData_(q,'PUBLIC');}
function EUC_DEV562_saveCompanySite(q){var ctx=EUC_DEV538_admin_();q=q||{};var key=EUC_DEV562_companyKey_(q);if(!key)throw new Error('Entreprise invalide.');var site=EUC_DEV562_url_(q.site,true);EUC_DEV562_ensureProfileTable_();var existing=EUC_DEV562_profileRow_(q),fields={Cle_entreprise:key,SIRET:EUC_DEV538_t_(q.siret).replace(/\D/g,''),Entreprise:EUC_DEV562_trim_(q.entreprise,250),Adresse:EUC_DEV562_trim_(q.adresse,500),Site_internet:site,Actif:true,Updated_at:new Date().toISOString(),Updated_by:EUC_DEV538_t_(ctx.email)},record={fields:fields},method='post';if(existing){record.id=existing.id;method='patch';}EUC_ENT_grist(method,'/tables/'+EUC_DEV562_PROFILE_TABLE_+'/records',{records:[record]});return{ok:true,site:site};}
function EUC_DEV562_saveCompanyLogo(q){var ctx=EUC_DEV538_admin_();q=q||{};if(q.droitDiffusion!==true)throw new Error('Confirmez le droit de diffusion du logo.');var mime=EUC_DEV538_t_(q.mime).toLowerCase();if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0)throw new Error('Format de logo non accepté.');var bytes=Utilities.base64Decode(EUC_DEV538_t_(q.base64).replace(/^data:[^;]+;base64,/,''));if(!bytes.length||bytes.length>2097152)throw new Error('Le logo doit peser moins de 2 Mo.');var key=EUC_DEV562_companyKey_(q),company=EUC_DEV562_trim_(q.entreprise,250);if(!key||!company)throw new Error('Entreprise invalide.');EUC_DEV562_ensureProfileTable_();var ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg',safe=('logo-'+company).replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,100),file=EUC_DEV562_folder_(EUC_DEV562_MEDIA_FOLDER_PROP_,'Eucalyptus PFMP - Médias entreprises').createFile(Utilities.newBlob(bytes,mime,safe+ext)),existing=EUC_DEV562_profileRow_(q),fields={Cle_entreprise:key,SIRET:EUC_DEV538_t_(q.siret).replace(/\D/g,''),Entreprise:company,Adresse:EUC_DEV562_trim_(q.adresse,500),Logo_drive_file_id:file.getId(),Logo_mime_type:mime,Logo_nom_fichier:file.getName(),Logo_droit_diffusion:true,Actif:true,Updated_at:new Date().toISOString(),Updated_by:EUC_DEV538_t_(ctx.email)},record={fields:fields},method='post';file.setDescription('Logo entreprise PFMP — diffusion confirmée par '+EUC_DEV538_t_(ctx.email));if(existing){record.id=existing.id;method='patch';}EUC_ENT_grist(method,'/tables/'+EUC_DEV562_PROFILE_TABLE_+'/records',{records:[record]});return{ok:true,name:file.getName()};}
function EUC_DEV562_actionFolder_(q,uid){var root=EUC_DEV562_folder_(EUC_DEV562_RELATION_FOLDER_PROP_,'Eucalyptus PFMP - Relations entreprises'),companyName=EUC_DEV562_trim_(q.entreprise,120).replace(/[\\/:*?"<>|]+/g,'-')||'Entreprise',it=root.getFoldersByName(companyName),company=it.hasNext()?it.next():root.createFolder(companyName),folder=company.createFolder((EUC_DEV538_t_(q.date)||new Date().toISOString().slice(0,10))+' - '+EUC_DEV562_trim_(q.titre,100).replace(/[\\/:*?"<>|]+/g,'-')+' - '+uid.slice(-8));return folder;}
function EUC_DEV562_saveRelationship(q){var ctx=EUC_DEV538_admin_();q=q||{};var key=EUC_DEV562_companyKey_(q),title=EUC_DEV562_trim_(q.titre,250),date=EUC_DEV538_iso_(q.date),cat=EUC_DEV538_t_(q.categorie).toUpperCase(),visibility=EUC_DEV538_t_(q.visibilite).toUpperCase()||'HERITEE',status=EUC_DEV538_t_(q.statut).toUpperCase()||'BROUILLON';if(!key||!title||!date||!EUC_DEV562_categories_()[cat])throw new Error('Renseignez la date, la catégorie et le titre de l’action.');if(['HERITEE','ADMIN','PUBLIC','PERSONNELS'].indexOf(visibility)<0||['BROUILLON','PUBLIE'].indexOf(status)<0)throw new Error('Visibilité ou statut invalide.');EUC_DEV562_ensureRelationTable_();var uid='ACT-'+Utilities.getUuid(),folder=q.creerDossier===true?EUC_DEV562_actionFolder_(q,uid):null,now=new Date().toISOString(),dateValue=Math.floor(new Date(date+'T12:00:00Z').getTime()/1000),fields={Action_uid:uid,Cle_entreprise:key,SIRET:EUC_DEV538_t_(q.siret).replace(/\D/g,''),Entreprise:EUC_DEV562_trim_(q.entreprise,250),Adresse:EUC_DEV562_trim_(q.adresse,500),Date_action:dateValue,Categorie:cat,Titre:title,Description:EUC_DEV562_trim_(q.description,3000),Lieu:EUC_DEV562_trim_(q.lieu,300),Classes_diplomes:EUC_DEV562_trim_(q.classesDiplomes,500),Lien_linkedin:EUC_DEV562_url_(q.lienLinkedin,true),Lien_instagram:EUC_DEV562_url_(q.lienInstagram,true),Lien_site_lycee:EUC_DEV562_url_(q.lienSiteLycee,true),Lien_autre:EUC_DEV562_url_(q.lienAutre,true),Drive_folder_id:folder?folder.getId():'',Visibilite:visibility,Statut:status,Actif:true,Created_at:now,Created_by:EUC_DEV538_t_(ctx.email),Updated_at:now,Updated_by:EUC_DEV538_t_(ctx.email)};EUC_ENT_grist('post','/tables/'+EUC_DEV562_RELATION_TABLE_+'/records',{records:[{fields:fields}]});return{ok:true,action:EUC_DEV562_safeEvent_({fields:fields},true)};}

/* Vue d'administration transversale. Elle réutilise exactement l'agrégation
 * du book, donc aucune donnée source n'est réécrite pour dresser la liste. */
function EUC_DEV563_contactDirectory(){
  EUC_DEV538_admin_();var companies=EUC_DEV538_history_({annee:'ALL',fenetre:0}),out=[];
  companies.forEach(function(company){[['RESPONSABLE',company.responsables||[]],['TUTEUR',company.tuteurs||[]]].forEach(function(group){group[1].forEach(function(c){out.push({identity:company.identity,siret:company.siret||'',entreprise:company.entreprise||'',adresse:company.adresse||'',role:group[0],contactKey:c.contactKey||'',nom:c.nom||'',nomSource:c.sourceNom||c.nom||'',annees:c.annees||[],corrige:c.nomCorrige===true});});});});
  out.sort(function(a,b){return a.entreprise.localeCompare(b.entreprise,'fr')||a.role.localeCompare(b.role,'fr')||a.nom.localeCompare(b.nom,'fr');});return{ok:true,contacts:out};
}
