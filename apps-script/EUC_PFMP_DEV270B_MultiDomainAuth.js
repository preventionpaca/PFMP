/** Eucalyptus PFMP - v1.0.0-dev.270b - authentification multi-domaines. */
var EUC_DEV270B_SECRET_PROPERTY_='EUC_DEV270B_HMAC_SECRET';
var EUC_DEV270B_GATEWAY_BASE_='https://script.google.com/macros/s/AKfycbyQ34i64GObLXSFFd9ixCks_16OAPdv2IUNoPq6SRMUiWWxxfli_fXQmrG_z8GZr-0Q/exec';
var EUC_DEV270B_ADMIN_BASE_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';
var EUC_DEV270B_SESSION_TTL_=21600;

function EUC_DEV270B_b64uBytes_(s){
  var pad=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
  while(pad.length%4)pad+='=';
  return Utilities.base64Decode(pad);
}
function EUC_DEV270B_b64uText_(s){
  return Utilities.newBlob(EUC_DEV270B_b64uBytes_(s)).getDataAsString();
}
function EUC_DEV270B_b64u_(bytes){
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');
}
function EUC_DEV270B_secret_(){
  var value=String(
    PropertiesService.getScriptProperties().getProperty(
      EUC_DEV270B_SECRET_PROPERTY_
    )||''
  ).trim();
  if(value.length<32){
    throw new Error('Secret d’authentification PFMP absent ou invalide.');
  }
  return value;
}
function EUC_DEV270B_sign_(payload){
  return EUC_DEV270B_b64u_(
    Utilities.computeHmacSha256Signature(
      payload,
      EUC_DEV270B_secret_(),
      Utilities.Charset.UTF_8
    )
  );
}
function EUC_DEV270B_safeEq_(a,b){
  a=String(a||''); b=String(b||'');
  if(a.length!==b.length)return false;
  var d=0;
  for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);
  return d===0;
}
function EUC_DEV270B_sessionKey_(){
  var k=String(Session.getTemporaryActiveUserKey()||'').trim();
  return k?'EUC_DEV270B_SESSION_'+k:'';
}
function EUC_DEV270B_contextOrNull_(){
  var k=EUC_DEV270B_sessionKey_();
  if(!k)return null;
  var raw=CacheService.getScriptCache().get(k);
  if(!raw)return null;
  try{
    var ctx=JSON.parse(raw);
    return ctx&&ctx.autorise?ctx:null;
  }catch(e){
    return null;
  }
}
function EUC_DEV270B_lookupUser_(email){
  email=String(email||'').trim().toLowerCase();
  if(!email)return null;

  var r=EUC_ENT_grist('get','/tables/EUC_UTILISATEURS_PFMP/records');
  var rows=(r&&r.records)||[];

  for(var i=0;i<rows.length;i++){
    var f=rows[i].fields||rows[i];
    if(
      f.Actif!==false &&
      String(f.Email||'').trim().toLowerCase()===email
    ){
      var role=String(f.Role||'').trim().toUpperCase();
      if(['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(role)<0){
        return null;
      }
      var ro=String(f.Mode_acces||'').trim().toUpperCase()==='LECTURE_SEULE';
      return {
        autorise:true,
        email:email,
        nom:String(f.Nom_affichage||email),
        role:role,
        classes:[],
        peutVoirToutesClasses:f.Peut_voir_toutes_classes!==false,
        peutModifier:!ro,
        peutSaisir:!ro,
        peutAnnuler:!ro,
        peutPurgerTests:role==='ADMIN_PFMP',
        lectureSeule:ro,
        origineAutorisation:'EUC_UTILISATEURS_PFMP'
      };
    }
  }
  return null;
}
function EUC_DEV270B_startSession_(token){
  token=String(token||'').trim();
  if(!token)throw new Error('Authentification PFMP manquante.');

  var parts=token.split('.');
  if(parts.length!==2)throw new Error('Jeton PFMP invalide.');

  var payload=parts[0], sig=parts[1];

  if(!EUC_DEV270B_safeEq_(sig,EUC_DEV270B_sign_(payload))){
    throw new Error('Signature PFMP invalide.');
  }

  var data;
  try{
    data=JSON.parse(EUC_DEV270B_b64uText_(payload));
  }catch(e){
    throw new Error('Jeton PFMP illisible.');
  }

  var now=Math.floor(Date.now()/1000);
  if(!data.exp || Number(data.exp)<now || Number(data.iat)>now+60){
    throw new Error('Jeton PFMP expiré.');
  }

  var ctx=EUC_DEV270B_lookupUser_(data.email);
  if(!ctx){
    throw new Error(
      'Compte Google authentifié mais non autorisé dans PFMP : '+
      String(data.email||'')
    );
  }

  var sk=EUC_DEV270B_sessionKey_();
  if(!sk)throw new Error('Session navigateur PFMP introuvable.');

  CacheService.getScriptCache().put(
    sk,
    JSON.stringify(ctx),
    EUC_DEV270B_SESSION_TTL_
  );

  return ctx;
}
function EUC_DEV270B_loginPage_(){
  var u=String(EUC_DEV270B_GATEWAY_BASE_||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');

  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Connexion administration PFMP</title>'+
    '<style>body{font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:32px;color:#17324d}'+
    '.card{max-width:650px;margin:60px auto;background:#fff;border:1px solid #d9e2ec;border-radius:14px;padding:28px}'+
    '.btn{display:inline-block;margin-top:16px;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700}</style>'+
    '</head><body><div class="card">'+
    '<h2>Administration PFMP</h2>'+
    '<p>Une authentification Google est nécessaire.</p>'+
    '<a class="btn" target="_top" href="'+u+'">Se connecter avec Google</a>'+
    '</div></body></html>'
  ).setTitle('Connexion administration PFMP');
}
