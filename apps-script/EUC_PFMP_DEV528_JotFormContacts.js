/**
 * PFMP DEV528 — restauration des responsables issus de JotForm.
 *
 * Les anciens imports ont conserve le CSV complet dans Raw_JSON, mais le
 * mapping historique n'a pas transporte « Nom du responsable », le telephone
 * de l'entreprise et son courriel dans l'acces convention. La vue peut donc
 * completer ces champs en lecture seule, sans modifier la convention signee.
 */
var EUC_DEV528_VERSION_='1.0.0-dev.528';
var EUC_DEV528_JOTFORM_CACHE_='EUC_DEV528_JOTFORM_CONTACTS_V1';

function EUC_DEV528_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV528_ref_(v){
  if(typeof EUC_DEV340_ref_==='function')return Number(EUC_DEV340_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV528_digits_(v){return EUC_DEV528_t_(v).replace(/\D/g,'');}
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
    eleve:EUC_DEV528_ref_(row.Eleve_match_id),
    classe:EUC_DEV528_ref_(row.Classe_match_id),
    siret:EUC_DEV528_digits_(row.SIRET_normalise||row.SIRET_brut||EUC_DEV528_pick_(raw,['N° SIRET (France)','N° SIRET','SIRET'])),
    nom:EUC_DEV528_pick_(row,['Nom_responsable','Responsable_nom'])||EUC_DEV528_pick_(raw,['Nom du responsable','Responsable entreprise','Nom responsable']),
    telephone:EUC_DEV528_pick_(row,['Responsable_telephone','Telephone_entreprise'])||EUC_DEV528_pick_(raw,['Téléphone entreprise','Telephone entreprise','Téléphone responsable','Telephone responsable']),
    courriel:EUC_DEV528_pick_(row,['Responsable_courriel','Email_entreprise'])||EUC_DEV528_pick_(raw,["Adresse e-mail de l'entreprise","Adresse email de l'entreprise",'Email responsable','Courriel responsable'])
  };
}
function EUC_DEV528_contactKey_(eleve,classe,siret){return [Number(eleve)||0,Number(classe)||0,EUC_DEV528_digits_(siret)].join('|');}
function EUC_DEV528_looseKey_(eleve,siret){return [Number(eleve)||0,EUC_DEV528_digits_(siret)].join('|');}
function EUC_DEV528_sameContact_(a,b){
  return EUC_DEV528_norm_(a&&a.nom)===EUC_DEV528_norm_(b&&b.nom)&&
    EUC_DEV528_norm_(a&&a.telephone)===EUC_DEV528_norm_(b&&b.telephone)&&
    EUC_DEV528_norm_(a&&a.courriel)===EUC_DEV528_norm_(b&&b.courriel);
}
function EUC_DEV528_jotformContactIndex_(){
  var cache=CacheService.getScriptCache(),cached='';
  try{cached=cache.get(EUC_DEV528_JOTFORM_CACHE_)||'';if(cached)return JSON.parse(cached);}catch(eCache){}
  var rows=[];try{rows=EUC_DEV519_referenceRows_('EUC_MIGRATION_JOTFORM_PFMP')||[];}catch(eRows){rows=[];}
  var exact={},loose={},ambiguous={};
  rows.forEach(function(row){
    if(EUC_DEV528_t_(row.Decision).toUpperCase()!=='VALIDEE')return;
    var c=EUC_DEV528_contactFromBuffer_(row);
    if(!c.eleve||c.siret.length!==14||!(c.nom||c.telephone||c.courriel))return;
    var key=EUC_DEV528_contactKey_(c.eleve,c.classe,c.siret),lk=EUC_DEV528_looseKey_(c.eleve,c.siret);
    if(!exact[key]||c.id>exact[key].id)exact[key]=c;
    if(loose[lk]&&!EUC_DEV528_sameContact_(loose[lk],c))ambiguous[lk]=true;
    else if(!loose[lk]||c.id>loose[lk].id)loose[lk]=c;
  });
  Object.keys(ambiguous).forEach(function(k){delete loose[k];});
  var out={exact:exact,loose:loose};
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
    var eleve=EUC_DEV528_ref_(a.Eleve),classe=EUC_DEV528_ref_(a.Classe_convention),siret=EUC_DEV528_digits_(a.Entreprise_siret||a.Entreprise_siret_snapshot);
    if(!eleve||siret.length!==14)return;
    var c=index.exact[EUC_DEV528_contactKey_(eleve,classe,siret)]||index.loose[EUC_DEV528_looseKey_(eleve,siret)];
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
