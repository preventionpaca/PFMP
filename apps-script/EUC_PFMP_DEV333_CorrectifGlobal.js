/**
 * PFMP — v1.0.0-dev.333
 * Correctif global suivi / apprentissage.
 * Lecture du suivi : pas d'écriture métier dans ce module, hors wrapper
 * explicite de sauvegarde de l'écran Gestion des apprentis.
 */

function EUC_DEV333_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV333_norm_(v){return EUC_DEV333_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'');}
function EUC_DEV333_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++){if(Number(v[i])>0)return Number(v[i]);}}
  return Number(v)||0;
}
function EUC_DEV333_level_(name,fam){
  var n=EUC_DEV333_txt_(name).toUpperCase();
  if(fam==='BACPRO'){
    if(/^T/.test(n)||/TERMINALE/.test(n))return'Terminale';
    if(/^1/.test(n)||/PREMIERE/.test(n))return'Première';
    if(/^2/.test(n)||/SECONDE/.test(n))return'Seconde';
  }
  if(fam==='BTS'){
    if(/^2/.test(n))return'Deuxième année';
    return'Première année';
  }
  if(fam==='CAP'){
    if(/^T/.test(n)||/^2/.test(n)||/TERMINALE/.test(n))return'Terminale CAP';
    return'Première CAP';
  }
  return'Autres';
}
function EUC_DEV333_order_(fam){
  if(fam==='BACPRO')return['Terminale','Première','Seconde'];
  if(fam==='BTS')return['Première année','Deuxième année'];
  if(fam==='CAP')return['Terminale CAP','Première CAP'];
  return['Autres'];
}
function EUC_DEV333_expected_(fam,level){
  if(fam==='BACPRO')return level==='Seconde'?1:((level==='Terminale'||level==='Première')?2:0);
  if(fam==='BTS')return 1;
  if(fam==='CAP')return level==='Terminale CAP'?2:(level==='Première CAP'?1:0);
  return 0;
}
function EUC_DEV333_appsAllowed_(fam,level){
  if(fam==='BACPRO')return level==='Terminale'||level==='Première';
  if(fam==='BTS')return true;
  return false;
}
function EUC_DEV333_isPdif_(p){
  p=p||{};
  if(p.isPdif===true||p.pdif===true||p.parcoursDifferencie===true||p.parcoursDifferencies!==undefined)return true;
  var n=EUC_DEV333_norm_(p.v50Slot||p.v51Slot||p.libelle||p.nom||p.type||'');
  return n.indexOf('PDIF')>=0||n.indexOf('PARCOURSDIFFERENCIE')>=0;
}
function EUC_DEV333_fast_(annee,fam){
  var r=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:fam});
  return r&&r.ready&&r.payload?r.payload:{ok:true,ready:false,annee:annee,famille:fam,classes:[]};
}
function EUC_DEV333_apps_(annee,fam){
  try{
    if(typeof EUC_DEV275_familyApprentis==='function')return EUC_DEV275_familyApprentis({annee:annee,famille:fam})||{classes:[]};
  }catch(e){}
  try{
    if(typeof EUC_APP172_chargerFamille==='function')return EUC_APP172_chargerFamille({annee:annee,famille:fam})||{classes:[]};
  }catch(e2){}
  return {classes:[]};
}
function EUC_DEV333_pdif_(annee){
  try{
    if(typeof EUC_DEV291_family==='function')return EUC_DEV291_family({annee:annee,famille:'BACPRO'})||{classes:[]};
  }catch(e){}
  return {classes:[]};
}
function EUC_DEV333_cname_(c){return EUC_DEV333_txt_(c&&(c.classe||c.nom||c.classeNom||c.code||c.Code_classe));}
function EUC_DEV333_cid_(c){return Number(c&&(c.classeId||c.id))||0;}
function EUC_DEV333_appIndex_(d){var o={};(d&&d.classes||[]).forEach(function(c){o[String(Number(c.classeId)||0)]=c;});return o;}
function EUC_DEV333_appPeriod_(c,p,index){
  if(!c)return null;
  var pid=Number(p&&p.id)||0,arr=c.periodes||[];
  if(pid){var x=arr.filter(function(q){return Number(q.id)===pid;})[0];if(x)return x;}
  return arr[index]||null;
}
function EUC_DEV333_periodLabel_(fam,n){return fam==='BTS'?'Stage n°'+n:'PFMP n°'+n;}

