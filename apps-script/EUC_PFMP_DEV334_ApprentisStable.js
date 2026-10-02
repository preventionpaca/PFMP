/**
 * PFMP — v1.0.0-dev.334
 * Source apprentissage stable pour gestion + détail de classe.
 */

function EUC_DEV334_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV334_ref_(v){
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

function EUC_DEV334_iso_(v){
  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var x=EUC_IMPORT_dateExistanteISO_(v);
      if(x)return x;
    }
  }catch(e){}

  if(typeof v==='number'&&isFinite(v)){
    var d=new Date(v*1000);
    return isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }

  var s=EUC_DEV334_txt_(v);
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?m[1]+'-'+m[2]+'-'+m[3]:'';
}

function EUC_DEV334_className_(classeId){
  try{
    var rows=EUC_IMPORT_lireRecords_('Classes')||[];

    var c=rows.filter(function(x){
      return Number(x.id)===Number(classeId);
    })[0]||{};

    if(typeof EUC_V154_classeNom_==='function'){
      return EUC_V154_classeNom_(c);
    }

    return EUC_DEV334_txt_(
      c.Nom||
      c.Libelle||
      c.Code||
      c.Code_classe||
      ''
    );
  }catch(e){
    return '';
  }
}

function EUC_DEV334_loadEngine_(annee,classeId,classeNom){
  var attempts=[];

  if(typeof EUC_DEV190V1_loadApprentis==='function'){
    try{
      var r1=EUC_DEV190V1_loadApprentis(
        annee,
        classeId,
        classeNom
      );

      if(r1&&Array.isArray(r1.students)){
        r1._source='DEV190V1';
        return r1;
      }
    }catch(e1){
      attempts.push(
        'DEV190V1: '+
        String(e1&&e1.message||e1)
      );
    }
  }

  if(typeof EUC_DEV190U_loadApprentis==='function'){
    try{
      var r2=EUC_DEV190U_loadApprentis(
        annee,
        classeId
      );

      if(r2&&Array.isArray(r2.students)){
        r2._source='DEV190U';
        return r2;
      }
    }catch(e2){
      attempts.push(
        'DEV190U: '+
        String(e2&&e2.message||e2)
      );
    }
  }

  try{
    var d=EUC_APP172_data({
      annee:annee,
      classe:classeId
    })||{};

    return {
      ok:true,
      _source:'APP172',
      students:(d.eleves||[]).map(function(x){
        return {
          id:Number(x.id)||0,
          nom:EUC_DEV334_txt_(x.nom),
          prenom:EUC_DEV334_txt_(x.prenom),
          apprenti:!!x.apprenti,
          debut:EUC_DEV334_txt_(x.debut),
          fin:EUC_DEV334_txt_(x.fin),
          entreprise:EUC_DEV334_txt_(x.entreprise),
          tuteur:EUC_DEV334_txt_(x.tuteur),
          telTuteur:EUC_DEV334_txt_(x.tel),
          mailTuteur:EUC_DEV334_txt_(x.mail)
        };
      })
    };
  }catch(e3){
    attempts.push(
      'APP172: '+
      String(e3&&e3.message||e3)
    );
  }

  throw new Error(
    'Aucun moteur apprentissage utilisable. '+
    attempts.join(' | ')
  );
}

function EUC_DEV334_appData(payload){
  payload=payload||{};

  var base=EUC_APP172_data(payload)||{};

  var annee=EUC_DEV334_txt_(
    base.annee||
    payload.annee
  );

  var classeId=
    Number(base.classeId)||Number(payload.classe)||0;

  var classeNom='';

  (base.classes||[]).forEach(function(c){
    if(Number(c.id)===classeId){
      classeNom=EUC_DEV334_txt_(c.nom);
    }
  });

  if(!classeNom){
    classeNom=EUC_DEV334_className_(classeId);
  }

  var engine=
    EUC_DEV334_loadEngine_(
      annee,
      classeId,
      classeNom
    );

  var byId={};

  (engine.students||[]).forEach(function(x){
    byId[Number(x.id)||0]=x;
  });

  base.eleves=(base.eleves||[]).map(function(x){
    var m=byId[Number(x.id)||0];

    if(!m)return x;

    x.apprenti=!!m.apprenti;
    x.debut=EUC_DEV334_txt_(m.debut||x.debut);
    x.fin=EUC_DEV334_txt_(m.fin||x.fin);
    x.entreprise=EUC_DEV334_txt_(m.entreprise||x.entreprise);
    x.tuteur=EUC_DEV334_txt_(m.tuteur||x.tuteur);
    x.tel=EUC_DEV334_txt_(
      m.telTuteur||
      m.tel||
      x.tel
    );
    x.mail=EUC_DEV334_txt_(
      m.mailTuteur||
      m.mail||
      x.mail
    );

    return x;
  });

  base.loaderSource=engine._source||'';
  return base;
}

