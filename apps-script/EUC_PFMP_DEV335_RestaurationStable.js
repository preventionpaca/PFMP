/**
 * PFMP — v1.0.0-dev.335
 * Restauration stable du suivi apprentissage.
 */

function EUC_DEV335_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV335_norm_(v){
  return EUC_DEV335_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,'');
}

function EUC_DEV335_ref_(v){
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

function EUC_DEV335_date_(v){
  try{
    var x=EUC_IMPORT_dateExistanteISO_(v);
    if(x)return x;
  }catch(e){}

  if(typeof v==='number'&&isFinite(v)){
    var d=new Date(v*1000);
    return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }

  var s=EUC_DEV335_txt_(v);
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);

  return m
    ? m[1]+'-'+m[2]+'-'+m[3]
    : '';
}

function EUC_DEV335_isPdif_(p){
  var n=EUC_DEV335_norm_(
    p&&(
      p.libelle||
      p.nom||
      p.label||
      p.type||
      p.v50Slot||
      p.v51Slot||
      ''
    )
  );

  /*
   * NE PAS tester l'existence de parcoursDifferencies :
   * ce champ peut exister avec 0 sur toutes les périodes.
   */
  return (
    n==='PDIF' ||
    n.indexOf('PARCOURSDIFFERENCIE')>=0
  );
}

function EUC_DEV335_level_(name,fam){
  var n=EUC_DEV335_txt_(name).toUpperCase();

  if(fam==='BACPRO'){
    if(/^T/.test(n))return'Terminale';
    if(/^1/.test(n))return'Première';
    if(/^2/.test(n))return'Seconde';
  }

  if(fam==='BTS'){
    if(/^2/.test(n))return'2e année';
    return'1re année';
  }

  if(fam==='CAP'){
    if(/^T/.test(n)||/^2/.test(n))return'TCAP';
    return'1CAP';
  }

  return'Autres';
}

function EUC_DEV335_expected_(fam,level){
  if(fam==='BACPRO'){
    if(level==='Terminale')return 2;
    if(level==='Première')return 2;
    if(level==='Seconde')return 1;
  }

  if(fam==='BTS')return 1;

  if(fam==='CAP'){
    if(level==='TCAP')return 2;
    if(level==='1CAP')return 1;
  }

  return 0;
}

function EUC_DEV335_appsAllowed_(fam,level){
  if(fam==='BACPRO'){
    return level==='Terminale'||level==='Première';
  }

  if(fam==='BTS'){
    return true;
  }

  /* Aucun apprenti en Seconde BAC ni en CAP. */
  return false;
}

function EUC_DEV335_familyCode_(card){
  try{
    var f=EUC_SUIVI_PUBLIC_famille_(card);
    return EUC_DEV335_txt_(f&&f.code);
  }catch(e){
    return '';
  }
}

function EUC_DEV335_className_(c){
  return EUC_DEV335_txt_(
    c&&(
      c.classe||
      c.classeNom||
      c.nom||
      c.code||
      c.Code_classe||
      ''
    )
  );
}

function EUC_DEV335_pdifTerminal_(annee){
  var out={
    lycee:0,
    entreprise:0,
    aDefinir:0
  };

  try{
    var d=EUC_DEV291_family({
      annee:annee,
      famille:'BACPRO'
    })||{};

    (d.classes||[]).forEach(function(c){
      if(
        EUC_DEV335_level_(
          EUC_DEV335_className_(c),
          'BACPRO'
        )!=='Terminale'
      ){
        return;
      }

      var pd=(c.periodes||[])
        .filter(EUC_DEV335_isPdif_)[0]||{};

      out.lycee+=Number(
        c.parcoursDifferencies!==undefined
          ? c.parcoursDifferencies
          : pd.parcoursDifferencies
      )||0;

      out.entreprise+=Number(
        c.poursuitePfmp2!==undefined
          ? c.poursuitePfmp2
          : pd.poursuitePfmp2
      )||0;

      out.aDefinir+=Number(
        c.aDefinirFinTerminale!==undefined
          ? c.aDefinirFinTerminale
          : pd.aDefinirFinTerminale
      )||0;
    });
  }catch(e){}

  return out;
}

function EUC_DEV335_resumeAccueil(payload){
  payload=payload||{};

  var annee=EUC_DEV335_txt_(payload.annee);

  if(!annee){
    var ctx=EUC_PFMP_contexteAnneeLectureV155_();
    annee=EUC_DEV335_txt_(ctx&&ctx.active);
  }

  if(!/^20\d{2}-20\d{2}$/.test(annee)){
    throw new Error('Année scolaire invalide.');
  }

  var snap=EUC_APP172_snapshot(annee)||{};
  var cards=snap.cartes||[];

  var order={
    BACPRO:['Terminale','Première','Seconde'],
    BTS:['1re année','2e année'],
    CAP:['TCAP','1CAP']
  };

  var families={};

  Object.keys(order).forEach(function(fam){
    families[fam]={};

    order[fam].forEach(function(level){
      families[fam][level]={
        niveau:level,
        periodes:[],
        pdif:null
      };
    });
  });

  cards.forEach(function(c){
    var fam=EUC_DEV335_familyCode_(c);
    if(!families[fam])return;

    var levelName=
      EUC_DEV335_level_(
        EUC_DEV335_className_(c),
        fam
      );

    var level=families[fam][levelName];
    if(!level)return;

    var expected=
      EUC_DEV335_expected_(
        fam,
        levelName
      );

    var normal=(c.periodes||[])
      .filter(function(p){
        return !EUC_DEV335_isPdif_(p);
      })
      .sort(function(a,b){
        return String(a.debut||'')
          .localeCompare(String(b.debut||''));
      })
      .slice(0,expected);

    normal.forEach(function(p,index){
      if(!level.periodes[index]){
        level.periodes[index]={
          ordinal:index+1,
          libelle:
            fam==='BTS'
              ? 'Stage n°'+(index+1)
              : 'PFMP n°'+(index+1),
          conventions:0,
          eleves:0,
          apprentis:0
        };
      }

      var dest=level.periodes[index];

      dest.conventions+=
        Number(p.conventions)||0;

      /*
       * APP172 snapshot retire déjà les apprentis du total scolaire.
       */
      dest.eleves+=
        Number(p.total)||0;

      if(
        EUC_DEV335_appsAllowed_(
          fam,
          levelName
        )
      ){
        dest.apprentis+=
          Number(p.apprentis)||0;
      }
    });
  });

  families.BACPRO.Terminale.pdif=
    EUC_DEV335_pdifTerminal_(annee);

  return {
    ok:true,
    version:'DEV.335',
    annee:annee,
    familles:{
      BACPRO:{
        niveaux:order.BACPRO.map(function(x){
          return families.BACPRO[x];
        })
      },
      BTS:{
        niveaux:order.BTS.map(function(x){
          return families.BTS[x];
        })
      },
      CAP:{
        niveaux:order.CAP.map(function(x){
          return families.CAP[x];
        })
      }
    }
  };
}