function EUC_DEV333_resumeOne_(annee,fam){
  var raw=EUC_DEV333_fast_(annee,fam);
  var apps=EUC_DEV333_apps_(annee,fam);
  var appBy=EUC_DEV333_appIndex_(apps);
  var pdifData=fam==='BACPRO'?EUC_DEV333_pdif_(annee):{classes:[]};
  var pdifBy={};
  (pdifData.classes||[]).forEach(function(c){pdifBy[String(EUC_DEV333_cid_(c))]=c;});
  var order=EUC_DEV333_order_(fam),levels={};
  order.forEach(function(n){levels[n]={niveau:n,periodes:[],pdif:null};});

  (raw.classes||[]).forEach(function(c){
    var name=EUC_DEV333_cname_(c),cid=EUC_DEV333_cid_(c),levelName=EUC_DEV333_level_(name,fam);
    if(!levels[levelName])levels[levelName]={niveau:levelName,periodes:[],pdif:null};
    var l=levels[levelName],expected=EUC_DEV333_expected_(fam,levelName),allowApps=EUC_DEV333_appsAllowed_(fam,levelName),appClass=appBy[String(cid)]||null;
    var normal=(c.periodes||[]).filter(function(p){return !EUC_DEV333_isPdif_(p);}).slice(0,expected);
    normal.forEach(function(p,index){
      if(!l.periodes[index])l.periodes[index]={ordinal:index+1,libelle:EUC_DEV333_periodLabel_(fam,index+1),conventions:0,eleves:0,apprentis:0};
      var d=l.periodes[index],ap=EUC_DEV333_appPeriod_(appClass,p,index);
      d.conventions+=Number(p.conventions)||0;
      if(allowApps&&ap){
        d.eleves+=Number(ap.total!==undefined?ap.total:p.total)||0;
        d.apprentis+=Number(ap.apprentis)||0;
      }else{
        d.eleves+=Number(p.total)||0;
      }
    });

    if(fam==='BACPRO'&&levelName==='Terminale'){
      var pc=pdifBy[String(cid)]||{};
      var pp=(pc.periodes||[]).filter(EUC_DEV333_isPdif_)[0]||{};
      if(!l.pdif)l.pdif={libelle:'P.dif.',lycee:0,entreprise:0,aDefinir:0};
      l.pdif.lycee+=Number(pc.parcoursDifferencies!==undefined?pc.parcoursDifferencies:pp.parcoursDifferencies)||0;
      l.pdif.entreprise+=Number(pc.poursuitePfmp2!==undefined?pc.poursuitePfmp2:pp.poursuitePfmp2)||0;
      l.pdif.aDefinir+=Number(pc.aDefinirFinTerminale!==undefined?pc.aDefinirFinTerminale:pp.aDefinirFinTerminale)||0;
    }
  });

  return {famille:fam,niveaux:order.filter(function(n){var l=levels[n];return l&&((l.periodes||[]).length||(fam==='BACPRO'&&n==='Terminale'&&l.pdif));}).map(function(n){var l=levels[n];l.periodes=(l.periodes||[]).filter(Boolean);return l;})};
}

