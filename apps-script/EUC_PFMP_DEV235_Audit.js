function EUC_DEV235_AUDIT_afficher(e){
  return HtmlService
    .createTemplateFromFile('Audit_DEV235_1MP3D')
    .evaluate()
    .setTitle('Audit DEV235 — 1MP3D')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV235_AUDIT_ping(){
  return {
    ok:true,
    now:new Date().toISOString()
  };
}

function EUC_DEV235_AUDIT_test1MP3D(){
  var t0=new Date().getTime();

  var raw=EUC_DEV235_loadStudentsJson(
    '2026-2027',
    7,
    '1MP3D'
  );

  var afterCall=new Date().getTime();
  var parsed=JSON.parse(raw);
  var afterParse=new Date().getTime();
  var students=(parsed&&parsed.students)||[];

  return {
    ok:true,
    totalMs:afterParse-t0,
    callMs:afterCall-t0,
    parseMs:afterParse-afterCall,
    count:students.length,
    source:parsed&&parsed.source||'',
    first:students.length ? students[0] : null,
    jsonLength:String(raw||'').length
  };
}
