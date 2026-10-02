/** PFMP — DEV.318 DIAG — lecture seule Grist. */
function EUC_DEV318_diagSuiviLayers(){
  var ctx=typeof EUC_V156_contexteAdmin_==='function'
    ? EUC_V156_contexteAdmin_()
    : null;
  if(!ctx)throw new Error('Accès administrateur requis.');

  function ref(v){
    if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
    if(Array.isArray(v)){
      for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);
    }
    return Number(v)||0;
  }

  function flat(table){
    var r=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records');
    return (r.records||[]).map(function(x){
      var o={id:Number(x.id)||0},f=x.fields||{};
      Object.keys(f).forEach(function(k){o[k]=f[k];});
      return o;
    });
  }

  var accesses=flat('EUC_ACCES_FORMULAIRES_PFMP');
  var students=flat('EUC_ELEVES_PFMP');
  var studentBy={};
  students.forEach(function(s){studentBy[Number(s.id)]=s;});

  var migrated=accesses.filter(function(a){
    return String(a.Lot_generation||'')==='MIGRATION_JOTFORM_DEV315';
  });

  var counts={
    migration315:migrated.length,
    avecSiret:0,
    avecEntreprise:0,
    avecDateSaisie:0,
    remonteesV50:0,
    activesV45:0
  };

  var targets={},samples=[];

  migrated.forEach(function(a){
    var eid=ref(a.Eleve),cid=ref(a.Classe_convention),pid=ref(a.Periode);
    var year=String(a.Annee_scolaire||'').trim();

    if(String(a.Entreprise_siret||'').replace(/\D/g,'').length===14)counts.avecSiret++;
    if(String(a.Entreprise_raison_sociale||'').trim())counts.avecEntreprise++;
    if(a.Date_saisie_entreprise)counts.avecDateSaisie++;

    var remontee=typeof EUC_V50_estRemontee_==='function'
      ? EUC_V50_estRemontee_(a)
      : false;
    var active=typeof EUC_SUIVI_V45_estActive_==='function'
      ? EUC_SUIVI_V45_estActive_(a)
      : false;

    if(remontee)counts.remonteesV50++;
    if(active)counts.activesV45++;

    if(year&&cid&&pid)targets[year+'|'+cid+'|'+pid]={year:year,classId:cid,periodId:pid};

    if(samples.length<12){
      var e=studentBy[eid]||{};
      samples.push({
        accesId:Number(a.id)||0,
        eleve:[String(e.Nom||'').trim(),String(e.Prenom_usage||e.Prenom||'').trim()].filter(Boolean).join(' '),
        classe:cid,periode:pid,annee:year,
        siret:String(a.Entreprise_siret||''),
        entreprise:String(a.Entreprise_raison_sociale||''),
        dateSaisie:String(a.Date_saisie_entreprise||''),
        remonteeV50:remontee,activeV45:active
      });
    }
  });

  var directDetails=[];
  Object.keys(targets).sort().forEach(function(k){
    var t=targets[k];
    try{
      var base=EUC_SUIVI_CLASSE_detailF18_(t.year,t.classId,t.periodId);
      var enriched=EUC_V50_enrichirDetail_(base,t.year,t.classId,t.periodId);
      directDetails.push({
        annee:t.year,classe:t.classId,periode:t.periodId,
        total:Number(enriched&&enriched.stats&&enriched.stats.total||0),
        avecConvention:Number(enriched&&enriched.stats&&enriched.stats.avecConvention||0),
        sansConvention:Number(enriched&&enriched.stats&&enriched.stats.sansConvention||0)
      });
    }catch(e){
      directDetails.push({
        annee:t.year,classe:t.classId,periode:t.periodId,
        erreur:String(e&&e.message||e)
      });
    }
  });

  var fastFamily=null;
  try{
    fastFamily=EUC_DEV190G1_fastFamilyIndex({annee:'2026-2027',famille:'BACPRO'});
  }catch(eFast){
    fastFamily={erreur:String(eFast&&eFast.message||eFast)};
  }

  var familySummary={ready:!!(fastFamily&&fastFamily.ready&&fastFamily.payload),classes:[]};
  if(familySummary.ready){
    (fastFamily.payload.classes||[]).forEach(function(c){
      familySummary.classes.push({
        classeId:Number(c.classeId||c.id)||0,
        classe:String(c.classe||c.code||c.nom||''),
        periodes:(c.periodes||[]).map(function(p){
          return {
            id:Number(p.id||p.periodeId)||0,
            conventions:Number(p.conventions||0),
            total:Number(p.total||0)
          };
        })
      });
    });
  }else if(fastFamily&&fastFamily.erreur){
    familySummary.erreur=fastFamily.erreur;
  }

  return {
    ok:true,lectureSeule:true,
    compteurs:counts,
    cibles:Object.keys(targets).length,
    echantillons:samples,
    detailsDirects:directDetails,
    indexFamille:familySummary
  };
}
