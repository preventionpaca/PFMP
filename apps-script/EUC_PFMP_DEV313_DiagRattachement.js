/** PFMP — DEV.313 DIAG — lecture seule. */
function EUC_DEV313_diagRattachement(){
  var ctx=typeof EUC_V156_contexteAdmin_==='function'?EUC_V156_contexteAdmin_():null;
  if(!ctx)throw new Error('Accès administrateur requis.');
  var yearCode='2026-2027';

  function flat(table){
    var r=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records');
    return (r.records||[]).map(function(x){
      var f=x.fields||{},o={id:Number(x.id)||0};
      Object.keys(f).forEach(function(k){o[k]=f[k];});
      return o;
    });
  }
  function ref(v){
    if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
    if(Array.isArray(v))return Number(v[0]||0)||0;
    return Number(v)||0;
  }

  var accesses=flat('EUC_ACCES_FORMULAIRES_PFMP');
  var students=flat('EUC_ELEVES_PFMP');
  var studentBy={};
  students.forEach(function(x){studentBy[Number(x.id)]=x;});

  var snap=typeof EUC_SUIVI_V45_snapshot_==='function'?EUC_SUIVI_V45_snapshot_(yearCode):{cartes:[]};
  var validKeys={};
  (snap.cartes||[]).forEach(function(card){
    var cid=Number(card.classeId)||0;
    (card.periodes||[]).forEach(function(p){
      var pid=Number(p.id)||0;
      if(cid&&pid)validKeys[cid+'|'+pid]={classe:card.classe||'',periode:p.libelle||'',debut:p.debut||'',fin:p.fin||''};
    });
  });

  var migration=accesses.filter(function(a){
    var lot=String(a.Lot_generation||'').toUpperCase();
    return lot.indexOf('MIGRATION_JOTFORM')===0||lot.indexOf('DEV307')>=0;
  });

  var c={total:migration.length,active:0,bonneAnnee:0,cleSuiviValide:0,classeEleveConforme:0,manqueEleve:0,manqueClasse:0,manquePeriode:0,mauvaiseAnnee:0,cleAbsenteDuSuivi:0};

  var rows=migration.map(function(a){
    var eid=ref(a.Eleve),cid=ref(a.Classe_convention),pid=ref(a.Periode),e=studentBy[eid]||{},studentClass=ref(e.Classe);
    var active=typeof EUC_SUIVI_V45_estActive_==='function'?EUC_SUIVI_V45_estActive_(a):true;
    if(active)c.active++;
    var an=String(a.Annee_scolaire||'').trim();
    var bonneAnnee=!an||an===yearCode;
    if(bonneAnnee)c.bonneAnnee++;else c.mauvaiseAnnee++;
    var key=cid+'|'+pid,keyInfo=validKeys[key]||null;
    if(keyInfo)c.cleSuiviValide++;else c.cleAbsenteDuSuivi++;
    var classeConforme=!!(studentClass&&cid&&Number(studentClass)===Number(cid));
    if(classeConforme)c.classeEleveConforme++;
    if(!eid)c.manqueEleve++;
    if(!cid)c.manqueClasse++;
    if(!pid)c.manquePeriode++;
    return {
      accesId:Number(a.id)||0,
      eleveId:eid,
      eleve:[String(e.Nom||'').trim(),String(e.Prenom_usage||e.Prenom||'').trim()].filter(Boolean).join(' '),
      codeClasseEleve:String(e.Code_classe_importe||''),
      classeEleveId:studentClass,
      classeAccesId:cid,
      classeAccesNom:String(a.Classe_convention_nom||''),
      periodeAccesId:pid,
      periodeAccesLibelle:String(a.Periode_libelle||''),
      anneeAcces:an,
      active:active,
      entreprise:String(a.Entreprise_raison_sociale||''),
      statut:String(a.Statut_administratif||a.Statut||''),
      cleSuivi:key,
      cleExisteDansSuivi:!!keyInfo,
      classeEleveConforme:classeConforme,
      carteSuivi:keyInfo
    };
  });

  rows.sort(function(a,b){
    if(a.cleExisteDansSuivi!==b.cleExisteDansSuivi)return a.cleExisteDansSuivi?1:-1;
    if(a.classeEleveConforme!==b.classeEleveConforme)return a.classeEleveConforme?1:-1;
    return String(a.eleve||'').localeCompare(String(b.eleve||''),'fr');
  });

  return {ok:true,lectureSeule:true,annee:yearCode,totalAcces:accesses.length,totalMigration:migration.length,nbCartes:(snap.cartes||[]).length,nbClesSuivi:Object.keys(validKeys).length,compteurs:c,exemples:rows.slice(0,50)};
}
