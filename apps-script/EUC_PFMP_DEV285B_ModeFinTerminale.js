/**
 * Eucalyptus PFMP — v1.0.0-dev.285b
 * Backend autonome "Fin de Terminale".
 */
var EUC_DEV285B_TABLE_='EUC_PARCOURS_DIFFERENCIE_PFMP';
var EUC_DEV285B_MODE_LYCEE_='PARCOURS_DIFF_LYCEE';
var EUC_DEV285B_MODE_ENTREPRISE_='POURSUITE_PFMP2_ENTREPRISE';
var EUC_DEV285B_MEMO_={};

function EUC_DEV285B_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV285B_bool_(v){
  if(v===true)return true;
  if(v===false)return false;
  if(typeof v==='number')return v!==0;
  var s=String(v==null?'':v).trim().toLowerCase();
  return s==='1'||s==='true'||s==='oui'||s==='yes'||s==='x';
}

function EUC_DEV285B_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}
  if(Array.isArray(v))return Number(v[1]||v[0])||0;
  return Number(v)||0;
}

function EUC_DEV285B_ensureSchema_(){
  var cols=EUC_ENT_grist(
    'get',
    '/tables/'+EUC_DEV285B_TABLE_+'/columns'
  ).columns||[];

  var have={};
  cols.forEach(function(c){have[c.id]=true;});

  var missing=[];

  if(!have.Mode_fin_terminale){
    missing.push({
      id:'Mode_fin_terminale',
      fields:{label:'Mode fin Terminale',type:'Text'}
    });
  }

  if(!have.Date_decision){
    missing.push({
      id:'Date_decision',
      fields:{label:'Date décision',type:'DateTime'}
    });
  }

  if(!have.Date_modification){
    missing.push({
      id:'Date_modification',
      fields:{label:'Modifié le',type:'DateTime'}
    });
  }

  if(!have.Auteur){
    missing.push({
      id:'Auteur',
      fields:{label:'Auteur',type:'Text'}
    });
  }

  if(missing.length){
    EUC_ENT_grist(
      'post',
      '/tables/'+EUC_DEV285B_TABLE_+'/columns',
      {columns:missing}
    );
  }

  return true;
}

function EUC_DEV285B_rows_(){
  EUC_DEV285B_ensureSchema_();
  return EUC_IMPORT_lireRecords_(EUC_DEV285B_TABLE_)||[];
}

function EUC_DEV285B_migrateLegacy_(){
  EUC_DEV285B_ensureSchema_();

  var rows=EUC_IMPORT_lireRecords_(EUC_DEV285B_TABLE_)||[];
  var patches=[];
  var now=new Date().toISOString();

  rows.forEach(function(r){
    if(EUC_DEV285B_txt_(r.Mode_fin_terminale)){
      return;
    }

    if(EUC_DEV285B_bool_(r.Parcours_differencie)){
      patches.push({
        id:r.id,
        fields:{
          Mode_fin_terminale:EUC_DEV285B_MODE_LYCEE_,
          Actif:true,
          Date_decision:r.Date_decision||now,
          Date_modification:now,
          Auteur:r.Auteur||'MIGRATION_DEV285B'
        }
      });
    }
  });

  if(patches.length){
    EUC_ENT_grist(
      'patch',
      '/tables/'+EUC_DEV285B_TABLE_+'/records',
      {records:patches}
    );
  }

  EUC_DEV285B_MEMO_={};

  return {
    ok:true,
    migres:patches.length
  };
}

function EUC_DEV285B_state_(annee){
  annee=EUC_DEV285B_txt_(annee);

  if(EUC_DEV285B_MEMO_[annee]){
    return EUC_DEV285B_MEMO_[annee];
  }

  var rows=EUC_DEV285B_rows_();
  var latest={};

  rows.forEach(function(r){
    if(EUC_DEV285B_txt_(r.Annee_scolaire)!==annee){
      return;
    }

    var eid=EUC_DEV285B_ref_(r.Eleve);

    if(!eid)return;

    if(
      !latest[eid] ||
      Number(r.id||0)>=Number(latest[eid].id||0)
    ){
      latest[eid]=r;
    }
  });

  var modes={};

  Object.keys(latest).forEach(function(k){
    var r=latest[k];
    var mode=EUC_DEV285B_txt_(r.Mode_fin_terminale);

    if(!mode && EUC_DEV285B_bool_(r.Parcours_differencie)){
      mode=EUC_DEV285B_MODE_LYCEE_;
    }

    if(
      mode!==EUC_DEV285B_MODE_LYCEE_ &&
      mode!==EUC_DEV285B_MODE_ENTREPRISE_
    ){
      mode='';
    }

    modes[Number(k)]=mode;
  });

  var out={
    latest:latest,
    modes:modes
  };

  EUC_DEV285B_MEMO_[annee]=out;

  return out;
}

function EUC_DEV285B_modeFor_(eleveId,annee){
  return EUC_DEV285B_state_(annee)
    .modes[Number(eleveId)||0]||'';
}

function EUC_DEV285B_selectedSet_(annee){
  var modes=EUC_DEV285B_state_(annee).modes;
  var set={};

  Object.keys(modes).forEach(function(k){
    if(modes[k]===EUC_DEV285B_MODE_LYCEE_){
      set[Number(k)]=true;
    }
  });

  return set;
}