function EUC_DEV333_resumeNiveaux(payload){
  payload=payload||{};
  var annee=EUC_DEV333_txt_(payload.annee);
  if(!annee){var ctx=EUC_PFMP_contexteAnneeLectureV155_();annee=EUC_DEV333_txt_(ctx&&ctx.active);}
  if(!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Année scolaire invalide.');
  return {ok:true,version:'DEV.333',annee:annee,familles:{BACPRO:EUC_DEV333_resumeOne_(annee,'BACPRO'),BTS:EUC_DEV333_resumeOne_(annee,'BTS'),CAP:EUC_DEV333_resumeOne_(annee,'CAP')}};
}

function EUC_DEV333_pick_(obj,names){
  obj=obj||{};
  if(typeof EUC_DEV315_pick_==='function')return EUC_DEV315_pick_(obj,names);
  var norm={};Object.keys(obj).forEach(function(k){norm[EUC_DEV333_norm_(k)]=k;});
  for(var i=0;i<names.length;i++){
    if(Object.prototype.hasOwnProperty.call(obj,names[i])&&EUC_DEV333_txt_(obj[names[i]]))return obj[names[i]];
    var k=norm[EUC_DEV333_norm_(names[i])];if(k&&EUC_DEV333_txt_(obj[k]))return obj[k];
  }
  return '';
}
function EUC_DEV333_contact_(r){
  if(!r)return'';
  var nom=[EUC_DEV333_txt_(r.Responsable_prenom),EUC_DEV333_txt_(r.Responsable_nom)].filter(Boolean).join(' ').trim();
  return [nom,EUC_DEV333_txt_(r.Responsable_telephone),EUC_DEV333_txt_(r.Responsable_courriel)].filter(Boolean).join(' · ');
}
function EUC_DEV333_bufferContacts_(){
  var out={};
  try{
    if(typeof EUC_DEV316_rawBuffer_!=='function')return out;
    (EUC_DEV316_rawBuffer_()||[]).forEach(function(r){
      var eid=Number(r.Eleve_match_id)||0;if(!eid)return;
      var nom=EUC_DEV333_pick_(r,['Nom du responsable','Responsable_nom','Nom responsable','Responsable entreprise']);
      var tel=EUC_DEV333_pick_(r,['Téléphone entreprise','Telephone entreprise','Responsable_telephone','Téléphone responsable','Telephone responsable']);
      var mail=EUC_DEV333_pick_(r,["Adresse e-mail de l'entreprise",'Adresse email de l entreprise','Responsable_courriel','Responsable_email','Email responsable','Courriel responsable']);
      var c=[EUC_DEV333_txt_(nom),EUC_DEV333_txt_(tel),EUC_DEV333_txt_(mail)].filter(Boolean).join(' · ');
      if(c)out[eid]=c;
    });
  }catch(e){}
  return out;
}

function EUC_DEV333_enrichDetail_(detail,annee,classeId,periodeId){
  detail=detail||{};
  try{
    if(typeof EUC_APP172_enrichirDetail==='function')detail=EUC_APP172_enrichirDetail(detail)||detail;
    else if(typeof EUC_APP172_eval==='function'&&typeof EUC_APP172_rows==='function'){
      var rows=EUC_APP172_rows(),debut=detail&&detail.periode&&detail.periode.debut,fin=detail&&detail.periode&&detail.periode.fin,ap=0,mx=0;
      (detail.lignes||[]).forEach(function(x){
        var st=EUC_APP172_eval(rows,x.eleveId,debut,fin);x.statutApprentissage=st.code;x.apprenti=st.code==='APPRENTI';x.statutMixte=st.code==='MIXTE';if(x.apprenti)ap++;if(x.statutMixte)mx++;
        if(st.record&&x.apprenti){if(!x.entreprise)x.entreprise=st.record.entreprise;if(!x.tuteurEntreprise)x.tuteurEntreprise=[st.record.tuteur,st.record.tel,st.record.mail].filter(Boolean).join(' · ');}
      });
      detail.stats=detail.stats||{};detail.stats.apprentis=ap;detail.stats.mixtes=mx;
    }
  }catch(eApp){}

  var accessBy={};
  try{
    (EUC_CONVENTION_lireAccesFraisV108_()||[]).filter(function(a){
      if(EUC_DEV333_ref_(a.Classe_convention)!==Number(classeId))return false;
      if(periodeId&&EUC_DEV333_ref_(a.Periode)!==Number(periodeId))return false;
      var an=EUC_DEV333_txt_(a.Annee_scolaire);return !annee||!an||an===annee;
    }).forEach(function(a){
      var eid=EUC_DEV333_ref_(a.Eleve);if(!eid)return;
      if(!accessBy[eid]||Number(a.id)>Number(accessBy[eid].id))accessBy[eid]=a;
    });
  }catch(eAcc){}
  var buffer=EUC_DEV333_bufferContacts_();
  var apCount=0,avec=0,ann=0,intp=0;
  (detail.lignes||[]).forEach(function(x){
    var eid=Number(x.eleveId)||0;
    if(x.apprenti){
      apCount++;x.statutCode='APPRENTI';x.statut='Apprenti';x.conventionId=0;
    }else{
      var sc=EUC_DEV333_norm_(x.statutCode||x.statut||'');
      if(x.conventionId>0&&sc!=='ANNULEE'&&sc!=='INTERROMPUE'&&sc!=='SUPPRIMEE')avec++;
      if(sc==='ANNULEE')ann++;
      if(sc==='INTERROMPUE')intp++;
    }
    if(!EUC_DEV333_txt_(x.contactEntreprise)){
      x.contactEntreprise=EUC_DEV333_contact_(accessBy[eid])||buffer[eid]||'';
    }
  });
  detail.stats=detail.stats||{};
  detail.stats.total=(detail.lignes||[]).length;
  detail.stats.apprentis=apCount;
  detail.stats.avecConvention=avec;
  detail.stats.annulees=ann;
  detail.stats.interrompues=intp;
  detail.stats.sansConvention=Math.max(0,detail.stats.total-apCount-avec-ann-intp);
  return detail;
}

function EUC_DEV333_appData(payload){
  payload=payload||{};
  var d=EUC_APP172_data(payload)||{};
  if(!(d.annees||[]).length){try{var ctx=EUC_PFMP_contexteAnneeLectureV155_();d.annees=ctx.annees||[];}catch(e){d.annees=[];}}
  if(!(d.classes||[]).length){
    try{d.classes=EUC_IMPORT_lireRecords_('Classes').filter(function(c){return c.Actif!==false;}).map(function(c){return {id:Number(c.id),nom:typeof EUC_V154_classeNom_==='function'?EUC_V154_classeNom_(c):EUC_DEV333_txt_(c.Nom||c.Libelle||c.Code)};}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr');});}catch(e2){d.classes=[];}
  }
  return d;
}
function EUC_DEV333_appSave(payload){
  var r=EUC_APP172_save(payload||{});
  try{CacheService.getScriptCache().remove('EUC_APP172_SNAP_'+EUC_DEV333_txt_(payload&&payload.annee));}catch(e){}
  return r;
}

function EUC_DEV333_nav(payload){
  payload=payload||{};
  var annee=EUC_DEV333_txt_(payload.annee),fam=EUC_DEV333_txt_(payload.famille)||'BACPRO',cid=Number(payload.classe)||0,pid=Number(payload.periode)||0;
  if(!annee||!cid||!pid)return {ok:false,items:[]};
  var data=EUC_DEV333_fast_(annee,fam),classes=data.classes||[],cur=classes.filter(function(c){return EUC_DEV333_cid_(c)===cid;})[0]||null;
  if(!cur)return {ok:false,items:[]};
  var level=EUC_DEV333_level_(EUC_DEV333_cname_(cur),fam),curP=(cur.periodes||[]).filter(function(p){return Number(p.id)===pid;})[0]||null,isPdif=EUC_DEV333_isPdif_(curP),normal=(cur.periodes||[]).filter(function(p){return !EUC_DEV333_isPdif_(p);}),ord=-1;
  if(!isPdif){for(var i=0;i<normal.length;i++){if(Number(normal[i].id)===pid){ord=i;break;}}}
  var items=[];
  classes.filter(function(c){return EUC_DEV333_level_(EUC_DEV333_cname_(c),fam)===level;}).sort(function(a,b){return EUC_DEV333_cname_(a).localeCompare(EUC_DEV333_cname_(b),'fr');}).forEach(function(c){
    var ps=c.periodes||[],target=null;
    if(isPdif)target=ps.filter(EUC_DEV333_isPdif_)[0]||null;
    else{var nps=ps.filter(function(p){return !EUC_DEV333_isPdif_(p);});target=ord>=0?nps[ord]||null:null;}
    if(target)items.push({classeId:EUC_DEV333_cid_(c),classe:EUC_DEV333_cname_(c),periodeId:Number(target.id)||0,current:EUC_DEV333_cid_(c)===cid});
  });
  return {ok:true,annee:annee,famille:fam,niveau:level,items:items};
}