function EUC_DEV334_appSave(payload){
  var r=EUC_APP172_save(payload||{});

  try{
    CacheService.getScriptCache().remove(
      'EUC_APP172_SNAP_'+
      EUC_DEV334_txt_(payload&&payload.annee)
    );
  }catch(e){}

  return r;
}

function EUC_DEV334_isApprenticeForPeriod_(
  app,
  pStart,
  pEnd
){
  if(!app||!app.apprenti){
    return {
      apprenti:false,
      mixte:false
    };
  }

  var aStart=EUC_DEV334_iso_(app.debut);
  var aEnd=
    EUC_DEV334_iso_(app.fin)||
    '9999-12-31';

  if(!pStart||!pEnd||!aStart){
    return {
      apprenti:true,
      mixte:false
    };
  }

  if(aStart<=pStart&&aEnd>=pEnd){
    return {
      apprenti:true,
      mixte:false
    };
  }

  if(aStart<=pEnd&&aEnd>=pStart){
    return {
      apprenti:false,
      mixte:true
    };
  }

  return {
    apprenti:false,
    mixte:false
  };
}

function EUC_DEV334_enrichDetail_(
  detail,
  annee,
  classeId,
  periodeId
){
  detail=detail||{};

  var classeNom=
    EUC_DEV334_txt_(
      detail.classe&&detail.classe.nom
    )||
    EUC_DEV334_className_(classeId);

  var engine=
    EUC_DEV334_loadEngine_(
      annee,
      classeId,
      classeNom
    );

  var byId={};

  (engine.students||[]).forEach(function(x){
    byId[Number(x.id)||0]=x;
  });

  var pStart=EUC_DEV334_iso_(
    detail.periode&&(
      detail.periode.debut||
      detail.periode.Date_debut
    )
  );

  var pEnd=EUC_DEV334_iso_(
    detail.periode&&(
      detail.periode.fin||
      detail.periode.Date_fin
    )
  );

  var ap=0;
  var avec=0;
  var ann=0;
  var intp=0;
  var sans=0;

  (detail.lignes||[]).forEach(function(x){
    var a=byId[Number(x.eleveId)||0]||null;

    var st=
      EUC_DEV334_isApprenticeForPeriod_(
        a,
        pStart,
        pEnd
      );

    x.apprenti=!!st.apprenti;
    x.statutMixte=!!st.mixte;

    if(x.apprenti){
      ap++;
      x.statutCode='APPRENTI';
      x.statut='Apprenti';
      x.conventionId=0;

      if(a){
        if(!EUC_DEV334_txt_(x.entreprise)){
          x.entreprise=
            EUC_DEV334_txt_(a.entreprise);
        }

        if(!EUC_DEV334_txt_(x.tuteurEntreprise)){
          x.tuteurEntreprise=[
            EUC_DEV334_txt_(a.tuteur),
            EUC_DEV334_txt_(
              a.telTuteur||a.tel
            ),
            EUC_DEV334_txt_(
              a.mailTuteur||a.mail
            )
          ].filter(Boolean).join(' · ');
        }

        if(!EUC_DEV334_txt_(x.contactEntreprise)){
          x.contactEntreprise=[
            EUC_DEV334_txt_(
              a.telEntreprise
            ),
            EUC_DEV334_txt_(
              a.mailEntreprise
            )
          ].filter(Boolean).join(' · ');
        }
      }

      return;
    }

    var code=
      EUC_DEV334_txt_(
        x.statutCode||
        x.statut
      ).toUpperCase();

    if(code.indexOf('ANNULEE')>=0){
      ann++;
      return;
    }

    if(code.indexOf('INTERROMP')>=0){
      intp++;
      return;
    }

    if(Number(x.conventionId)>0){
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
  detail.dev334LoaderSource=
    engine._source||'';

  return detail;
}
