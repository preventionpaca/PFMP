/** Eucalyptus PFMP — v1.0.0-dev.161-fix3
 * - Etat actuel : annulation/interruption => Sans convention + historique secondaire
 * - Désaffectation téléphone/visiteur avec historique conservé
 * - Utilitaires lecture seule ENT
 */

function EUC_V161F3_txt_(v){return String(v==null?'':v).trim();}
function EUC_V161F3_norm_(v){
  return EUC_V161F3_txt_(v).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function EUC_V161F3_incident_(x){
  var s=EUC_V161F3_norm_((x&&x.statutCode)||'')+' '+EUC_V161F3_norm_((x&&x.statut)||'');
  return s.indexOf('annul')>=0 || s.indexOf('interromp')>=0;
}

function EUC_V161F3_reason_(x){
  var keys=[
    'motifAnnulation','motif_annulation','Motif_annulation','Motif_annulation_interruption',
    'motifInterruption','motif_interruption','Motif_interruption','raison','Raison','motif','Motif'
  ];
  for(var i=0;i<keys.length;i++){
    if(x && EUC_V161F3_txt_(x[keys[i]]))return EUC_V161F3_txt_(x[keys[i]]);
  }
  return '';
}

function EUC_V161F3_type_(x){
  var s=EUC_V161F3_norm_((x&&x.statutCode)||'')+' '+EUC_V161F3_norm_((x&&x.statut)||'');
  return s.indexOf('interromp')>=0?'Convention interrompue':'Convention annulée';
}

function EUC_SUIVI_CLASSE_detailV162(codeAnnee,classeId,periodeId){
  var d=EUC_SUIVI_CLASSE_detailV156(codeAnnee,classeId,periodeId);
  d.historiqueIncidents=[];

  d.lignes=(d.lignes||[]).map(function(x){
    x.historiqueConventions=x.historiqueConventions||[];

    if(EUC_V161F3_incident_(x)){
      var hist={
        type:EUC_V161F3_type_(x),
        numero:EUC_V161F3_txt_(x.numero),
        entreprise:EUC_V161F3_txt_(x.entreprise),
        statut:EUC_V161F3_txt_(x.statut),
        raison:EUC_V161F3_reason_(x)
      };
      x.historiqueConventions.push(hist);
      d.historiqueIncidents.push({
        eleveId:x.eleveId,
        nom:EUC_V161F3_txt_(x.nom),
        prenom:EUC_V161F3_txt_(x.prenom),
        numero:hist.numero,
        entreprise:hist.entreprise,
        statut:hist.statut||hist.type,
        type:hist.type,
        raison:hist.raison
      });

      x.statutCode='SANS_CONVENTION';
      x.statut='Sans convention';
      x.numero='';
      x.entreprise='';
      x.adresseEntreprise='';
      x.contactEntreprise='';
    }
    return x;
  });

  var sans=0,avec=0;
  d.lignes.forEach(function(x){
    var s=EUC_V161F3_norm_(x.statutCode)+' '+EUC_V161F3_norm_(x.statut);
    if(s.indexOf('sans convention')>=0)sans++; else avec++;
  });

  d.stats=d.stats||{};
  d.stats.total=d.lignes.length;
  d.stats.avecConvention=avec;
  d.stats.sansConvention=sans;
  d.stats.annulees=d.historiqueIncidents.filter(function(x){return EUC_V161F3_norm_(x.type).indexOf('annul')>=0;}).length;
  d.stats.interrompues=d.historiqueIncidents.filter(function(x){return EUC_V161F3_norm_(x.type).indexOf('interromp')>=0;}).length;

  return d;
}

function EUC_V161F3_assurerRetraitCols_(){
  var table='EUC_AFFECTATIONS_SUIVI_PFMP';
  var cols=EUC_ENT_grist('get','/tables/'+table+'/columns').columns||[];
  var have={};cols.forEach(function(c){have[c.id]=true;});
  var missing=[];
  if(!have.Date_retrait)missing.push({id:'Date_retrait',fields:{label:'Date retrait',type:'DateTime'}});
  if(!have.Retire_par)missing.push({id:'Retire_par',fields:{label:'Retiré par',type:'Text'}});
  if(!have.Motif_retrait)missing.push({id:'Motif_retrait',fields:{label:'Motif retrait',type:'Text'}});
  if(missing.length)EUC_ENT_grist('post','/tables/'+table+'/columns',{columns:missing});
  return true;
}

function EUC_SUIVI_DESAFFECTER_V162(payload){
  var ctx=EUC_V156_contexteAdmin_();
  if(!ctx)throw new Error('Accès administrateur requis.');

  payload=payload||{};
  var annee=EUC_V161F3_txt_(payload.annee);
  var classeId=Number(payload.classeId);
  var periodeId=Number(payload.periodeId);
  var type=EUC_V161F3_txt_(payload.type).toUpperCase();
  var ids=(payload.eleveIds||[]).map(Number).filter(function(x){return x>0;});
  var motif=EUC_V161F3_txt_(payload.motif)||'Désaffectation administrative';

  if(['TELEPHONE','VISITE'].indexOf(type)<0)throw new Error('Type de suivi invalide.');
  if(!annee||!classeId||!periodeId||!ids.length)throw new Error('Désaffectation incomplète.');

  EUC_V161F3_assurerRetraitCols_();
  var rows=EUC_IMPORT_lireRecords_('EUC_AFFECTATIONS_SUIVI_PFMP');
  var now=new Date().toISOString();
  var count=0;

  rows.forEach(function(r){
    if(r.Actif===false)return;
    if(EUC_V161F3_txt_(r.Annee_scolaire)!==annee)return;
    if(Number(EUC_PFMP_ref_(r.Classe))!==classeId)return;
    if(Number(EUC_PFMP_ref_(r.Periode))!==periodeId)return;
    if(ids.indexOf(Number(EUC_PFMP_ref_(r.Eleve)))<0)return;
    if(EUC_V161F3_txt_(r.Type_suivi).toUpperCase()!==type)return;

    EUC_ENT_grist('patch','/tables/EUC_AFFECTATIONS_SUIVI_PFMP/records',{
      records:[{id:r.id,fields:{
        Actif:false,
        Date_retrait:now,
        Retire_par:ctx.email||'',
        Motif_retrait:motif,
        Date_modification:now
      }}]
    });
    count++;
  });

  return {ok:true,count:count,detail:EUC_SUIVI_CLASSE_detailV162(annee,classeId,periodeId)};
}

function EUC_V161F3_historiqueHtml_(detail){
  var rows=(detail&&detail.historiqueIncidents)||[];
  if(!rows.length)return '';
  function e(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  return '<br><h3 style="font-family:Arial,sans-serif;color:#b42318">Conventions annulées ou interrompues pendant cette PFMP</h3>'+ 
    '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px"><thead><tr style="background:#fff1f2">'+
    '<th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Élève</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Convention</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Ancienne entreprise</th><th style="border:1px solid #cfd8e3;padding:7px;text-align:left">Situation / motif</th></tr></thead><tbody>'+ 
    rows.map(function(x){return '<tr><td style="border:1px solid #cfd8e3;padding:7px">'+e((x.nom||'')+' '+(x.prenom||''))+'</td><td style="border:1px solid #cfd8e3;padding:7px">'+e(x.numero||'—')+'</td><td style="border:1px solid #cfd8e3;padding:7px">'+e(x.entreprise||'—')+'</td><td style="border:1px solid #cfd8e3;padding:7px;color:#b42318;font-weight:700">'+e(x.statut||x.type)+(x.raison?'<br><span style="font-weight:400">'+e(x.raison)+'</span>':'')+'</td></tr>';}).join('')+
    '</tbody></table>';
}
