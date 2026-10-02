/**
 * Eucalyptus PFMP — v1.0.0-dev.281
 * Bool Grist robuste.
 */
function EUC_DEV281_bool_(v){
  if(v===true)return true;
  if(v===false)return false;

  if(typeof v==='number'){
    return v!==0;
  }

  var s=String(v==null?'':v)
    .trim()
    .toLowerCase();

  return (
    s==='1' ||
    s==='true' ||
    s==='oui' ||
    s==='yes' ||
    s==='x'
  );
}

function EUC_DEV281_active_(v){
  /*
   * Absence de colonne Actif = considéré actif
   * pour compatibilité avec les anciennes lignes.
   */
  if(v===undefined||v===null||v===''){
    return true;
  }

  return EUC_DEV281_bool_(v);
}
