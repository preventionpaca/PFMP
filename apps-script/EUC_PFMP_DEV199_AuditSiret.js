function EUC_DEV199_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV199_siret_(v){return EUC_DEV199_txt_(v).replace(/\D/g,'').slice(0,14);}
function EUC_DEV199_safe_(v){
  try{return JSON.parse(JSON.stringify(v));}
  catch(e){return {_type:typeof v,_string:String(v)};}
}
function EUC_DEV199_score_(x){
  if(!x||!x.found)return 0;
  var n=0;
  if(x.nomEntreprise)n++;
  if(x.nomCommercial)n++;
  if(x.adresse)n++;
  if(x.codePostal)n++;
  if(x.ville)n++;
  if(x.telephoneEntreprise)n++;
  if(x.courrielEntreprise)n++;
  return n;
}
function EUC_DEV199_auditerSiret(siret){
  siret=EUC_DEV199_siret_(siret);
  var out={ok:true,siret:siret,timestamp:new Date().toISOString()};

  if(siret.length!==14){
    return {ok:false,siret:siret,error:'SIRET invalide : 14 chiffres attendus.'};
  }

  try{
    out.globalTable=
      typeof EUC_DEV196_findGlobalTable_==='function'
        ? EUC_DEV196_findGlobalTable_()
        : '';

    out.globalDetailed=
      typeof EUC_DEV198_findGlobalDetailed_==='function'
        ? EUC_DEV198_findGlobalDetailed_(siret)
        : null;
  }catch(e1){
    out.globalError=String(e1&&e1.message||e1);
  }

  try{
    out.historicalFunctionAvailable=
      typeof EUC_ENT_rechercherSiret==='function';

    if(out.historicalFunctionAvailable){
      var raw=EUC_ENT_rechercherSiret(siret);
      out.historicalRawType=typeof raw;
      out.historicalRaw=EUC_DEV199_safe_(raw);
    }
  }catch(e2){
    out.historicalError=String(e2&&e2.message||e2);
  }

  try{
    if(typeof EUC_DEV193_normalizeEntreprise_==='function'){
      out.map193=EUC_DEV193_normalizeEntreprise_(out.historicalRaw,siret);
    }
  }catch(e3){
    out.map193Error=String(e3&&e3.message||e3);
  }

  try{
    if(typeof EUC_DEV194_lookupSiret==='function'){
      out.lookup194=EUC_DEV194_lookupSiret(siret);
    }
  }catch(e4){
    out.lookup194Error=String(e4&&e4.message||e4);
  }

  try{
    if(typeof EUC_DEV195_lookupSiret==='function'){
      out.lookup195=EUC_DEV195_lookupSiret(siret);
    }
  }catch(e5){
    out.lookup195Error=String(e5&&e5.message||e5);
  }

  try{
    if(typeof EUC_DEV196_lookupSiret==='function'){
      out.lookup196=EUC_DEV196_lookupSiret(siret);
    }
  }catch(e6){
    out.lookup196Error=String(e6&&e6.message||e6);
  }

  try{
    if(typeof EUC_DEV197_lookupSiret==='function'){
      out.lookup197=EUC_DEV197_lookupSiret(siret);
    }
  }catch(e7){
    out.lookup197Error=String(e7&&e7.message||e7);
  }

  try{
    if(typeof EUC_DEV198_lookupSiret==='function'){
      out.lookup198=EUC_DEV198_lookupSiret(siret);
    }
  }catch(e8){
    out.lookup198Error=String(e8&&e8.message||e8);
  }

  out.summary={
    globalFound:!!(out.globalDetailed&&out.globalDetailed.found),
    globalScore:EUC_DEV199_score_(out.globalDetailed),
    historicalReturned:!!out.historicalFunctionAvailable&&!out.historicalError,
    map193Score:EUC_DEV199_score_(out.map193),
    lookup194Score:EUC_DEV199_score_(out.lookup194),
    lookup195Score:EUC_DEV199_score_(out.lookup195),
    lookup196Score:EUC_DEV199_score_(out.lookup196),
    lookup197Score:EUC_DEV199_score_(out.lookup197),
    lookup198Score:EUC_DEV199_score_(out.lookup198)
  };

  return out;
}