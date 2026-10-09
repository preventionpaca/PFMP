/**
 * PFMP DEV466 — import JotForm fiable, idempotent et publié atomiquement.
 *
 * Garanties :
 * - sélection explicite et préflight complet avant toute écriture ;
 * - clé métier élève + classe + période + année ;
 * - écritures Grist groupées (créations puis compléments) ;
 * - aucune convention QR/déjà renseignée n'est écrasée ;
 * - tampon validé uniquement après relecture Grist ET contrôle de la vue ;
 * - reconstruction DEV425 limitée aux classes/périodes touchées.
 */
var EUC_DEV466_VERSION_='1.0.0-dev.503';

function EUC_DEV466_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV466_ref_(v){
  if(typeof EUC_DEV307_ref_==='function')return Number(EUC_DEV307_ref_(v))||0;
  if(Array.isArray(v))return Number(v[0])||0;
  return Number(v)||0;
}
function EUC_DEV466_key_(studentId,classId,periodId,year){
  return [Number(studentId)||0,Number(classId)||0,Number(periodId)||0,EUC_DEV466_txt_(year)].join('|');
}
function EUC_DEV466_empty_(v){
  return v===null||v===undefined||v===''||(Array.isArray(v)&&v.length===0);
}
function EUC_DEV466_family_(classe){
  if(typeof EUC_DEV453_familyForClass_==='function')return EUC_DEV453_familyForClass_(classe||{});
  var s=EUC_DEV466_txt_(classe&&(classe.Categorie||classe.Famille||classe.Code||classe.Libelle||classe.Nom)).toUpperCase();
  return s.indexOf('BTS')>=0?'BTS':(s.indexOf('CAP')>=0?'CAP':'BACPRO');
}
function EUC_DEV466_year_(student,years){
  var direct=EUC_DEV466_txt_(student&&(student.Annee_scolaire_code||student.Annee_scolaire));
  if(/^20\d{2}-20\d{2}$/.test(direct))return direct;
  var id=EUC_DEV466_ref_(student&&student.Annee_scolaire),found=null;
  (years||[]).some(function(y){if(Number(y.id)===id){found=y;return true;}return false;});
  return EUC_DEV466_txt_(found&&found.Code);
}
function EUC_DEV466_activeAccess_(a){
  return !!a&&a.Revoked!==true&&a.Supprimee_admin!==true;
}
function EUC_DEV466_isSubmitted_(a){
  if(typeof EUC_V50_estRemontee_==='function')return !!EUC_V50_estRemontee_(a);
  if(typeof EUC_DEV307_eligible_==='function')return !!EUC_DEV307_eligible_(a);
  return !!(a&&(a.Date_saisie_entreprise||a.Entreprise_raison_sociale||a.Entreprise_siret));
}
function EUC_DEV466_safeLabel_(row){
  return EUC_DEV466_txt_(row&&(row.Eleve_match_libelle||row.Eleve_saisi||row.Eleve_brut))||('ligne '+Number(row&&row.id||0));
}
function EUC_DEV466_verifiedSiret_(row){
  if(typeof EUC_DEV322_verifiedSiret_==='function')return !!EUC_DEV322_verifiedSiret_(row||{});
  return EUC_DEV466_txt_(row&&row.SIRET_statut).toUpperCase()==='VERIFIE';
}
function EUC_DEV468_isPdif_(period){
  var label=EUC_DEV466_txt_(period&&(period.type||period.Type||period.libelle||period.Libelle_periode||period.Code_periode));
  var normalized=label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
  return normalized.indexOf('PDIF')>=0||normalized.indexOf('PARCOURSDIFFERENCIE')>=0||normalized.indexOf('FINTERMINALE')>=0;
}
function EUC_DEV468_periodFor_(row,student,periods,links,offerId,classId,offers,meta,yearCode){
  var base=EUC_DEV312_periodFor_(row,student,periods,links,offerId,classId,offers);
  if(base&&base.ok)return base;

  var rawStart=EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
    'Date_debut_brut','Date_debut','Date début','Date debut','Debut','Début','Date_debut_PFMP','Date début PFMP'
  ]));
  var rawEnd=EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
    'Date_fin_brut','Date_fin','Date fin','Fin','Date_fin_PFMP','Date fin PFMP'
  ]));
  yearCode=EUC_DEV466_txt_(yearCode);
  if(!rawStart||!rawEnd||rawStart>rawEnd||!/^20\d{2}-20\d{2}$/.test(yearCode))return base;

  /*
   * DEV468 : JotForm peut contenir les dates réellement travaillées et non
   * les bornes complètes de la PFMP. On n'accepte ce cas que si l'intervalle
   * saisi est entièrement inclus dans une unique fenêtre officielle de la
   * vraie classe. Aucun rapprochement par simple chevauchement n'est permis.
   */
  var windows={};
  ((meta&&meta.periodes)||[]).forEach(function(period){
    if(!period||EUC_DEV468_isPdif_(period))return;
    var periodYear=EUC_DEV466_txt_(period.annee||period.Annee_scolaire);
    if(periodYear&&periodYear!==yearCode)return;
    var classIds=Array.isArray(period.classesConcernees)?period.classesConcernees:[];
    if(!classIds.some(function(id){return EUC_DEV466_ref_(id)===Number(classId);}))return;
    var officialStart=EUC_DEV307_dateISO_(period.debut||period.Date_debut);
    var officialEnd=EUC_DEV307_dateISO_(period.fin||period.Date_fin);
    if(!officialStart||!officialEnd||rawStart<officialStart||rawEnd>officialEnd)return;
    var key=officialStart+'|'+officialEnd;
    (windows[key]=windows[key]||[]).push(period);
  });

  var keys=Object.keys(windows);
  if(keys.length!==1){
    if(keys.length>1)return {ok:false,error:'Les dates saisies '+rawStart+' → '+rawEnd+' sont incluses dans plusieurs périodes officielles de la vraie classe ; contrôle manuel requis.'};
    return base;
  }
  var chosen=windows[keys[0]].sort(function(a,b){return Number(a.id||0)-Number(b.id||0);})[0];
  var bounds=keys[0].split('|');
  return {
    ok:true,
    period:chosen,
    start:bounds[0],
    end:bounds[1],
    correctionDate:'DEV468_INTERVALLE_INCLUS_UNIQUE',
    dateSaisieDebut:rawStart,
    dateSaisieFin:rawEnd,
    annee:yearCode
  };
}
function EUC_DEV503_dates_(row){
  return {
    start:EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
      'Date_debut_brut','Date_debut','Date début','Date debut','Debut','Début','Date_debut_PFMP','Date début PFMP'
    ])),
    end:EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
      'Date_fin_brut','Date_fin','Date fin','Fin','Date_fin_PFMP','Date fin PFMP'
    ]))
  };
}
function EUC_DEV503_periodsForClass_(meta,classId,yearCode){
  return ((meta&&meta.periodes)||[]).filter(function(period){
    if(!period||EUC_DEV468_isPdif_(period))return false;
    var periodYear=EUC_DEV466_txt_(period.annee||period.Annee_scolaire);
    if(periodYear&&periodYear!==EUC_DEV466_txt_(yearCode))return false;
    var classIds=Array.isArray(period.classesConcernees)?period.classesConcernees:[];
    return classIds.some(function(id){return EUC_DEV466_ref_(id)===Number(classId);});
  }).sort(function(a,b){
    var da=EUC_DEV466_txt_(a.debut||a.Date_debut),db=EUC_DEV466_txt_(b.debut||b.Date_debut);
    return da.localeCompare(db)||Number(a.id||0)-Number(b.id||0);
  });
}
function EUC_DEV503_overrideMap_(payload){
  var out={};
  (Array.isArray(payload&&payload.periodOverrides)?payload.periodOverrides:[]).forEach(function(item){
    var id=Number(item&&item.rowId)||0;
    if(id&&item&&item.enabled===true)out[id]=item;
  });
  return out;
}
function EUC_DEV503_periodOverride_(row,meta,classId,yearCode,item){
  if(!item)return null;
  var scenario=EUC_DEV466_txt_(item.scenario).toUpperCase();
  if(['DEBUT_RETARDE','AUTRE_SITUATION_EXCEPTIONNELLE'].indexOf(scenario)<0){
    throw new Error('Situation de dates invalide. Choisissez « Début retardé » ou « Autre situation exceptionnelle ».');
  }
  var periodId=Number(item.periodId)||0,period=EUC_DEV503_periodsForClass_(meta,classId,yearCode).filter(function(p){return Number(p.id)===periodId;})[0];
  if(!period)throw new Error('La période de rattachement choisie n’est pas autorisée pour la vraie classe et l’année de l’élève.');
  var source=EUC_DEV503_dates_(row),actualStart=EUC_DEV307_dateISO_(item.actualStart)||source.start;
  var actualEnd=EUC_DEV307_dateISO_(item.actualEnd)||source.end;
  var officialStart=EUC_DEV307_dateISO_(period.debut||period.Date_debut),officialEnd=EUC_DEV307_dateISO_(period.fin||period.Date_fin);
  var motive=EUC_DEV466_txt_(item.motive);
  if(!actualStart||!actualEnd||actualStart>actualEnd)throw new Error('Les dates réelles sont absentes ou incohérentes.');
  if(!officialStart||!officialEnd)throw new Error('Les bornes de la période officielle sont absentes.');
  if(!motive)throw new Error('Le motif du rattachement manuel est obligatoire.');
  if(scenario==='DEBUT_RETARDE'){
    if(actualStart<=officialStart)throw new Error('Pour un début retardé, la date réelle de début doit être postérieure au début officiel.');
    if(actualStart>officialEnd||actualEnd!==officialEnd)throw new Error('Pour un début retardé, la fin réelle doit rester la fin officielle de la PFMP.');
  }else if(actualEnd<officialStart||actualStart>officialEnd){
    throw new Error('Les dates réelles ne chevauchent pas la période officielle choisie.');
  }
  return {
    ok:true,period:period,start:officialStart,end:officialEnd,
    correctionDate:'DEV503_RATTACHEMENT_MANUEL',dateSaisieDebut:actualStart,dateSaisieFin:actualEnd,
    scenario:scenario,motive:motive,manual:true,annee:EUC_DEV466_txt_(yearCode)
  };
}
function EUC_DEV503_periodChoices(payload){
  EUC_IMPORT_exigerAdminTexte_();
  var selected=EUC_DEV466_selected_(payload),students=EUC_DEV307_flatRecords_(EUC_DEV307_STUDENTS_TABLE_),studentBy={};
  students.forEach(function(s){studentBy[Number(s.id)||0]=s;});
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),classBy={};
  (meta.classes||[]).forEach(function(c){classBy[Number(c.id)||0]=c;});
  var years=[];try{years=EUC_DEV307_flatRecords_('Annees_Scolaires');}catch(eYears){}
  return {rows:selected.map(function(row){
    var student=studentBy[Number(row.Eleve_match_id)||0]||{},classId=EUC_DEV466_ref_(student.Classe),year=EUC_DEV466_year_(student,years),dates=EUC_DEV503_dates_(row);
    var periods=EUC_DEV503_periodsForClass_(meta,classId,year).map(function(p){
      return {id:Number(p.id)||0,label:EUC_DEV466_txt_(p.type||p.libelle||p.Libelle_periode)||('Période '+p.id),start:EUC_DEV307_dateISO_(p.debut||p.Date_debut),end:EUC_DEV307_dateISO_(p.fin||p.Date_fin)};
    });
    return {rowId:Number(row.id)||0,student:EUC_DEV466_safeLabel_(row),classId:classId,classLabel:EUC_DEV466_txt_((classBy[classId]||{}).nom||(classBy[classId]||{}).libelle),year:year,actualStart:dates.start,actualEnd:dates.end,periods:periods};
  })};
}
function EUC_DEV503_specialFields_(periodRes,period){
  if(!periodRes||periodRes.manual!==true)return {};
  var scenario=periodRes.scenario==='DEBUT_RETARDE'?'Début retardé':'Situation exceptionnelle';
  var label=EUC_DEV466_txt_(period.type||period.libelle||period.Libelle_periode||period.Code_periode)||'PFMP';
  return {
    Date_debut:periodRes.dateSaisieDebut,
    Date_fin:periodRes.dateSaisieFin,
    Periode_libelle:label+' '+periodRes.start+' → '+periodRes.end+' — '+scenario+' : '+periodRes.dateSaisieDebut+' → '+periodRes.dateSaisieFin+' — '+periodRes.motive,
    Scenario_dates:periodRes.scenario,
    Date_officielle_debut:periodRes.start,
    Date_officielle_fin:periodRes.end,
    Date_declaree_debut:periodRes.dateSaisieDebut,
    Date_declaree_fin:periodRes.dateSaisieFin,
    Motif_ecart_dates:periodRes.motive
  };
}
function EUC_DEV466_mergeIncomplete_(existing,prepared,companyFields,columns){
  var out={},business={};
  Object.keys(companyFields||{}).forEach(function(k){business[k]=true;});
  Object.keys(prepared||{}).forEach(function(k){
    if(EUC_DEV466_empty_(existing&&existing[k]))out[k]=prepared[k];
  });
  Object.keys(companyFields||{}).forEach(function(k){out[k]=companyFields[k];});
  /* Ne jamais ramener un dossier déjà avancé à ENTREPRISE_SAISIE. */
  ['Statut','Statut_administratif'].forEach(function(k){
    var old=EUC_DEV466_txt_(existing&&existing[k]).toUpperCase();
    if(old&&old!=='CONVENTION_GENEREE'&&old!=='A_COMPLETER')delete out[k];
  });
  return EUC_DEV307_filterFields_(out,columns);
}
function EUC_DEV466_selected_(payload){
  payload=payload||{};
  var ids=Array.isArray(payload.ids)?payload.ids.map(function(x){return Number(x)||0;}).filter(function(x){return x>0;}):[];
  var unique={};ids.forEach(function(id){unique[id]=true;});ids=Object.keys(unique).map(Number);
  if(payload.manualSelection!==true||!ids.length)throw new Error('IMPORT BLOQUÉ : sélection explicite obligatoire.');
  var rows=EUC_DEV298_rows_(),selected=rows.filter(function(r){return !!unique[Number(r.id)||0];});
  if(selected.length!==ids.length){
    throw new Error('Sélection incohérente : '+ids.length+' ligne(s) demandée(s), '+selected.length+' retrouvée(s). Aucune écriture effectuée.');
  }
  return selected;
}
function EUC_DEV466_prepare_(selected,ctx,payload){
  var overrides=EUC_DEV503_overrideMap_(payload);
  var students=EUC_DEV307_flatRecords_(EUC_DEV307_STUDENTS_TABLE_),studentBy={};
  students.forEach(function(s){studentBy[Number(s.id)||0]=s;});
  var generatorStudents=EUC_CONVENTION_lireElevesAdmin(),genBy={};
  (generatorStudents||[]).forEach(function(s){genBy[Number(s.id)||0]=s;});
  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin(),classBy={},periodMetaBy={};
  (meta.classes||[]).forEach(function(c){classBy[Number(c.id)||0]=c;});
  (meta.periodes||[]).forEach(function(p){periodMetaBy[Number(p.id)||0]=p;});
  /* Ces tables d'aide n'existent pas dans toutes les générations du
   * document Grist. Le moteur DEV312 sait résoudre la période depuis les
   * données de classe/JotForm sans elles : une ancienne table absente ne
   * doit donc jamais bloquer l'import avant écriture. */
  var periods=[],links=[],years=[],offers=[];
  try{periods=EUC_DEV307_flatRecords_('Planning_Periodes');}catch(ePeriods){}
  try{links=EUC_DEV307_flatRecords_('EUC_OFFRES_PERIODES');}catch(eLinks){}
  try{years=EUC_DEV307_flatRecords_('Annees_Scolaires');}catch(eYears){}
  try{offers=EUC_DEV307_flatRecords_('EUC_OFFRES_FORMATION');}catch(eOffers){}
  var accesses=EUC_DEV307_flatRecords_(EUC_DEV307_ACCESS_TABLE_);
  var columns=EUC_DEV307_columns_(EUC_DEV307_ACCESS_TABLE_),byKey={};
  if(Object.keys(overrides).length){
    Object.assign(columns,{Scenario_dates:'Text',Date_officielle_debut:'Date',Date_officielle_fin:'Date',Date_declaree_debut:'Date',Date_declaree_fin:'Date',Motif_ecart_dates:'Text'});
  }
  accesses.filter(EUC_DEV466_activeAccess_).forEach(function(a){
    var k=EUC_DEV466_key_(EUC_DEV466_ref_(a.Eleve),EUC_DEV466_ref_(a.Classe_convention),EUC_DEV466_ref_(a.Periode),a.Annee_scolaire);
    (byKey[k]=byKey[k]||[]).push(a);
  });
  Object.keys(byKey).forEach(function(k){byKey[k].sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});});
  var items=[],errors=[],seen={};
  selected.forEach(function(row){
    var label=EUC_DEV466_safeLabel_(row);
    try{
      if(!EUC_DEV466_verifiedSiret_(row))throw new Error('SIRET non vérifié.');
      var studentId=Number(row.Eleve_match_id)||0,student=studentBy[studentId],genStudent=genBy[studentId];
      if(!studentId||!student||!genStudent)throw new Error('Élève rapproché introuvable dans EUC_ELEVES_PFMP.');
      var realClassId=EUC_DEV466_ref_(student.Classe),chosenClassId=Number(row.Classe_match_id)||0;
      if(!realClassId||!classBy[realClassId])throw new Error('Classe actuelle de l’élève introuvable.');
      if(chosenClassId&&chosenClassId!==realClassId)throw new Error('La classe choisie dans JotForm ne correspond pas à la classe actuelle de l’élève. Corrigez le rapprochement avant import.');
      var year=EUC_DEV466_year_(student,years);
      if(!/^20\d{2}-20\d{2}$/.test(year))throw new Error('Année scolaire de l’élève introuvable.');
      var offerId=EUC_DEV466_ref_(student.Offre_formation)||EUC_DEV466_ref_(row.Offre_formation);
      var periodRes=EUC_DEV503_periodOverride_(row,meta,realClassId,year,overrides[Number(row.id)||0])||EUC_DEV468_periodFor_(row,student,periods,links,offerId,realClassId,offers,meta,year);
      if(!periodRes||!periodRes.ok)throw new Error(EUC_DEV466_txt_(periodRes&&periodRes.error)||'Période officielle introuvable ou ambiguë.');
      var periodId=Number(periodRes.period&&periodRes.period.id)||0;
      if(!periodId)throw new Error('Identifiant de période officielle absent.');
      var period=periodMetaBy[periodId]||{id:periodId,libelle:EUC_DEV466_txt_(periodRes.period.Libelle_periode||periodRes.period.Code_periode||periodRes.period.Type),debut:periodRes.start,fin:periodRes.end};
      var siret=EUC_DEV466_txt_(row.SIRET_normalise||row.SIRET_brut).replace(/\D/g,'');
      if(siret.length!==14)throw new Error('SIRET invalide : 14 chiffres attendus.');
      var key=EUC_DEV466_key_(studentId,realClassId,periodId,year);
      if(seen[key])throw new Error('Deux lignes sélectionnées visent le même élève, la même classe et la même période. Ne conservez qu’une ligne.');
      seen[key]=true;
      var existing=(byKey[key]||[])[0]||null,existingSiret=EUC_DEV466_txt_(existing&&existing.Entreprise_siret).replace(/\D/g,'');
      if(existing&&EUC_DEV466_isSubmitted_(existing)&&existingSiret&&existingSiret!==siret){
        throw new Error('Conflit QR/JotForm : une convention existe déjà avec un autre SIRET. Aucune donnée n’a été écrasée.');
      }
      var prepared=EUC_CONVENTION_preparerRecordAcces_(ctx,genStudent,classBy[realClassId],period,year,{lot:'MIGRATION_JOTFORM_DEV466'});
      var preparedFields=(prepared.record&&prepared.record.fields)||prepared.record||{};
      var companyFields=typeof EUC_DEV528_companyFields_==='function'?EUC_DEV528_companyFields_(row,ctx,columns):EUC_DEV307_companyFields_(row,ctx,columns),specialFields=EUC_DEV503_specialFields_(periodRes,period),mode='CREATE',fields=null,accessId=0;
      if(existing&&EUC_DEV466_isSubmitted_(existing)){
        mode='EXISTING';fields={};accessId=Number(existing.id)||0;
      }else if(existing){
        mode='COMPLETE';accessId=Number(existing.id)||0;
        fields=EUC_DEV466_mergeIncomplete_(existing,preparedFields,companyFields,columns);
      }else{
        fields=EUC_DEV307_filterFields_(Object.assign({},preparedFields,companyFields),columns);
      }
      if(periodRes.manual===true&&mode!=='EXISTING')fields=Object.assign({},fields,EUC_DEV307_filterFields_(specialFields,columns));
      items.push({rowId:Number(row.id)||0,label:label,studentId:studentId,classId:realClassId,periodId:periodId,year:year,family:EUC_DEV466_family_(classBy[realClassId]),key:key,siret:siret,mode:mode,fields:fields,accessId:accessId,datesSpeciales:periodRes.manual===true});
    }catch(e){errors.push({id:Number(row.id)||0,eleve:label,erreur:EUC_DEV466_txt_(e&&e.message||e)});}
  });
  if(errors.length){
    throw new Error('PRÉCONTRÔLE BLOQUÉ — aucune écriture effectuée. '+errors.slice(0,5).map(function(e){return e.eleve+' : '+e.erreur;}).join(' | '));
  }
  return {items:items,accessesBefore:accesses.length};
}
function EUC_DEV466_readback_(items){
  var rows=EUC_DEV307_flatRecords_(EUC_DEV307_ACCESS_TABLE_),byKey={};
  rows.filter(EUC_DEV466_activeAccess_).forEach(function(a){
    var key=EUC_DEV466_key_(EUC_DEV466_ref_(a.Eleve),EUC_DEV466_ref_(a.Classe_convention),EUC_DEV466_ref_(a.Periode),a.Annee_scolaire);
    (byKey[key]=byKey[key]||[]).push(a);
  });
  Object.keys(byKey).forEach(function(k){byKey[k].sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});});
  var errors=[];
  items.forEach(function(item){
    var a=(byKey[item.key]||[])[0]||null,siret=EUC_DEV466_txt_(a&&a.Entreprise_siret).replace(/\D/g,'');
    if(!a||!EUC_DEV466_isSubmitted_(a))errors.push({id:item.rowId,eleve:item.label,erreur:'Convention absente ou incomplète après relecture Grist.'});
    else if(item.siret&&siret&&item.siret!==siret)errors.push({id:item.rowId,eleve:item.label,erreur:'Le SIRET relu dans Grist ne correspond pas au SIRET contrôlé.'});
    else item.accessId=Number(a.id)||0;
  });
  return {rows:rows,errors:errors};
}
function EUC_DEV466_verifyViews_(items){
  var groups={},errors=[];
  items.forEach(function(item){
    var key=item.year+'|'+item.family+'|'+item.classId+'|'+item.periodId;
    (groups[key]=groups[key]||[]).push(item);
  });
  Object.keys(groups).forEach(function(k){
    var target=groups[k][0],detail=null;
    try{detail=EUC_DEV416_cacheGet_(EUC_DEV416_key_(target.year,target.family,target.classId,target.periodId));}catch(e){}
    if(!detail||!Array.isArray(detail.lignes)){
      groups[k].forEach(function(item){errors.push({id:item.rowId,eleve:item.label,erreur:'Vue reconstruite introuvable dans le cache publié.'});});return;
    }
    groups[k].forEach(function(item){
      var line=(detail.lignes||[]).filter(function(x){return Number(x.eleveId)===item.studentId;})[0]||null;
      var status=EUC_DEV466_txt_(line&&(line.statutCode||line.statut)).toUpperCase();
      if(!line||status==='SANS_CONVENTION'||!status){
        errors.push({id:item.rowId,eleve:item.label,erreur:'La vue de classe ne publie pas encore la convention pour la période choisie.'});
      }
    });
  });
  return errors;
}
function EUC_DEV466_importSelection(payload){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Un autre import PFMP est déjà en cours.');
  try{
    var started=Date.now(),ctx=EUC_IMPORT_exigerAdminTexte_(),selected=EUC_DEV466_selected_(payload),plan=EUC_DEV466_prepare_(selected,ctx,payload),items=plan.items;
    if(Object.keys(EUC_DEV503_overrideMap_(payload)).length)EUC_CONVENTION_assurerTableAcces_();
    var tokens=EUC_DEV425_beginImportItems_(items,'import-jotform-dev466'),creates=[],updates=[];
    items.forEach(function(item){
      if(item.mode==='CREATE')creates.push({fields:item.fields});
      else if(item.mode==='COMPLETE')updates.push({id:item.accessId,fields:item.fields});
    });
    if(creates.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(EUC_DEV307_ACCESS_TABLE_)+'/records',{records:creates});
    if(updates.length)EUC_ENT_grist('patch','/tables/'+encodeURIComponent(EUC_DEV307_ACCESS_TABLE_)+'/records',{records:updates});
    var readback=EUC_DEV466_readback_(items);
    if(readback.errors.length){
      throw new Error('CONTRÔLE GRIST ÉCHOUÉ — le tampon reste à contrôler. '+readback.errors.slice(0,5).map(function(e){return e.eleve+' : '+e.erreur;}).join(' | '));
    }
    var snapshots=EUC_DEV425_finishMany_(tokens),viewErrors=EUC_DEV466_verifyViews_(items);
    if(viewErrors.length){
      throw new Error('PUBLICATION INCOMPLÈTE — aucune ligne du tampon n’est marquée validée. Relancez le même lot sans risque de doublon. '+viewErrors.slice(0,5).map(function(e){return e.eleve+' : '+e.erreur;}).join(' | '));
    }
    EUC_DEV322_patchBufferValidated_(items.map(function(x){return x.rowId;}),ctx);
    var list=EUC_DEV298_lister(),created=items.filter(function(x){return x.mode==='CREATE';}).length;
    var completed=items.filter(function(x){return x.mode==='COMPLETE';}).length;
    var existing=items.filter(function(x){return x.mode==='EXISTING';}).length;
    list.validationBilan={
      selectionnees:items.length,creees:created,completees:completed,dejaExistantes:existing,
      lieesEleves:items.length,verifiees:items.length,affichees:items.length,rejetees:0,
      cibleAvant:plan.accessesBefore,cibleApres:readback.rows.length,erreurs:[],
      idempotent:true,publicationAtomique:true,table:EUC_DEV307_ACCESS_TABLE_,snapshotSync:{ok:true,details:snapshots},
      dureeMs:Date.now()-started
    };
    return list;
  }finally{lock.releaseLock();}
}
