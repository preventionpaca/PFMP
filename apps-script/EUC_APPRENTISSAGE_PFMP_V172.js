var EUC_APP172_TABLE='EUC_APPRENTISSAGE_PFMP';
function EUC_APP172_txt(v){return String(v==null?'':v).trim();}
function EUC_APP172_date(v){return EUC_IMPORT_dateExistanteISO_(v)||'';}
function EUC_APP172_col(id,label,type){return {id:id,fields:{label:label,type:type||'Text'}};}

function EUC_APP172_assurerTable(){
  var tabs=EUC_ENT_grist('get','/tables').tables||[],ok=tabs.some(function(t){return t.id===EUC_APP172_TABLE});
  var c=EUC_APP172_col,cols=[c('Eleve','Élève','Ref:EUC_ELEVES_PFMP'),c('Date_debut','Début contrat','Date'),c('Date_fin','Fin contrat','Date'),c('Entreprise','Entreprise'),c('Tuteur_nom','Tuteur'),c('Tuteur_telephone','Téléphone tuteur'),c('Tuteur_courriel','Courriel tuteur'),c('Motif_fin','Motif / remarque'),c('Actif','Actif','Bool'),c('Date_creation','Créé le','DateTime'),c('Date_modification','Modifié le','DateTime'),c('Auteur','Auteur')];
  if(!ok){EUC_ENT_grist('post','/tables',{tables:[{id:EUC_APP172_TABLE,columns:cols}]});return;}
  var have={};(EUC_ENT_grist('get','/tables/'+EUC_APP172_TABLE+'/columns').columns||[]).forEach(function(x){have[x.id]=1});
  var miss=cols.filter(function(x){return !have[x.id]});if(miss.length)EUC_ENT_grist('post','/tables/'+EUC_APP172_TABLE+'/columns',{columns:miss});
}
function EUC_APP172_rows(){
  try{
    /*
     * DEV275B : lecture de tout l'historique.
     * Les épisodes inactifs mais datés sont indispensables pour conserver
     * le statut des périodes antérieures à une rupture.
     */
    return EUC_IMPORT_lireRecords_(EUC_APP172_TABLE)||[];
  }catch(e){
    EUC_APP172_assurerTable();
    return [];
  }
}
function EUC_APP172_eval(rows,eid,debut,fin){
  return EUC_DEV275B_evalRows_(
    rows||[],
    eid,
    debut,
    fin
  );
}
function EUC_APP172_afficher(){
  EUC_ADMIN_WORKFLOW_ctxV144_();EUC_APP172_assurerTable();var t=HtmlService.createTemplateFromFile('Apprentissage_PFMP_V172');t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});return t.evaluate().setTitle('Gestion des apprentis').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function EUC_APP172_data(p){
  EUC_ADMIN_WORKFLOW_ctxV144_();EUC_APP172_assurerTable();p=p||{};var ctx=EUC_PFMP_contexteAnneeLectureV155_(),annee=EUC_APP172_txt(p.annee)||ctx.active,classe=Number(p.classe)||0,map=EUC_V154_anneesMap_();
  var classes=EUC_IMPORT_lireRecords_('Classes').filter(function(c){return c.Actif!==false}).map(function(c){return {id:Number(c.id),nom:EUC_V154_classeNom_(c)}}).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr')});if(!classe&&classes.length)classe=classes[0].id;
  var hist=EUC_APP172_rows(),today=new Date().toISOString().slice(0,10);
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){if(e.Actif===false||e.Present_dernier_import===false||Number(EUC_PFMP_ref_(e.Classe))!==classe)return false;var a=EUC_V154_anneeCode_(e.Annee_scolaire,map);return !annee||!a||a===annee}).map(function(e){
    var eid=Number(e.id),h=hist.filter(function(r){return Number(EUC_PFMP_ref_(r.Eleve))===eid}).sort(function(a,b){return EUC_APP172_date(b.Date_debut).localeCompare(EUC_APP172_date(a.Date_debut))});
    var cur=h.filter(function(r){var d=EUC_APP172_date(r.Date_debut),f=EUC_APP172_date(r.Date_fin)||'9999-12-31';return d&&d<=today&&f>=today})[0]||null,last=cur||h[0]||{};
    return {id:eid,nom:EUC_APP172_txt(e.Nom),prenom:EUC_APP172_txt(e.Prenom_usage||e.Prenom),apprenti:!!cur,recordId:cur?Number(cur.id):0,debut:EUC_APP172_date(last.Date_debut),fin:EUC_APP172_date(last.Date_fin),entreprise:EUC_APP172_txt(last.Entreprise),tuteur:EUC_APP172_txt(last.Tuteur_nom),tel:EUC_APP172_txt(last.Tuteur_telephone),mail:EUC_APP172_txt(last.Tuteur_courriel),historique:h.length};
  }).sort(function(a,b){return a.nom.localeCompare(b.nom,'fr')||a.prenom.localeCompare(b.prenom,'fr')});
  return {annee:annee,annees:ctx.annees||[],classes:classes,classeId:classe,eleves:eleves};
}
function EUC_DEV396_BASE_EUC_APP172_save(p){
  var ctx=EUC_ADMIN_WORKFLOW_ctxV144_();EUC_APP172_assurerTable();p=p||{};var eid=Number(p.eleve)||0,rid=Number(p.recordId)||0,debut=EUC_APP172_date(p.debut),fin=EUC_APP172_date(p.fin),now=new Date().toISOString();
  if(!eid)throw new Error('Élève manquant.');if(p.apprenti&&!debut)throw new Error('Date de début obligatoire.');if(debut&&fin&&fin<debut)throw new Error('Date de fin invalide.');
  var f={Eleve:eid,Date_debut:debut||null,Date_fin:fin||null,Entreprise:EUC_APP172_txt(p.entreprise),Tuteur_nom:EUC_APP172_txt(p.tuteur),Tuteur_telephone:EUC_APP172_txt(p.tel),Tuteur_courriel:EUC_APP172_txt(p.mail),Actif:true,Date_modification:now,Auteur:ctx.email||''};
  if(p.apprenti){if(rid)EUC_ENT_grist('patch','/tables/'+EUC_APP172_TABLE+'/records',{records:[{id:rid,fields:f}]});else{f.Date_creation=now;EUC_ENT_grist('post','/tables/'+EUC_APP172_TABLE+'/records',{records:[{fields:f}]})}}
  else if(rid){if(!fin)throw new Error('Renseignez la date de fin pour terminer le contrat.');EUC_ENT_grist('patch','/tables/'+EUC_APP172_TABLE+'/records',{records:[{id:rid,fields:{Date_fin:fin,Date_modification:now,Auteur:ctx.email||''}}]});}
  CacheService.getScriptCache().remove('EUC_APP172_SNAP_'+EUC_APP172_txt(p.annee));return {ok:true};
}
function EUC_DEV394_BASE_EUC_APP172_snapshot(annee){
  var cache=CacheService.getScriptCache(),key='EUC_APP172_SNAP_'+annee,got=cache.get(key);if(got){try{return JSON.parse(got)}catch(e){}}
  var base=EUC_V50_snapshot_(annee),cards=JSON.parse(JSON.stringify(base.cartes||[])),rows=EUC_APP172_rows(),map=EUC_V154_anneesMap_();
  var eleves=EUC_IMPORT_lireRecords_('EUC_ELEVES_PFMP').filter(function(e){if(e.Actif===false||e.Present_dernier_import===false)return false;var a=EUC_V154_anneeCode_(e.Annee_scolaire,map);return !annee||!a||a===annee});
  var byC={};eleves.forEach(function(e){var c=Number(EUC_PFMP_ref_(e.Classe));if(c)(byC[c]||(byC[c]=[])).push(e)});var famSet={};
  cards.forEach(function(c){var cid=Number(c.classeId),fo=EUC_SUIVI_PUBLIC_famille_(c),fam=fo?fo.code:'',uniq={};famSet[fam]=famSet[fam]||{};(c.periodes||[]).forEach(function(p){var ap=0,mx=0;(byC[cid]||[]).forEach(function(e){var st=EUC_APP172_eval(rows,e.id,p.debut,p.fin);if(st.code==='APPRENTI'){ap++;uniq[e.id]=1;famSet[fam][e.id]=1}else if(st.code==='MIXTE')mx++});p.apprentis=ap;p.mixtes=mx;p.total=Math.max(0,(Number(p.total)||Number(c.effectif)||0)-ap-mx);p.manquantes=Math.max(0,p.total-(Number(p.conventions)||0));p.pourcentage=p.total?Math.round((Number(p.conventions)||0)/p.total*100):100});c.apprentis=Object.keys(uniq).length;});
  var fc={};Object.keys(famSet).forEach(function(k){fc[k]=Object.keys(famSet[k]).length});var out={cartes:cards,familyApprentis:fc};try{cache.put(key,JSON.stringify(out),300)}catch(e){}return out;
}
function EUC_APP172_resumeFamille(p){
  p=p||{};var an=EUC_APP172_txt(p.annee),fam=EUC_APP172_txt(p.famille),snap=EUC_APP172_snapshot(an),cards=(snap.cartes||[]).filter(function(c){var f=EUC_SUIVI_PUBLIC_famille_(c);return f&&f.code===fam}),slots={};
  cards.forEach(function(c){(c.periodes||[]).forEach(function(x){var k=EUC_APP172_txt(x.v50Slot||x.v51Slot||x.libelle);if(!k)return;slots[k]=slots[k]||{libelle:k,conventions:0,total:0,apprentis:0,mixtes:0};slots[k].conventions+=Number(x.conventions)||0;slots[k].total+=Number(x.total)||0;slots[k].apprentis+=Number(x.apprentis)||0;slots[k].mixtes+=Number(x.mixtes)||0})});
  return {code:fam,libelle:fam==='BACPRO'?'BAC PRO':fam,classes:cards.length,effectif:cards.reduce(function(s,c){return s+(Number(c.effectif)||0)},0),apprentis:Number(snap.familyApprentis[fam])||0,periodes:Object.keys(slots).map(function(k){var x=slots[k];x.pourcentage=x.total?Math.round(x.conventions/x.total*100):100;return x})};
}
function EUC_DEV394_BASE_EUC_APP172_chargerFamille(p){
  p=p||{};var an=EUC_APP172_txt(p.annee),fam=EUC_APP172_txt(p.famille),snap=EUC_APP172_snapshot(an);
  var classes=(snap.cartes||[]).filter(function(c){var f=EUC_SUIVI_PUBLIC_famille_(c);return f&&f.code===fam}).map(function(c){return {classeId:Number(c.classeId),classe:EUC_APP172_txt(c.classe),effectif:Number(c.effectif)||0,apprentis:Number(c.apprentis)||0,periodes:(c.periodes||[]).map(function(x){return {id:Number(x.id),libelle:EUC_APP172_txt(x.v50Slot||x.v51Slot||x.libelle),debutFr:EUC_SUIVI_PUBLIC_dateFr_(x.debut),finFr:EUC_SUIVI_PUBLIC_dateFr_(x.fin),conventions:Number(x.conventions)||0,total:Number(x.total)||0,apprentis:Number(x.apprentis)||0,mixtes:Number(x.mixtes)||0,pourcentage:Number(x.pourcentage)||0}})}}).sort(function(a,b){return a.classe.localeCompare(b.classe,'fr')});
  return {ok:true,annee:an,famille:fam,familleLibelle:fam==='BACPRO'?'BAC PRO':fam,classes:classes};
}
function EUC_APP172_enrichirDetail(d){
  return EUC_DEV275B_enrichDetail_(d);
}
function EUC_SUIVI_CLASSE_afficherV172(e){
  var ctx=EUC_PFMP_contexteAnneeLectureV155_(),cid=Number(e&&e.parameter&&e.parameter.classe)||0,pid=Number(e&&e.parameter&&e.parameter.periode)||0,an=EUC_APP172_txt(e&&e.parameter&&e.parameter.annee)||ctx.active;if(!cid)throw new Error('Classe manquante.');var d=EUC_SUIVI_CLASSE_detailF18_(an,cid,pid);d=EUC_V50_enrichirDetail_(d,an,cid,pid);if(typeof EUC_V51_numeroPeriodes_==='function')d=EUC_V51_numeroPeriodes_(d);d=EUC_APP172_enrichirDetail(d);var t=HtmlService.createTemplateFromFile('Suivi_PFMP_Classe_Detail_V156');t.config=JSON.stringify({baseUrl:ScriptApp.getService().getUrl()});t.anneeContextJson=JSON.stringify(ctx);t.detailJson=JSON.stringify(d);return t.evaluate().setTitle('Suivi PFMP — '+d.classe.nom).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function EUC_APP172_chargerFamille(){
  var __t=Date.now();
  try{
    return EUC_DEV394_BASE_EUC_APP172_chargerFamille.apply(this,arguments);
  } finally {
    EUC_DEV394_mark_('EUC_APP172_chargerFamille',Date.now()-__t);
  }
}


function EUC_APP172_snapshot(annee){
  // EUC_DEV396_PERSISTENT_SNAPSHOT_BEGIN
  var __t=Date.now();

  try{
    annee=String(annee||'');

    var persisted=
      EUC_DEV396_getPersistentAppSnapshot_(annee);

    if(persisted){
      return persisted;
    }

    var value=
      EUC_DEV394_BASE_EUC_APP172_snapshot
        .apply(this,arguments);

    return EUC_DEV396_putPersistentAppSnapshot_(
      annee,
      value
    );
  } finally {
    EUC_DEV394_mark_(
      'EUC_APP172_snapshot',
      Date.now()-__t
    );
  }
  // EUC_DEV396_PERSISTENT_SNAPSHOT_END
}


function EUC_APP172_save(p){
  var token=EUC_DEV425_beginMutation_({
    annee:p&&p.annee,
    eleveId:p&&(p.eleve||p.eleveId||p.id),
    reason:'saisie-apprentissage-v172'
  });
  var r=
    EUC_DEV396_BASE_EUC_APP172_save
      .apply(this,arguments);

  try{
    EUC_DEV396_invalidateAppSnapshots_(
      p&&p.annee
    );
  }catch(e){}

  return EUC_DEV425_finishResult_(token,r);
}
