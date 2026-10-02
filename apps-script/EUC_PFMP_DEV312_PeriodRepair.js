/**
 * PFMP — v1.0.0-dev.312
 * Corrige le rattachement de période des conventions issues de la migration JotForm.
 */

function EUC_DEV312_offerIds_(student,classId,offerId,offers){
  var out={};
  if(Number(offerId)>0)out[Number(offerId)]=true;

  var code=EUC_DEV307_norm_(
    student.Code_classe_importe||student.Classe_nom||''
  );

  (offers||[]).forEach(function(o){
    if(o.Actif===false)return;
    var sameClass=EUC_DEV307_ref_(o.Classe)===Number(classId);
    var sameCode=code&&(
      EUC_DEV307_norm_(o.Code_classe)===code||
      EUC_DEV307_norm_(o.Classe_code)===code||
      EUC_DEV307_norm_(o.Classe_nom)===code
    );
    if(sameClass||sameCode)out[Number(o.id)]=true;
  });

  return out;
}

function EUC_DEV312_periodFor_(row,student,periods,links,offerId,classId,offers){
  var fallback=EUC_DEV307_periodFor_(
    row,student,periods,links,offerId,classId,offers
  );

  var rawStart=EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
    'Date_debut_brut','Date_debut','Date début','Date debut',
    'Debut','Début','Date_debut_PFMP','Date début PFMP'
  ]));
  var rawEnd=EUC_DEV307_dateISO_(EUC_DEV307_pick_(row,[
    'Date_fin_brut','Date_fin','Date fin','Fin',
    'Date_fin_PFMP','Date fin PFMP'
  ]));
  if(!rawStart||!rawEnd)return fallback;

  var offerIds=EUC_DEV312_offerIds_(student,classId,offerId,offers);
  if(!Object.keys(offerIds).length)return fallback;

  var allowed={};
  (links||[]).forEach(function(l){
    if(l.Active===false)return;
    var oid=EUC_DEV307_ref_(l.Offre_formation);
    if(!offerIds[oid])return;
    var pid=EUC_DEV307_ref_(l.Periode);
    if(pid)allowed[pid]=true;
  });
  if(!Object.keys(allowed).length)return fallback;

  var yearCode=(typeof EUC_DEV310_yearCode_==='function')
    ? EUC_DEV310_yearCode_(student)
    : '';

  var variants=[{start:rawStart,end:rawEnd,mode:'BRUT'}];
  if(typeof EUC_DEV309_addDays_==='function'){
    variants.push({
      start:EUC_DEV309_addDays_(rawStart,1),
      end:EUC_DEV309_addDays_(rawEnd,1),
      mode:'TAMPON_PLUS_1_JOUR'
    });
  }

  var scored=[];
  (periods||[]).forEach(function(per){
    var pid=Number(per.id)||0;
    if(!pid||!allowed[pid]||per.Actif===false)return;
    if(typeof EUC_DEV309_isPdif_==='function'&&EUC_DEV309_isPdif_(per))return;
    if(yearCode&&typeof EUC_DEV310_periodYearOk_==='function'&&
       !EUC_DEV310_periodYearOk_(per,student,yearCode))return;

    var os=EUC_DEV307_dateISO_(per.Date_debut);
    var oe=EUC_DEV307_dateISO_(per.Date_fin);
    if(!os||!oe)return;

    var best=null;
    variants.forEach(function(v){
      var ds=(typeof EUC_DEV310_dayDiff_==='function')
        ? EUC_DEV310_dayDiff_(v.start,os) : 99999;
      var de=(typeof EUC_DEV310_dayDiff_==='function')
        ? EUC_DEV310_dayDiff_(v.end,oe) : 99999;
      if(ds>3||de>14)return;
      var it={p:per,ds:ds,de:de,score:(ds*100)+de,variant:v};
      if(!best||it.score<best.score)best=it;
    });
    if(best)scored.push(best);
  });

  if(!scored.length)return fallback;
  scored.sort(function(a,b){
    return a.score-b.score||Number(a.p.id)-Number(b.p.id);
  });

  var best=scored[0];
  return {
    ok:true,
    period:best.p,
    start:EUC_DEV307_dateISO_(best.p.Date_debut),
    end:EUC_DEV307_dateISO_(best.p.Date_fin),
    correctionDate:'DEV312_PERIODE_EXACTE_OFFRE',
    dateSaisieDebut:best.variant.start,
    dateSaisieFin:best.variant.end,
    ecartDebutJours:best.ds,
    ecartFinJours:best.de,
    annee:yearCode
  };
}

function EUC_DEV312_isMigrationAccess_(a){
  var lot=String(a&&a.Lot_generation||'').toUpperCase();
  return lot.indexOf('MIGRATION_JOTFORM')===0||lot.indexOf('DEV307')>=0;
}

function EUC_DEV312_repairExisting_(current,studentId,classId,periodId,yearCode,cl,p){
  var rows=(current||[]).filter(function(a){
    if(!a||a.Revoked===true||a.Supprimee_admin===true)return false;
    if(EUC_DEV307_ref_(a.Eleve)!==Number(studentId))return false;
    var an=String(a.Annee_scolaire||'').trim();
    if(yearCode&&an&&an!==yearCode)return false;
    return EUC_DEV312_isMigrationAccess_(a);
  }).sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});

  if(!rows.length)return 0;
  var a=rows[0];

  var exact=(
    EUC_DEV307_ref_(a.Classe_convention)===Number(classId)&&
    EUC_DEV307_ref_(a.Periode)===Number(periodId)&&
    (!yearCode||!String(a.Annee_scolaire||'').trim()||
      String(a.Annee_scolaire||'').trim()===yearCode)
  );
  if(exact)return Number(a.id)||0;

  var patch={
    Annee_scolaire:yearCode,
    Classe_convention:Number(classId),
    Classe_convention_nom:String(cl&&(cl.nom||cl.libelle)||''),
    Periode:Number(periodId),
    Periode_libelle:String(p&&(p.libelle||p.nom||p.Libelle||p.Nom)||''),
    Date_debut:p&&(p.debut||p.Date_debut)||null,
    Date_fin:p&&(p.fin||p.Date_fin)||null
  };

  EUC_ENT_grist(
    'patch',
    '/tables/'+encodeURIComponent(EUC_DEV307_ACCESS_TABLE_)+'/records',
    {records:[{id:Number(a.id),fields:patch}]}
  );

  Object.keys(patch).forEach(function(k){a[k]=patch[k];});
  return Number(a.id)||0;
}
