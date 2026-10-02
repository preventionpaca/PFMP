/** PFMP — v1.0.0-dev.331 */
function EUC_DEV331_txt_(v){return String(v==null?'':v).trim();}
function EUC_DEV331_norm_(v){return EUC_DEV331_txt_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'');}
function EUC_DEV331_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV331_levelOf_(name,fam){
  var n=EUC_DEV331_txt_(name).toUpperCase();
  if(fam==='BACPRO'){if(/^T/.test(n))return'Terminale';if(/^1/.test(n))return'Première';if(/^2/.test(n))return'Seconde';}
  if(fam==='BTS'){if(/^2/.test(n))return'2e année';return'1re année';}
  if(fam==='CAP'){if(/^T/.test(n)||/^2/.test(n))return'TCAP';return'1CAP';}
  return'Autres';
}
function EUC_DEV331_order_(fam){
  if(fam==='BACPRO')return['Terminale','Première','Seconde'];
  if(fam==='BTS')return['1re année','2e année'];
  if(fam==='CAP')return['1CAP','TCAP'];
  return['Autres'];
}
function EUC_DEV331_isPdif_(p){
  p=p||{};
  var n=EUC_DEV331_norm_(p.libelle||p.label||p.code||'');
  return !!(p.pdif===true||p.parcoursDifferencie===true||p.parcoursDifferencies!==undefined||n.indexOf('PDIF')>=0||n.indexOf('PARCOURSDIFFERENCIE')>=0);
}
function EUC_DEV331_periodLabel_(fam,n){return fam==='BTS'?'Stage n°'+n:'PFMP n°'+n;}
function EUC_DEV331_familyIndex_(annee,famille){
  var r=EUC_DEV190G1_fastFamilyIndex({annee:annee,famille:famille});
  return r&&r.ready&&r.payload?r.payload:{ok:true,ready:false,annee:annee,famille:famille,classes:[]};
}
function EUC_DEV331_resumeOne_(annee,famille){
  var data=EUC_DEV331_familyIndex_(annee,famille),levels={},order=EUC_DEV331_order_(famille);
  order.forEach(function(n){levels[n]={niveau:n,effectif:0,apprentis:0,classes:0,periodes:[],pdif:null};});
  (data.classes||[]).forEach(function(c){
    var ln=EUC_DEV331_levelOf_(c.classe||c.nom||c.code||'',famille);
    if(!levels[ln])levels[ln]={niveau:ln,effectif:0,apprentis:0,classes:0,periodes:[],pdif:null};
    var l=levels[ln],eff=Number(c.effectif)||0;
    if(!eff){var fp=(c.periodes||[]).filter(function(p){return !EUC_DEV331_isPdif_(p);})[0];eff=Number(fp&&fp.total)||0;}
    l.classes++;l.effectif+=eff;l.apprentis+=Number(c.apprentis)||0;
    var ord=0;
    (c.periodes||[]).forEach(function(p){
      if(EUC_DEV331_isPdif_(p)){
        var pd=l.pdif||{libelle:'P.dif.',parcoursDifferencies:0,poursuitePfmp2:0,aDefinirFinTerminale:0};
        pd.parcoursDifferencies+=Number(p.parcoursDifferencies)||0;
        pd.poursuitePfmp2+=Number(p.poursuitePfmp2)||0;
        pd.aDefinirFinTerminale+=Number(p.aDefinirFinTerminale)||0;
        l.pdif=pd;return;
      }
      ord++;
      if(!l.periodes[ord-1])l.periodes[ord-1]={ordinal:ord,libelle:EUC_DEV331_periodLabel_(famille,ord),conventions:0,total:0,apprentis:0};
      var d=l.periodes[ord-1];
      d.conventions+=Number(p.conventions)||0;
      d.total+=Number(p.total)||0;
      d.apprentis+=p.apprentis!==undefined&&p.apprentis!==null?Number(p.apprentis)||0:Number(c.apprentis)||0;
    });
  });
  if(famille==='BACPRO'&&levels.Terminale){
    try{
      var legacy=EUC_APP172_resumeFamille({annee:annee,famille:'BACPRO'})||{};
      var pl=(legacy.periodes||[]).filter(EUC_DEV331_isPdif_)[0]||null;
      if(pl)levels.Terminale.pdif={
        libelle:pl.libelle||'P.dif.',
        parcoursDifferencies:Number(pl.parcoursDifferencies)||0,
        poursuitePfmp2:Number(pl.poursuitePfmp2)||0,
        aDefinirFinTerminale:Number(pl.aDefinirFinTerminale)||0
      };
    }catch(e){}
  }
  var outs=order.filter(function(n){return levels[n]&&levels[n].classes>0;}).map(function(n){
    var l=levels[n];l.periodes=(l.periodes||[]).filter(Boolean);
    l.periodes.forEach(function(p){p.pourcentage=p.total>0?Math.round(100*p.conventions/p.total):0;});
    return l;
  });
  var out={famille:famille,classes:0,effectif:0,apprentis:0,niveaux:outs};
  outs.forEach(function(l){out.classes+=Number(l.classes)||0;out.effectif+=Number(l.effectif)||0;out.apprentis+=Number(l.apprentis)||0;});
  return out;
}
function EUC_DEV331_resumeNiveaux(payload){
  payload=payload||{};
  var annee=EUC_DEV331_txt_(payload.annee);
  if(!annee){var ctx=EUC_PFMP_contexteAnneeLectureV155_();annee=EUC_DEV331_txt_(ctx&&ctx.active);}
  if(!/^20\d{2}-20\d{2}$/.test(annee))throw new Error('Année scolaire invalide.');
  return {ok:true,version:'DEV.331',annee:annee,familles:{
    BACPRO:EUC_DEV331_resumeOne_(annee,'BACPRO'),
    BTS:EUC_DEV331_resumeOne_(annee,'BTS'),
    CAP:EUC_DEV331_resumeOne_(annee,'CAP')
  }};
}
function EUC_DEV331_date_(v){
  if(typeof EUC_IMPORT_dateExistanteISO_==='function'){try{var x=EUC_IMPORT_dateExistanteISO_(v);if(x)return x;}catch(e){}}
  if(typeof v==='number'&&isFinite(v))return new Date(v*1000).toISOString().slice(0,10);
  var s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
function EUC_DEV331_apprentisActuels_(){
  var rows=[];try{rows=typeof EUC_APP172_rows==='function'?EUC_APP172_rows():[];}catch(e){rows=[];}
  var today=new Date().toISOString().slice(0,10),map={};
  (rows||[]).forEach(function(r){
    if(r.Actif===false)return;
    var eid=EUC_DEV331_ref_(r.Eleve);if(!(eid>0))return;
    var d=EUC_DEV331_date_(r.Date_debut),f=EUC_DEV331_date_(r.Date_fin)||'9999-12-31';
    if(d&&d<=today&&f>=today)map[eid]={id:Number(r.id)||0,debut:d,fin:f==='9999-12-31'?'':f,entreprise:EUC_DEV331_txt_(r.Entreprise)};
  });
  return map;
}
function EUC_DEV331_enrichApprentisDetail_(detail,annee,classeId,periodeId){
  detail=detail||{};var map=EUC_DEV331_apprentisActuels_(),nb=0;
  (detail.lignes||[]).forEach(function(x){
    var eid=Number(x.eleveId||x.id||0)||0,app=map[eid]||null;
    x.apprenti=!!app;
    if(app){nb++;x.apprentissage={recordId:app.id,debut:app.debut,fin:app.fin,entreprise:app.entreprise};}
  });
  detail.stats=detail.stats||{};
  detail.stats.apprentis=nb;
  detail.stats.sansConvention=(detail.lignes||[]).filter(function(x){
    if(x.apprenti)return false;
    var c=EUC_DEV331_norm_(x.statutCode||x.statut||'');
    return c==='SANSCONVENTION'||c.indexOf('SANSCONVENTION')>=0;
  }).length;
  return detail;
}

/* ==========================================================
 * DEV.331 V3 — Adaptateur JotForm France / Monaco
 * Ne touche pas au parseur historique : il enveloppe l'import,
 * puis enrichit le tampon avec les trois nouveaux champs JotForm.
 * ========================================================== */
function EUC_DEV331_jotNorm_(v){
  return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function EUC_DEV331_jotDigits_(v){return String(v==null?'':v).replace(/\D/g,'');}
function EUC_DEV331_jotNis_(v){return String(v==null?'':v).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,30);}
function EUC_DEV331_jotGet_(row,names){
  row=row||{};names=names||[];
  if(typeof EUC_DEV296_get_==='function'){
    try{var direct=EUC_DEV296_get_(row,names);if(direct!==undefined&&direct!==null&&String(direct).trim()!=='')return String(direct).trim();}catch(e){}
  }
  var byNorm={};Object.keys(row).forEach(function(k){byNorm[EUC_DEV331_jotNorm_(k)]=row[k];});
  for(var i=0;i<names.length;i++){var v=byNorm[EUC_DEV331_jotNorm_(names[i])];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}
  return '';
}
function EUC_DEV331_jotHasHeader_(rows,name){
  if(!rows||!rows.length)return false;var target=EUC_DEV331_jotNorm_(name);
  return Object.keys(rows[0]||{}).some(function(k){return EUC_DEV331_jotNorm_(k)===target;});
}
function EUC_DEV331_ensureJotCols_(){
  var table=EUC_DEV316_detectBufferTable_();
  var cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[],have={};
  cols.forEach(function(c){have[String(c.id||'')]=true;});
  var defs=[
    ['Pays_entreprise_brut','Pays entreprise JotForm','Text'],
    ['NIS_brut','NIS Monaco JotForm','Text'],
    ['Entreprise_identifiant_type','Type identifiant entreprise','Text'],
    ['NIS_normalise','NIS Monaco normalisé','Text'],
    ['NIS_statut','Statut NIS','Text'],
    ['Pays_officiel','Pays entreprise','Text']
  ];
  var missing=defs.filter(function(d){return !have[d[0]];}).map(function(d){return {id:d[0],fields:{label:d[1],type:d[2]}};});
  if(missing.length)EUC_ENT_grist('post','/tables/'+encodeURIComponent(table)+'/columns',{columns:missing});
  cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[];have={};
  cols.forEach(function(c){have[String(c.id||'')]=true;});
  return {table:table,have:have,added:missing.map(function(x){return x.id;})};
}
function EUC_DEV331_sourceProfile_(r,index){
  var nom=EUC_DEV331_jotGet_(r,["Nom de l'élève",'Nom élève','Nom eleve','Nom']);
  var prenom=EUC_DEV331_jotGet_(r,["Prénom de l'élève","Prenom de l'élève",'Prénom élève','Prenom eleve','Prénom','Prenom']);
  var classe=EUC_DEV331_jotGet_(r,['Classe BAC PRO'])||EUC_DEV331_jotGet_(r,['Classe CAP'])||EUC_DEV331_jotGet_(r,['Classe BTS'])||EUC_DEV331_jotGet_(r,['Classe']);
  var ent=EUC_DEV331_jotGet_(r,["Nom ou raison sociale de l'entreprise",'Nom entreprise','Entreprise']);
  var debut=EUC_DEV331_jotGet_(r,['DATE DE DEBUT PFMP','Date de début','Date debut','Date de début PFMP']);
  var sid=EUC_DEV331_jotGet_(r,['Submission ID','SubmissionID','ID soumission']);
  return {
    index:index,raw:r,submission:sid,
    name:EUC_DEV331_jotNorm_([nom,prenom].filter(Boolean).join(' ')),
    nameRev:EUC_DEV331_jotNorm_([prenom,nom].filter(Boolean).join(' ')),
    nom:EUC_DEV331_jotNorm_(nom),prenom:EUC_DEV331_jotNorm_(prenom),classe:EUC_DEV331_jotNorm_(classe),
    entreprise:EUC_DEV331_jotNorm_(ent),debut:EUC_DEV331_jotNorm_(debut),
    pays:EUC_DEV331_jotGet_(r,["Pays de l'entreprise",'Pays entreprise']),
    nis:EUC_DEV331_jotGet_(r,['N° NIS (Monaco)','NIS Monaco','NIS']),
    siret:EUC_DEV331_jotGet_(r,['N° SIRET (France)','SIRET France','SIRET'])
  };
}
function EUC_DEV331_bufferProfile_(r,index){
  r=r||{};
  var student=String(r.Eleve_saisi||r.Eleve_brut||r.Eleve_nom||r.Nom_eleve||r.Eleve_match_libelle||r.Eleve||r.Nom||'');
  var classe=String(r.Classe_saisie||r.Classe_brut||r.Classe_match_libelle||r.Classe||'');
  var ent=String(r.Entreprise_saisie||r.Entreprise_brut||r.Raison_sociale_officielle||'');
  var debut=String(r.Date_debut_brut||r.Date_debut||'');
  var sid=String(r.Submission_ID||r.SubmissionId||r.Submission_id||r.ID_soumission||r.Identifiant_soumission||'').trim();
  return {index:index,row:r,id:Number(r.id)||0,submission:sid,student:EUC_DEV331_jotNorm_(student),classe:EUC_DEV331_jotNorm_(classe),entreprise:EUC_DEV331_jotNorm_(ent),debut:EUC_DEV331_jotNorm_(debut)};
}
function EUC_DEV331_matchScore_(s,b){
  var score=0;
  if(s.submission&&b.submission&&s.submission===b.submission)score+=100;
  if(s.name&&b.student){
    if(b.student===s.name||b.student===s.nameRev)score+=40;
    else if(s.nom&&s.prenom&&b.student.indexOf(s.nom)>=0&&b.student.indexOf(s.prenom)>=0)score+=32;
    else if(s.nom&&b.student.indexOf(s.nom)>=0)score+=12;
  }
  if(s.classe&&b.classe){if(s.classe===b.classe)score+=15;else if(s.classe.indexOf(b.classe)>=0||b.classe.indexOf(s.classe)>=0)score+=8;}
  if(s.entreprise&&b.entreprise){if(s.entreprise===b.entreprise)score+=8;else if(s.entreprise.indexOf(b.entreprise)>=0||b.entreprise.indexOf(s.entreprise)>=0)score+=4;}
  if(s.debut&&b.debut&&s.debut===b.debut)score+=4;
  return score;
}
function EUC_DEV331_filterFields_(fields,have){var out={};Object.keys(fields||{}).forEach(function(k){if(have[k])out[k]=fields[k];});return out;}
function EUC_DEV331_cleanSiretAlerts_(v){
  return String(v||'').split(/\s*·\s*/).filter(function(x){var n=EUC_DEV331_jotNorm_(x);return !(n.indexOf('SIRET')>=0||n.indexOf('SIREN')>=0);}).filter(Boolean).join(' · ');
}
function EUC_DEV331_patchNewJotForm_(csvText){
  var sourceRows=EUC_V160_csvRows_(csvText)||[];
  var active=!!(EUC_DEV331_jotHasHeader_(sourceRows,"Pays de l'entreprise")||EUC_DEV331_jotHasHeader_(sourceRows,'N° NIS (Monaco)')||EUC_DEV331_jotHasHeader_(sourceRows,'N° SIRET (France)'));
  if(!active)return {active:false,patched:0,monaco:0,france:0,unmatched:0,added:[]};
  var schema=EUC_DEV331_ensureJotCols_();
  var buffer=(EUC_DEV316_rawBuffer_()||[]).slice().sort(function(a,b){return Number(a.id||0)-Number(b.id||0);});
  var src=sourceRows.map(EUC_DEV331_sourceProfile_),dst=buffer.map(EUC_DEV331_bufferProfile_),used={},pairs=[],unmatched=[];
  src.forEach(function(s){
    var best=null,bestScore=-1,tie=false;
    dst.forEach(function(b){if(used[b.id])return;var sc=EUC_DEV331_matchScore_(s,b);if(sc>bestScore){best=b;bestScore=sc;tie=false;}else if(sc===bestScore&&sc>0){tie=true;}});
    if(best&&bestScore>=20&&!tie){used[best.id]=true;pairs.push({source:s,buffer:best,score:bestScore,mode:'IDENTITE'});return;}
    if(src.length===dst.length){var b2=dst[s.index];if(b2&&!used[b2.id]){used[b2.id]=true;pairs.push({source:s,buffer:b2,score:bestScore,mode:'ORDRE_CONTROLE'});return;}}
    unmatched.push({index:s.index+1,name:s.name,classe:s.classe});
  });
  var patches=[],monaco=0,france=0;
  pairs.forEach(function(pair){
    var s=pair.source,r=pair.buffer.row||{},pays=String(s.pays||'').trim(),paysN=EUC_DEV331_jotNorm_(pays),nis=EUC_DEV331_jotNis_(s.nis),siret=EUC_DEV331_jotDigits_(s.siret);
    var isMonaco=!!(nis||paysN.indexOf('MONACO')>=0),fields={Pays_entreprise_brut:pays};
    if(isMonaco){
      monaco++;fields.NIS_brut=String(s.nis||'').trim();fields.NIS_normalise=nis;fields.NIS_statut=nis?'JOTFORM_NIS':'A_COMPLETER';fields.Entreprise_identifiant_type='NIS';fields.Pays_officiel='MONACO';fields.SIRET_brut='';fields.SIRET_normalise='';fields.SIRET_statut='NIS_MONACO';fields.SIRET_erreur='';fields.Alertes=EUC_DEV331_cleanSiretAlerts_(r.Alertes);fields.Importer=false;
      if(!nis)fields.Alertes=(fields.Alertes?fields.Alertes+' · ':'')+'NIS Monaco à compléter';
    }else{
      france++;fields.NIS_brut='';fields.NIS_normalise='';fields.NIS_statut='';fields.Entreprise_identifiant_type='SIRET';fields.Pays_officiel=pays||'FRANCE';fields.SIRET_brut=String(s.siret||'').trim();fields.SIRET_normalise=siret;
      if(siret.length===14){fields.SIRET_statut='A_VERIFIER';fields.SIRET_erreur='';}
      else if(siret.length===9){fields.SIRET_statut='MANUEL_SIREN_9_CHIFFRES';fields.SIRET_erreur='SIREN 9 chiffres : SIRET établissement à retrouver.';}
      else if(!siret){fields.SIRET_statut='MANUEL_SIRET_ABSENT';fields.SIRET_erreur='SIRET absent.';}
      else{fields.SIRET_statut='MANUEL_SIRET_INVALIDE';fields.SIRET_erreur='SIRET invalide : '+siret.length+' chiffre(s).';}
    }
    fields=EUC_DEV331_filterFields_(fields,schema.have);patches.push({id:pair.buffer.id,fields:fields});
  });
  var path='/tables/'+encodeURIComponent(schema.table)+'/records';
  for(var i=0;i<patches.length;i+=20)EUC_ENT_grist('patch',path,{records:patches.slice(i,i+20)});
  return {active:true,source:sourceRows.length,buffer:buffer.length,patched:patches.length,monaco:monaco,france:france,unmatched:unmatched.length,unmatchedRows:unmatched.slice(0,20),added:schema.added||[]};
}
function EUC_V160_importCsv(csvText){
  var out=EUC_V160_importCsv__DEV331_ORIG(csvText);
  var meta=EUC_DEV331_patchNewJotForm_(csvText);
  try{
    if(meta.active&&typeof EUC_DEV298_lister==='function'){
      var fresh=EUC_DEV298_lister();
      if(fresh&&typeof fresh==='object'){
        if(!out||typeof out!=='object')out={};
        ['counts','lignes','classes','elevesParClasseId'].forEach(function(k){if(fresh[k]!==undefined)out[k]=fresh[k];});
      }
    }
  }catch(eRefresh){meta.refreshWarning=String(eRefresh&&eRefresh.message||eRefresh);}
  if(!out||typeof out!=='object')out={ok:true};out.dev331JotForm=meta;return out;
}
