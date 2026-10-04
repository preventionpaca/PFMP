function EUC_DEV401_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV401_year_(e,ctx){
  var y=EUC_DEV401_txt_(e&&e.parameter&&e.parameter.annee);
  return y||EUC_DEV401_txt_(ctx&&ctx.active);
}
function EUC_DEV401_enrichAffectations_(d,annee,classe,periode){
  d=d||{};
  try{
    if(typeof EUC_V156_affectations_!=='function')return d;
    var rows=EUC_V156_affectations_(annee,classe,periode)||[],by={};
    rows.forEach(function(a){
      var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
      var typ=EUC_DEV401_txt_(a.Type_suivi).toUpperCase();
      if(eid&&typ)by[eid+'|'+typ]=a;
    });
    (d.lignes||[]).forEach(function(x){
      var eid=Number(x.eleveId)||0;if(!eid)return;
      var tel=by[eid+'|TELEPHONE'],vis=by[eid+'|VISITE'];
      if(tel){
        x.professeurTelephone=EUC_DEV401_txt_(tel.Nom_professeur_snapshot)||EUC_DEV401_txt_(x.professeurTelephone);
        x.affectationTelephoneId=Number(tel.id)||Number(x.affectationTelephoneId)||0;
      }
      if(vis){
        x.professeurVisiteur=EUC_DEV401_txt_(vis.Nom_professeur_snapshot)||EUC_DEV401_txt_(x.professeurVisiteur);
        x.affectationVisiteId=Number(vis.id)||Number(x.affectationVisiteId)||0;
      }
    });
  }catch(e){}
  return d;
}
function EUC_DEV401_adminDetail(e){
  var trace=typeof EUC_DEV394_begin_==='function'&&typeof EUC_DEV394_finish_==='function';
  if(trace)EUC_DEV394_begin_('suivi-pfmp-classe');
  var t0=Date.now();
  try{
    var ctx=EUC_PFMP_contexteAnneeLectureV155_();
    var annee=EUC_DEV401_year_(e,ctx);
    var famille=EUC_DEV401_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO';
    var classe=Number(e&&e.parameter&&e.parameter.classe)||0;
    var periode=Number(e&&e.parameter&&e.parameter.periode)||0;
    if(!annee||!classe||!periode)throw new Error('Contexte détail incomplet.');
    var d=EUC_DEV416_finalDetail_(annee,famille,classe,periode);
    /* Le snapshot détaillé reste le chemin rapide. Les droits admin sont
       ajoutés sans relire la table des professeurs au chargement initial. */
    d.peutModifier=!!EUC_V156_contexteAdmin_();
    d.professeursDisponibles=[];
    d.professeursDisponiblesCharges=false;
    var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
    tpl.config=JSON.stringify({baseUrl:typeof EUC_DEV347_ADMIN_URL_!=='undefined'?EUC_DEV347_ADMIN_URL_:ScriptApp.getService().getUrl()});
    tpl.anneeContextJson=JSON.stringify(ctx||{});
    tpl.detailJson=JSON.stringify(d);

    /*
     * DEV402
     * Le template V156 attend jumpClassesJson depuis DEV357.
     * On reconstruit la liste avec le moteur de navigation déjà validé.
     */
    var jump=[];
    try{
      if(typeof EUC_DEV333_nav==='function'){
        var jr=EUC_DEV333_nav({
          annee:annee,
          famille:famille,
          classe:classe,
          periode:periode
        })||{};
        jump=(jr.items||[]).map(function(x){
          return {
            id:Number(x.classeId)||0,
            nom:String(x.classe||''),
            classe:String(x.classe||''),
            label:String(x.classe||''),
            famille:String(jr.famille||famille||'BACPRO'),
            periode:Number(x.periodeId)||0,
            current:!!x.current
          };
        });
      }
    }catch(eJump){
      console.log('[DEV406 jump] '+String(eJump&&eJump.message||eJump));
      jump=[];
    }
    tpl.jumpClassesJson=JSON.stringify(jump);
    tpl.dev186BreadcrumbHtml='';
    return tpl.evaluate().setTitle('Suivi PFMP — '+((d.classe&&d.classe.nom)||'Classe')).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } finally {
    if(trace)EUC_DEV394_finish_('EUC_DEV401_adminDetail',Date.now()-t0);
  }
}

function EUC_DEV435_professeursDisponibles(){
  if(!EUC_V156_contexteAdmin_())throw new Error('Accès administrateur requis.');
  return {ok:true,professeurs:EUC_V156_professeurs_()||[]};
}
