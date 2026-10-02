/** PFMP DEV269 - création directe de EUC_UTILISATEURS_PFMP avec réponse HTTP brute. */
var EUC_DEV269_INSTALL_KEY_='a02d0abc2a541a5548616201481dbc4e';

function EUC_DEV269_fetch_(method,path,body){
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
    code:r.getResponseCode(),
    body:String(r.getContentText()||'')
  };
}

function EUC_DEV269_run_(){
  var out={
    version:'PFMP DEV269',
    cible:null,
    avant:null,
    creation:null,
    apres:null,
    insertion:null,
    verification:null
  };

  var cfg=EUC_ENT_lireConfiguration();
  out.cible={
    gristApiUrl:String(cfg.EUC_ENT_GRIST_API_URL||''),
    gristDocId:String(cfg.EUC_ENT_GRIST_DOC_ID||''),
    environment:String(cfg.EUC_ENT_ENVIRONMENT||'')
  };

  out.avant=EUC_DEV269_fetch_(
    'get',
    '/tables/EUC_UTILISATEURS_PFMP/records'
  );

  if(out.avant.code===404){
    var schema={
      tables:[{
        id:'EUC_UTILISATEURS_PFMP',
        columns:[
          {id:'Email',fields:{label:'Email',type:'Text'}},
          {id:'Nom_affichage',fields:{label:'Nom affichage',type:'Text'}},
          {id:'Role',fields:{label:'Rôle',type:'Text'}},
          {id:'Actif',fields:{label:'Actif',type:'Bool'}},
          {id:'Mode_acces',fields:{label:'Mode accès',type:'Text'}},
          {id:'Peut_voir_toutes_classes',fields:{label:'Peut voir toutes les classes',type:'Bool'}},
          {id:'Commentaire',fields:{label:'Commentaire',type:'Text'}}
        ]
      }]
    };

    out.creation=EUC_DEV269_fetch_('post','/tables',schema);
  }else{
    out.creation={
      method:'skip',
      path:'/tables',
      code:0,
      body:'Table déjà existante : création ignorée.'
    };
  }

  out.apres=EUC_DEV269_fetch_(
    'get',
    '/tables/EUC_UTILISATEURS_PFMP/records'
  );

  if(out.apres.code===200){
    var existing=[];
    try{
      existing=(JSON.parse(out.apres.body||'{}').records||[]);
    }catch(e){}

    var byEmail={};
    existing.forEach(function(r){
      var f=r.fields||{};
      var email=String(f.Email||'').trim().toLowerCase();
      if(email)byEmail[email]=r;
    });

    var wanted=[
      {
        Email:'r.les.mines@gmail.com',
        Nom_affichage:'Rudy Thémines',
        Role:'DDFPT',
        Actif:true,
        Mode_acces:'ECRITURE',
        Peut_voir_toutes_classes:true,
        Commentaire:'Ajout DEV269'
      },
      {
        Email:'sabine.durandy@lycee-les-eucalyptus.org',
        Nom_affichage:'Sabine Durandy',
        Role:'DDFPT',
        Actif:true,
        Mode_acces:'ECRITURE',
        Peut_voir_toutes_classes:true,
        Commentaire:'Ajout DEV269'
      }
    ];

    var create=[];
    var update=[];

    wanted.forEach(function(fields){
      var k=fields.Email.toLowerCase();
      if(byEmail[k]){
        update.push({
          id:byEmail[k].id,
          fields:fields
        });
      }else{
        create.push({fields:fields});
      }
    });

    out.insertion={create:null,update:null};

    if(create.length){
      out.insertion.create=EUC_DEV269_fetch_(
        'post',
        '/tables/EUC_UTILISATEURS_PFMP/records',
        {records:create}
      );
    }

    if(update.length){
      out.insertion.update=EUC_DEV269_fetch_(
        'patch',
        '/tables/EUC_UTILISATEURS_PFMP/records',
        {records:update}
      );
    }
  }

  out.verification=EUC_DEV269_fetch_(
    'get',
    '/tables/EUC_UTILISATEURS_PFMP/records'
  );

  return out;
}

function EUC_DEV269_afficherInstallation(e){
  var key=String(e&&e.parameter&&e.parameter.key||'');
  if(key!==EUC_DEV269_INSTALL_KEY_){
    throw new Error('Clé DEV269 invalide.');
  }

  var r=EUC_DEV269_run_();
  var ok=
    r.verification &&
    r.verification.code===200;

  var json=JSON.stringify(r,null,2)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');

  var h=
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>PFMP DEV269</title>'+
    '<style>'+
    'body{font-family:Arial,sans-serif;background:#f5f7fb;color:#17324d;padding:24px}'+
    '.card{max-width:1050px;margin:auto;background:#fff;border:1px solid #d8e0e8;border-radius:12px;padding:24px}'+
    '.ok{color:#087f5b}.ko{color:#c92a2a}'+
    'pre{white-space:pre-wrap;word-break:break-word;background:#f0f3f6;padding:16px;border-radius:8px;font-size:13px}'+
    '</style></head><body><div class="card">'+
    '<h2>PFMP DEV269</h2>'+
    '<p class="'+(ok?'ok':'ko')+'"><strong>'+
      (ok?'✓ Table EUC_UTILISATEURS_PFMP accessible':'✗ Création non confirmée')+
    '</strong></p>'+
    '<pre>'+json+'</pre>'+
    '</div></body></html>';

  return HtmlService.createHtmlOutput(h)
    .setTitle('PFMP DEV269')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
