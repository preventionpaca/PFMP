/**
 * Eucalyptus PFMP — v1.0.0-dev.273h
 * Arbitrage persistant des divergences de date de naissance.
 */
var EUC_DEV273H_TABLE_='EUC_IMPORT_ARBITRAGES_PFMP';

function EUC_DEV273H_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV273H_norm_(v){
  return EUC_DEV273H_txt_(v).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
}
function EUC_DEV273H_iso_(v){
  if(v===null||v===undefined||v==='')return '';
  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var a=EUC_IMPORT_dateExistanteISO_(v); if(a)return a;
    }
  }catch(e){}
  try{
    if(typeof EUC_SUIVI_dateISO_==='function'){
      var b=EUC_SUIVI_dateISO_(v); if(b)return b;
    }
  }catch(e2){}
  var s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  return m?m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0'):'';
}
function EUC_DEV273H_fr_(v){
  var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[3]+'/'+m[2]+'/'+m[1]:String(v||'');
}
function EUC_DEV273H_dateGrist_(iso){
  if(typeof EUC_IMPORT_dateGrist_==='function')return EUC_IMPORT_dateGrist_(iso);
  var ms=Date.parse(String(iso||'')+'T00:00:00Z');
  return isFinite(ms)?ms/1000:null;
}
function EUC_DEV273H_stable_(r){
  if(r&&r.numeroNational)return 'NN|'+EUC_DEV273H_txt_(r.numeroNational);
  if(r&&r.ident)return 'I|'+EUC_DEV273H_txt_(r.ident);
  if(r&&r.numero)return 'N|'+EUC_DEV273H_txt_(r.numero);
  return 'NP|'+EUC_DEV273H_norm_(r&&r.nom)+'|'+EUC_DEV273H_norm_(r&&r.prenom);
}
function EUC_DEV273H_source_(parsed,payload){
  var s=EUC_DEV273H_txt_(payload&&payload.sourcePronote||parsed&&parsed.sourcePronote||'AUTO').toUpperCase();
  if(s&&s!=='AUTO')return s;
  try{
    if(typeof EUC_IMPORT_detecterSource_==='function'&&typeof EUC_IMPORT_chargerClassesCamin_==='function'){
      var d=EUC_IMPORT_detecterSource_(parsed,parsed.annee||payload.annee,EUC_IMPORT_chargerClassesCamin_());
      if(d&&d.source)return String(d.source);
    }
  }catch(e){}
  return 'AUTO';
}
function EUC_DEV273H_key_(parsed,r,payload){
  return [
    EUC_DEV273H_source_(parsed,payload||{}),
    String(parsed&&parsed.annee||payload&&payload.annee||''),
    EUC_DEV273H_stable_(r),
    'DATE_NAISSANCE'
  ].join('|');
}
function EUC_DEV273H_assurerTable_(){
  var tabs=EUC_ENT_grist('get','/tables').tables||[];
  var exists=tabs.some(function(t){return t.id===EUC_DEV273H_TABLE_;});
  function c(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}
  var cols=[
    c('Cle','Clé'),c('Annee','Année'),c('Source_Pronote','Source Pronote'),
    c('Nom','Nom'),c('Prenom','Prénom'),c('Champ','Champ'),
    c('Decision','Décision'),c('Valeur_Grist','Valeur Grist'),
    c('Valeur_Pronote','Valeur Pronote'),c('Actif','Actif','Bool'),
    c('Date_modification','Date modification','DateTime'),c('Auteur','Auteur')
  ];
  if(!exists){
    EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV273H_TABLE_,columns:cols}]});
    return;
  }
  var have={};
  (EUC_ENT_grist('get','/tables/'+EUC_DEV273H_TABLE_+'/columns').columns||[])
    .forEach(function(x){have[x.id]=true;});
  var miss=cols.filter(function(x){return !have[x.id];});
  if(miss.length){
    EUC_ENT_grist('post','/tables/'+EUC_DEV273H_TABLE_+'/columns',{columns:miss});
  }
}
function EUC_DEV273H_map_(){
  var map={};
  try{
    EUC_DEV273H_assurerTable_();
    var rows=EUC_IMPORT_lireRecords_(EUC_DEV273H_TABLE_)||[];
    rows.filter(function(x){return x.Actif!==false;}).forEach(function(x){
      if(x.Cle)map[String(x.Cle)]=x;
    });
  }catch(e){}
  return map;
}
function EUC_DEV273H_decisionPreview_(parsed,r,e){
  var key=EUC_DEV273H_key_(parsed,r,{});
  var a=EUC_DEV273H_map_()[key];
  return a&&a.Decision?String(a.Decision).toUpperCase():'';
}
function EUC_DEV273H_naissancePourEcriture_(r,preview,source){
  var parsed={annee:preview&&preview.annee||'',sourcePronote:source||preview&&preview.sourcePronote||''};
  var key=EUC_DEV273H_key_(parsed,r,{sourcePronote:source||''});
  var a=EUC_DEV273H_map_()[key];
  if(a&&String(a.Decision).toUpperCase()==='GRIST'&&a.Valeur_Grist){
    return EUC_DEV273H_iso_(a.Valeur_Grist);
  }
  return r&&r.naissance||'';
}
function EUC_DEV273H_records_(){
  if(typeof EUC_IMPORT_lireRecords_==='function'){
    return EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];
  }
  var r=EUC_ENT_grist('get','/tables/EUC_ELEVES_PFMP/records');
  return (r&&r.records||[]).map(function(x){
    var f=Object.assign({},x.fields||{}); f.id=x.id; return f;
  });
}
function EUC_DEV273H_find_(r,rows){
  var out=[];
  if(r.numeroNational){
    out=(rows||[]).filter(function(e){return EUC_DEV273H_txt_(e.Numero_national)===EUC_DEV273H_txt_(r.numeroNational);});
  }
  if(!out.length&&r.ident){
    out=(rows||[]).filter(function(e){return EUC_DEV273H_txt_(e.Identifiant_Pronote||e.Identifiant_import)===EUC_DEV273H_txt_(r.ident);});
  }
  if(!out.length&&r.numero){
    out=(rows||[]).filter(function(e){return EUC_DEV273H_txt_(e.Numero_Pronote)===EUC_DEV273H_txt_(r.numero);});
  }
  if(!out.length){
    var n=EUC_DEV273H_norm_(r.nom),p=EUC_DEV273H_norm_(r.prenom);
    out=(rows||[]).filter(function(e){
      return EUC_DEV273H_norm_(e.Nom)===n&&EUC_DEV273H_norm_(e.Prenom_usage||e.Prenom)===p;
    });
  }
  return out.length===1?out[0]:null;
}
function EUC_DEV273H_parse_(payload){
  var texte=String(payload&&payload.texte||'');
  if(!texte.trim())throw new Error('Données Pronote absentes.');
  var parsed;
  if(typeof EUC_IMPORT_analyserTexteComplet_==='function'){
    parsed=EUC_IMPORT_analyserTexteComplet_(texte,{annee:payload.annee});
  }else{
    parsed=EUC_IMPORT_analyserTexte_(texte,{annee:payload.annee});
  }
  try{
    if(typeof EUC_IMPORT_extraireProfesseursPrincipaux_==='function'){
      EUC_IMPORT_extraireProfesseursPrincipaux_(texte,parsed);
    }
  }catch(e){}
  parsed.sourcePronote=EUC_DEV273H_source_(parsed,payload);
  return parsed;
}
function EUC_DEV273H_info(payload){
  EUC_IMPORT_exigerAdminTexte_();
  var parsed=EUC_DEV273H_parse_(payload||{});
  var line=Number(payload.ligne)||0;
  var r=(parsed.rows||[]).filter(function(x){return Number(x.ligne)===line;})[0];
  if(!r)throw new Error('Ligne Pronote introuvable.');
  var e=EUC_DEV273H_find_(r,EUC_DEV273H_records_());
  if(!e)throw new Error('Fiche Grist unique introuvable.');
  var dg=EUC_DEV273H_iso_(e.Date_naissance),dp=EUC_DEV273H_iso_(r.naissance);
  return {
    ligne:line,nom:r.nom||'',prenom:r.prenom||'',
    dateGrist:dg,dateGristFr:EUC_DEV273H_fr_(dg),
    datePronote:dp,datePronoteFr:EUC_DEV273H_fr_(dp)
  };
}
function EUC_DEV273H_enregistrer(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();
  payload=payload||{};
  var decision=String(payload.decision||'').toUpperCase();
  if(['GRIST','PRONOTE'].indexOf(decision)<0)throw new Error('Décision invalide.');

  var parsed=EUC_DEV273H_parse_(payload);
  var line=Number(payload.ligne)||0;
  var r=(parsed.rows||[]).filter(function(x){return Number(x.ligne)===line;})[0];
  if(!r)throw new Error('Ligne Pronote introuvable.');

  var e=EUC_DEV273H_find_(r,EUC_DEV273H_records_());
  if(!e)throw new Error('Fiche Grist unique introuvable.');

  var dg=EUC_DEV273H_iso_(e.Date_naissance),dp=EUC_DEV273H_iso_(r.naissance);
  var key=EUC_DEV273H_key_(parsed,r,payload);

  EUC_DEV273H_assurerTable_();
  var rows=EUC_IMPORT_lireRecords_(EUC_DEV273H_TABLE_)||[];
  var ex=rows.filter(function(x){return String(x.Cle||'')===key;})[0];
  var fields={
    Cle:key,Annee:String(parsed.annee||payload.annee||''),
    Source_Pronote:EUC_DEV273H_source_(parsed,payload),
    Nom:r.nom||'',Prenom:r.prenom||'',Champ:'DATE_NAISSANCE',
    Decision:decision,Valeur_Grist:dg,Valeur_Pronote:dp,
    Actif:true,Date_modification:new Date().toISOString(),
    Auteur:String(ctx&&ctx.email||'')
  };

  if(ex){
    EUC_ENT_grist('patch','/tables/'+EUC_DEV273H_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});
  }else{
    EUC_ENT_grist('post','/tables/'+EUC_DEV273H_TABLE_+'/records',{records:[{fields:fields}]});
  }

  if(decision==='PRONOTE'){
    EUC_ENT_grist('patch','/tables/EUC_ELEVES_PFMP/records',{
      records:[{id:Number(e.id),fields:{Date_naissance:EUC_DEV273H_dateGrist_(dp)}}]
    });
  }

  return {ok:true,decision:decision};
}
