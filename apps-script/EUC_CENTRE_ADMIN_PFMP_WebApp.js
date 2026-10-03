/** Eucalyptus PFMP - v1.0.0-dev.270b - centre admin multi-domaines. */
function EUC_CENTRE_ADMIN_afficherApplication(e){
  var auth=String(e&&e.parameter&&e.parameter.auth||'').trim();
  var ctx=null;
  var authFailure='';
  if(auth){
    try{ctx=EUC_DEV270B_startSession_(auth);}
    catch(__expired){
      authFailure=EUC_DEV270B_failureCode_(__expired);
      try{ctx=EUC_DEV270B_contextOrNull_();}catch(__ctx){ctx=null;}
      if(!ctx)return EUC_DEV270B_loginPage_(authFailure);
    }
  }
  if(!ctx){try{ctx=EUC_DEV270B_contextOrNull_();}catch(__ctx2){ctx=null;}}
  if(!ctx)return EUC_DEV270B_loginPage_(authFailure);
  if(!ctx.autorise||['DDFPT','ADMIN_PFMP','BUREAU_ENTREPRISES'].indexOf(ctx.role)<0)throw new Error('Accès PFMP non autorisé.');
  var tpl=HtmlService.createTemplateFromFile('Admin_PFMP');
  tpl.config=JSON.stringify({version:'Eucalyptus PFMP - v1.0.0-dev.338',role:ctx.role,baseUrl:EUC_DEV338_ADMIN_URL_});
  return tpl.evaluate().setTitle('Administration PFMP').addMetaTag('viewport','width=device-width, initial-scale=1');
}
