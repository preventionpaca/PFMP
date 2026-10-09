/**
 * PFMP DEV528 — restauration des responsables issus de JotForm.
 *
 * Les anciens imports ont conserve le CSV complet dans Raw_JSON, mais le
 * mapping historique n'a pas transporte « Nom du responsable », le telephone
 * de l'entreprise et son courriel dans l'acces convention. La vue peut donc
 * completer ces champs en lecture seule, sans modifier la convention signee.
 */
var EUC_DEV528_VERSION_='1.0.0-dev.533';
var EUC_DEV528_JOTFORM_CACHE_='EUC_DEV533_JOTFORM_CONTACTS_V3';

function EUC_DEV528_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV528_ref_(v){
  if(typeof EUC_DEV340_ref_==='function')return Number(EUC_DEV340_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV528_digits_(v){return EUC_DEV528_t_(v).replace(/\D/g,'');}
function EUC_DEV530_date_(v){
  var s=EUC_DEV528_t_(v),m;
  if(!s)return'';
  m=s.match(/^(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if(m)return [m[1],String(m[2]).padStart(2,'0'),String(m[3]).padStart(2,'0')].join('-');
  m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2})/);
  if(m)return [m[3],String(m[2]).padStart(2,'0'),String(m[1]).padStart(2,'0')].join('-');
  return'';
}
function EUC_DEV528_norm_(v){
  var s=EUC_DEV528_t_(v);
  try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(e){}
  return s.toUpperCase().replace(/[^A-Z0-9]+/g,'');
}
function EUC_DEV528_pick_(obj,names){
  obj=obj||{};var byNorm={},i,k,v;
  Object.keys(obj).forEach(function(key){byNorm[EUC_DEV528_norm_(key)]=key;});
  for(i=0;i<names.length;i++){
    k=Object.prototype.hasOwnProperty.call(obj,names[i])?names[i]:byNorm[EUC_DEV528_norm_(names[i])];
    if(k){v=obj[k];if(EUC_DEV528_t_(v))return EUC_DEV528_t_(v);}
  }
  return '';
}
function EUC_DEV528_raw_(row){
  var raw={};
  try{raw=JSON.parse(EUC_DEV528_t_(row&&row.Raw_JSON)||'{}')||{};}catch(e){raw={};}
  return raw;
}
function EUC_DEV528_contactFromBuffer_(row){
  row=row||{};var raw=EUC_DEV528_raw_(row);
  return {
    id:Number(row.id)||0,
    eleve:EUC_DEV528_ref_(row.Eleve_match_id||row.Eleve||row.Eleve_id),
    classe:EUC_DEV528_ref_(row.Classe_match_id||row.Classe_convention||row.Classe),
    siret:EUC_DEV528_digits_(row.SIRET_normalise||row.SIRET_brut||EUC_DEV528_pick_(raw,['N° SIRET (France)','N° SIRET','SIRET'])),
    debut:EUC_DEV530_date_(row.Date_debut_brut||row.Date_debut||EUC_DEV528_pick_(raw,['Date de début','Date debut'])),
    fin:EUC_DEV530_date_(row.Date_fin_brut||row.Date_fin||EUC_DEV528_pick_(raw,['Date de fin','Date fin'])),
    nom:EUC_DEV528_pick_(row,['Nom_responsable','Responsable_nom','Nom_representant'])||EUC_DEV528_pick_(raw,['Nom du responsable',"Nom du responsable de l'entreprise",'Responsable entreprise','Nom responsable','Nom du représentant','Représentée par']),
    telephone:EUC_DEV528_pick_(row,['Responsable_telephone','Telephone_entreprise','Telephone_responsable'])||EUC_DEV528_pick_(raw,['Téléphone entreprise','Telephone entreprise','Téléphone responsable','Telephone responsable','Téléphone du responsable']),
    courriel:EUC_DEV528_pick_(row,['Responsable_courriel','Email_entreprise','Email_responsable'])||EUC_DEV528_pick_(raw,["Adresse e-mail de l'entreprise","Adresse email de l'entreprise",'Email responsable','Courriel responsable','Adresse e-mail du responsable'])
  };
}
function EUC_DEV528_contactKey_(eleve,classe,siret){return [Number(eleve)||0,Number(classe)||0,EUC_DEV528_digits_(siret)].join('|');}
function EUC_DEV528_looseKey_(eleve,siret){return [Number(eleve)||0,EUC_DEV528_digits_(siret)].join('|');}
function EUC_DEV530_periodKey_(eleve,classe,debut,fin){return [Number(eleve)||0,Number(classe)||0,EUC_DEV530_date_(debut),EUC_DEV530_date_(fin)].join('|');}
function EUC_DEV530_classKey_(eleve,classe){return [Number(eleve)||0,Number(classe)||0].join('|');}
function EUC_DEV528_sameContact_(a,b){
  return EUC_DEV528_norm_(a&&a.nom)===EUC_DEV528_norm_(b&&b.nom)&&
    EUC_DEV528_norm_(a&&a.telephone)===EUC_DEV528_norm_(b&&b.telephone)&&
    EUC_DEV528_norm_(a&&a.courriel)===EUC_DEV528_norm_(b&&b.courriel);
}
function EUC_DEV530_compatibleContact_(a,b){
  return ['nom','telephone','courriel'].every(function(k){
    var av=EUC_DEV528_norm_(a&&a[k]),bv=EUC_DEV528_norm_(b&&b[k]);
    return !av||!bv||av===bv;
  });
}
function EUC_DEV530_mergeContact_(a,b){
  var newer=Number(b&&b.id)>Number(a&&a.id)?b:a,older=newer===b?a:b,out={};
  Object.keys(older||{}).forEach(function(k){out[k]=older[k];});
  Object.keys(newer||{}).forEach(function(k){if(newer[k]!==''&&newer[k]!=null)out[k]=newer[k];});
  ['nom','telephone','courriel'].forEach(function(k){if(!EUC_DEV528_t_(out[k]))out[k]=EUC_DEV528_t_(older&&older[k]);});
  return out;
}
function EUC_DEV533_importedJotformRow_(row){
  var value=row&&row.Importer;
  return value===true||Number(value)===1||['OUI','YES','TRUE','VRAI'].indexOf(EUC_DEV528_t_(value).toUpperCase())>=0;
}
function EUC_DEV533_eligibleJotformRow_(row){
  /* Les dossiers historiques réellement importés sont restés marqués
   * A_CONTROLER dans le tampon. Le booléen Importer constitue la preuve
   * d'import ; les lignes seulement analysées restent exclues. */
  return EUC_DEV528_t_(row&&row.Decision).toUpperCase()==='VALIDEE'||EUC_DEV533_importedJotformRow_(row);
}
function EUC_DEV528_jotformContactIndex_(){
  var cache=CacheService.getScriptCache(),cached='';
  try{cached=cache.get(EUC_DEV528_JOTFORM_CACHE_)||'';if(cached)return JSON.parse(cached);}catch(eCache){}
  var rows=[];try{rows=EUC_DEV519_referenceRows_('EUC_MIGRATION_JOTFORM_PFMP')||[];}catch(eRows){rows=[];}
  var exact={},loose={},period={},studentClass={},student={},ambiguous={};
  function uniquePut(bucket,prefix,key,c){
    if(!key)return;
    if(bucket[key]&&!EUC_DEV530_compatibleContact_(bucket[key],c))ambiguous[prefix+key]=true;
    else if(bucket[key])bucket[key]=EUC_DEV530_mergeContact_(bucket[key],c);
    else bucket[key]=c;
  }
  rows.forEach(function(row){
    if(!EUC_DEV533_eligibleJotformRow_(row))return;
    var c=EUC_DEV528_contactFromBuffer_(row);
    if(!c.eleve||!(c.nom||c.telephone||c.courriel))return;
    if(c.siret.length===14){
      uniquePut(exact,'E|',EUC_DEV528_contactKey_(c.eleve,c.classe,c.siret),c);
      uniquePut(loose,'L|',EUC_DEV528_looseKey_(c.eleve,c.siret),c);
    }
    if(c.classe&&c.debut&&c.fin)uniquePut(period,'P|',EUC_DEV530_periodKey_(c.eleve,c.classe,c.debut,c.fin),c);
    if(c.classe)uniquePut(studentClass,'C|',EUC_DEV530_classKey_(c.eleve,c.classe),c);
    uniquePut(student,'S|',String(c.eleve),c);
  });
  Object.keys(ambiguous).forEach(function(k){
    var prefix=k.slice(0,2),key=k.slice(2);
    if(prefix==='E|')delete exact[key];
    else if(prefix==='L|')delete loose[key];
    else if(prefix==='P|')delete period[key];
    else if(prefix==='C|')delete studentClass[key];
    else if(prefix==='S|')delete student[key];
  });
  var out={exact:exact,loose:loose,period:period,studentClass:studentClass,student:student};
  try{cache.put(EUC_DEV528_JOTFORM_CACHE_,JSON.stringify(out),600);}catch(ePut){}
  return out;
}
function EUC_DEV528_enrichJotformContacts_(rows){
  rows=rows||[];
  var needed=rows.some(function(a){
    return !(EUC_DEV528_t_(a.Responsable_nom)||EUC_DEV528_t_(a.Responsable_prenom))||
      !EUC_DEV528_t_(a.Responsable_telephone)||!EUC_DEV528_t_(a.Responsable_courriel);
  });
  if(!needed)return rows;
  var index=EUC_DEV528_jotformContactIndex_();
  rows.forEach(function(a){
    var eleve=EUC_DEV528_ref_(a.Eleve||a.Eleve_id||a.Jeune),classe=EUC_DEV528_ref_(a.Classe_convention||a.Classe),siret=EUC_DEV528_digits_(a.Entreprise_siret||a.Entreprise_siret_snapshot||a.SIRET);
    var debut=EUC_DEV530_date_(a.Date_debut||a.Date_declaree_debut),fin=EUC_DEV530_date_(a.Date_fin_reelle||a.Date_fin||a.Date_declaree_fin);
    if(!eleve)return;
    var c=null;
    if(siret.length===14)c=index.exact[EUC_DEV528_contactKey_(eleve,classe,siret)]||index.loose[EUC_DEV528_looseKey_(eleve,siret)];
    if(!c&&classe&&debut&&fin)c=index.period[EUC_DEV530_periodKey_(eleve,classe,debut,fin)];
    if(!c&&classe)c=index.studentClass[EUC_DEV530_classKey_(eleve,classe)];
    if(!c)c=index.student[String(eleve)];
    if(!c)return;
    a.Responsable_nom=EUC_DEV520_firstText_(a.Responsable_nom,c.nom);
    a.Responsable_telephone=EUC_DEV520_firstText_(a.Responsable_telephone,c.telephone);
    a.Responsable_courriel=EUC_DEV520_firstText_(a.Responsable_courriel,c.courriel);
    a.Entreprise_telephone=EUC_DEV520_firstText_(a.Entreprise_telephone,c.telephone);
    a.Entreprise_courriel=EUC_DEV520_firstText_(a.Entreprise_courriel,c.courriel);
  });
  return rows;
}

/* Les prochains imports ecrivent aussi les champs canoniques. L'ancien
 * mapping reste la base ; DEV528 ajoute uniquement les coordonnees oubliees. */
function EUC_DEV528_companyFields_(row,ctx,columns){
  var out=EUC_DEV307_companyFields_(row,ctx,columns),c=EUC_DEV528_contactFromBuffer_(row),extra={
    Entreprise_telephone:c.telephone,
    Entreprise_courriel:c.courriel,
    Responsable_nom:c.nom,
    Responsable_telephone:c.telephone,
    Responsable_courriel:c.courriel
  };
  return Object.assign(out,EUC_DEV307_filterFields_(extra,columns));
}
