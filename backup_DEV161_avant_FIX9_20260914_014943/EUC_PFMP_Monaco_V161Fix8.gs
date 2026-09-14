/** Eucalyptus PFMP — v1.0.0-dev.161-fix8 */
function EUC_V161F8_txt_(v){return String(v==null?'':v).trim();}
function EUC_V161F8_tableEntreprise_(){
  try{var c=EUC_ENT_lireConfiguration();return String(c.EUC_ENT_TABLE_ENTREPRISES||'EUC_ENTREPRISES').trim()||'EUC_ENTREPRISES';}
  catch(e){return 'EUC_ENTREPRISES';}
}
function EUC_V161F8_assurerColonnesMonaco_(){
  var table=EUC_V161F8_tableEntreprise_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];
  var have={};cols.forEach(function(c){have[c.id]=true;});
  var defs=[['NIS','NIS Monaco','Text'],['RCI','RCI Monaco','Text'],['Statut_validation','Statut validation','Text'],['Source_creation','Source création','Text']];
  var missing=defs.filter(function(d){return !have[d[0]];}).map(function(d){return {id:d[0],fields:{label:d[1],type:d[2]}};});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  return table;
}
function EUC_V161_rechercherEntrepriseMonaco(nis){
  var table=EUC_V161F8_assurerColonnesMonaco_();
  nis=EUC_V161F8_txt_(nis);if(!nis)return {found:false};
  var n=nis.toLowerCase().replace(/\s+/g,'');
  var hit=EUC_IMPORT_lireRecords_(table).filter(function(r){return EUC_V161F8_txt_(r.NIS).toLowerCase().replace(/\s+/g,'')===n;})[0];
  if(!hit)return {found:false,nis:nis};
  return {found:true,id:Number(hit.id)||0,pays:'Monaco',nis:EUC_V161F8_txt_(hit.NIS),rci:EUC_V161F8_txt_(hit.RCI),nom:EUC_V161F8_txt_(hit.Raison_sociale||hit.Nom||hit.Entreprise),adresse:EUC_V161F8_txt_(hit.Adresse||hit.Adresse_complete),cp:EUC_V161F8_txt_(hit.Code_postal),ville:EUC_V161F8_txt_(hit.Commune)||'Monaco',email:EUC_V161F8_txt_(hit.Email),telephone:EUC_V161F8_txt_(hit.Telephone),statut:EUC_V161F8_txt_(hit.Statut_validation)};
}
function EUC_V161_enregistrerEntrepriseMonacoSiNouvelle_(d){
  d=d||{};if(EUC_V161F8_txt_(d.entreprisePays).toLowerCase()!=='monaco')return {created:false};
  var nis=EUC_V161F8_txt_(d.entrepriseSiret);if(!nis)return {created:false};
  var existing=EUC_V161_rechercherEntrepriseMonaco(nis);if(existing&&existing.found)return {created:false,id:existing.id};
  var table=EUC_V161F8_assurerColonnesMonaco_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];var have={};cols.forEach(function(c){have[c.id]=true;});
  var fields={};function put(k,v){if(have[k]&&v!==undefined&&v!==null)fields[k]=v;}
  put('NIS',nis);put('RCI',EUC_V161F8_txt_(d.entrepriseRci));put('Raison_sociale',EUC_V161F8_txt_(d.entrepriseRaisonSociale));put('Enseigne',EUC_V161F8_txt_(d.entrepriseEnseigne));put('Adresse',EUC_V161F8_txt_(d.entrepriseAdresse));put('Complement_adresse',EUC_V161F8_txt_(d.entrepriseComplement));put('Code_postal',EUC_V161F8_txt_(d.entrepriseCodePostal));put('Commune',EUC_V161F8_txt_(d.entrepriseCommune)||'Monaco');put('Pays','Monaco');put('Statut_validation','A_VALIDER');put('Source_creation','QR_PFMP');
  var r=EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/records',{records:[{fields:fields}]});
  var id=0;try{id=Number(r.records&&r.records[0]&&r.records[0].id)||0;}catch(e){}
  return {created:true,id:id};
}
