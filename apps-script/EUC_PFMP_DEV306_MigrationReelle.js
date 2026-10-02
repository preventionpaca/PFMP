/**
 * PFMP — v1.0.0-dev.307
 *
 * Correction de DEV.306 :
 * la production historique réellement utilisée par le suivi PFMP est
 * EUC_ACCES_FORMULAIRES_PFMP, pas EUC_SOUMISSIONS_PFMP.
 *
 * Le nom public EUC_DEV306_validateSelectionReel est conservé pour ne pas
 * modifier le bouton client déjà publié en DEV.306.
 */
var EUC_DEV307_ACCESS_TABLE_='EUC_ACCES_FORMULAIRES_PFMP';
var EUC_DEV307_STUDENTS_TABLE_='EUC_ELEVES_PFMP';

function EUC_DEV307_flatRecords_(table){
  var r=EUC_ENT_grist(
    'get',
    '/tables/'+encodeURIComponent(table)+'/records'
  );
  return (r.records||[]).map(function(x){
    var f=x.fields||{};
    var o={id:Number(x.id)||0};
    Object.keys(f).forEach(function(k){o[k]=f[k];});
    return o;
  });
}

function EUC_DEV307_columns_(table){
  var r=EUC_ENT_grist(
    'get',
    '/tables/'+encodeURIComponent(table)+'/columns'
  );
  var out={};
  (r.columns||[]).forEach(function(c){
    var id=String(c.id||'');
    if(!id)return;
    out[id]=String(c.fields&&c.fields.type||c.type||'');
  });
  return out;
}

function EUC_DEV307_norm_(v){
  return String(v==null?'':v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV307_pick_(obj,aliases){
  obj=obj||{};
  var i,k,v,byNorm={};

  for(i=0;i<aliases.length;i++){
    k=aliases[i];
    if(Object.prototype.hasOwnProperty.call(obj,k)){
      v=obj[k];
      if(v!==null&&v!==undefined&&String(v).trim()!=='')return v;
    }
  }

  Object.keys(obj).forEach(function(key){
    byNorm[EUC_DEV307_norm_(key)]=key;
  });

  for(i=0;i<aliases.length;i++){
    k=byNorm[EUC_DEV307_norm_(aliases[i])];
    if(k){
      v=obj[k];
      if(v!==null&&v!==undefined&&String(v).trim()!=='')return v;
    }
  }

  return '';
}

function EUC_DEV307_ref_(v){
  if(typeof v==='number'&&isFinite(v))return Number(v)||0;

  if(Array.isArray(v)){
    for(var i=0;i<v.length;i++){
      if(typeof v[i]==='number'&&isFinite(v[i]))return Number(v[i])||0;
    }
  }

  var n=Number(v);
  return isFinite(n)?n:0;
}

function EUC_DEV307_refListHas_(v,id){
  id=Number(id)||0;
  if(!id)return false;

  if(typeof v==='number')return Number(v)===id;

  if(Array.isArray(v)){
    return v.some(function(x){return Number(x)===id;});
  }

  return String(v||'')
    .split(/[^0-9]+/)
    .some(function(x){return Number(x)===id;});
}

function EUC_DEV307_dateISO_(v){
  if(v===null||v===undefined||v==='')return '';

  if(typeof v==='number'&&isFinite(v)){
    var ms=Math.abs(v)>100000000000?v:v*1000;
    var d=new Date(ms);
    return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }

  var s=String(v).trim();
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+'-'+m[2]+'-'+m[3];

  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m){
    return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  }

  var d2=new Date(s);
  return isNaN(d2.getTime())?'':d2.toISOString().slice(0,10);
}

function EUC_DEV307_toGrist_(value,type){
  if(value===undefined||value===null)return null;

  type=String(type||'');

  if(type.indexOf('DateTime')===0){
    if(typeof value==='number'&&isFinite(value))return value;
    var ms=Date.parse(String(value));
    return isNaN(ms)?null:ms/1000;
  }

  if(type.indexOf('Date')===0){
    if(typeof value==='number'&&isFinite(value))return value;
    var iso=EUC_DEV307_dateISO_(value);
    return iso?Date.parse(iso+'T00:00:00Z')/1000:null;
  }

  if(type.indexOf('Bool')===0)return !!value;

  if(type.indexOf('Int')===0||type.indexOf('Numeric')===0){
    if(value==='')return null;
    var n=Number(value);
    return isFinite(n)?n:null;
  }

  if(type.indexOf('Ref:')===0){
    var r=EUC_DEV307_ref_(value);
    return r||null;
  }

  return value;
}

function EUC_DEV307_filterFields_(fields,columns){
  var out={};

  Object.keys(fields||{}).forEach(function(k){
    if(!Object.prototype.hasOwnProperty.call(columns,k))return;
    out[k]=EUC_DEV307_toGrist_(fields[k],columns[k]);
  });

  return out;
}

function EUC_DEV308_addDays_(iso,days){
  var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return '';

  var d=new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2])-1,
      Number(m[3])
    )
  );

  d.setUTCDate(d.getUTCDate()+Number(days||0));
  return d.toISOString().slice(0,10);
}

