function EUC_V46_txt_(v){return String(v==null?'':v).trim();}
function EUC_V46_norm_(v){return EUC_V46_txt_(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

function EUC_V46_statut_(a){
  if(!a)return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false,incident:false};
  var s=EUC_V46_norm_(a.Statut_administratif||a.Statut||'');
  if(a.Revoked===true||a.Supprimee_admin===true||s.indexOf('SUPPRIM')>=0||s.indexOf('REVOQU')>=0)
    return {code:'SANS_CONVENTION',libelle:'Sans convention',active:false,incident:false};
  if(s.indexOf('ANNULEE')>=0)return {code:'ANNULEE',libelle:'Annulée',active:false,incident:true};
  if(s.indexOf('INTERROMP')>=0)return {code:'INTERROMPUE',libelle:'Interrompue',active:false,incident:true};
  var legacy=EUC_V155_statutLibelle_(a);
  return {code:legacy.code,libelle:legacy.libelle,active:true,incident:false};
}

function EUC_V46_tuteur_(a){
  if(!a)return '';
  var nom=[EUC_V46_txt_(a.Tuteur_prenom),EUC_V46_txt_(a.Tuteur_nom)].filter(Boolean).join(' ').trim();
  if(!nom)nom=EUC_V46_txt_(a.Tuteur_nom);
  return [nom,EUC_V46_txt_(a.Tuteur_telephone),EUC_V46_txt_(a.Tuteur_courriel)].filter(Boolean).join(' · ');
}

function EUC_V46_numeroPeriodes_(detail){
  var ps=(detail&&detail.periodes||[]).slice().sort(function(a,b){
    var da=EUC_V46_txt_(a.debut)||'9999',db=EUC_V46_txt_(b.debut)||'9999';
    if(da!==db)return da.localeCompare(db);
    return Number(a.id||0)-Number(b.id||0);
  });
  var isBts=EUC_V46_norm_(detail&&detail.classe&&detail.classe.categorie).indexOf('BTS')>=0 ||
            EUC_V46_norm_(detail&&detail.classe&&detail.classe.nom).indexOf('BTS')>=0;
  var prefix=isBts?'Stage n°':'PFMP n°';
  ps.forEach(function(p,i){p.libelleOriginal=p.libelle;p.numero=i+1;p.libelle=prefix+(i+1);});
  detail.periodes=ps;
  if(detail.periode){
    var cur=ps.filter(function(p){return Number(p.id)===Number(detail.periode.id);})[0];
    if(cur){detail.periode.libelleOriginal=detail.periode.libelle;detail.periode.libelle=cur.libelle;detail.periode.numero=cur.numero;}
  }
  return detail;
}

function EUC_V46_enrichirDetail_(detail,annee,classeId,periodeId){
  if(!detail||!Array.isArray(detail.lignes))return detail;
  var dossiers=EUC_CONVENTION_lireAccesFraisV108_().filter(function(a){
    if(Number(EUC_PFMP_ref_(a.Classe_convention))!==Number(classeId))return false;
    if(periodeId&&Number(EUC_PFMP_ref_(a.Periode))!==Number(periodeId))return false;
    var an=EUC_V46_txt_(a.Annee_scolaire);
    return !annee||!an||an===annee;
  });
  var byEleve={};
  dossiers.forEach(function(a){
    var eid=Number(EUC_PFMP_ref_(a.Eleve))||0;
    if(!eid)return;
    (byEleve[eid]||(byEleve[eid]=[])).push(a);
  });
  var avec=0,annulees=0,interrompues=0;
  detail.lignes.forEach(function(x){
    var list=(byEleve[Number(x.eleveId)]||[]).slice().sort(function(a,b){return Number(b.id||0)-Number(a.id||0);});
    var actif=list.filter(function(a){return EUC_V46_statut_(a).active;})[0]||null;
    var dernier=actif||list[0]||null;
    var st=EUC_V46_statut_(dernier);
    x.conventionId=actif?Number(actif.id)||0:0;
    x.numero=actif?EUC_ADMIN_WORKFLOW_numeroV144_(actif):'';
    x.statutCode=st.code;x.statut=st.libelle;
    var src=actif||dernier;
    x.entreprise=src?EUC_V46_txt_(src.Entreprise_raison_sociale):'';
    x.adresseEntreprise=src?EUC_V155_adresseEntreprise_(src):'';
    x.contactEntreprise=src?EUC_V155_contactEntreprise_(src):'';
    x.tuteurEntreprise=src?EUC_V46_tuteur_(src):'';
    if(st.active)avec++;
    if(st.code==='ANNULEE')annulees++;
    if(st.code==='INTERROMPUE')interrompues++;
  });
  detail.stats=detail.stats||{};
  detail.stats.total=detail.lignes.length;
  detail.stats.avecConvention=avec;
  detail.stats.annulees=annulees;
  detail.stats.interrompues=interrompues;
  detail.stats.sansConvention=Math.max(0,detail.lignes.length-avec-annulees-interrompues);
  return EUC_V46_numeroPeriodes_(detail);
}

function EUC_SUIVI_CLASSE_afficherV46(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_();
  var classeId=Number(e&&e.parameter&&e.parameter.classe)||0;
  var periodeId=Number(e&&e.parameter&&e.parameter.periode)||0;
  var annee=EUC_V46_txt_(e&&e.parameter&&e.parameter.annee)||ctx.active;
  if(classeId<=0)throw new Error('Classe manquante.');
  var detail=EUC_SUIVI_CLASSE_detailF18_(annee,classeId,periodeId);
  var pid=Number(detail&&detail.periode&&detail.periode.id)||periodeId||0;
  detail=EUC_V46_enrichirDetail_(detail,annee,classeId,pid);
  var tpl=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');
  tpl.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});
  tpl.anneeContextJson=JSON.stringify(ctx);
  tpl.detailJson=JSON.stringify(detail);
  return tpl.evaluate().setTitle('Suivi PFMP — '+detail.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
