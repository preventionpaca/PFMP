/**
 * PFMP DEV277B
 * Conversion unique des dates vers yyyy-MM-dd.
 */
function EUC_DEV277B_iso_(v){
  if(v===null||v===undefined||v==='')return '';

  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var d=EUC_IMPORT_dateExistanteISO_(v);
      if(d)return d;
    }
  }catch(e){}

  if(Object.prototype.toString.call(v)==='[object Date]'){
    try{
      return Utilities.formatDate(
        v,
        Session.getScriptTimeZone()||'Europe/Paris',
        'yyyy-MM-dd'
      );
    }catch(e2){}
  }

  if(typeof v==='number'&&isFinite(v)){
    var ms=v>1000000000000?v:v*1000;
    return Utilities.formatDate(
      new Date(ms),
      Session.getScriptTimeZone()||'Europe/Paris',
      'yyyy-MM-dd'
    );
  }

  var s=String(v).trim();

  if(/^\d{10}(?:\.\d+)?$/.test(s)){
    return Utilities.formatDate(
      new Date(Number(s)*1000),
      Session.getScriptTimeZone()||'Europe/Paris',
      'yyyy-MM-dd'
    );
  }

  if(/^\d{13}$/.test(s)){
    return Utilities.formatDate(
      new Date(Number(s)),
      Session.getScriptTimeZone()||'Europe/Paris',
      'yyyy-MM-dd'
    );
  }

  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;

  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);

  if(m){
    return m[3]+'-'+
      String(m[2]).padStart(2,'0')+'-'+
      String(m[1]).padStart(2,'0');
  }

  return '';
}