function EUC_DEV285B_loadChoices(annee,classeId,classeNom){
  annee=EUC_DEV285B_txt_(annee);
  classeId=Number(classeId)||0;

  EUC_DEV285B_migrateLegacy_();

  var base=EUC_DEV190V1_loadPdif(
    annee,
    classeId,
    classeNom||''
  );

  var state=EUC_DEV285B_state_(annee);

  return {
    ok:true,
    students:(base.students||[]).map(function(s){
      var r=state.latest[Number(s.id)||0]||{};

      return {
        id:Number(s.id)||0,
        nom:s.nom||'',
        prenom:s.prenom||'',
        mode:state.modes[Number(s.id)||0]||'',
        remarque:r.Remarque||r.Commentaire||''
      };
    })
  };
}

function EUC_DEV285B_saveChoice(p){
  p=p||{};

  var annee=EUC_DEV285B_txt_(p.annee);
  var eleveId=Number(p.eleveId)||0;
  var mode=EUC_DEV285B_txt_(p.mode);

  if(mode==='A_DEFINIR'){
    mode='';
  }

  if(
    mode &&
    mode!==EUC_DEV285B_MODE_LYCEE_ &&
    mode!==EUC_DEV285B_MODE_ENTREPRISE_
  ){
    throw new Error('Mode fin Terminale invalide.');
  }

  if(!annee||!eleveId){
    throw new Error('Année et élève obligatoires.');
  }

  EUC_DEV285B_ensureSchema_();

  var rows=EUC_IMPORT_lireRecords_(EUC_DEV285B_TABLE_)||[];

  var existing=rows
    .filter(function(r){
      return (
        EUC_DEV285B_ref_(r.Eleve)===eleveId &&
        EUC_DEV285B_txt_(r.Annee_scolaire)===annee
      );
    })
    .sort(function(a,b){
      return Number(b.id||0)-Number(a.id||0);
    })[0]||null;

  var now=new Date().toISOString();

  var fields={
    Eleve:eleveId,
    Annee_scolaire:annee,
    Mode_fin_terminale:mode,
    Parcours_differencie:
      mode===EUC_DEV285B_MODE_LYCEE_,
    Actif:true,
    Remarque:EUC_DEV285B_txt_(p.remarque),
    Date_decision:mode?now:null,
    Date_modification:now
  };

  if(existing){
    EUC_ENT_grist(
      'patch',
      '/tables/'+EUC_DEV285B_TABLE_+'/records',
      {
        records:[
          {
            id:existing.id,
            fields:fields
          }
        ]
      }
    );
  }else{
    EUC_ENT_grist(
      'post',
      '/tables/'+EUC_DEV285B_TABLE_+'/records',
      {
        records:[
          {fields:fields}
        ]
      }
    );
  }

  EUC_DEV285B_MEMO_={};

  return {
    ok:true,
    mode:mode
  };
}

function EUC_DEV285B_isPdif_(p){
  var t=EUC_DEV285B_txt_(
    (p&&(
      p.libelle||
      p.nom||
      p.type||
      p.v50Slot||
      p.v51Slot
    ))||''
  )
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');

  return /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(t);
}

function EUC_DEV285B_isPfmp2_(p){
  var t=EUC_DEV285B_txt_(
    (p&&(
      p.libelle||
      p.nom||
      p.type||
      p.v50Slot||
      p.v51Slot
    ))||''
  )
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');

  return /PFMP[^0-9]*N?[^0-9]*2|PFMP[^0-9]*2/.test(t);
}

function EUC_DEV285B_enrichDetail_(detail,annee){
  if(!detail)return detail;

  var isPdif=EUC_DEV285B_isPdif_(detail.periode||{});
  var isPfmp2=EUC_DEV285B_isPfmp2_(detail.periode||{});

  if(isPdif){
    var selected=EUC_DEV285B_selectedSet_(annee);

    detail.lignes=(detail.lignes||[])
      .filter(function(x){
        return !!selected[Number(x.eleveId)||0];
      })
      .map(function(x){
        x.modeFinTerminale=EUC_DEV285B_MODE_LYCEE_;
        x.parcoursDifferencie=true;
        x.statutCode='PARCOURS_DIFFERENCIE_LYCEE';
        x.statut='Parcours différencié — lycée';
        x.convention=false;
        x.numero='';
        x.entreprise='';
        x.adresseEntreprise='';
        x.contactEntreprise='';
        x.tuteurEntreprise='';
        return x;
      });

    detail.stats=detail.stats||{};
    detail.stats.total=detail.lignes.length;
    detail.stats.parcoursDifferencies=detail.lignes.length;
    detail.stats.apprentis=0;
    detail.stats.avecConvention=0;
    detail.stats.sansConvention=0;
    detail.stats.annulees=0;
    detail.stats.interrompues=0;
  }

  if(isPfmp2){
    (detail.lignes||[]).forEach(function(x){
      x.modeFinTerminale=EUC_DEV285B_modeFor_(
        Number(x.eleveId)||0,
        annee
      );
    });
  }

  return detail;
}
