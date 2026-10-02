function EUC_DEV415_publicDetail(e){

  var ctx=EUC_PFMP_contexteAnneeLectureV155_();

  var annee=
    typeof EUC_DEV401_year_==='function'
      ? EUC_DEV401_year_(e,ctx)
      : String(e&&e.parameter&&e.parameter.annee||'').trim();

  var famille=
    typeof EUC_DEV401_txt_==='function'
      ? EUC_DEV401_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO'
      : String(e&&e.parameter&&e.parameter.famille||'BACPRO');

  var classe=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periode=Number(e&&e.parameter&&e.parameter.periode)||0;

  if(!annee||!classe||!periode){
    throw new Error('Contexte détail PUBLIC incomplet.');
  }

  /*
   * EXACTEMENT LE PIPELINE ADMIN DEV401
   */
  var d=EUC_DEV416_finalDetail_(annee,famille,classe,periode);

  /*
   * EXACTEMENT LA LISTE DE CLASSES ADMIN
   */
  var jump=[];

  try{
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
        famille:String(jr.famille||famille),
        periode:Number(x.periodeId)||0,
        current:!!x.current
      };
    });
  }catch(e4){}

  /*
   * EXACTEMENT LE TEMPLATE ADMIN
   */
  var tpl=HtmlService.createTemplateFromFile(
    'Suivi_PFMP_Classe_Detail_V156'
  );

  tpl.config=JSON.stringify({
    baseUrl:'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec',
    readonly:true,
    publicMode:true
  });

  tpl.anneeContextJson=JSON.stringify(ctx||{});
  tpl.detailJson=JSON.stringify(d);
  tpl.jumpClassesJson=JSON.stringify(jump);
  tpl.dev186BreadcrumbHtml='';

  var html=tpl.evaluate().getContent();

  /*
   * Toutes les routes ADMIN du HTML rendu deviennent PUBLIC.
   * Aucun changement dans le vrai template ADMIN.
   */
  html=html.split(
    'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'
  ).join(
    'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec'
  );

  html=html.replace(
    /page=suivi-pfmp-classe(?!-public)/g,
    'page=suivi-pfmp-classe-public'
  );

  html=html.replace(
    /page=suivi-conventions-famille(?!-public)/g,
    'page=suivi-conventions-public-famille'
  );

  html=html.replace(
    /page=suivi-conventions(?!-public)/g,
    'page=suivi-conventions-public'
  );

  html=html.replace(
    /'suivi-pfmp-classe'/g,
    "'suivi-pfmp-classe-public'"
  );

  html=html.replace(
    /'suivi-conventions-famille'/g,
    "'suivi-conventions-public-famille'"
  );

  /*
   * Lecture seule :
   * on masque seulement les commandes ADMIN.
   */
  var lock=
    '<style id="EUC_DEV415_READONLY">'+
    '#assignToolbar,#assignToolbarV156,'+
    '#assignStatus,#assignStatusV156,'+
    '#mailParams,#sendTable,#mailModal,'+
    '#retModalV162,#selectHead,'+
    '#euc340SnapshotDetail,'+
    '.mail-actions,.assignbar,.assign-status,'+
    '.student-check,'+
    'input[type="checkbox"].rowcheck,'+
    'button[id^="retire"],'+
    'a[href*="admin-pfmp"],'+
    'a[href*="snapshot-pfmp-admin"]'+
    '{display:none!important}'+
    '</style>';

  html=html.replace(
    /<\/head>/i,
    lock+'</head>'
  );

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(
      'Point sur les stages — '+
      ((d.classe&&d.classe.nom)||'Classe')
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
