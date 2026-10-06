/**
 * PFMP DEV.453 — cohérence immédiate après import et navigation publique.
 *
 * Aucun accès Grist dans ce module : il ne fait que purger les caches du
 * détail déjà reconstruit et corriger les URL rendues côté public.
 */
var EUC_DEV453_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';
var EUC_DEV453_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';

function EUC_DEV453_familyForClass_(classe){
  classe=classe||{};
  var label=String(
    classe.Categorie||classe.Catégorie||classe.Famille||
    classe.Code||classe.Libelle||classe.Nom||''
  ).toUpperCase();
  if(label.indexOf('BTS')>=0)return 'BTS';
  if(label.indexOf('CAP')>=0)return 'CAP';
  return 'BACPRO';
}

function EUC_DEV453_dropTargetCaches_(annee,classe,periode){
  annee=String(annee||'').trim();
  classe=Number(classe)||0;
  periode=Number(periode)||0;
  if(!annee||!classe||!periode)return false;

  var cache=CacheService.getScriptCache();
  try{
    if(typeof EUC_DEV455_rosterKey_==='function')cache.remove(EUC_DEV455_rosterKey_(annee,classe));
  }catch(eRoster){}
  ['BACPRO','BTS','CAP'].forEach(function(famille){
    try{
      cache.remove(
        'DEV423_DETAIL_'+annee+'_'+famille+'_'+classe+'_'+periode
      );
    }catch(eShort){}

    try{
      if(typeof EUC_DEV416_key_==='function'&&
         typeof EUC_DEV416_cacheDrop_==='function'){
        EUC_DEV416_cacheDrop_(
          EUC_DEV416_key_(annee,famille,classe,periode)
        );
      }
    }catch(eFinal){}
  });
  return true;
}

function EUC_DEV453_publicizeOutput_(output,title){
  var html=output&&typeof output.getContent==='function'
    ?output.getContent()
    :String(output||'');
  html=html.split(EUC_DEV453_ADMIN_URL_).join(EUC_DEV453_PUBLIC_URL_);
  html=html
    .split('page=suivi-pfmp-classe&amp;').join('page=suivi-pfmp-classe-public&amp;')
    .split('page=suivi-pfmp-classe&').join('page=suivi-pfmp-classe-public&')
    .split("'suivi-conventions'").join("'suivi-conventions-public'")
    .split('"suivi-conventions"').join('"suivi-conventions-public"');
  return HtmlService.createHtmlOutput(html)
    .setTitle(title||'Suivi des PFMP — consultation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV453_publicFamily(e){
  return EUC_DEV453_publicizeOutput_(
    EUC_DEV353_publicFamily(e),
    'Suivi des PFMP — consultation'
  );
}

function EUC_DEV453_publicDetail(e){
  return EUC_DEV453_publicizeOutput_(
    EUC_DEV415_publicDetail(e),
    'Suivi des PFMP — consultation'
  );
}
