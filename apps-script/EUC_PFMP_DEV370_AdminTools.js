var EUC_DEV368_TABLE_='EUC_ORDRES_MISSION_PFMP';
function EUC_DEV368_t(v){return String(v==null?'':v).trim()}
function EUC_DEV368_n(v){return Number(v)||0}
function EUC_DEV368_admin(){var c=EUC_V156_contexteAdmin_();if(!c)throw new Error('Accès administrateur requis.');return c}
function EUC_DEV368_year(v){v=EUC_DEV368_t(v);return v||EUC_DEV368_t(EUC_PFMP_contexteAnneeLectureV155_().active)}
function EUC_DEV368_catalog(y){EUC_DEV368_admin();y=EUC_DEV368_year(y);var out=[];['BACPRO','BTS','CAP'].forEach(function(f){var r=EUC_DEV190G1_fastFamilyIndex({annee:y,famille:f}),d=r&&r.ready&&r.payload?r.payload:{classes:[]};(d.classes||[]).forEach(function(c){out.push({famille:f,classeId:EUC_DEV368_n(c.classeId||c.id),classe:EUC_DEV368_t(c.classe||c.nom),periodes:(c.periodes||[]).map(function(p){return{id:EUC_DEV368_n(p.id),libelle:EUC_DEV368_t(p.libelle||p.nom),debut:EUC_DEV368_t(p.debutFr||p.debut),fin:EUC_DEV368_t(p.finFr||p.fin)}})})})});out.sort(function(a,b){return a.classe.localeCompare(b.classe,'fr')});return{annee:y,classes:out}}
function EUC_DEV368_detail(y,c,p){var r=EUC_DEV190I_readOne({annee:y,classe:c,periode:p}),d=r&&r.ready&&r.detail?r.detail:null;if(!d&&typeof EUC_DEV190_buildHistoricalDetail_==='function')d=EUC_DEV190_buildHistoricalDetail_(y,c,p);d=d||{annee:y,classe:{id:c,nom:''},periode:{id:p},lignes:[]};try{if(typeof EUC_APP172_enrichirDetail==='function')d=EUC_APP172_enrichirDetail(d)||d}catch(e){}try{var a=EUC_V156_affectations_(y,c,p)||[],m={};a.forEach(function(x){var id=Number(EUC_PFMP_ref_(x.Eleve))||0,t=EUC_DEV368_t(x.Type_suivi).toUpperCase();if(id&&t)m[id+'|'+t]=x});(d.lignes||[]).forEach(function(x){var v=m[EUC_DEV368_n(x.eleveId)+'|VISITE'];if(v)x.professeurVisiteur=EUC_DEV368_t(v.Nom_professeur_snapshot)})}catch(e2){}return d}
function EUC_DEV368_targets(q){q=q||{};var y=EUC_DEV368_year(q.annee),f=EUC_DEV368_t(q.famille),cid=EUC_DEV368_n(q.classeId),pid=EUC_DEV368_n(q.periodeId),o=[];EUC_DEV368_catalog(y).classes.forEach(function(c){if(f&&c.famille!==f)return;if(cid&&c.classeId!==cid)return;(c.periodes||[]).forEach(function(p){if(pid&&p.id!==pid)return;o.push({annee:y,famille:c.famille,classeId:c.classeId,classe:c.classe,periode:p})})});return o}
function EUC_DEV368_sansConvention(q){EUC_DEV368_admin();var o=[];EUC_DEV368_targets(q).forEach(function(t){var d=EUC_DEV368_detail(t.annee,t.classeId,t.periode.id);(d.lignes||[]).forEach(function(x){if(x.apprenti)return;var code=EUC_DEV368_t(x.statutCode||x.statut).toUpperCase();if(code.indexOf('ANNULEE')>=0||code.indexOf('INTERROMP')>=0)return;if(EUC_DEV368_n(x.conventionId)>0)return;o.push({classe:t.classe,periode:t.periode.libelle,eleve:[x.nom,x.prenom].filter(Boolean).join(' '),professeurPrincipal:EUC_DEV368_t(x.professeurPrincipal)})})});return{ok:true,total:o.length,lignes:o}}
function EUC_DEV368_col(id,label,type){return{id:id,fields:{label:label,type:type||'Text'}}}
function EUC_DEV368_ensure(){var ts=EUC_ENT_grist('get','/tables').tables||[],ex=ts.some(function(t){return t.id===EUC_DEV368_TABLE_}),c=EUC_DEV368_col;var cols=[c('Annee_scolaire','Année scolaire'),c('Classe_id','Classe ID','Int'),c('Classe_nom','Classe'),c('Periode_id','Période ID','Int'),c('Periode_libelle','Période'),c('Eleve_id','Élève ID','Int'),c('Eleve_nom','Élève'),c('Professeur_visiteur','Professeur visiteur'),c('Moyen_transport','Moyen de transport'),c('Date_modification','Date modification','DateTime')];if(!ex)EUC_ENT_grist('post','/tables',{tables:[{id:EUC_DEV368_TABLE_,columns:cols}]})}
function EUC_DEV368_mapTransport(){EUC_DEV368_ensure();var m={};(EUC_IMPORT_lireRecords_(EUC_DEV368_TABLE_)||[]).forEach(function(r){m[EUC_DEV368_t(r.Annee_scolaire)+'|'+EUC_DEV368_n(r.Classe_id)+'|'+EUC_DEV368_n(r.Periode_id)+'|'+EUC_DEV368_n(r.Eleve_id)]={id:EUC_DEV368_n(r.id),mode:EUC_DEV368_t(r.Moyen_transport)}});return m}
function EUC_DEV368_missions(q){EUC_DEV368_admin();var tm=EUC_DEV368_mapTransport(),g={};EUC_DEV368_targets(q).forEach(function(t){var d=EUC_DEV368_detail(t.annee,t.classeId,t.periode.id);(d.lignes||[]).forEach(function(x){var prof=EUC_DEV368_t(x.professeurVisiteur);if(!prof||x.apprenti||!(EUC_DEV368_n(x.conventionId)>0))return;var k=prof+'|'+t.classeId+'|'+t.periode.id;if(!g[k])g[k]={key:k,professeur:prof,classeId:t.classeId,classe:t.classe,periodeId:t.periode.id,periode:t.periode.libelle,debut:t.periode.debut,fin:t.periode.fin,lignes:[]};var mk=t.annee+'|'+t.classeId+'|'+t.periode.id+'|'+EUC_DEV368_n(x.eleveId);g[k].lignes.push({eleveId:EUC_DEV368_n(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),entreprise:EUC_DEV368_t(x.entreprise),adresse:EUC_DEV368_t(x.adresseEntreprise),transport:tm[mk]?tm[mk].mode:''})})});return{ok:true,groups:Object.keys(g).map(function(k){return g[k]})}}
function EUC_DEV368_sauverTransport(q){EUC_DEV368_admin();q=q||{};var allowed=['','Bus','Tram','Train','Véhicule personnel','Visio'],mode=EUC_DEV368_t(q.transport);if(allowed.indexOf(mode)<0)throw new Error('Transport invalide');EUC_DEV368_ensure();var y=EUC_DEV368_year(q.annee),cid=EUC_DEV368_n(q.classeId),pid=EUC_DEV368_n(q.periodeId),eid=EUC_DEV368_n(q.eleveId),rows=EUC_IMPORT_lireRecords_(EUC_DEV368_TABLE_)||[],ex=rows.filter(function(r){return EUC_DEV368_t(r.Annee_scolaire)===y&&EUC_DEV368_n(r.Classe_id)===cid&&EUC_DEV368_n(r.Periode_id)===pid&&EUC_DEV368_n(r.Eleve_id)===eid})[0],fields={Annee_scolaire:y,Classe_id:cid,Classe_nom:EUC_DEV368_t(q.classe),Periode_id:pid,Periode_libelle:EUC_DEV368_t(q.periode),Eleve_id:eid,Eleve_nom:EUC_DEV368_t(q.eleve),Professeur_visiteur:EUC_DEV368_t(q.professeur),Moyen_transport:mode,Date_modification:new Date().toISOString()};if(ex)EUC_ENT_grist('patch','/tables/'+EUC_DEV368_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});else EUC_ENT_grist('post','/tables/'+EUC_DEV368_TABLE_+'/records',{records:[{fields:fields}]});return{ok:true}}
function EUC_DEV368_pdf(title,fn){var d=DocumentApp.create(title),b=d.getBody();fn(b);d.saveAndClose();var f=DriveApp.getFileById(d.getId()),pdf=f.getAs(MimeType.PDF).setName(title+'.pdf'),r={ok:true,name:title+'.pdf',mime:'application/pdf',base64:Utilities.base64Encode(pdf.getBytes())};f.setTrashed(true);return r}
function EUC_DEV368_pdfSans(q){var d=EUC_DEV368_sansConvention(q);return EUC_DEV368_pdf('Eleves_sans_convention_'+EUC_DEV368_year(q&&q.annee),function(b){b.appendParagraph('ÉLÈVES SANS CONVENTION').setHeading(DocumentApp.ParagraphHeading.HEADING1);b.appendParagraph('Année scolaire : '+EUC_DEV368_year(q&&q.annee));var rows=[['Classe','Période','Élève','Professeur principal']];d.lignes.forEach(function(x){rows.push([x.classe,x.periode,x.eleve,x.professeurPrincipal||''])});b.appendTable(rows)})}
function EUC_DEV368_prof(name){var n=EUC_DEV368_t(name).toUpperCase(),p=(EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')||[]).filter(function(x){return [x.Civilite,x.Prenom,x.Nom].filter(Boolean).join(' ').trim().toUpperCase()===n})[0]||{},disc=EUC_DEV368_t(p.Discipline);return{nom:name,fonction:disc?'Professeur — '+disc:'Professeur'}}
function EUC_DEV368_pdfMission(q){q=q||{};var g=EUC_DEV368_missions(q).groups.filter(function(x){return x.key===EUC_DEV368_t(q.groupKey)})[0];if(!g)throw new Error('Groupe introuvable');if(g.lignes.some(function(x){return !x.transport}))throw new Error('Choisissez un moyen de transport pour chaque élève.');var p=EUC_DEV368_prof(g.professeur),safe=(g.professeur+'_'+g.classe+'_'+g.periode).replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_');return EUC_DEV368_pdf('Ordre_de_mission_'+safe,function(b){b.appendParagraph('LYCÉE LES EUCALYPTUS').setBold(true);b.appendParagraph('ORDRE DE MISSION').setHeading(DocumentApp.ParagraphHeading.HEADING1);b.appendParagraph('NOM / PRÉNOM : '+p.nom);b.appendParagraph('FONCTION : '+p.fonction);b.appendParagraph('MOTIF : Visites en entreprise des élèves en PFMP');b.appendParagraph('CLASSE : '+g.classe);b.appendParagraph('PÉRIODE DE MISSION : '+(g.debut||'')+' au '+(g.fin||'')+' — '+g.periode);var rows=[['Élève','Entreprise','Adresse','Moyen de transport']];g.lignes.forEach(function(x){rows.push([x.eleve,x.entreprise||'',x.adresse||'',x.transport])});b.appendTable(rows);b.appendParagraph('Fait à Nice, le '+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','dd/MM/yyyy'));b.appendParagraph('Le Proviseur').setBold(true);b.appendParagraph('* Les visites en visio n’ouvrent pas droit à des frais de déplacement.').setItalic(true)})}
function EUC_DEV368_boot(){var c=EUC_PFMP_contexteAnneeLectureV155_(),ys=(c.annees||[]).map(function(x){return x.code||x}).filter(Boolean);if(c.active&&ys.indexOf(c.active)<0)ys.unshift(c.active);return{current:c.active||'',years:ys,baseUrl:'https://script.google.com/a/macros/lycee-les-eucalyptus.org/s/AKfycbwQoKZOD2LeDyGqBRIVl6_uAPe6z3iGEW-w60ybCMu2Z3Rf4HAy-8ap_9FwFcKuHo7-qA/exec'}}
function EUC_DEV368_afficherSans(e){EUC_DEV368_admin();var t=HtmlService.createTemplateFromFile('Sans_Convention_PFMP_V368');t.bootJson=JSON.stringify(EUC_DEV368_boot());return t.evaluate().setTitle('Élèves sans convention').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)}
function EUC_DEV368_afficherMissions(e){EUC_DEV368_admin();var t=HtmlService.createTemplateFromFile('Ordres_Mission_PFMP_V368');t.bootJson=JSON.stringify(EUC_DEV368_boot());return t.evaluate().setTitle('Ordres de mission PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)}


/* DEV371 — correction sans convention + niveaux */
function EUC_DEV371_levelOf_(name,fam){
  var n=EUC_DEV368_t(name).toUpperCase();
  if(fam==='BACPRO'){if(/^T/.test(n))return'TBAC';if(/^1/.test(n))return'1BAC';if(/^2/.test(n))return'2NDE';}
  if(fam==='BTS'){if(/^2/.test(n))return'2BTS';return'1BTS';}
  if(fam==='CAP'){if(/^T/.test(n)||/^2/.test(n))return'TCAP';return'1CAP';}
  return'';
}
function EUC_DEV371_levelLabel_(code){
  return {TBAC:'Terminale Bac Pro', '1BAC':'Première Bac Pro', '2NDE':'Seconde Bac Pro',
          '1BTS':'1re année BTS','2BTS':'2e année BTS','1CAP':'1re année CAP',TCAP:'Terminale CAP'}[code]||code;
}
function EUC_DEV371_periodKind_(label){
  var s=EUC_DEV368_t(label).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(s.indexOf('P.DIF')>=0||s.indexOf('P DIF')>=0||s.indexOf('DIFFER')>=0)return'PDIF';
  if(s.indexOf('PFMP')>=0){
    if(/N.?2|N°?2| 2\b/.test(s))return'PFMP2';
    if(/N.?1|N°?1| 1\b/.test(s))return'PFMP1';
  }
  if(s.indexOf('STAGE')>=0){
    if(/N.?2|N°?2| 2\b/.test(s))return'STAGE2';
    return'STAGE1';
  }
  return s;
}
function EUC_DEV371_catalog(y){
  var d=EUC_DEV368_catalog(y),levels={};
  (d.classes||[]).forEach(function(c){
    var lv=EUC_DEV371_levelOf_(c.classe,c.famille);
    if(!lv)return;
    if(!levels[lv])levels[lv]={code:lv,label:EUC_DEV371_levelLabel_(lv),famille:c.famille,periods:{},classes:[]};
    var classe={famille:c.famille,classeId:c.classeId,classe:c.classe,periodes:[]};
    (c.periodes||[]).forEach(function(p){
      var k=EUC_DEV371_periodKind_(p.libelle);
      if(!levels[lv].periods[k])levels[lv].periods[k]={kind:k,label:p.libelle};
      classe.periodes.push({id:p.id,kind:k,label:p.libelle});
    });
    levels[lv].classes.push(classe);
  });
  var order=['TBAC','1BAC','2NDE','1BTS','2BTS','1CAP','TCAP'];
  return {annee:d.annee,levels:order.filter(function(k){return levels[k]}).map(function(k){
    var x=levels[k];x.periods=Object.keys(x.periods).map(function(pk){return x.periods[pk]});return x;
  })};
}
function EUC_DEV371_targets_(q){
  q=q||{};var y=EUC_DEV368_year(q.annee),level=EUC_DEV368_t(q.niveau),pk=EUC_DEV368_t(q.periodeKind),famille=EUC_DEV368_t(q.famille),classeId=EUC_DEV368_n(q.classeId),periodeId=EUC_DEV368_n(q.periodeId),out=[];
  EUC_DEV368_catalog(y).classes.forEach(function(c){
    var lv=EUC_DEV371_levelOf_(c.classe,c.famille);
    if(level&&lv!==level)return;
    if(famille&&c.famille!==famille)return;
    if(classeId&&c.classeId!==classeId)return;
    (c.periodes||[]).forEach(function(p){
      var kind=EUC_DEV371_periodKind_(p.libelle);
      if(pk&&kind!==pk)return;
      if(periodeId&&p.id!==periodeId)return;
      out.push({annee:y,famille:c.famille,niveau:lv,classeId:c.classeId,classe:c.classe,periode:p});
    });
  });return out;
}
function EUC_DEV371_detailCorrect_(y,c,p){
  /* Pour cette liste administrative on privilégie la vérité métier au snapshot léger.
     Le snapshot ligne DEV190 ne transporte pas conventionId, donc il pouvait classer
     à tort les élèves déjà conventionnés comme "sans convention". */
  var d=EUC_DEV190_buildHistoricalDetail_(y,c,p);
  try{if(typeof EUC_APP172_enrichirDetail==='function')d=EUC_APP172_enrichirDetail(d)||d}catch(e){}
  return d||{lignes:[]};
}
function EUC_DEV435_detailSans_(y,f,c,p){
  var d=null,fast=false;
  try{d=EUC_DEV416_finalDetail_(y,f,c,p);fast=!!d}catch(e){}
  if(!d)d=EUC_DEV371_detailCorrect_(y,c,p);
  d=d||{lignes:[]};d.__dev435Fast=fast;
  return d;
}
function EUC_DEV371_sansConvention(q){
  EUC_DEV368_admin();var out=[],targets=EUC_DEV371_targets_(q),managed=0;
  targets.forEach(function(t){
    var d=EUC_DEV435_detailSans_(t.annee,t.famille,t.classeId,t.periode.id);
    if(!d.__dev435Fast&&typeof EUC_DEV420_enrichDetail_==='function')d=EUC_DEV420_enrichDetail_(d,t.annee,t.famille,t.classeId,t.periode.id);
    (d.lignes||[]).forEach(function(x){
      /* apprentis = considérés comme couverts PFMP : jamais dans "sans convention" */
      if(x.apprenti)return;
      var code=EUC_DEV368_t(x.statutCode||x.statut).toUpperCase();
      if(code.indexOf('ANNULEE')>=0||code.indexOf('INTERROMP')>=0)return;
      if(EUC_DEV368_n(x.conventionId)>0)return;
      out.push({
        niveau:t.niveau,famille:t.famille,classe:t.classe,classeId:t.classeId,
        periode:t.periode.libelle,periodeId:t.periode.id,
        eleveId:EUC_DEV368_n(x.eleveId),
        eleve:[x.nom,x.prenom].filter(Boolean).join(' '),
        professeurPrincipal:EUC_DEV368_t(x.professeurPrincipal),
        situationId:EUC_DEV368_n(x.situationAdministrativeId),
        situationCode:EUC_DEV368_t(x.situationAdministrativeCode),
        situationLibelle:EUC_DEV368_t(x.situationAdministrativeLibelle),
        exclureSansConvention:x.exclureSansConvention===true
      });
      if(x.exclureSansConvention===true)managed++;
    });
  });
  out.sort(function(a,b){var c=a.classe.localeCompare(b.classe,'fr');return c||a.eleve.localeCompare(b.eleve,'fr')});
  return {ok:true,total:out.length-managed,managed:managed,allTotal:out.length,lignes:out,motifs:typeof EUC_DEV420_motifs_==='function'?EUC_DEV420_motifs_(true):[]};
}
function EUC_DEV371_pdfSans(q){
  var d=EUC_DEV371_sansConvention(q),lv=EUC_DEV371_levelLabel_(EUC_DEV368_t(q&&q.niveau));
  return EUC_DEV368_pdf('Eleves_sans_convention_'+EUC_DEV368_year(q&&q.annee),function(b){
    b.appendParagraph('ÉLÈVES SANS CONVENTION').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    b.appendParagraph('Année scolaire : '+EUC_DEV368_year(q&&q.annee));
    if(lv)b.appendParagraph('Niveau : '+lv);
    if(q&&q.periodeKind)b.appendParagraph('Période : '+EUC_DEV368_t(q.periodeKind));
    var rows=[['Classe','Période','Élève','Situation administrative','Professeur principal']];
    d.lignes.forEach(function(x){rows.push([x.classe,x.periode,x.eleve,x.situationLibelle||'Sans convention',x.professeurPrincipal||''])});
    b.appendTable(rows);
  });
}



/* DEV374 MISSIONS FIABLES */
function EUC_DEV374_missionDetail_(y,c,p){
  var d=EUC_DEV190_buildHistoricalDetail_(y,c,p);
  try{if(typeof EUC_APP172_enrichirDetail==='function')d=EUC_APP172_enrichirDetail(d)||d}catch(e){}
  try{
    var a=EUC_V156_affectations_(y,c,p)||[],m={};
    a.forEach(function(x){var id=Number(EUC_PFMP_ref_(x.Eleve))||0,t=EUC_DEV368_t(x.Type_suivi).toUpperCase();if(id&&t)m[id+'|'+t]=x});
    (d.lignes||[]).forEach(function(x){var v=m[EUC_DEV368_n(x.eleveId)+'|VISITE'];if(v)x.professeurVisiteur=EUC_DEV368_t(v.Nom_professeur_snapshot)});
  }catch(e2){}
  return d||{lignes:[]};
}
function EUC_DEV374_missions(q){
  EUC_DEV368_admin();var tm=EUC_DEV368_mapTransport(),g={};
  EUC_DEV368_targets(q).forEach(function(t){
    var d=EUC_DEV374_missionDetail_(t.annee,t.classeId,t.periode.id);
    (d.lignes||[]).forEach(function(x){
      var prof=EUC_DEV368_t(x.professeurVisiteur);if(!prof||x.apprenti)return;
      var code=EUC_DEV368_t(x.statutCode||x.statut).toUpperCase();
      if(code.indexOf('ANNULEE')>=0||code.indexOf('INTERROMP')>=0)return;
      if(!(EUC_DEV368_n(x.conventionId)>0))return;
      var k=prof+'|'+t.classeId+'|'+t.periode.id;
      if(!g[k])g[k]={key:k,professeur:prof,classeId:t.classeId,classe:t.classe,periodeId:t.periode.id,periode:t.periode.libelle,debut:t.periode.debut,fin:t.periode.fin,lignes:[]};
      var mk=t.annee+'|'+t.classeId+'|'+t.periode.id+'|'+EUC_DEV368_n(x.eleveId);
      g[k].lignes.push({eleveId:EUC_DEV368_n(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),entreprise:EUC_DEV368_t(x.entreprise),adresse:EUC_DEV368_t(x.adresseEntreprise),transport:tm[mk]?tm[mk].mode:''});
    });
  });
  return {ok:true,groups:Object.keys(g).map(function(k){return g[k]})};
}
function EUC_DEV374_pdfMission(q){
  q=q||{};var g=EUC_DEV374_missions(q).groups.filter(function(x){return x.key===EUC_DEV368_t(q.groupKey)})[0];
  if(!g)throw new Error('Groupe de mission introuvable.');
  if(g.lignes.some(function(x){return !EUC_DEV368_t(x.transport)}))throw new Error('Choisissez un moyen de transport pour chaque élève avant de générer le PDF.');
  var p=EUC_DEV368_prof(g.professeur),safe=(g.professeur+'_'+g.classe+'_'+g.periode).replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_');
  return EUC_DEV368_pdf('Ordre_de_mission_'+safe,function(b){
    b.appendParagraph('LYCÉE LES EUCALYPTUS').setBold(true);
    b.appendParagraph('ORDRE DE MISSION').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    b.appendParagraph('NOM / PRÉNOM : '+p.nom);b.appendParagraph('FONCTION : '+p.fonction);
    b.appendParagraph('MOTIF : Visites en entreprise des élèves en PFMP');b.appendParagraph('CLASSE : '+g.classe);
    b.appendParagraph('PÉRIODE DE MISSION : '+(g.debut||'')+' au '+(g.fin||'')+' — '+g.periode);
    var rows=[['Élève','Entreprise','Adresse','Moyen de transport']];g.lignes.forEach(function(x){rows.push([x.eleve,x.entreprise||'',x.adresse||'',x.transport])});b.appendTable(rows);
    b.appendParagraph('Fait à Nice, le '+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','dd/MM/yyyy'));b.appendParagraph('Le Proviseur').setBold(true);
    b.appendParagraph('* Les visites en visio n’ouvrent pas droit à des frais de déplacement.').setItalic(true);
  });
}
