/** PFMP — DEV.314 DIAG — lecture seule. */
function EUC_DEV314_diagAccesEleves(){
  var ctx=typeof EUC_V156_contexteAdmin_==='function'?EUC_V156_contexteAdmin_():null;
  if(!ctx)throw new Error('Accès administrateur requis.');

  function flat(table){
    var r=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records');
    return (r.records||[]).map(function(x){
      var o={id:Number(x.id)||0},f=x.fields||{};
      Object.keys(f).forEach(function(k){o[k]=f[k];});
      return o;
    });
  }
  function ref(v){
    if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
    if(Array.isArray(v))return Number(v[0]||0)||0;
    return Number(v)||0;
  }
  function digits(v){return String(v==null?'':v).replace(/\D/g,'');}

  var buffer=typeof EUC_DEV298_rows_==='function'?EUC_DEV298_rows_():[];
  var accesses=flat('EUC_ACCES_FORMULAIRES_PFMP');
  var students=flat('EUC_ELEVES_PFMP');
  var studentBy={};
  students.forEach(function(e){studentBy[Number(e.id)]=e;});

  var selected=buffer.filter(function(r){
    return Number(r.Eleve_match_id)>0 && (r.Importer===true || String(r.Decision||'').toUpperCase()==='VALIDEE');
  });

  var byStudent={};
  selected.forEach(function(r){
    var id=Number(r.Eleve_match_id)||0;
    if(!byStudent[id])byStudent[id]=[];
    byStudent[id].push(r);
  });

  var accessByStudent={};
  accesses.forEach(function(a){
    var id=ref(a.Eleve);
    if(!id)return;
    if(!accessByStudent[id])accessByStudent[id]=[];
    accessByStudent[id].push(a);
  });

  var snap=typeof EUC_SUIVI_V45_snapshot_==='function'?EUC_SUIVI_V45_snapshot_('2026-2027'):{cartes:[]};
  var keys={};
  (snap.cartes||[]).forEach(function(c){
    var cid=Number(c.classeId)||0;
    (c.periodes||[]).forEach(function(p){
      var pid=Number(p.id)||0;
      if(cid&&pid)keys[cid+'|'+pid]=true;
    });
  });

  var c={
    lignesTampon:selected.length,
    elevesDistincts:Object.keys(byStudent).length,
    elevesAvecAcces:0,
    elevesSansAcces:0,
    elevesAvecPlusieursAcces:0,
    elevesAvecSiretMatch:0,
    elevesVisiblesSuivi:0,
    accesLies:0,
    accesSiretMatch:0,
    accesClasseOk:0,
    accesCleSuiviOk:0,
    accesActifs:0
  };

  var details=[];

  Object.keys(byStudent).forEach(function(k){
    var eid=Number(k),e=studentBy[eid]||{},rows=byStudent[eid]||[];
    var expected={};
    rows.forEach(function(r){
      var s=digits(r.SIRET_normalise||r.SIRET_brut||'');
      if(s)expected[s]=true;
    });

    var classId=ref(e.Classe);
    var list=(accessByStudent[eid]||[]).slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});
    if(list.length)c.elevesAvecAcces++; else c.elevesSansAcces++;
    if(list.length>1)c.elevesAvecPlusieursAcces++;
    c.accesLies+=list.length;

    var siretMatch=false,visible=false;
    var acc=list.slice(0,10).map(function(a){
      var cid=ref(a.Classe_convention),pid=ref(a.Periode),s=digits(a.Entreprise_siret||'');
      var active=typeof EUC_SUIVI_V45_estActive_==='function'?EUC_SUIVI_V45_estActive_(a):true;
      var classOk=!!classId && cid===classId;
      var keyOk=!!keys[cid+'|'+pid];
      var sm=!!s && !!expected[s];
      if(active)c.accesActifs++;
      if(classOk)c.accesClasseOk++;
      if(keyOk)c.accesCleSuiviOk++;
      if(sm){c.accesSiretMatch++;siretMatch=true;}
      if(active&&classOk&&keyOk)visible=true;
      return {
        id:Number(a.id)||0,classe:cid,periode:pid,active:active,classOk:classOk,keyOk:keyOk,
        siret:s,siretMatch:sm,annee:String(a.Annee_scolaire||''),entreprise:String(a.Entreprise_raison_sociale||''),
        statut:String(a.Statut_administratif||a.Statut||''),lot:String(a.Lot_generation||'')
      };
    });

    if(siretMatch)c.elevesAvecSiretMatch++;
    if(visible)c.elevesVisiblesSuivi++;

    details.push({
      eleveId:eid,
      eleve:[String(e.Nom||'').trim(),String(e.Prenom_usage||e.Prenom||'').trim()].filter(Boolean).join(' '),
      classeReelle:classId,
      codeClasse:String(e.Code_classe_importe||''),
      sirets:Object.keys(expected),
      nbAcces:list.length,
      siretMatch:siretMatch,
      visibleSuivi:visible,
      acces:acc
    });
  });

  details.sort(function(a,b){
    if(a.visibleSuivi!==b.visibleSuivi)return a.visibleSuivi?1:-1;
    if(a.siretMatch!==b.siretMatch)return a.siretMatch?1:-1;
    return b.nbAcces-a.nbAcces;
  });

  return {ok:true,lectureSeule:true,totalAccesTable:accesses.length,nbClesSuivi:Object.keys(keys).length,compteurs:c,details:details.slice(0,35)};
}
