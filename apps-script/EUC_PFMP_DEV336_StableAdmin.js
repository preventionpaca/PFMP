var EUC_DEV336_ADMIN_URL_=
  'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';

function EUC_DEV336_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV336_ref_(v){
  if(typeof EUC_PFMP_ref_==='function'){
    return Number(EUC_PFMP_ref_(v))||0;
  }
  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(Number(v[i])>0)return Number(v[i]);
    }
  }
  return Number(v)||0;
}

function EUC_DEV336_date_(v){
  try{
    var x=EUC_IMPORT_dateExistanteISO_(v);
    if(x)return x;
  }catch(e){}
  if(typeof v==='number'&&isFinite(v)){
    var d=new Date(v*1000);
    return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  var s=EUC_DEV336_txt_(v);
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?m[1]+'-'+m[2]+'-'+m[3]:'';
}

function EUC_DEV336_afficherApprentis(e){
  var y=EUC_DEV190X_years_();
  var current=
    EUC_DEV336_txt_(e&&e.parameter&&e.parameter.annee)||
    EUC_DEV336_txt_(y.current);
  var years=(y.years||[]).slice();
  if(current&&years.indexOf(current)<0)years.unshift(current);
  var classes=EUC_DEV190X_classes_(current,false)||[];
  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190X');
  t.bootJson=JSON.stringify({
    currentYear:current,
    years:years,
    classes:classes,
    webappUrl:EUC_DEV336_ADMIN_URL_
  });
  return t.evaluate()
    .setTitle('Gestion des apprentis')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV336_afficherAccueil(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var annee=
    EUC_DEV336_txt_(e&&e.parameter&&e.parameter.annee)||
    EUC_DEV336_txt_(ctx.active);
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_LazyV190K4');
  t.paramsJson=JSON.stringify({annee:annee});
  return t.evaluate()
    .setTitle('Suivi des conventions PFMP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV336_afficherFamille(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var annee=
    EUC_DEV336_txt_(e&&e.parameter&&e.parameter.annee)||
    EUC_DEV336_txt_(ctx.active);
  var famille=
    EUC_DEV336_txt_(e&&e.parameter&&e.parameter.famille)||
    'BACPRO';
  var data;
  if(famille==='BACPRO'&&typeof EUC_DEV291_family==='function'){
    data=EUC_DEV291_family({annee:annee,famille:'BACPRO'});
  }else{
    var fast=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});
    data=fast&&fast.ready&&fast.payload
      ? fast.payload
      : {ok:true,ready:false,annee:annee,famille:famille,classes:[]};
    data.ready=!!(fast&&fast.ready&&fast.payload);
  }
  data=data||{ok:true,ready:false,annee:annee,famille:famille,classes:[]};
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});
  t.dataJson=JSON.stringify(data);
  return t.evaluate()
    .setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function EUC_DEV336_resumeAccueil(payload){
  return EUC_DEV335_resumeAccueil(payload||{});
}

function EUC_DEV336_appRows_(){
  try{
    return (EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[])
      .filter(function(r){return r.Actif!==false;});
  }catch(e){
    return [];
  }
}

function EUC_DEV336_appStatus_(rows,eid,debut,fin){
  debut=EUC_DEV336_date_(debut);
  fin=EUC_DEV336_date_(fin);
  var list=(rows||[])
    .filter(function(r){
      return EUC_DEV336_ref_(r.Eleve)===Number(eid);
    })
    .map(function(r){
      return {
        debut:EUC_DEV336_date_(r.Date_debut),
        fin:EUC_DEV336_date_(r.Date_fin)||'9999-12-31',
        entreprise:EUC_DEV336_txt_(r.Nom_entreprise||r.Entreprise),
        tuteur:EUC_DEV336_txt_(r.Tuteur_nom),
        tel:EUC_DEV336_txt_(r.Tuteur_telephone),
        mail:EUC_DEV336_txt_(r.Tuteur_courriel)
      };
    })
    .filter(function(r){return !!r.debut;});
  if(!debut||!fin){
    return list.length?{code:'APPRENTI',record:list[0]}:{code:'SCOLAIRE'};
  }
  var full=list.filter(function(r){return r.debut<=debut&&r.fin>=fin;})[0];
  if(full)return {code:'APPRENTI',record:full};
  var part=list.filter(function(r){return r.debut<=fin&&r.fin>=debut;})[0];
  if(part)return {code:'MIXTE',record:part};
  return {code:'SCOLAIRE'};
}

function EUC_DEV336_enrichDetail_(detail,annee,classe,periode){
  detail=detail||{};
  var rows=EUC_DEV336_appRows_();
  var debut=detail.periode&&(detail.periode.debut||detail.periode.Date_debut);
  var fin=detail.periode&&(detail.periode.fin||detail.periode.Date_fin);
  var ap=0,avec=0,sans=0,ann=0,intp=0;

  (detail.lignes||[]).forEach(function(x){
    var st=EUC_DEV336_appStatus_(rows,x.eleveId,debut,fin);
    x.apprenti=st.code==='APPRENTI';
    x.statutMixte=st.code==='MIXTE';

    if(x.apprenti){
      ap++;
      x.statutCode='APPRENTI';
      x.statut='APPRENTI';
      if(st.record&&!EUC_DEV336_txt_(x.entreprise)){
        x.entreprise=st.record.entreprise;
      }
      if(st.record&&!EUC_DEV336_txt_(x.tuteurEntreprise)){
        x.tuteurEntreprise=[
          st.record.tuteur,
          st.record.tel,
          st.record.mail
        ].filter(Boolean).join(' · ');
      }
      return;
    }

    var code=EUC_DEV336_txt_(x.statutCode||x.statut).toUpperCase();
    if(code.indexOf('ANNULEE')>=0)ann++;
    else if(code.indexOf('INTERROMP')>=0)intp++;
    else if(Number(x.conventionId)>0)avec++;
    else sans++;
  });

  detail.stats=detail.stats||{};
  detail.stats.total=(detail.lignes||[]).length;
  detail.stats.apprentis=ap;
  detail.stats.avecConvention=avec;
  detail.stats.sansConvention=sans;
  detail.stats.annulees=ann;
  detail.stats.interrompues=intp;
  return detail;
}
