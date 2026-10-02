function EUC_DEV214_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV214_norm_(v){
  return EUC_DEV214_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function EUC_DEV214_refId_(v){
  if(typeof v==='number')return v;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++){if(typeof v[i]==='number')return v[i];}}
  return Number(v)||0;
}
function EUC_DEV214_cols_(){
  return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/columns',null).columns||[]);
}
function EUC_DEV214_records_(){
  return (EUC_DEV190_api_('get','/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/records',null).records||[]);
}
function EUC_DEV214_col_(cols,names){
  var wanted=names.map(EUC_DEV214_norm_);
  for(var i=0;i<cols.length;i++){
    if(wanted.indexOf(EUC_DEV214_norm_(cols[i].id))>=0)return cols[i].id;
  }
  return '';
}
function EUC_DEV214_ensureCols_(){
  var cols=EUC_DEV214_cols_(),have={};
  cols.forEach(function(c){have[c.id]=true;});
  var wanted=[
    {id:'Dossier_remis',type:'Bool'},
    {id:'Date_remise_dossier',type:'Date'}
  ];
  var missing=wanted.filter(function(c){return !have[c.id];});
  if(missing.length){
    EUC_DEV190_api_('post','/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/columns',{columns:missing});
  }
  return {ok:true};
}
function EUC_DEV214_latestRows_(){
  var cols=EUC_DEV214_cols_();
  var cEleve=EUC_DEV214_col_(cols,['Eleve','Élève','Eleve_id']);
  var map={};
  EUC_DEV214_records_().forEach(function(r){
    var id=EUC_DEV214_refId_((r.fields||{})[cEleve]);
    if(id && (!map[id] || r.id>map[id].id))map[id]=r;
  });
  return {map:map,cols:cols};
}
function EUC_DEV214_loadApprentis(annee,classeId,classeNom){
  EUC_DEV214_ensureCols_();
  var base=(typeof EUC_DEV211_loadApprentis==='function')
    ? EUC_DEV211_loadApprentis(annee,classeId,classeNom)
    : EUC_DEV208_loadApprentis(annee,classeId,classeNom);

  var latest=EUC_DEV214_latestRows_(),cols=latest.cols||[];
  function c(names){return EUC_DEV214_col_(cols,names);}
  function txt(f,names){var cc=c(names);return cc?EUC_DEV214_txt_(f[cc]):'';}
  function boo(f,names){var cc=c(names);return cc?!!f[cc]:false;}

  (base.students||[]).forEach(function(s){
    var row=(latest.map||{})[s.id],f=row?(row.fields||{}):{};
    s.dossierDistribue=boo(f,['Dossier_distribue']);
    s.dateDistribution=txt(f,['Date_distribution_dossier']);
    s.dossierRemis=boo(f,['Dossier_remis']);
    s.dateRemise=txt(f,['Date_remise_dossier']);
    s.transmisCfa=boo(f,['Dossier_transmis_CFA']);
    s.dateCfa=txt(f,['Date_transmission_CFA']);
  });
  return base;
}
function EUC_DEV214_saveApprenti(p){
  p=p||{};
  EUC_DEV214_ensureCols_();

  var legacy={};
  Object.keys(p).forEach(function(k){legacy[k]=p[k];});
  legacy.dossierRemis=!!p.dossierDistribue;
  legacy.dateDossier=p.dateDistribution||'';

  var result=EUC_DEV192_saveApprenti(legacy);

  var latest=EUC_DEV214_latestRows_();
  var row=(latest.map||{})[Number(p.eleveId)];
  if(row){
    var cols=latest.cols||[];
    var cRemis=EUC_DEV214_col_(cols,['Dossier_remis']);
    var cDate=EUC_DEV214_col_(cols,['Date_remise_dossier']);
    var fields={};
    if(cRemis)fields[cRemis]=!!p.dossierRemis;
    if(cDate)fields[cDate]=p.dateRemise||'';
    if(Object.keys(fields).length){
      EUC_DEV190_api_('patch','/tables/'+encodeURIComponent('EUC_APPRENTISSAGE_PFMP')+'/records',{
        records:[{id:row.id,fields:fields}]
      });
    }
  }
  return result||{ok:true};
}