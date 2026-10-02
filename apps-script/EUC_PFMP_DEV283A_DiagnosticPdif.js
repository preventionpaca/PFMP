/**
 * PFMP DEV283A — diagnostic P.dif. strictement lecture seule.
 * Aucun POST/PATCH/DELETE Grist.
 */
function EUC_DEV283A_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV283A_norm_(v){
  return EUC_DEV283A_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();
}

function EUC_DEV283A_ref_(v){
  try{
    if(typeof EUC_PFMP_ref_==='function'){
      return Number(EUC_PFMP_ref_(v))||0;
    }
  }catch(e){}

  if(Array.isArray(v)){
    return Number(v[1]||v[0])||0;
  }

  return Number(v)||0;
}

function EUC_DEV283A_bool_(v){
  if(typeof EUC_DEV281_bool_==='function'){
    return EUC_DEV281_bool_(v);
  }

  if(v===true)return true;
  if(v===false)return false;
  if(typeof v==='number')return v!==0;

  var s=String(v==null?'':v).trim().toLowerCase();

  return (
    s==='1'||
    s==='true'||
    s==='oui'||
    s==='yes'||
    s==='x'
  );
}

function EUC_DEV283A_safe_(fn){
  try{
    return {ok:true,value:fn()};
  }catch(e){
    return {
      ok:false,
      error:String(e&&e.message||e),
      stack:String(e&&e.stack||'')
    };
  }
}

