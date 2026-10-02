/** PFMP — v1.0.0-dev.327 — résolution guidée des anomalies. */
function EUC_DEV327_ref_(v){
  if(typeof EUC_PFMP_ref_==='function')return Number(EUC_PFMP_ref_(v))||0;
  if(Array.isArray(v)){for(var i=0;i<v.length;i++)if(Number(v[i])>0)return Number(v[i]);}
  return Number(v)||0;
}
function EUC_DEV327_periodOptions_(item){
  var year=String(item&&item.year||'').trim(),cid=Number(item&&item.classId)||0;
  if(!year||!cid)return [];
  var snap;try{snap=EUC_SUIVI_V45_snapshot_(year);}catch(e){return [];}
  return (EUC_DEV325_currentPeriods_(snap,cid)||[]).map(function(p,i){return {
    id:Number(p.id)||0,ordinal:i+1,libelle:String(p.libelle||p.originalLibelle||'Période'),
    debut:EUC_DEV315_dateISO_(p.debut||p.Date_debut),fin:EUC_DEV315_dateISO_(p.fin||p.Date_fin)
  };});
}
function EUC_DEV327_flat_(table){
  var r=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/records');
  return (r.records||[]).map(function(x){var o={id:Number(x.id)||0},f=x.fields||{};Object.keys(f).forEach(function(k){o[k]=f[k];});return o;});
}
function EUC_DEV327_companyVerified_(row){
  row=row||{};
  try{if(typeof EUC_DEV322_verifiedSiret_==='function'&&EUC_DEV322_verifiedSiret_(row))return true;}catch(e){}
  var s=String(row.SIRET_normalise||row.SIRET_brut||'').replace(/\D/g,'');
  return !!(s.length===14&&String(row.Raison_sociale_officielle||'').trim()&&String(row.Adresse_officielle||'').trim()&&String(row.CP_officiel||'').trim()&&String(row.Ville_officielle||'').trim());
}
function EUC_DEV327_listAnomalies(){
  EUC_IMPORT_exigerAdminTexte_();
  var a=EUC_DEV325_analyze_(),accesses=EUC_DEV327_flat_('EUC_ACCES_FORMULAIRES_PFMP'),accessBy={};
  accesses.forEach(function(x){accessBy[Number(x.id)||0]=x;});
  var hidden={DEJA_PRESENTE:true,DEJA_PRESENTE_PERIODE_HISTORIQUE:true,NOUVELLE_PRETE:true,DOUBLON_CSV:true};
  var out=(a.items||[]).filter(function(x){return !hidden[x.statut];}).map(function(item){
    var opts=EUC_DEV327_periodOptions_(item),target=opts.filter(function(p){return Number(p.id)===Number(item.periodId);})[0]||null;
    var hist=(item.historicalAccessIds||[]).map(Number).filter(function(id){return id>0;});
    if(item.historicalAccessId&&hist.indexOf(Number(item.historicalAccessId))<0)hist.push(Number(item.historicalAccessId));
    if(item.statut==='PERIODE_HISTORIQUE_A_CONTROLER'&&!hist.length){
      accesses.forEach(function(x){if(EUC_DEV327_ref_(x.Eleve)===Number(item.studentId)&&EUC_DEV327_ref_(x.Classe_convention)===Number(item.classId)&&String(x.Annee_scolaire||'').trim()===String(item.year||'').trim()&&EUC_DEV327_ref_(x.Periode)!==Number(item.periodId))hist.push(Number(x.id)||0);});
    }
    var company=EUC_DEV323_companyInput_(item.row||{}),csv=String(item.row&&(item.row.SIRET_normalise||item.row.SIRET_brut)||'').replace(/\D/g,'');
    var q=csv||[company.nom,company.cp,company.ville].filter(Boolean).join(' ');
    return {
      ligne:Number(item.ligne)||0,eleve:String(item.eleve||''),statut:String(item.statut||''),detail:String(item.detail||''),classeId:Number(item.classId)||0,periodeId:Number(item.periodId)||0,annee:String(item.year||''),periodOptions:opts,targetPeriod:target,
      historical:hist.map(function(id){var x=accessBy[id];if(!x)return null;return {accessId:Number(x.id)||0,periodId:EUC_DEV327_ref_(x.Periode),libelle:String(x.Periode_libelle||'Ancienne période'),debut:EUC_DEV315_dateISO_(x.Date_debut),fin:EUC_DEV315_dateISO_(x.Date_fin),entreprise:String(x.Entreprise_raison_sociale||''),siret:String(x.Entreprise_siret||'').replace(/\D/g,'')};}).filter(Boolean),
      existingId:Number(item.existing&&item.existing.id)||0,companyVerified:EUC_DEV327_companyVerified_(item.row||{}),csvSiret:csv,companyQuery:q
    };
  });
  return {ok:true,total:a.total,counts:a.counts,anomalies:out};
}
function EUC_DEV327_findItem_(line){
  return (EUC_DEV325_analyze_().items||[]).filter(function(x){return Number(x.ligne)===Number(line);})[0]||null;
}
function EUC_DEV327_bufferPatch_(line,fields){
  var table=EUC_DEV316_detectBufferTable_(),cols=EUC_ENT_grist('get','/tables/'+encodeURIComponent(table)+'/columns').columns||[],have={},f={};
  cols.forEach(function(c){have[String(c.id||'')]=true;});Object.keys(fields||{}).forEach(function(k){if(have[k])f[k]=fields[k];});
  if(!Object.keys(f).length)throw new Error('Aucune colonne du tampon à mettre à jour.');
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent(table)+'/records',{records:[{id:Number(line),fields:f}]});return f;
}
function EUC_DEV327_resolvePeriod(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};
  var line=Number(payload.ligne)||0,pid=Number(payload.periodeId)||0,item=EUC_DEV327_findItem_(line);
  if(!item||item.statut!=='PERIODE_A_CONTROLER')throw new Error('Cette ligne n’est plus en contrôle de période.');
  var p=EUC_DEV327_periodOptions_(item).filter(function(x){return Number(x.id)===pid;})[0]||null;
  if(!p)throw new Error('Période non autorisée pour cette classe.');
  EUC_DEV327_bufferPatch_(line,{Date_debut_brut:p.debut,Date_fin_brut:p.fin,Date_debut:p.debut,Date_fin:p.fin});
  return {ok:true,ligne:line,eleve:item.eleve,periode:p};
}
function EUC_DEV327_relinkHistorical(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};
  var line=Number(payload.ligne)||0,aid=Number(payload.accessId)||0,item=EUC_DEV327_findItem_(line);
  if(!item||item.statut!=='PERIODE_HISTORIQUE_A_CONTROLER')throw new Error('Cette ligne n’est plus en anomalie historique.');
  var target=EUC_DEV327_periodOptions_(item).filter(function(x){return Number(x.id)===Number(item.periodId);})[0]||null;if(!target)throw new Error('Période cible introuvable.');
  var accesses=EUC_DEV327_flat_('EUC_ACCES_FORMULAIRES_PFMP'),sel=accesses.filter(function(x){return Number(x.id)===aid;})[0]||null;
  if(!sel)throw new Error('Accès historique introuvable.');
  if(EUC_DEV327_ref_(sel.Eleve)!==Number(item.studentId)||EUC_DEV327_ref_(sel.Classe_convention)!==Number(item.classId)||String(sel.Annee_scolaire||'').trim()!==String(item.year||'').trim())throw new Error('Accès historique incohérent.');
  var dup=accesses.some(function(x){return Number(x.id)!==aid&&EUC_DEV327_ref_(x.Eleve)===Number(item.studentId)&&EUC_DEV327_ref_(x.Classe_convention)===Number(item.classId)&&EUC_DEV327_ref_(x.Periode)===Number(item.periodId)&&String(x.Annee_scolaire||'').trim()===String(item.year||'').trim();});
  if(dup)throw new Error('Une convention existe déjà sur la période actuelle.');
  var pr=EUC_DEV327_flat_('Planning_Periodes').filter(function(x){return Number(x.id)===Number(item.periodId);})[0]||{};
  var fields={Annee_scolaire:String(item.year||''),Classe_convention:Number(item.classId),Periode:Number(item.periodId),Periode_libelle:String(pr.Libelle||pr.Libelle_periode||pr.Code_periode||target.libelle||''),Date_debut:pr.Date_debut||target.debut||null,Date_fin:pr.Date_fin||target.fin||null};
  fields=EUC_DEV315_filter_(fields,EUC_DEV315_columns_('EUC_ACCES_FORMULAIRES_PFMP'));
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent('EUC_ACCES_FORMULAIRES_PFMP')+'/records',{records:[{id:aid,fields:fields}]});
  try{var y={};y[item.year]=true;EUC_DEV315_clearCaches_({x:{year:item.year,classId:item.classId,periodId:item.periodId}},y);}catch(e){}
  return {ok:true,ligne:line,eleve:item.eleve,accessId:aid,oldPeriodId:EUC_DEV327_ref_(sel.Periode),newPeriodId:Number(item.periodId),periode:target};
}
function EUC_DEV327_completeExisting(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var line=Number(payload.ligne)||0,item=EUC_DEV327_findItem_(line);
  if(!item||item.statut!=='EXISTANTE_A_COMPLETER')throw new Error('Cette ligne n’est plus à compléter.');
  if(!EUC_DEV327_companyVerified_(item.row||{}))throw new Error('Vérifiez d’abord le SIRET et l’adresse officielle.');
  var aid=Number(item.existing&&item.existing.id)||0;if(!aid)throw new Error('Accès existant introuvable.');
  var cols=EUC_DEV315_columns_('EUC_ACCES_FORMULAIRES_PFMP'),fields=EUC_DEV315_companyFields_(item.row,ctx,cols);
  EUC_ENT_grist('patch','/tables/'+encodeURIComponent('EUC_ACCES_FORMULAIRES_PFMP')+'/records',{records:[{id:aid,fields:fields}]});
  try{var y={};y[item.year]=true;EUC_DEV315_clearCaches_({x:{year:item.year,classId:item.classId,periodId:item.periodId}},y);}catch(e){}
  return {ok:true,ligne:line,eleve:item.eleve,accessId:aid};
}
function EUC_DEV327_applyCompanyResult(payload){
  EUC_IMPORT_exigerAdminTexte_();payload=payload||{};var line=Number(payload.ligne)||0,q=String(payload.query||'').trim(),json=payload.reponse||{};
  var row=EUC_DEV316_rawBuffer_().filter(function(r){return Number(r.id)===line;})[0]||null;if(!row)throw new Error('Ligne tampon introuvable.');
  var clone={};Object.keys(row).forEach(function(k){clone[k]=row[k];});var digits=q.replace(/\D/g,'');if(digits.length===14||digits.length===9){clone.SIRET_normalise=digits;clone.SIRET_brut=digits;}
  var choice=EUC_DEV323_choose_(clone,json);if(!choice.ok)return {ok:false,ligne:line,eleve:String(row.Eleve_match_libelle||row.Eleve_saisi||row.Eleve_brut||''),reason:choice.reason,suggestions:choice.suggestions||[]};
  var c=choice.candidate;EUC_DEV327_bufferPatch_(line,{SIRET_normalise:c.siret,SIRET_statut:'VERIFIE',Raison_sociale_officielle:c.nom,Nom_commercial:c.enseigne,Adresse_officielle:c.adresse,CP_officiel:c.cp,Ville_officielle:c.ville});
  return {ok:true,ligne:line,eleve:String(row.Eleve_match_libelle||row.Eleve_saisi||row.Eleve_brut||''),siret:c.siret,nom:c.nom,adresse:c.adresse,cp:c.cp,ville:c.ville,confidence:choice.confidence};
}
