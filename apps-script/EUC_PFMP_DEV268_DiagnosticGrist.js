/** PFMP DEV268C - diagnostic Grist en lecture seule / sans création réelle. */
var EUC_DEV268_DIAG_KEY_='9ae22b3e882ca3789157c6e47e14bd05';

function EUC_DEV268_rawFetch_(method,path,body){
  var c=EUC_ENT_lireConfiguration();
  var base=String(c.EUC_ENT_GRIST_API_URL||'').replace(/\/$/,'');
  var doc=String(c.EUC_ENT_GRIST_DOC_ID||'');
  var key=String(c.EUC_ENT_GRIST_API_KEY||'');

  var url=base+'/api/docs/'+encodeURIComponent(doc)+path;
  var opt={
    method:method,
    muteHttpExceptions:true,
    headers:{
      Authorization:'Bearer '+key,
      Accept:'application/json'
    }
  };

  if(body!==undefined){
    opt.contentType='application/json';
    opt.payload=JSON.stringify(body);
  }

  var r=UrlFetchApp.fetch(url,opt);
  return {
    method:method,
    path:path,
    urlSansSecret:url,
    code:r.getResponseCode(),
    body:String(r.getContentText()||'').slice(0,5000)
  };
}

function EUC_DEV268_diag_(){
  var cfg=EUC_ENT_lireConfiguration();
  var out={
    version:'PFMP DEV268',
    horodatage:new Date().toISOString(),
    configuration:{
      environment:String(cfg.EUC_ENT_ENVIRONMENT||''),
      gristApiUrl:String(cfg.EUC_ENT_GRIST_API_URL||''),
      gristDocId:String(cfg.EUC_ENT_GRIST_DOC_ID||''),
      apiKeyPresente:!!String(cfg.EUC_ENT_GRIST_API_KEY||''),
      apiKeyLongueur:String(cfg.EUC_ENT_GRIST_API_KEY||'').length,
      docIdRecetteAutorise:
        (typeof EUC_ENT_DOC_ID_RECETTE_AUTORISE!=='undefined')
          ? String(EUC_ENT_DOC_ID_RECETTE_AUTORISE||'')
          : '(constante absente)'
    }
  };

  try{
    EUC_ENT_controlerCibleRecette_();
    out.gardeCible={
      ok:true,
      message:'EUC_ENT_controlerCibleRecette_ accepte la cible.'
    };
  }catch(e){
    out.gardeCible={
      ok:false,
      erreur:String(e&&e.message||e)
    };
  }

  try{
    var viaHelper=EUC_ENT_grist('get','/tables');
    var ids1=(viaHelper&&viaHelper.tables||[]).map(function(t){return t.id;});
    out.getTablesViaEUC_ENT_grist={
      ok:true,
      nombre:ids1.length,
      contientEUC_UTILISATEURS_PFMP:
        ids1.indexOf('EUC_UTILISATEURS_PFMP')>=0,
      exemples:ids1.slice(0,40)
    };
  }catch(e2){
    out.getTablesViaEUC_ENT_grist={
      ok:false,
      erreur:String(e2&&e2.message||e2)
    };
  }

  try{
    var rawGet=EUC_DEV268_rawFetch_('get','/tables');
    out.getTablesBrut=rawGet;

    try{
      var parsed=JSON.parse(rawGet.body||'{}');
      var ids2=(parsed.tables||[]).map(function(t){return t.id;});
      out.getTablesBrut.analyse={
        nombre:ids2.length,
        contientEUC_UTILISATEURS_PFMP:
          ids2.indexOf('EUC_UTILISATEURS_PFMP')>=0,
        exemples:ids2.slice(0,40)
      };
    }catch(parseErr){
      out.getTablesBrut.analyse={
        erreurParsing:String(parseErr&&parseErr.message||parseErr)
      };
    }
  }catch(e3){
    out.getTablesBrut={
      ok:false,
      erreur:String(e3&&e3.message||e3)
    };
  }

  /*
   * Test d'écriture NON DESTRUCTIF :
   * on tente d'ajouter un record dans une table volontairement inexistante.
   * 404 = la requête a atteint Grist avec authentification acceptée.
   * 401/403 = problème d'autorisation/API key.
   * Aucun objet réel ne doit être créé.
   */
  try{
    out.testEcritureNonDestructif=EUC_DEV268_rawFetch_(
      'post',
      '/tables/__EUC_DEV268_TABLE_INEXISTANTE__/records',
      {records:[{fields:{Diagnostic:'DEV268'}}]}
    );
  }catch(e4){
    out.testEcritureNonDestructif={
      ok:false,
      erreur:String(e4&&e4.message||e4)
    };
  }

  try{
    out.lectureTableCible=EUC_DEV268_rawFetch_(
      'get',
      '/tables/EUC_UTILISATEURS_PFMP/records'
    );
  }catch(e5){
    out.lectureTableCible={
      ok:false,
      erreur:String(e5&&e5.message||e5)
    };
  }

  return out;
}

function EUC_DEV268_afficherDiagnostic(e){
  var key=String(e&&e.parameter&&e.parameter.key||'');
  if(key!==EUC_DEV268_DIAG_KEY_){
    throw new Error('Clé diagnostic DEV268 invalide.');
  }

  var r=EUC_DEV268_diag_();
  var json=JSON.stringify(r,null,2)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');

  var h=
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Diagnostic Grist PFMP DEV268</title>'+
    '<style>'+
    'body{font-family:Arial,sans-serif;background:#f5f7fb;color:#18324b;padding:24px}'+
    '.card{max-width:1050px;margin:auto;background:white;border:1px solid #d8e0e8;border-radius:12px;padding:24px}'+
    'pre{white-space:pre-wrap;word-break:break-word;background:#f0f3f6;padding:18px;border-radius:8px;font-size:13px}'+
    '</style></head><body><div class="card">'+
    '<h2>Diagnostic Grist PFMP — DEV268</h2>'+
    '<p>Ce diagnostic ne crée ni ne supprime aucune table.</p>'+
    '<pre>'+json+'</pre>'+
    '</div></body></html>';

  return HtmlService.createHtmlOutput(h)
    .setTitle('Diagnostic Grist PFMP DEV268')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