function EUC_DEV283A_diag(payload){
  payload=payload||{};

  try{
    if(typeof EUC_IMPORT_exigerAdminTexte_==='function'){
      EUC_IMPORT_exigerAdminTexte_();
    }
  }catch(e){}

  var annee=EUC_DEV283A_txt_(payload.annee)||'2026-2027';
  var classeCode=EUC_DEV283A_txt_(payload.classe)||'TCAR';

  var out={
    ok:true,
    lectureSeule:true,
    diagnosticLe:new Date().toISOString(),
    annee:annee,
    classe:classeCode,
    raw:{},
    correspondances:{},
    moteurs:{},
    conclusions:[]
  };

  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP')||[];
  var classes=EUC_IMPORT_lireRecords_('Classes')||[];
  var pdif=EUC_IMPORT_lireRecords_('EUC_PARCOURS_DIFFERENCIE_PFMP')||[];
  var periodes=EUC_IMPORT_lireRecords_('Planning_Periodes')||[];

  out.raw.totalEleves=eleves.length;
  out.raw.totalClasses=classes.length;
  out.raw.totalPdif=pdif.length;
  out.raw.totalPeriodes=periodes.length;

  var classe=classes.filter(function(c){
    return [
      c.Nom,
      c.Code,
      c.Code_classe,
      c.Libelle,
      c.Libellé
    ].some(function(v){
      return EUC_DEV283A_norm_(v)===EUC_DEV283A_norm_(classeCode);
    });
  })[0]||null;

  var classeId=classe?Number(classe.id)||0:0;

  out.correspondances.classe={
    trouvee:!!classe,
    id:classeId,
    brut:classe
  };

  var elevesClasse=eleves.filter(function(e){
    var code=EUC_DEV283A_txt_(
      e.Code_classe_importe||
      e.Classe_nom
    );

    var ref=EUC_DEV283A_ref_(e.Classe);

    return (
      EUC_DEV283A_norm_(code)===EUC_DEV283A_norm_(classeCode) ||
      (classeId && ref===classeId)
    );
  });

  out.correspondances.elevesClasse=elevesClasse.map(function(e){
    return {
      id:Number(e.id)||0,
      nom:e.Nom||'',
      prenom:e.Prenom_usage||e.Prenom||'',
      codeClasse:e.Code_classe_importe||'',
      classeRef:EUC_DEV283A_ref_(e.Classe)
    };
  });

  var byId={};

  elevesClasse.forEach(function(e){
    byId[Number(e.id)||0]={
      nom:e.Nom||'',
      prenom:e.Prenom_usage||e.Prenom||''
    };
  });

  out.raw.pdifRows=pdif.map(function(r){
    var eid=EUC_DEV283A_ref_(r.Eleve);

    return {
      id:Number(r.id)||0,
      eleveRaw:r.Eleve,
      eleveId:eid,
      eleveNom:byId[eid]
        ? [byId[eid].nom,byId[eid].prenom].filter(Boolean).join(' ')
        : '',
      annee:r.Annee_scolaire,
      parcoursRaw:r.Parcours_differencie,
      parcoursType:typeof r.Parcours_differencie,
      parcoursBool:EUC_DEV283A_bool_(r.Parcours_differencie),
      actifRaw:r.Actif,
      actifBool:
        r.Actif===undefined||
        r.Actif===null||
        r.Actif===''||
        EUC_DEV283A_bool_(r.Actif),
      remarque:r.Remarque||''
    };
  });

  var selectedRows=out.raw.pdifRows.filter(function(r){
    return (
      String(r.annee||'').trim()===annee &&
      r.parcoursBool &&
      r.actifBool
    );
  });

  out.correspondances.selectionTable=selectedRows;

  var selectedIds={};

  selectedRows.forEach(function(r){
    selectedIds[Number(r.eleveId)||0]=true;
  });

  out.correspondances.selectionTCAR=elevesClasse
    .filter(function(e){
      return !!selectedIds[Number(e.id)||0];
    })
    .map(function(e){
      return {
        id:Number(e.id)||0,
        nom:e.Nom||'',
        prenom:e.Prenom_usage||e.Prenom||''
      };
    });

  out.moteurs.dev174=EUC_DEV283A_safe_(function(){
    if(typeof EUC_DEV174_pdifRows_!=='function'){
      return {absent:true};
    }

    var rows=EUC_DEV174_pdifRows_();

    return elevesClasse.map(function(e){
      return {
        id:Number(e.id)||0,
        nom:[
          e.Nom||'',
          e.Prenom_usage||e.Prenom||''
        ].filter(Boolean).join(' '),
        selected:
          typeof EUC_DEV174_estPdif_==='function'
            ? EUC_DEV174_estPdif_(
                rows,
                Number(e.id)||0,
                annee
              )
            : null
      };
    });
  });

  out.moteurs.dev283=EUC_DEV283A_safe_(function(){
    if(typeof EUC_DEV283_selectedSet_!=='function'){
      return {absent:true};
    }

    var set=EUC_DEV283_selectedSet_(annee);

    return elevesClasse.map(function(e){
      return {
        id:Number(e.id)||0,
        nom:[
          e.Nom||'',
          e.Prenom_usage||e.Prenom||''
        ].filter(Boolean).join(' '),
        selected:!!set[Number(e.id)||0]
      };
    });
  });

  var pdifPeriodes=periodes.filter(function(p){
    var txt=EUC_DEV283A_norm_([
      p.Type,
      p.type,
      p.Libelle,
      p.libelle,
      p.Nom,
      p.nom,
      p.Groupe,
      p.groupe,
      p.Niveau,
      p.niveau
    ].filter(Boolean).join(' '));

    return (
      /P[.\s-]*DIF|PDIF|PARCOURS DIFFERENCIE/.test(txt)
    );
  });

  out.correspondances.periodesPdif=pdifPeriodes.map(function(p){
    return {
      id:Number(p.id)||0,
      classeRaw:p.Classe||p.classe,
      classeRef:EUC_DEV283A_ref_(p.Classe||p.classe),
      libelle:p.Libelle||p.libelle||p.Nom||p.nom||p.Type||p.type||'',
      debut:p.Date_debut||p.debut||'',
      fin:p.Date_fin||p.fin||''
    };
  });

  var family=EUC_DEV283A_safe_(function(){
    if(typeof EUC_DEV283_family!=='function'){
      return {absent:true};
    }

    var r=EUC_DEV283_family({
      annee:annee,
      famille:'BACPRO'
    });

    var c=(r.classes||[]).filter(function(x){
      return Number(x.classeId||x.id)===classeId ||
        EUC_DEV283A_norm_(x.classe||x.nom||x.classeNom)===EUC_DEV283A_norm_(classeCode);
    })[0]||null;

    return c;
  });

  out.moteurs.family283=family;

  if(
    out.correspondances.selectionTCAR.length===0 &&
    selectedRows.length>0
  ){
    out.conclusions.push(
      'Des lignes P.dif. cochées existent, mais elles ne correspondent à aucun ID élève de la classe TCAR.'
    );
  }

  if(selectedRows.length===0){
    out.conclusions.push(
      'Aucune ligne cochée P.dif. active n’est lue pour 2026-2027 dans EUC_PARCOURS_DIFFERENCIE_PFMP.'
    );
  }

  if(out.correspondances.selectionTCAR.length){
    out.conclusions.push(
      'La table métier remonte '+out.correspondances.selectionTCAR.length+
      ' élève(s) TCAR cochés : '+out.correspondances.selectionTCAR
        .map(function(x){return x.nom+' '+x.prenom;})
        .join(', ')+'.'
    );
  }

  return out;
}

function EUC_DEV283A_page(e){
  var t=HtmlService.createTemplateFromFile(
    'EUC_DEV283A_DiagnosticPdif'
  );

  return t.evaluate()
    .setTitle('Diagnostic P.dif. — lecture seule')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