function EUC_DEV335_appRows_(){
  try{
    return (EUC_IMPORT_lireRecords_(
      'EUC_APPRENTISSAGE_PFMP'
    )||[])
      .filter(function(r){
        return r.Actif!==false;
      });
  }catch(e){
    return [];
  }
}

function EUC_DEV335_appStatus_(
  rows,
  eid,
  debut,
  fin
){
  debut=EUC_DEV335_date_(debut);
  fin=EUC_DEV335_date_(fin);

  var list=(rows||[])
    .filter(function(r){
      return (
        EUC_DEV335_ref_(r.Eleve)===
        Number(eid)
      );
    })
    .map(function(r){
      return {
        debut:EUC_DEV335_date_(r.Date_debut),
        fin:EUC_DEV335_date_(r.Date_fin)||'9999-12-31',
        entreprise:EUC_DEV335_txt_(
          r.Nom_entreprise||
          r.Entreprise
        ),
        tuteur:EUC_DEV335_txt_(r.Tuteur_nom),
        tel:EUC_DEV335_txt_(r.Tuteur_telephone),
        mail:EUC_DEV335_txt_(r.Tuteur_courriel)
      };
    })
    .filter(function(r){
      return !!r.debut;
    });

  if(!debut||!fin){
    return list.length
      ? {code:'APPRENTI',record:list[0]}
      : {code:'SCOLAIRE'};
  }

  var full=list.filter(function(r){
    return r.debut<=debut&&r.fin>=fin;
  })[0];

  if(full){
    return {
      code:'APPRENTI',
      record:full
    };
  }

  var part=list.filter(function(r){
    return r.debut<=fin&&r.fin>=debut;
  })[0];

  if(part){
    return {
      code:'MIXTE',
      record:part
    };
  }

  return {code:'SCOLAIRE'};
}

function EUC_DEV335_enrichDetail_(
  detail,
  annee,
  classe,
  periode
){
  detail=detail||{};

  var rows=EUC_DEV335_appRows_();

  var debut=
    detail.periode&&(
      detail.periode.debut||
      detail.periode.Date_debut
    );

  var fin=
    detail.periode&&(
      detail.periode.fin||
      detail.periode.Date_fin
    );

  var ap=0;
  var avec=0;
  var sans=0;
  var ann=0;
  var intp=0;

  (detail.lignes||[]).forEach(function(x){
    var st=
      EUC_DEV335_appStatus_(
        rows,
        x.eleveId,
        debut,
        fin
      );

    x.apprenti=
      st.code==='APPRENTI';

    x.statutMixte=
      st.code==='MIXTE';

    if(x.apprenti){
      ap++;
      x.statutCode='APPRENTI';
      x.statut='APPRENTI';

      if(
        st.record &&
        !EUC_DEV335_txt_(x.entreprise)
      ){
        x.entreprise=
          st.record.entreprise;
      }

      if(
        st.record &&
        !EUC_DEV335_txt_(
          x.tuteurEntreprise
        )
      ){
        x.tuteurEntreprise=[
          st.record.tuteur,
          st.record.tel,
          st.record.mail
        ].filter(Boolean).join(' · ');
      }

      return;
    }

    var code=EUC_DEV335_norm_(
      x.statutCode||
      x.statut
    );

    if(code.indexOf('ANNULEE')>=0){
      ann++;
    }else if(
      code.indexOf('INTERROMP')>=0
    ){
      intp++;
    }else if(
      Number(x.conventionId)>0
    ){
      avec++;
    }else{
      sans++;
    }
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

function EUC_DEV335_familyPageData_(annee,famille){
  if(
    famille==='BACPRO' &&
    typeof EUC_DEV291_family==='function'
  ){
    try{
      return EUC_DEV291_family({
        annee:annee,
        famille:famille
      });
    }catch(e){}
  }

  var fast=
    EUC_DEV190G1_fastFamilyIndex({
      annee:annee,
      famille:famille
    });

  var data=
    fast&&fast.ready&&fast.payload
      ? fast.payload
      : {
          ok:true,
          ready:false,
          annee:annee,
          famille:famille,
          classes:[]
        };

  data.ready=
    !!(
      fast&&
      fast.ready&&
      fast.payload
    );

  return data;
}