/* EUC_DEV309_PERIOD_MATCH */

function EUC_DEV309_addDays_(iso,days){
  var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return '';

  var d=new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2])-1,
      Number(m[3])
    )
  );

  d.setUTCDate(
    d.getUTCDate()+Number(days||0)
  );

  return d.toISOString().slice(0,10);
}

function EUC_DEV309_dayDiff_(a,b){
  var ma=String(a||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var mb=String(b||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if(!ma||!mb)return 99999;

  var ta=Date.UTC(
    Number(ma[1]),
    Number(ma[2])-1,
    Number(ma[3])
  );

  var tb=Date.UTC(
    Number(mb[1]),
    Number(mb[2])-1,
    Number(mb[3])
  );

  return Math.abs(
    Math.round(
      (ta-tb)/86400000
    )
  );
}

function EUC_DEV309_periodLabel_(p){
  return String(
    p.Libelle_periode||
    p.Libelle||
    p.Nom||
    p.Code_periode||
    p.Type||
    p.Formation||
    ''
  );
}

function EUC_DEV309_isPdif_(p){
  var n=EUC_DEV307_norm_(
    EUC_DEV309_periodLabel_(p)
  );

  return (
    n.indexOf('PDIF')>=0 ||
    n.indexOf('PARCOURSDIFFERENCIE')>=0 ||
    n.indexOf('DIFFERENCIE')>=0 ||
    n.indexOf('FINTERMINALE')>=0
  );
}

function EUC_DEV309_offersForClass_(offers,classId,student){
  var ids={};

  var code=EUC_DEV307_norm_(
    student.Code_classe_importe||
    student.Classe_nom||
    ''
  );

  (offers||[]).forEach(function(o){
    if(o.Actif===false)return;

    var sameRef=
      EUC_DEV307_ref_(o.Classe)===Number(classId);

    var sameCode=
      code &&
      (
        EUC_DEV307_norm_(o.Code_classe)===code ||
        EUC_DEV307_norm_(o.Classe_code)===code ||
        EUC_DEV307_norm_(o.Classe_nom)===code
      );

    if(sameRef||sameCode){
      ids[Number(o.id)]=true;
    }
  });

  return ids;
}

/* EUC_DEV310_PERIOD_MATCH */

function EUC_DEV310_yearCode_(student){
  var direct=String(student.Annee_scolaire_code||'').trim();

  if(/^20\d{2}-20\d{2}$/.test(direct)){
    return direct;
  }

  var raw=String(student.Annee_scolaire||'').trim();

  if(/^20\d{2}-20\d{2}$/.test(raw)){
    return raw;
  }

  var ref=EUC_DEV307_ref_(student.Annee_scolaire);

  if(ref){
    try{
      var years=EUC_DEV307_flatRecords_('Annees_Scolaires');

      var y=years.filter(function(x){
        return Number(x.id)===Number(ref);
      })[0]||null;

      if(y && /^20\d{2}-20\d{2}$/.test(String(y.Code||''))){
        return String(y.Code);
      }
    }catch(e){}
  }

  return '';
}

function EUC_DEV310_periodYearOk_(p,student,yearCode){
  var pref=EUC_DEV307_ref_(p.Annee_scolaire);
  var sref=EUC_DEV307_ref_(student.Annee_scolaire);

  if(pref && sref){
    return Number(pref)===Number(sref);
  }

  var raw=String(p.Annee_scolaire||'').trim();

  if(/^20\d{2}-20\d{2}$/.test(raw)){
    return raw===yearCode;
  }

  if(pref){
    try{
      var years=EUC_DEV307_flatRecords_('Annees_Scolaires');

      var y=years.filter(function(x){
        return Number(x.id)===Number(pref);
      })[0]||null;

      return !!(y && String(y.Code||'')===yearCode);
    }catch(e){
      return false;
    }
  }

  return true;
}

function EUC_DEV310_allowed_(meta,classId,yearCode,periodId){
  if(typeof EUC_CONVENTION_verifierPeriodeAutorisee_!=='function'){
    return false;
  }

  try{
    EUC_CONVENTION_verifierPeriodeAutorisee_(
      meta,
      Number(classId),
      String(yearCode),
      Number(periodId),
      'Période officielle'
    );

    return true;
  }catch(e){
    return false;
  }
}

function EUC_DEV310_dateVariants_(start,end){
  var out=[{
    start:start,
    end:end,
    mode:'BRUT'
  }];

  if(typeof EUC_DEV309_addDays_==='function'){
    out.push({
      start:EUC_DEV309_addDays_(start,1),
      end:EUC_DEV309_addDays_(end,1),
      mode:'TAMPON_PLUS_1_JOUR'
    });
  }

  return out;
}

function EUC_DEV310_dayDiff_(a,b){
  var ma=String(a||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var mb=String(b||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if(!ma||!mb)return 99999;

  var ta=Date.UTC(Number(ma[1]),Number(ma[2])-1,Number(ma[3]));
  var tb=Date.UTC(Number(mb[1]),Number(mb[2])-1,Number(mb[3]));

  return Math.abs(Math.round((ta-tb)/86400000));
}

function EUC_DEV307_periodFor_(
  row,
  student,
  periods,
  links,
  offerId,
  classId,
  offers
){
  var rawStart=EUC_DEV307_dateISO_(
    EUC_DEV307_pick_(row,[
      'Date_debut_brut','Date_debut','Date début','Date debut',
      'Debut','Début','Date_debut_PFMP','Date début PFMP'
    ])
  );

  var rawEnd=EUC_DEV307_dateISO_(
    EUC_DEV307_pick_(row,[
      'Date_fin_brut','Date_fin','Date fin','Fin',
      'Date_fin_PFMP','Date fin PFMP'
    ])
  );

  if(!rawStart||!rawEnd){
    return {
      ok:false,
      error:
        'Dates PFMP absentes ou illisibles. '+
        'Aucune période officielle n’est forcée sans date.'
    };
  }

  var yearCode=EUC_DEV310_yearCode_(student);

  if(!yearCode){
    return {
      ok:false,
      error:'Année scolaire réelle de l’élève introuvable.'
    };
  }

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();

  /*
   * DEV.310
   * Le même contrôleur que celui du générateur de conventions décide
   * si une période appartient réellement à cette classe et à cette année.
   */
  var candidates=(periods||[]).filter(function(per){
    if(per.Actif===false)return false;

    if(
      typeof EUC_DEV309_isPdif_==='function' &&
      EUC_DEV309_isPdif_(per)
    ){
      return false;
    }

    var pid=Number(per.id)||0;
    if(!pid)return false;

    if(!EUC_DEV310_periodYearOk_(per,student,yearCode)){
      return false;
    }

    return EUC_DEV310_allowed_(
      meta,
      classId,
      yearCode,
      pid
    );
  });

  if(!candidates.length){
    return {
      ok:false,
      error:
        'Aucune période officielle autorisée pour la vraie classe '+
        'de l’élève en '+yearCode+'.'
    };
  }

  var variants=EUC_DEV310_dateVariants_(rawStart,rawEnd);
  var bestByPeriod={};

  candidates.forEach(function(per){
    var officialStart=EUC_DEV307_dateISO_(per.Date_debut);
    var officialEnd=EUC_DEV307_dateISO_(per.Date_fin);

    if(!officialStart||!officialEnd)return;

    variants.forEach(function(v){
      var ds=EUC_DEV310_dayDiff_(v.start,officialStart);
      var de=EUC_DEV310_dayDiff_(v.end,officialEnd);

      /*
       * Tolérance métier :
       * - début : 3 jours maximum ;
       * - fin   : 14 jours maximum.
       */
      if(ds>3 || de>14)return;

      var item={
        p:per,
        ds:ds,
        de:de,
        score:(ds*100)+de,
        variant:v
      };

      var key=String(Number(per.id));

      if(!bestByPeriod[key] || item.score<bestByPeriod[key].score){
        bestByPeriod[key]=item;
      }
    });
  });

  var scored=Object.keys(bestByPeriod).map(function(k){
    return bestByPeriod[k];
  });

  if(!scored.length){
    return {
      ok:false,
      error:
        'Aucune période officielle de la vraie classe n’est suffisamment '+
        'proche des dates saisies '+rawStart+' → '+rawEnd+'.'
    };
  }

  scored.sort(function(a,b){
    return a.score-b.score || Number(a.p.id)-Number(b.p.id);
  });

  var best=scored[0];

  /*
   * Si deux enregistrements de Planning_Periodes ont exactement les
   * mêmes dates officielles, ils représentent la même fenêtre métier :
   * on conserve de façon déterministe le premier ID autorisé.
   */
  var sameScore=scored.filter(function(x){
    return (
      x.score===best.score &&
      Number(x.p.id)!==Number(best.p.id)
    );
  });

  var realConflict=sameScore.filter(function(x){
    return !(
      EUC_DEV307_dateISO_(x.p.Date_debut)===
        EUC_DEV307_dateISO_(best.p.Date_debut) &&
      EUC_DEV307_dateISO_(x.p.Date_fin)===
        EUC_DEV307_dateISO_(best.p.Date_fin)
    );
  });

  if(realConflict.length){
    return {
      ok:false,
      error:
        'Deux périodes officielles différentes sont encore équidistantes ; '+
        'contrôle manuel requis.'
    };
  }

  return {
    ok:true,
    period:best.p,

    /*
     * Les dates écrites dans la convention sont TOUJOURS celles
     * de Planning_Periodes.
     */
    start:EUC_DEV307_dateISO_(best.p.Date_debut),
    end:EUC_DEV307_dateISO_(best.p.Date_fin),

    correctionDate:'DEV310_PERIODE_OFFICIELLE_CLASSE_ANNEE',
    dateSaisieDebut:best.variant.start,
    dateSaisieFin:best.variant.end,
    ecartDebutJours:best.ds,
    ecartFinJours:best.de,
    annee:yearCode
  };
}

function EUC_DEV307_eligible_(a){
  a=a||{};

  if(a.Revoked===true||a.Supprimee_admin===true)return false;

  return !!(
    a.Date_saisie_entreprise ||
    a.Numero_enregistrement ||
    a.Entreprise_raison_sociale ||
    String(a.Statut||'')==='ENTREPRISE_SAISIE'
  );
}

function EUC_DEV307_sameAccess_(a,studentId,classId,periodId,yearCode){
  if(!a||a.Revoked===true||a.Supprimee_admin===true)return false;

  if(EUC_DEV307_ref_(a.Eleve)!==Number(studentId))return false;
  if(EUC_DEV307_ref_(a.Classe_convention)!==Number(classId))return false;
  if(EUC_DEV307_ref_(a.Periode)!==Number(periodId))return false;

  var an=String(a.Annee_scolaire||'').trim();
  if(yearCode&&an&&an!==yearCode)return false;

  return true;
}

function EUC_DEV307_companyFields_(r,ctx,columns){
  var siret=String(
    r.SIRET_normalise||
    r.SIRET_brut||
    ''
  ).replace(/\D/g,'');

  var fields={
    Statut:'ENTREPRISE_SAISIE',
    Statut_administratif:'INFORMATIONS_ENREGISTREES',
    Date_saisie_entreprise:new Date().toISOString(),
    Entreprise_siret:siret,
    Entreprise_identifiant_type:'SIRET',
    Entreprise_validation_statut:'VALIDE',
    Entreprise_raison_sociale:String(
      r.Raison_sociale_officielle||
      r.Entreprise_saisie||
      ''
    ),
    Entreprise_enseigne:String(
      r.Nom_commercial||
      r.Entreprise_saisie||
      ''
    ),
    Entreprise_adresse:String(
      r.Adresse_officielle||
      EUC_DEV307_pick_(r,[
        'Adresse_entreprise','Adresse entreprise','Adresse'
      ])||
      ''
    ),
    Entreprise_complement:String(
      EUC_DEV307_pick_(r,[
        'Complement_adresse_officielle',
        'Complément adresse',
        'Complement adresse'
      ])||
      ''
    ),
    Entreprise_code_postal:String(
      r.CP_officiel||
      EUC_DEV307_pick_(r,[
        'Code_postal_entreprise','Code postal entreprise','CP'
      ])||
      ''
    ),
    Entreprise_commune:String(
      r.Ville_officielle||
      EUC_DEV307_pick_(r,[
        'Ville_entreprise','Ville entreprise','Commune'
      ])||
      ''
    ),
    Entreprise_pays:String(
      EUC_DEV307_pick_(r,[
        'Pays_officiel','Pays entreprise','Pays'
      ])||
      'FR'
    ),
    Responsable_nom:String(
      EUC_DEV307_pick_(r,[
        'Responsable_nom','Responsable',
        'Nom responsable','Responsable entreprise'
      ])||
      ''
    ),
    Responsable_prenom:String(
      EUC_DEV307_pick_(r,[
        'Responsable_prenom','Prénom responsable','Prenom responsable'
      ])||
      ''
    ),
    Responsable_fonction:String(
      EUC_DEV307_pick_(r,[
        'Responsable_fonction','Fonction responsable'
      ])||
      ''
    ),
    Responsable_telephone:String(
      EUC_DEV307_pick_(r,[
        'Responsable_telephone','Téléphone responsable',
        'Telephone responsable'
      ])||
      ''
    ),
    Responsable_courriel:String(
      EUC_DEV307_pick_(r,[
        'Responsable_courriel','Responsable_email',
        'Email responsable','Courriel responsable'
      ])||
      ''
    ),
    Tuteur_nom:String(
      EUC_DEV307_pick_(r,[
        'Tuteur_nom','Tuteur','Nom tuteur'
      ])||
      ''
    ),
    Tuteur_prenom:String(
      EUC_DEV307_pick_(r,[
        'Tuteur_prenom','Prénom tuteur','Prenom tuteur'
      ])||
      ''
    ),
    Tuteur_fonction:String(
      EUC_DEV307_pick_(r,[
        'Tuteur_fonction','Fonction tuteur'
      ])||
      ''
    ),
    Tuteur_telephone:String(
      EUC_DEV307_pick_(r,[
        'Tuteur_telephone','Téléphone tuteur','Telephone tuteur'
      ])||
      ''
    ),
    Tuteur_courriel:String(
      EUC_DEV307_pick_(r,[
        'Tuteur_courriel','Tuteur_email',
        'Email tuteur','Courriel tuteur'
      ])||
      ''
    ),
    Valide_par:String(ctx&&ctx.email||''),
    Date_validation:new Date().toISOString(),
    Auteur_enregistrement:String(ctx&&ctx.email||'')
  };

  return EUC_DEV307_filterFields_(fields,columns);
}

function EUC_DEV307_invaliderCaches_(yearCode,classId,periodId){
  try{
    var cache=CacheService.getScriptCache();

    if(yearCode){
      cache.remove('EUC_SUIVI_V45_'+yearCode);

      if(typeof EUC_SUIVI_CACHE_SYNTHESE_!=='undefined'){
        cache.remove(EUC_SUIVI_CACHE_SYNTHESE_+yearCode);
      }

      if(typeof EUC_SUIVI_CACHE_META_!=='undefined'){
        cache.remove(EUC_SUIVI_CACHE_META_+yearCode);
      }
    }

    if(yearCode&&classId&&periodId){
      cache.remove(
        'DEV185_DETAIL_'+yearCode+'_'+classId+'_'+periodId
      );
    }
  }catch(e){}

  try{
    if(typeof EUC_CONVENTION_resetCacheV94_==='function'){
      EUC_CONVENTION_resetCacheV94_();
    }
  }catch(e){}
}

function EUC_DEV378_validateSelectionBase_(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  if(typeof EUC_CONVENTION_assurerTableAcces_!=='function'){
    throw new Error(
      'Moteur de conventions introuvable : EUC_CONVENTION_assurerTableAcces_.'
    );
  }

  if(typeof EUC_CONVENTION_preparerRecordAcces_!=='function'){
    throw new Error(
      'Moteur de génération introuvable : EUC_CONVENTION_preparerRecordAcces_.'
    );
  }

  if(typeof EUC_CONVENTION_lireElevesAdmin!=='function'){
    throw new Error(
      'Lecture élèves du générateur introuvable.'
    );
  }

  if(typeof EUC_CONVENTION_lireClassesEtPeriodesAdmin!=='function'){
    throw new Error(
      'Référentiel classes/périodes du générateur introuvable.'
    );
  }

  /*
   * On prépare la VRAIE table historique utilisée par le suivi.
   */
  EUC_CONVENTION_assurerTableAcces_();

  if(typeof EUC_CONVENTION_assurerColonnesEntrepriseV117_==='function'){
    EUC_CONVENTION_assurerColonnesEntrepriseV117_();
  }

  var accessCols=EUC_DEV307_columns_(EUC_DEV307_ACCESS_TABLE_);

  var rows=EUC_DEV298_rows_();

  var manualMode=!!(
    payload &&
    payload.manualSelection===true &&
    Array.isArray(payload.ids)
  );

  var manualSet={};
  if(manualMode){
    payload.ids.forEach(function(id){
      id=Number(id)||0;
      if(id)manualSet[id]=true;
    });
  }

  var selected=manualMode
    ? rows.filter(function(r){return !!manualSet[Number(r.id)||0];})
    : rows.filter(function(r){return r.Importer===true;});

  var unselected=manualMode
    ? []
    : rows.filter(function(r){return r.Importer!==true;});

  if(manualMode){
    if(!selected.length){
      throw new Error('Aucune ligne sélectionnée manuellement.');
    }

    var invalidManual=selected.filter(function(r){
      return (
        String(r.SIRET_statut||'').toUpperCase()!=='VERIFIE' ||
        !(Number(r.Eleve_match_id)||0) ||
        !(Number(r.Classe_match_id)||0)
      );
    });

    if(invalidManual.length){
      throw new Error(
        'Sélection refusée : '+invalidManual.length+
        ' ligne(s) ne sont pas SIRET vérifié + élève rapproché + classe rapprochée.'
      );
    }
  }

  if(!selected.length){
    var empty=EUC_DEV298_lister();
    empty.validationBilan={
      selectionnees:0,
      creees:0,
      dejaExistantes:0,
      lieesEleves:0,
      rejetees:0,
      verifiees:0,
      cibleAvant:0,
      cibleApres:0,
      erreurs:[]
    };
    return empty;
  }

  var rawStudents=EUC_DEV307_flatRecords_(EUC_DEV307_STUDENTS_TABLE_);
  var rawByStudent={};
  rawStudents.forEach(function(s){
    rawByStudent[Number(s.id)]=s;
  });

  var generatorStudents=EUC_CONVENTION_lireElevesAdmin();
  var genByStudent={};
  (generatorStudents||[]).forEach(function(e){
    genByStudent[Number(e.id)]=e;
  });

  var meta=EUC_CONVENTION_lireClassesEtPeriodesAdmin();
  var classById={};
  var periodMetaById={};

  (meta.classes||[]).forEach(function(c){
    classById[Number(c.id)]=c;
  });

  (meta.periodes||[]).forEach(function(p){
    periodMetaById[Number(p.id)]=p;
  });

  var periods=[];
  var links=[];
  var years=[];
  var offers=[];

  try{periods=EUC_DEV307_flatRecords_('Planning_Periodes');}catch(e){}
  try{links=EUC_DEV307_flatRecords_('EUC_OFFRES_PERIODES');}catch(e){}
  try{years=EUC_DEV307_flatRecords_('Annees_Scolaires');}catch(e){}
  try{offers=EUC_DEV307_flatRecords_('EUC_OFFRES_FORMATION');}catch(e){}

  var byYearId={};
  years.forEach(function(y){
    byYearId[Number(y.id)]=y;
  });

  var byOfferId={};
  offers.forEach(function(o){
    byOfferId[Number(o.id)]=o;
  });

  var before=EUC_DEV307_flatRecords_(EUC_DEV307_ACCESS_TABLE_);
  var current=before.slice();

  var bufferPatches=[];

  unselected.forEach(function(r){
    bufferPatches.push({
      id:Number(r.id),
      fields:{
        Decision:'IGNOREE',
        Date_validation:null,
        Valide_par:''
      }
    });
  });

  var created=0;
  var existing=0;
  var linked=0;
  var rejected=0;
  var verifiedIds=[];
  var errors=[];
  var cacheTargets={};

  /*
   * Le générateur historique utilise ce contexte pour fabriquer
   * référence + jeton + lien QR compatibles avec tout le reste du projet.
   */
  var generatorCtx=
    typeof EUC_IMPORT_exigerAdminTexte_==='function'
      ? EUC_IMPORT_exigerAdminTexte_()
      : ctx;

  selected.forEach(function(r){
    var label=String(
      r.Eleve_match_libelle||
      r.Eleve_saisi||
      r.Eleve_brut||
      ('ligne '+r.id)
    );

    try{
      var studentId=Number(r.Eleve_match_id)||0;
      var student=rawByStudent[studentId];
      var genStudent=genByStudent[studentId];

      if(!student||!genStudent){
        throw new Error(
          'Élève rapproché introuvable dans EUC_ELEVES_PFMP (id '+
          studentId+').'
        );
      }

      var studentClassId=
        EUC_DEV307_ref_(student.Classe)||
        0;

      var rowClassId=
        Number(r.Classe_match_id)||
        0;

      /*
       * DEV.309 v3
       * La classe réellement enregistrée sur l'élève PFMP fait foi.
       * La classe choisie dans JotForm n'est utilisée qu'en repli.
       */
      var classId=
        studentClassId||
        rowClassId||
        0;

var cl=classById[classId];

      if(!cl){
        throw new Error(
          'Classe de convention introuvable (id '+classId+').'
        );
      }

      var offerId=
        EUC_DEV307_ref_(student.Offre_formation)||
        EUC_DEV307_ref_(r.Offre_formation)||
        0;

      /* EUC_DEV312_PERIOD_CALL */
      var periodRes=EUC_DEV312_periodFor_(
        r,
        student,
        periods,
        links,
        offerId,
        classId,
        offers
      );

      if(!periodRes.ok){
        throw new Error(periodRes.error);
      }

      var rawPeriod=periodRes.period;
      var periodId=Number(rawPeriod.id)||0;
      var p=periodMetaById[periodId];

      if(!p){
        /*
         * Repli compatible avec le générateur si le référentiel admin
         * ne renvoie pas exactement le même objet.
         */
        p={
          id:periodId,
          libelle:String(
            rawPeriod.Libelle_periode||
            rawPeriod.Code_periode||
            rawPeriod.Type||
            ('PFMP '+periodRes.start+' → '+periodRes.end)
          ),
          debut:periodRes.start,
          fin:periodRes.end
        };
      }

      var yearId=
        EUC_DEV307_ref_(student.Annee_scolaire)||
        EUC_DEV307_ref_(rawPeriod.Annee_scolaire)||
        0;

      var year=byYearId[yearId]||{};
      var yearCode=String(
        year.Code||
        student.Annee_scolaire_code||
        student.Annee_scolaire||
        ''
      ).trim();

      if(!/^20\d{2}-20\d{2}$/.test(yearCode)){
        throw new Error(
          'Année scolaire introuvable pour '+label+'.'
        );
      }

      var siret=String(
        r.SIRET_normalise||
        r.SIRET_brut||
        ''
      ).replace(/\D/g,'');

      if(siret.length!==14){
        throw new Error(
          'SIRET non valide au moment de l’import.'
        );
      }

      if(String(r.SIRET_statut||'')!=='VERIFIE'){
        throw new Error(
          'SIRET non vérifié.'
        );
      }

      var companyFields=
        EUC_DEV307_companyFields_(
          r,
          ctx,
          accessCols
        );

      /*
       * Réutilise un accès existant pour le même élève /
       * classe / période / année.
       */
      /* EUC_DEV312_REPAIR_EXISTING */
      EUC_DEV312_repairExisting_(
        current,
        studentId,
        classId,
        periodId,
        yearCode,
        cl,
        p
      );

      var matches=current
        .filter(function(a){
          if(EUC_DEV307_sameAccess_(
            a,
            studentId,
            classId,
            periodId,
            yearCode
          ))return true;

          /* DEV380 : récupère un accès orphelin issu de l'ancien bug,
             uniquement si le SIRET est identique et si les 3 références
             métier sont absentes. */
          var orphanSiret=String(a.Entreprise_siret||'').replace(/\D/g,'');
          return (
            orphanSiret===siret &&
            !EUC_DEV307_ref_(a.Eleve) &&
            !EUC_DEV307_ref_(a.Classe_convention) &&
            !EUC_DEV307_ref_(a.Periode) &&
            a.Revoked!==true &&
            a.Supprimee_admin!==true
          );
        })
        .sort(function(a,b){
          return Number(b.id||0)-Number(a.id||0);
        });

      var accessId=0;

      if(matches.length){
        var chosen=matches[0];

        var chosenFields=companyFields;

        if(
          !EUC_DEV307_ref_(chosen.Eleve) ||
          !EUC_DEV307_ref_(chosen.Classe_convention) ||
          !EUC_DEV307_ref_(chosen.Periode)
        ){
          var repairPrepared=EUC_CONVENTION_preparerRecordAcces_(
            generatorCtx,
            genStudent,
            cl,
            p,
            yearCode,
            {lot:'MIGRATION_JOTFORM_DEV380_REPAIR'}
          );

          chosenFields=Object.assign(
            {},
            (repairPrepared.record&&repairPrepared.record.fields)||
              repairPrepared.record||{},
            companyFields
          );

          chosenFields=EUC_DEV307_filterFields_(
            chosenFields,
            accessCols
          );
        }

        EUC_ENT_grist(
          'patch',
          '/tables/'+
            encodeURIComponent(EUC_DEV307_ACCESS_TABLE_)+
            '/records',
          {
            records:[
              {
                id:Number(chosen.id),
                fields:chosenFields
              }
            ]
          }
        );

        accessId=Number(chosen.id)||0;
        existing++;

        Object.keys(chosenFields).forEach(function(k){
          chosen[k]=chosenFields[k];
        });

      }else{
        var a=EUC_CONVENTION_preparerRecordAcces_(
          generatorCtx,
          genStudent,
          cl,
          p,
          yearCode,
          {
            lot:'MIGRATION_JOTFORM_DEV307'
          }
        );

        /* DEV380 : EUC_CONVENTION_preparerRecordAcces_ renvoie
           {record:{fields:{...}}}. Les références métier sont dans fields. */
        var record=Object.assign(
          {},
          (a.record&&a.record.fields)||a.record||{},
          companyFields
        );

        record=EUC_DEV307_filterFields_(
          record,
          accessCols
        );

        var resp=EUC_ENT_grist(
          'post',
          '/tables/'+
            encodeURIComponent(EUC_DEV307_ACCESS_TABLE_)+
            '/records',
          {
            records:[
              {
                fields:record
              }
            ]
          }
        );

        accessId=Number(
          resp&&
          resp.records&&
          resp.records[0]&&
          resp.records[0].id
        )||0;

        if(!accessId){
          var reread=EUC_DEV307_flatRecords_(
            EUC_DEV307_ACCESS_TABLE_
          ).filter(function(x){
            return EUC_DEV307_sameAccess_(
              x,
              studentId,
              classId,
              periodId,
              yearCode
            );
          }).sort(function(a,b){
            return Number(b.id||0)-Number(a.id||0);
          });

          if(reread.length){
            accessId=Number(reread[0].id)||0;
          }
        }

        if(!accessId){
          throw new Error(
            'Le dossier a été envoyé à Grist mais son identifiant '+
            'n’a pas été retourné.'
          );
        }

        created++;

        var cacheRow={
          id:accessId,
          Eleve:studentId,
          Classe_convention:classId,
          Periode:periodId,
          Annee_scolaire:yearCode
        };

        Object.keys(record).forEach(function(k){
          cacheRow[k]=record[k];
        });

        current.push(cacheRow);
      }

      linked++;
      verifiedIds.push(accessId);

      cacheTargets[
        yearCode+'|'+classId+'|'+periodId
      ]={
        year:yearCode,
        classId:classId,
        periodId:periodId
      };

      bufferPatches.push({
        id:Number(r.id),
        fields:{
          Decision:'VALIDEE',
          Date_validation:new Date().toISOString(),
          Valide_par:String(ctx.email||'')
        }
      });

    }catch(e){
      rejected++;

      errors.push({
        id:Number(r.id)||0,
        eleve:label,
        erreur:String(e&&e.message||e)
      });

      bufferPatches.push({
        id:Number(r.id),
        fields:{
          Decision:'A_CONTROLER',
          Date_validation:null,
          Valide_par:''
        }
      });
    }
  });

  if(bufferPatches.length){
    EUC_DEV298_safePatch_(
      bufferPatches
    );
  }

  Object.keys(cacheTargets).forEach(function(k){
    var c=cacheTargets[k];

    EUC_DEV307_invaliderCaches_(
      c.year,
      c.classId,
      c.periodId
    );
  });

  /* EUC_DEV311_SYNC_AFTER_IMPORT */
  var dev311SyncReport=
    EUC_DEV311_syncTargets_(
      cacheTargets
    );

  var after=EUC_DEV307_flatRecords_(
    EUC_DEV307_ACCESS_TABLE_
  );

  var byId={};
  after.forEach(function(a){
    byId[Number(a.id)]=a;
  });

  var verified=verifiedIds.filter(function(id){
    var a=byId[Number(id)];
    return !!(
      a &&
      EUC_DEV307_eligible_(a) &&
      EUC_DEV307_ref_(a.Eleve)>0 &&
      EUC_DEV307_ref_(a.Classe_convention)>0 &&
      EUC_DEV307_ref_(a.Periode)>0
    );
  }).length;

  var list=EUC_DEV298_lister();

  list.validationBilan={
    selectionnees:selected.length,
    creees:created,
    dejaExistantes:existing,
    lieesEleves:linked,
    rejetees:rejected,
    verifiees:verified,
    cibleAvant:before.length,
    cibleApres:after.length,
    erreurs:errors.slice(0,50),
    idempotent:true,
    table:EUC_DEV307_ACCESS_TABLE_
  };

  if(list&&list.validationBilan){
    list.validationBilan.snapshotSync=
      dev311SyncReport;
  }

  return list;
}

/* EUC_DEV378_SELECTION_WRAPPER
 * Garde générique : le moteur historique reste intact.
 * EUC_DEV298_rows_ est temporairement limité aux seules lignes explicitement cochées.
 */
function EUC_DEV306_validateSelectionReel(payload){
  payload=payload||{};

  var ids=Array.isArray(payload.ids)
    ? payload.ids.map(function(x){return Number(x)||0;})
        .filter(function(x){return x>0;})
    : [];

  if(payload.manualSelection!==true || !ids.length){
    throw new Error(
      'IMPORT BLOQUÉ : sélection explicite obligatoire. '+
      'Cochez uniquement les élèves à importer.'
    );
  }

  var set={};
  ids.forEach(function(id){set[id]=true;});

  var originalRowsFn=EUC_DEV298_rows_;
  var allRows=originalRowsFn();

  var chosen=allRows.filter(function(r){
    return !!set[Number(r.id)||0];
  });

  if(chosen.length!==Object.keys(set).length){
    throw new Error(
      'Sélection incohérente : '+Object.keys(set).length+
      ' ligne(s) demandée(s), '+chosen.length+' retrouvée(s). Import annulé.'
    );
  }

  var safeRows=chosen.map(function(r){
    var o={};
    Object.keys(r||{}).forEach(function(k){o[k]=r[k];});
    o.Importer=true;
    return o;
  });

  /*
   * Le moteur historique ne voit QUE les lignes choisies.
   * Par conséquent son tableau "unselected" est vide et aucune autre ligne
   * du tampon ne peut être marquée IGNORÉE / À CONTRÔLER par cet import.
   */
  EUC_DEV298_rows_=function(){
    return safeRows.map(function(r){
      var o={};
      Object.keys(r||{}).forEach(function(k){o[k]=r[k];});
      return o;
    });
  };

  try{
    return EUC_DEV378_validateSelectionBase_();
  }finally{
    EUC_DEV298_rows_=originalRowsFn;
  }
}
