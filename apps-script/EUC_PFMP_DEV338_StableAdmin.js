/** PFMP — v1.0.0-dev.338 */
var EUC_DEV338_ADMIN_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec';

function EUC_DEV338_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV338_year_(e){
  var y=EUC_DEV338_txt_(e&&e.parameter&&e.parameter.annee);
  if(y)return y;
  var c=EUC_PFMP_contexteAnneeLectureV155_();
  return EUC_DEV338_txt_(c&&c.active);
}
function EUC_DEV338_summary_(annee){
  var raw=EUC_DEV335_resumeAccueil({annee:annee})||{};
  var src=raw.familles||{};
  var spec={
    BACPRO:[['Terminale',2,true],['Première',2,true],['Seconde',1,false]],
    BTS:[['1re année',1,true],['2e année',1,true]],
    CAP:[['TCAP',2,false],['1CAP',1,false]]
  };
  var out={ok:true,version:'DEV.338',annee:annee,familles:{}};
  Object.keys(spec).forEach(function(fam){
    var by={};
    ((src[fam]&&src[fam].niveaux)||[]).forEach(function(l){by[EUC_DEV338_txt_(l.niveau)]=l||{};});
    out.familles[fam]={niveaux:spec[fam].map(function(rule){
      var name=rule[0], count=rule[1], apps=rule[2], s=by[name]||{}, ps=s.periodes||[], periods=[];
      for(var i=0;i<count;i++){
        var p=ps[i]||{};
        periods.push({
          ordinal:i+1,
          libelle:fam==='BTS'?'Stage n°'+(i+1):'PFMP n°'+(i+1),
          conventions:Number(p.conventions)||0,
          eleves:Number(p.eleves)||0,
          apprentis:apps?(Number(p.apprentis)||0):0
        });
      }
      return {niveau:name,periodes:periods,pdif:(fam==='BACPRO'&&name==='Terminale')?(s.pdif||null):null};
    })};
  });
  return out;
}
function EUC_DEV338_afficherAccueil(e){
  var annee=EUC_DEV338_year_(e), t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_Summary_V338');
  t.dataJson=JSON.stringify(EUC_DEV338_summary_(annee));
  t.paramsJson=JSON.stringify({annee:annee});
  t.baseUrl=EUC_DEV338_ADMIN_URL_;
  return t.evaluate().setTitle('Suivi des conventions PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV338_afficherFamille(e){
  var annee=EUC_DEV338_year_(e),famille=EUC_DEV338_txt_(e&&e.parameter&&e.parameter.famille)||'BACPRO',data;
  if(famille==='BACPRO'&&typeof EUC_DEV291_family==='function') data=EUC_DEV291_family({annee:annee,famille:famille});
  else {
    var fast=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});
    data=(fast&&fast.ready&&fast.payload)?fast.payload:{ok:true,ready:false,annee:annee,famille:famille,classes:[]};
    data.ready=!!(fast&&fast.ready&&fast.payload);
  }
  var t=HtmlService.createTemplateFromFile('Suivi_Conventions_Admin_FamilleV190L');
  t.paramsJson=JSON.stringify({annee:annee,famille:famille});
  t.dataJson=JSON.stringify(data||{});
  t.baseUrl=EUC_DEV338_ADMIN_URL_;
  return t.evaluate().setTitle('Suivi des conventions — '+(famille==='BACPRO'?'BAC PRO':famille)).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV338_afficherApprentis(e){
  var y=EUC_DEV190X_years_(),current=EUC_DEV338_year_(e)||EUC_DEV338_txt_(y.current),years=(y.years||[]).slice();
  if(current&&years.indexOf(current)<0)years.unshift(current);
  var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V190X');
  t.bootJson=JSON.stringify({currentYear:current,years:years,classes:EUC_DEV190X_classes_(current,false)||[],webappUrl:EUC_DEV338_ADMIN_URL_});
  return t.evaluate().setTitle('Gestion des apprentis').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV338_afficherPdif(e){
  var y=EUC_DEV190X_years_(),current=EUC_DEV338_year_(e)||EUC_DEV338_txt_(y.current),years=(y.years||[]).slice();
  if(current&&years.indexOf(current)<0)years.unshift(current);
  var t=HtmlService.createTemplateFromFile('Parcours_Differencie_PFMP_V190X');
  t.bootJson=JSON.stringify({currentYear:current,years:years,classes:EUC_DEV190X_classes_(current,true)||[],webappUrl:EUC_DEV338_ADMIN_URL_});
  return t.evaluate().setTitle('Fin de Terminale').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV338_afficherSnapshot(e){
  var t=HtmlService.createTemplateFromFile('Snapshot_PFMP_Admin_V190');
  t.baseUrl=EUC_DEV338_ADMIN_URL_;
  return t.evaluate().setTitle('Maintenance Snapshot PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV338_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++){var n=Number(v[i]);if(n>0)return n;}}
  return Number(v)||0;
}
function EUC_DEV338_date_(v){
  try{if(typeof EUC_IMPORT_dateExistanteISO_==='function'){var x=EUC_IMPORT_dateExistanteISO_(v);if(x)return x;}}catch(e){}
  if(typeof v==='number'&&isFinite(v)){var d=new Date(v*1000);return isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
  var s=EUC_DEV338_txt_(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?m[1]+'-'+m[2]+'-'+m[3]:'';
}
function EUC_DEV338_appRowsFast_(){
  try{return EUC_IMPORT_lireRecords_('EUC_APPRENTISSAGE_PFMP')||[];}catch(e){return [];}
}
function EUC_DEV338_appStatusFast_(rows,eid,debut,fin){
  debut=EUC_DEV338_date_(debut);fin=EUC_DEV338_date_(fin);
  var bestFull=null,bestPart=null;
  for(var i=0;i<(rows||[]).length;i++){
    var r=rows[i]||{};
    if(EUC_DEV338_ref_(r.Eleve)!==Number(eid))continue;
    var d=EUC_DEV338_date_(r.Date_debut);
    if(!d)continue;
    var f=EUC_DEV338_date_(r.Date_fin)||'9999-12-31';
    var rec={
      debut:d,fin:f,
      entreprise:EUC_DEV338_txt_(r.Nom_entreprise||r.Entreprise),
      tuteur:EUC_DEV338_txt_(r.Tuteur_nom),
      tel:EUC_DEV338_txt_(r.Tuteur_telephone),
      mail:EUC_DEV338_txt_(r.Tuteur_courriel)
    };
    if(debut&&fin&&d<=debut&&f>=fin){bestFull=rec;break;}
    if(debut&&fin&&d<=fin&&f>=debut&&!bestPart)bestPart=rec;
  }
  if(bestFull)return {code:'APPRENTI',record:bestFull};
  if(bestPart)return {code:'MIXTE',record:bestPart};
  return {code:'SCOLAIRE'};
}
function EUC_DEV338_enrichDetail_(detail){
  detail=detail||{};
  var rows=EUC_DEV338_appRowsFast_();
  var debut=detail.periode&&(detail.periode.debut||detail.periode.Date_debut);
  var fin=detail.periode&&(detail.periode.fin||detail.periode.Date_fin);
  var avec=0,sans=0,ann=0,intp=0,ap=0;
  (detail.lignes||[]).forEach(function(x){
    var st=EUC_DEV338_appStatusFast_(rows,x.eleveId,debut,fin);
    x.apprenti=st.code==='APPRENTI';
    x.statutMixte=st.code==='MIXTE';
    x.statutApprentissage=st.code;
    if(x.apprenti){
      ap++;x.statutCode='APPRENTI';x.statut='APPRENTI';
      if(st.record&&!EUC_DEV338_txt_(x.entreprise))x.entreprise=st.record.entreprise;
      if(st.record&&!EUC_DEV338_txt_(x.tuteurEntreprise)){
        x.tuteurEntreprise=[st.record.tuteur,st.record.tel,st.record.mail].filter(Boolean).join(' · ');
      }
      return;
    }
    var code=EUC_DEV338_txt_(x.statutCode||x.statut).toUpperCase();
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
