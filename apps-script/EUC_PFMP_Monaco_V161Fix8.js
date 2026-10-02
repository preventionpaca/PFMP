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
  var table=EUC_V161F8_tableEntreprise_();
  nis=String(nis||'').trim().toUpperCase().replace(/[\s-]+/g,'');

  if(!nis)return {found:false};

  var rows=EUC_IMPORT_lireRecords_(table);
  var hit=rows.filter(function(r){
    var rn=String(r.NIS||'').trim().toUpperCase().replace(/[\s-]+/g,'');
    return rn===nis;
  })[0];

  if(!hit)return {found:false,nis:nis};

  return {
    found:true,
    id:Number(hit.id)||0,
    pays:'Monaco',
    nis:String(hit.NIS||'').trim(),
    rci:String(hit.RCI||'').trim(),
    nom:String(hit.Raison_sociale||hit.Nom||hit.Entreprise||'').trim(),
    enseigne:String(hit.Enseigne||'').trim(),
    adresse:String(hit.Adresse||hit.Adresse_complete||'').trim(),
    complement:String(hit.Complement_adresse||hit.Complement||'').trim(),
    cp:String(hit.Code_postal||'').trim(),
    ville:String(hit.Commune||'Monaco').trim(),
    email:String(hit.Email||'').trim(),
    telephone:String(hit.Telephone||'').trim(),
    statut:String(hit.Statut_validation||'').trim()
  };
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
