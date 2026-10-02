var EUC_DEV353_PUBLIC_URL_='https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg/exec';
function EUC_DEV353_t_(v){return String(v==null?'':v).trim();}
function EUC_DEV353_y_(e){var y=EUC_DEV353_t_(e&&e.parameter&&e.parameter.annee);if(y)return y;try{return EUC_DEV353_t_(EUC_PFMP_contexteAnneeLectureV155_().active);}catch(err){return '';}}
function EUC_DEV353_family_(a,f){
 if(typeof EUC_DEV347_family_==='function'){try{return EUC_DEV347_family_(a,f);}catch(e){}}
 if(typeof EUC_DEV340_familyData_==='function'){try{var d=EUC_DEV340_familyData_(a,f);if(d)return d;}catch(e2){}}
 return {ok:true,ready:false,annee:a,famille:f,classes:[]};
}
function EUC_DEV353_detail_(a,f,c,p){
 if(typeof EUC_DEV347_detail==='function'){try{return EUC_DEV347_detail(a,f,c,p);}catch(e){}}
 var q=EUC_DEV190I_readOne({annee:a,famille:f,classe:c,periode:p});
 var d=(q&&q.ready&&q.detail)?q.detail:EUC_SUIVI_CLASSE_detailF18_(a,c,p);
 if(typeof EUC_DEV340_enrichConventions_==='function')d=EUC_DEV340_enrichConventions_(d,a,c,p);
 if(typeof EUC_DEV340_enrichApprentis_==='function')d=EUC_DEV340_enrichApprentis_(d);
 return d;
}
function EUC_DEV353_jumpClasses(annee,ordinal){
 ordinal=Math.max(0,Number(ordinal)||0);
 var out=[];
 ['BACPRO','BTS','CAP'].forEach(function(f){
  var d=EUC_DEV353_family_(annee,f);
  (d.classes||[]).forEach(function(c){
   var ps=c.periodes||[],p=ps[ordinal]||ps[0]||null;
   if(!p)return;
   out.push({id:Number(c.classeId||c.id)||0,nom:String(c.classe||c.nom||''),famille:f,periode:Number(p.id)||0});
  });
 });
 out=out.filter(function(x){return x.id&&x.nom&&x.periode;});
 out.sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});
 return out;
}
function EUC_DEV353_publicApprentis(e){
 var y=EUC_DEV190X_years_(),current=EUC_DEV353_y_(e)||EUC_DEV353_t_(y.current),years=(y.years||[]).slice();
 if(current&&years.indexOf(current)<0)years.unshift(current);
 var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_PublicClone_V353');
 t.bootJson=JSON.stringify({currentYear:current,years:years,classes:EUC_DEV190X_classes_(current,false)||[],webappUrl:EUC_DEV353_PUBLIC_URL_,readonly:true,publicMode:true});
 return t.evaluate().setTitle('Apprentis — consultation').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV353_publicSummary(e){
 var a=EUC_DEV353_y_(e),t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_Clone_V353');
 t.paramsJson=JSON.stringify({annee:a});t.baseUrl=EUC_DEV353_PUBLIC_URL_;
 return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV353_publicFamily(e){
 var a=EUC_DEV353_y_(e),f=EUC_DEV353_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO',t=HtmlService.createTemplateFromFile('Suivi_Conventions_Public_FamilleClone_V353');
 t.paramsJson=JSON.stringify({annee:a,famille:f});t.dataJson=JSON.stringify(EUC_DEV353_family_(a,f));t.baseUrl=EUC_DEV353_PUBLIC_URL_;
 return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_DEV353_publicDetail(e){
 var a=EUC_DEV353_y_(e),f=EUC_DEV353_t_(e&&e.parameter&&e.parameter.famille)||'BACPRO',c=Number(e&&e.parameter&&e.parameter.classe)||0,p=Number(e&&e.parameter&&e.parameter.periode)||0,d=EUC_DEV353_detail_(a,f,c,p),ctx=EUC_PFMP_contexteAnneeLectureV155_();
 var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_PublicClone_V353');
 t.config=JSON.stringify({baseUrl:EUC_DEV353_PUBLIC_URL_,readonly:true,publicMode:true});
 t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(d);t.dev186BreadcrumbHtml='';
 return t.evaluate().setTitle('Point sur les stages').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
