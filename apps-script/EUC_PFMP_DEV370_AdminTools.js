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
function EUC_DEV368_mapTransport(){return EUC_DEV440_transportMap_()}
function EUC_DEV368_missions(q){EUC_DEV368_admin();var tm=EUC_DEV368_mapTransport(),g={};EUC_DEV368_targets(q).forEach(function(t){var d=EUC_DEV368_detail(t.annee,t.classeId,t.periode.id);(d.lignes||[]).forEach(function(x){var prof=EUC_DEV368_t(x.professeurVisiteur);if(!prof||!EUC_DEV374_missionEligible_(x))return;var k=prof+'|'+t.classeId+'|'+t.periode.id;if(!g[k])g[k]={key:k,professeur:prof,classeId:t.classeId,classe:t.classe,periodeId:t.periode.id,periode:t.periode.libelle,debut:t.periode.debut,fin:t.periode.fin,lignes:[]};var mk=t.annee+'|'+t.classeId+'|'+t.periode.id+'|'+EUC_DEV368_n(x.eleveId);g[k].lignes.push({eleveId:EUC_DEV368_n(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),entreprise:EUC_DEV368_t(x.entreprise),adresse:EUC_DEV368_t(x.adresseEntreprise),transport:tm[mk]?tm[mk].mode:''})})});return{ok:true,groups:Object.keys(g).map(function(k){return g[k]})}}
function EUC_DEV368_sauverTransport(q){EUC_DEV368_admin();q=q||{};var allowed=['','Bus','Tram','Tramway','Train','À pied','Véhicule personnel','Visio','Visioconférence'],mode=EUC_DEV368_t(q.transport);if(allowed.indexOf(mode)<0)throw new Error('Transport invalide');EUC_DEV368_ensure();var y=EUC_DEV368_year(q.annee),cid=EUC_DEV368_n(q.classeId),pid=EUC_DEV368_n(q.periodeId),eid=EUC_DEV368_n(q.eleveId),rows=EUC_IMPORT_lireRecords_(EUC_DEV368_TABLE_)||[],ex=rows.filter(function(r){return EUC_DEV368_t(r.Annee_scolaire)===y&&EUC_DEV368_n(r.Classe_id)===cid&&EUC_DEV368_n(r.Periode_id)===pid&&EUC_DEV368_n(r.Eleve_id)===eid})[0],fields={Annee_scolaire:y,Classe_id:cid,Classe_nom:EUC_DEV368_t(q.classe),Periode_id:pid,Periode_libelle:EUC_DEV368_t(q.periode),Eleve_id:eid,Eleve_nom:EUC_DEV368_t(q.eleve),Professeur_visiteur:EUC_DEV368_t(q.professeur),Moyen_transport:mode,Date_modification:new Date().toISOString()};if(ex)EUC_ENT_grist('patch','/tables/'+EUC_DEV368_TABLE_+'/records',{records:[{id:ex.id,fields:fields}]});else EUC_ENT_grist('post','/tables/'+EUC_DEV368_TABLE_+'/records',{records:[{fields:fields}]});EUC_DEV440_updateCachedTransport_(q.missionToken,eid,mode);return{ok:true}}
function EUC_DEV368_pdf(title,fn){var d=DocumentApp.create(title),b=d.getBody();fn(b);d.saveAndClose();var f=DriveApp.getFileById(d.getId()),pdf=f.getAs(MimeType.PDF).setName(title+'.pdf'),r={ok:true,name:title+'.pdf',mime:'application/pdf',base64:Utilities.base64Encode(pdf.getBytes())};f.setTrashed(true);return r}
function EUC_DEV368_pdfSans(q){var d=EUC_DEV368_sansConvention(q);return EUC_DEV368_pdf('Eleves_sans_convention_'+EUC_DEV368_year(q&&q.annee),function(b){b.appendParagraph('ÉLÈVES SANS CONVENTION').setHeading(DocumentApp.ParagraphHeading.HEADING1);b.appendParagraph('Année scolaire : '+EUC_DEV368_year(q&&q.annee));var rows=[['Classe','Période','Élève','Professeur principal']];d.lignes.forEach(function(x){rows.push([x.classe,x.periode,x.eleve,x.professeurPrincipal||''])});b.appendTable(rows)})}
function EUC_DEV368_prof(name){var n=EUC_DEV368_t(name).toUpperCase(),p=(EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')||[]).filter(function(x){return [x.Civilite,x.Prenom,x.Nom].filter(Boolean).join(' ').trim().toUpperCase()===n})[0]||{},disc=EUC_DEV368_t(p.Discipline);return{nom:EUC_DEV368_t(p.Nom)||name,prenom:EUC_DEV368_t(p.Prenom),civilite:EUC_DEV368_t(p.Civilite),discipline:disc,fonction:disc?'Professeur — '+disc:'Professeur'}}
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
function EUC_DEV374_isApprenti_(x){
  x=x||{};
  if(x.apprenti===true||x.apprenti===1)return true;
  var flag=EUC_DEV368_t(x.apprenti).toUpperCase(),code=EUC_DEV368_t(x.statutCode||x.statut).toUpperCase();
  return ['1','TRUE','VRAI','OUI','YES'].indexOf(flag)>=0||code.indexOf('APPRENT')>=0||code==='MIXTE';
}
function EUC_DEV374_missionEligible_(x){
  if(EUC_DEV374_isApprenti_(x))return true;
  var code=EUC_DEV368_t((x||{}).statutCode||(x||{}).statut).toUpperCase();
  if(code.indexOf('ANNULEE')>=0||code.indexOf('INTERROMP')>=0)return false;
  return EUC_DEV368_n((x||{}).conventionId)>0;
}
function EUC_DEV440_contactBlock_(fallback,name,tel,mail){
  var parts=EUC_DEV368_t(fallback).split(/\s*[·\n]\s*/).filter(Boolean),extra=[name,tel,mail];
  extra.forEach(function(v){v=EUC_DEV368_t(v);if(v&&!parts.some(function(p){return p.toUpperCase()===v.toUpperCase()}))parts.push(v)});
  return parts.join('\n');
}
function EUC_DEV440_missionLine_(x,transport){
  x=x||{};
  return{
    eleveId:EUC_DEV368_n(x.eleveId),eleve:[x.nom,x.prenom].filter(Boolean).join(' '),
    entreprise:EUC_DEV368_t(x.entreprise),adresse:EUC_DEV368_t(x.adresseEntreprise),transport:EUC_DEV368_t(transport)||'Véhicule personnel',
    contactEntreprise:EUC_DEV440_contactBlock_(x.coordonneesEntreprise||x.contactEntreprise,x.responsableEntreprise||x.nomResponsableEntreprise,x.telephoneEntreprise,x.courrielEntreprise||x.emailEntreprise),
    contactTuteur:EUC_DEV440_contactBlock_(x.coordonneesTuteur||x.tuteurEntreprise,x.tuteur||x.nomTuteurEntreprise,x.telephoneTuteur,x.courrielTuteur||x.emailTuteur)
  };
}
function EUC_DEV374_missionDetail_(y,f,c,p){
  var d=null,fast=false,key='';
  try{
    if(typeof EUC_DEV416_key_==='function'&&typeof EUC_DEV416_cacheGet_==='function'){
      key=EUC_DEV416_key_(y,f,c,p);d=EUC_DEV416_cacheGet_(key);
      if(d&&typeof EUC_DEV425_payloadFresh_==='function'&&!EUC_DEV425_payloadFresh_(y,f,d))d=null;
    }
    if(!d&&typeof EUC_DEV427_readDetail_==='function')d=EUC_DEV427_readDetail_(y,f,c,p);
    if(!d&&typeof EUC_DEV424_readEnrichedDetail_==='function')d=EUC_DEV424_readEnrichedDetail_(y,f,c,p);
    if(d){fast=true;if(key&&typeof EUC_DEV416_cachePut_==='function')EUC_DEV416_cachePut_(key,d);if(typeof EUC_DEV428_withContext_==='function')d=EUC_DEV428_withContext_(d,y,f)}
  }catch(e){d=null;fast=false}
  if(!d){d=EUC_DEV190_buildHistoricalDetail_(y,c,p);try{if(typeof EUC_APP172_enrichirDetail==='function')d=EUC_APP172_enrichirDetail(d)||d}catch(e2){}}
  if(fast)return d||{lignes:[]};
  try{
    var a=EUC_V156_affectations_(y,c,p)||[],m={};
    a.forEach(function(x){var id=Number(EUC_PFMP_ref_(x.Eleve))||0,t=EUC_DEV368_t(x.Type_suivi).toUpperCase();if(id&&t)m[id+'|'+t]=x});
    (d.lignes||[]).forEach(function(x){var v=m[EUC_DEV368_n(x.eleveId)+'|VISITE'];if(v)x.professeurVisiteur=EUC_DEV368_t(v.Nom_professeur_snapshot)});
  }catch(e3){}
  return d||{lignes:[]};
}
function EUC_DEV374_missions(q){
  var started=new Date().getTime();EUC_DEV368_admin();var t0=new Date().getTime(),tm=EUC_DEV368_mapTransport(),transportMs=new Date().getTime()-t0,g={};
  t0=new Date().getTime();var targets=EUC_DEV440_missionTargets_(q),targetsMs=new Date().getTime()-t0,detailMs=0;
  targets.forEach(function(t){
    var detailStarted=new Date().getTime();
    var d=EUC_DEV374_missionDetail_(t.annee,t.famille,t.classeId,t.periode.id);
    detailMs+=new Date().getTime()-detailStarted;
    (d.lignes||[]).forEach(function(x){
      var prof=EUC_DEV368_t(x.professeurVisiteur);if(!prof||!EUC_DEV374_missionEligible_(x))return;
      var k=prof+'|'+t.classeId+'|'+t.periode.id;
      if(!g[k])g[k]={key:k,famille:t.famille,professeur:prof,classeId:t.classeId,classe:t.classe,periodeId:t.periode.id,periode:t.periode.libelle,debut:t.periode.debut,fin:t.periode.fin,lignes:[]};
      var mk=t.annee+'|'+t.classeId+'|'+t.periode.id+'|'+EUC_DEV368_n(x.eleveId);
      g[k].lignes.push(EUC_DEV440_missionLine_(x,tm[mk]?tm[mk].mode:''));
    });
  });
  var groups=Object.keys(g).map(function(k){return g[k]});
  groups.forEach(function(group){group.pdfToken=EUC_DEV440_cacheGroup_(group)});
  return {ok:true,groups:groups,metrics:{transportMs:transportMs,targetsMs:targetsMs,detailMs:detailMs,totalMs:new Date().getTime()-started}};
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

/* DEV436 — modèles d'ordres de mission fusionnables.
 * Le document source reste dans Drive. Seul son identifiant est versionné ici ;
 * les modèles supplémentaires sont enregistrés dans les propriétés du script. */
var EUC_DEV436_MISSION_MODEL_DEFAULT_='1UYL-QMQpTvR1XsijWNsyLjcDrOr2K6S_nQEk2ZYDKKI';
var EUC_DEV436_MISSION_MODELS_KEY_='EUC_DEV436_MISSION_MODELS';
function EUC_DEV436_extractDriveId_(v){
  var s=EUC_DEV368_t(v),m=s.match(/[-\w]{25,}/);return m?m[0]:'';
}
function EUC_DEV436_models_(){
  var base=[{id:'eucalyptus-standard',label:'Modèle Eucalyptus standard',famille:'TOUS',documentId:EUC_DEV436_MISSION_MODEL_DEFAULT_,defaut:true}];
  try{
    var raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV436_MISSION_MODELS_KEY_),extra=raw?JSON.parse(raw):[];
    if(Array.isArray(extra))base=base.concat(extra);
  }catch(e){}
  return base;
}
function EUC_DEV436_listMissionModels(){EUC_DEV368_admin();return{ok:true,models:EUC_DEV436_models_()}}
function EUC_DEV436_saveMissionModel(q){
  EUC_DEV368_admin();q=q||{};
  var documentId=EUC_DEV436_extractDriveId_(q.documentId),label=EUC_DEV368_t(q.label),fam=EUC_DEV368_t(q.famille).toUpperCase()||'TOUS';
  if(!documentId||!label)throw new Error('Nom du modèle et lien Google Docs requis.');
  if(['TOUS','BACPRO','BTS','CAP'].indexOf(fam)<0)throw new Error('Famille de modèle invalide.');
  var file=DriveApp.getFileById(documentId);
  if(file.getMimeType()!=='application/vnd.google-apps.document')throw new Error('Le modèle doit être un document Google Docs éditable.');
  var props=PropertiesService.getScriptProperties(),raw=props.getProperty(EUC_DEV436_MISSION_MODELS_KEY_),models=[];
  try{models=raw?JSON.parse(raw):[]}catch(e){models=[]}
  if(!Array.isArray(models))models=[];
  if(q.defaut)models.forEach(function(x){if(x.famille===fam)x.defaut=false});
  var id='modele-'+Utilities.getUuid(),item={id:id,label:label,famille:fam,documentId:documentId,defaut:q.defaut!==false};
  models.push(item);props.setProperty(EUC_DEV436_MISSION_MODELS_KEY_,JSON.stringify(models));
  return{ok:true,model:item,models:EUC_DEV436_models_()};
}
function EUC_DEV436_model_(id,famille){
  var models=EUC_DEV436_models_(),wanted=EUC_DEV368_t(id),fam=EUC_DEV368_t(famille).toUpperCase();
  var selected=models.filter(function(x){return x.id===wanted&&(x.famille==='TOUS'||x.famille===fam)})[0];
  if(!selected)selected=models.filter(function(x){return x.defaut&&x.famille===fam})[0];
  if(!selected)selected=models.filter(function(x){return x.defaut&&x.famille==='TOUS'})[0]||models[0];
  return selected;
}
function EUC_DEV436_replace_(body,key,value){
  var pattern='\\{\\{'+key+'\\}\\}',replacement=String(value==null?'':value).replace(/\\/g,'\\\\').replace(/\$/g,'$$$$');
  body.replaceText(pattern,replacement);
}
/* DEV438 — la seconde page est ajoutée après la fusion, donc elle est
 * commune au modèle Eucalyptus et à tous les futurs modèles enregistrés. */
function EUC_DEV438_emptyParagraph_(p){
  if(!p||p.getType()!==DocumentApp.ElementType.PARAGRAPH)return false;
  var text=EUC_DEV368_t(p.getText()).replace(/[\u200B-\u200D\uFEFF]/g,'').trim(),hasUsefulChild=false;
  for(var i=0;i<p.getNumChildren();i++){
    var type=p.getChild(i).getType();
    if(type!==DocumentApp.ElementType.TEXT&&type!==DocumentApp.ElementType.PAGE_BREAK){hasUsefulChild=true;break}
  }
  return !text&&!hasUsefulChild;
}
function EUC_DEV438_compactParagraph_(p){
  try{p.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1)}catch(e){}
}
function EUC_DEV438_formatTable_(table,widths,headerSize,rowSize){
  for(var c=0;c<widths.length;c++)try{table.setColumnWidth(c,widths[c])}catch(e){}
  for(var r=0;r<table.getNumRows();r++){
    var row=table.getRow(r);try{row.setMinimumHeight(r===0?20:18)}catch(e2){}
    for(var k=0;k<row.getNumCells();k++){
      var cell=row.getCell(k);try{cell.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(3).setPaddingRight(3)}catch(e3){}
      try{cell.editAsText().setFontSize(r===0?headerSize:rowSize).setBold(r===0)}catch(e4){}
      for(var p=0;p<cell.getNumChildren();p++)if(cell.getChild(p).getType()===DocumentApp.ElementType.PARAGRAPH)EUC_DEV438_compactParagraph_(cell.getChild(p).asParagraph());
    }
  }
}
function EUC_DEV438_compactMissionPage_(body,table){
  /* Le modèle officiel conserve un cartouche flottant à gauche. On réduit
     seulement la largeur du tableau et sa marge droite : toucher aux marges
     haute/basse déplacerait le titre sous le logo, et une marge gauche trop
     faible ferait chevaucher le tableau avec le cartouche. */
  /* Conserver impérativement la marge gauche du modèle : le cartouche et le
     logo sont positionnés relativement à cette marge. La changer après la
     copie décale l'image hors de la page. Seule la marge droite est resserrée. */
  try{body.setMarginRight(24)}catch(e){}
  EUC_DEV438_formatTable_(table,[88,92,152,88],8,7);
  var anchor=arguments.length>2&&arguments[2]?arguments[2]:table,index=body.getChildIndex(anchor),removed=0;
  /* Le modèle officiel contient des paragraphes de placement entre le
     tableau et les signatures. Ils faisaient basculer « Le Proviseur » et
     les deux mentions sur une seconde page. On ne retire que les lignes
     réellement vides (ou constituées d'un saut de page), jamais du texte. */
  while(index>=0&&index+1<body.getNumChildren()&&removed<40){
    var next=body.getChild(index+1);
    if(!EUC_DEV438_emptyParagraph_(next))break;
    next.removeFromParent();removed++;
  }
  for(var i=Math.max(0,index+1);i<body.getNumChildren();i++){
    var el=body.getChild(i);if(el.getType()===DocumentApp.ElementType.PARAGRAPH)EUC_DEV438_compactParagraph_(el.asParagraph());
  }
}
function EUC_DEV442_insertMissionTable_(body,index,rows){
  /* Un tableau extérieur invisible crée le retrait nécessaire sans toucher à
     la marge globale du modèle et donc sans déplacer le logo flottant. */
  var layout=body.insertTable(index,[['','']]);
  try{layout.setBorderWidth(0).setColumnWidth(0,50).setColumnWidth(1,420)}catch(e){}
  for(var c=0;c<2;c++)try{layout.getCell(0,c).setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0)}catch(e2){}
  var holder=layout.getCell(0,1);try{holder.clear()}catch(e3){}
  var table=holder.appendTable(rows);
  return{layout:layout,table:table};
}
function EUC_DEV441_formatMissionSignature_(body){
  var fait=null,proviseur=null,after=false;
  for(var i=0;i<body.getNumChildren();i++){
    var el=body.getChild(i);if(el.getType()!==DocumentApp.ElementType.PARAGRAPH)continue;
    var p=el.asParagraph(),text=EUC_DEV368_t(p.getText());
    if(text.indexOf('Fait à Nice')===0)fait=p;
    if(/^Le Proviseur\b/i.test(text)){proviseur=p;after=true;continue;}
    if(after&&text){try{p.setSpacingBefore(24).setSpacingAfter(0).setLineSpacing(1)}catch(e0){}after=false;}
  }
  /* Les deux mentions doivent commencer sur le même axe, à droite du
     tableau, plutôt que d'être centrées indépendamment selon leur longueur. */
  [fait,proviseur].forEach(function(p){if(!p)return;try{p.setAlignment(DocumentApp.HorizontalAlignment.LEFT).setIndentStart(260).setIndentEnd(0)}catch(e1){}});
  if(proviseur)try{proviseur.setSpacingBefore(8).setSpacingAfter(28)}catch(e2){}
}
var EUC_DEV440_MISSION_CACHE_PREFIX_='DEV440_MISSION_';
var EUC_DEV440_TRANSPORT_CACHE_KEY_='DEV440_TRANSPORTS';
function EUC_DEV440_transportMap_(){
  var cache=CacheService.getScriptCache(),raw=null;try{raw=cache.get(EUC_DEV440_TRANSPORT_CACHE_KEY_)}catch(e){}
  if(raw){try{return JSON.parse(raw)}catch(e2){}}
  var map={};
  try{(EUC_IMPORT_lireRecords_(EUC_DEV368_TABLE_)||[]).forEach(function(r){map[EUC_DEV368_t(r.Annee_scolaire)+'|'+EUC_DEV368_n(r.Classe_id)+'|'+EUC_DEV368_n(r.Periode_id)+'|'+EUC_DEV368_n(r.Eleve_id)]={id:EUC_DEV368_n(r.id),mode:EUC_DEV368_t(r.Moyen_transport)}})}catch(e3){EUC_DEV368_ensure()}
  try{cache.put(EUC_DEV440_TRANSPORT_CACHE_KEY_,JSON.stringify(map),21600)}catch(e4){}
  return map;
}
function EUC_DEV440_missionTargets_(q){
  q=q||{};var y=EUC_DEV368_year(q.annee),family=EUC_DEV368_t(q.famille),cid=EUC_DEV368_n(q.classeId),pid=EUC_DEV368_n(q.periodeId);
  if(!family)return EUC_DEV368_targets(q);
  var response=EUC_DEV190G1_fastFamilyIndex({annee:y,famille:family}),payload=response&&response.ready&&response.payload?response.payload:{classes:[]},out=[];
  (payload.classes||[]).forEach(function(c){
    var classId=EUC_DEV368_n(c.classeId||c.id);if(cid&&classId!==cid)return;
    (c.periodes||[]).forEach(function(p){var periodId=EUC_DEV368_n(p.id||p.periodeId);if(pid&&periodId!==pid)return;out.push({annee:y,famille:family,classeId:classId,classe:EUC_DEV368_t(c.classe||c.nom),periode:{id:periodId,libelle:EUC_DEV368_t(p.libelle||p.nom),debut:EUC_DEV368_t(p.debutFr||p.debut),fin:EUC_DEV368_t(p.finFr||p.fin)}})});
  });
  return out;
}
function EUC_DEV440_cacheGroup_(group){
  try{
    var token=Utilities.getUuid().replace(/-/g,''),cache=CacheService.getScriptCache();
    cache.put(EUC_DEV440_MISSION_CACHE_PREFIX_+token,JSON.stringify(group),900);
    return token;
  }catch(e){return''}
}
function EUC_DEV440_cachedGroup_(token,key){
  token=EUC_DEV368_t(token);key=EUC_DEV368_t(key);
  if(!/^[a-f0-9]{32}$/i.test(token)||!key)return null;
  try{
    var raw=CacheService.getScriptCache().get(EUC_DEV440_MISSION_CACHE_PREFIX_+token),group=raw?JSON.parse(raw):null;
    return group&&EUC_DEV368_t(group.key)===key?group:null;
  }catch(e){return null}
}
function EUC_DEV440_updateCachedTransport_(token,eleveId,mode){
  try{CacheService.getScriptCache().remove(EUC_DEV440_TRANSPORT_CACHE_KEY_)}catch(e0){}
  token=EUC_DEV368_t(token);if(!/^[a-f0-9]{32}$/i.test(token))return;
  try{
    var cache=CacheService.getScriptCache(),key=EUC_DEV440_MISSION_CACHE_PREFIX_+token,raw=cache.get(key),group=raw?JSON.parse(raw):null,id=EUC_DEV368_n(eleveId);
    if(!group||!Array.isArray(group.lignes))return;
    group.lignes.forEach(function(x){if(EUC_DEV368_n(x.eleveId)===id)x.transport=EUC_DEV368_t(mode)});
    cache.put(key,JSON.stringify(group),900);
  }catch(e){}
}
function EUC_DEV440_groupForPdf_(q){
  EUC_DEV368_admin();q=q||{};
  var key=EUC_DEV368_t(q.groupKey),cached=EUC_DEV440_cachedGroup_(q.missionToken,key);
  if(cached)return cached;
  return EUC_DEV374_missions(q).groups.filter(function(x){return x.key===key})[0]||null;
}
function EUC_DEV440_profEmail_(name){
  var wanted=EUC_DEV368_t(name).toUpperCase(),prof=(EUC_IMPORT_lireRecords_('EUC_PROFESSEURS_PFMP')||[]).filter(function(p){
    return p.Actif!==false&&[p.Civilite,p.Prenom,p.Nom].filter(Boolean).join(' ').trim().toUpperCase()===wanted;
  })[0],email=EUC_DEV368_t(prof&&(prof.Email||prof.Courriel));
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
}
function EUC_DEV440_prepareMissionTransportEmail(q){
  var ctx=EUC_DEV368_admin(),g=EUC_DEV440_groupForPdf_(q),sender=EUC_DEV368_t(ctx.nom||ctx.email),replyTo=EUC_DEV368_t(ctx.email);
  if(!g)throw new Error('Groupe de mission introuvable.');
  var recipient=EUC_DEV440_profEmail_(g.professeur);if(!recipient)throw new Error('Aucune adresse électronique valide pour ce professeur.');
  var subject='[PFMP] Ordre de mission — '+g.classe+' — '+g.periode;
  var body='Bonjour,\n\nVous trouverez en pièce jointe l’ordre de mission concernant la classe '+g.classe+' pour la période '+g.periode+' ('+(g.debut||'date de début à préciser')+' au '+(g.fin||'date de fin à préciser')+').\n\nLe véhicule personnel est retenu par défaut pour l’ensemble de vos visites. Si vous effectuez les visites avec un autre moyen de transport (bus, tramway, à pied ou, par nécessité, en visioconférence), merci de nous le signaler par retour de courriel, en précisant les visites concernées et la modalité choisie pour chacune.\n\nSans retour de votre part, le véhicule personnel restera le mode de déplacement retenu pour toutes vos visites.\n\nSincères salutations,\n\n'+(sender||'Bureau des entreprises');
  return{ok:true,to:recipient,replyTo:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)?replyTo:'',subject:subject,body:body,professeur:g.professeur,classe:g.classe,periode:g.periode};
}
function EUC_DEV440_sendMissionTransportEmail(q){
  var prepared=EUC_DEV440_prepareMissionTransportEmail(q),lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var duplicateKey='DEV440_MAIL_'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,[prepared.to,prepared.subject,prepared.replyTo].join('|'))).slice(0,24),cache=CacheService.getScriptCache();
    if(cache.get(duplicateKey))throw new Error('Ce message vient déjà d’être envoyé. Patientez une minute avant un nouvel envoi.');
    var mission=EUC_DEV436_pdfMission(q),attachment=Utilities.newBlob(Utilities.base64Decode(mission.base64),mission.mime,mission.name);
    var options={to:prepared.to,subject:prepared.subject,body:prepared.body,name:'PFMP — Lycée Les Eucalyptus',attachments:[attachment]};
    if(prepared.replyTo)options.replyTo=prepared.replyTo;
    MailApp.sendEmail(options);cache.put(duplicateKey,'1',60);
  }finally{lock.releaseLock()}
  return{ok:true,to:prepared.to,subject:prepared.subject,attachment:mission.name,generationMs:mission.generationMs};
}
function EUC_DEV440_docsRequest_(documentId,suffix,method,payload){
  if(typeof Docs!=='undefined'&&Docs.Documents){
    if(suffix===':batchUpdate')return Docs.Documents.batchUpdate(payload,documentId);
    return Docs.Documents.get(documentId);
  }
  var options={method:method||'get',muteHttpExceptions:true,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}};
  if(payload!=null){options.contentType='application/json';options.payload=JSON.stringify(payload)}
  var response=UrlFetchApp.fetch('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(documentId)+(suffix||''),options),status=response.getResponseCode();
  if(status<200||status>=300)throw new Error('Mise en page Google Docs impossible (HTTP '+status+').');
  var text=response.getContentText();return text?JSON.parse(text):{};
}
function EUC_DEV440_insertLandscapeSection_(documentId){
  var document=EUC_DEV440_docsRequest_(documentId,'','get'),content=(document.body&&document.body.content)||[],last=content.length?content[content.length-1]:null,index=Math.max(1,EUC_DEV368_n(last&&last.endIndex)-1);
  EUC_DEV440_docsRequest_(documentId,':batchUpdate','post',{requests:[{insertSectionBreak:{sectionType:'NEXT_PAGE',location:{index:index}}}]});
  return index;
}
function EUC_DEV440_styleLandscapeSection_(documentId,sectionBreakIndex){
  var document=EUC_DEV440_docsRequest_(documentId,'','get'),content=(document.body&&document.body.content)||[],last=content.length?content[content.length-1]:null;
  var start=Math.max(1,EUC_DEV368_n(sectionBreakIndex)+1),end=Math.max(start+1,EUC_DEV368_n(last&&last.endIndex)-1);
  EUC_DEV440_docsRequest_(documentId,':batchUpdate','post',{requests:[
    {updateSectionStyle:{range:{startIndex:start,endIndex:end},sectionStyle:{flipPageOrientation:true,marginTop:{magnitude:24,unit:'PT'},marginBottom:{magnitude:24,unit:'PT'},marginLeft:{magnitude:24,unit:'PT'},marginRight:{magnitude:24,unit:'PT'}},fields:'flipPageOrientation,marginTop,marginBottom,marginLeft,marginRight'}}
  ]});
}
function EUC_DEV438_appendVisitRecap_(body,g){
  var title=body.appendParagraph('RÉCAPITULATIF HORAIRE DES VISITES EN ENTREPRISE');
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(true).setFontSize(12).setSpacingAfter(4);
  var meta=body.appendParagraph((g.classe||'')+' — '+(g.periode||'')+' — '+(g.debut||'')+' au '+(g.fin||''));
  meta.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(8).setSpacingAfter(5);
  var rows=[['N°','Élève','Entreprise','Adresse','Contact\nentreprise','Contact\ntuteur','Date','Lieu de\ndépart','Heure\nd’arrivée','Nombre de\nkilomètres','Heure de\ndépart','Moyen de\ntransport']];
  (g.lignes||[]).forEach(function(x,i){rows.push([String(i+1),x.eleve||'',x.entreprise||'',x.adresse||'',x.contactEntreprise||'',x.contactTuteur||'','','','','','',x.transport||''])});
  var table=body.appendTable(rows);table.setBorderColor('#6f9f95');
  for(var c=0;c<12;c++)table.getCell(0,c).setBackgroundColor('#e7f5f1');
  /* 630 pt : marge de sécurité pour éviter toute coupe lors de l'export PDF. */
  EUC_DEV438_formatTable_(table,[18,45,50,82,93,93,28,38,32,30,32,89],6,6);
  var help=body.appendParagraph('Lieu de départ : indiquer D pour le domicile, EK pour le lycée Les Eucalyptus, ou le numéro d’ordre de l’entreprise visitée juste avant lorsque les visites s’enchaînent dans une tournée.');
  help.setFontSize(7).setItalic(true).setSpacingBefore(5).setSpacingAfter(2);
  var receipts=body.appendParagraph('Justificatifs : joindre tous les justificatifs nécessaires pour bénéficier d’une prise en charge financière.');
  receipts.setFontSize(7).setItalic(true).setSpacingBefore(0).setSpacingAfter(4);
  var precisionTitle=body.appendParagraph('Précisions complémentaires');
  precisionTitle.setBold(true).setFontSize(8).setSpacingBefore(0).setSpacingAfter(2);
  var precision=body.appendTable([[''],[''],[''],[''],[''],['']]);precision.setBorderColor('#6f9f95');
  for(var r=0;r<precision.getNumRows();r++){try{precision.getRow(r).setMinimumHeight(11)}catch(e){}try{precision.getCell(r,0).setPaddingTop(0).setPaddingBottom(0)}catch(e2){}}
  try{precision.setColumnWidth(0,630)}catch(e3){}
  var signatures=body.appendTable([['Signature du professeur','Signature du directeur délégué aux formations']]);signatures.setBorderColor('#6f9f95');
  try{signatures.setColumnWidth(0,312).setColumnWidth(1,312);signatures.getRow(0).setMinimumHeight(42)}catch(e4){}
  for(var s=0;s<2;s++){try{signatures.getCell(0,s).setPaddingTop(3).setPaddingLeft(4).editAsText().setBold(true).setFontSize(8)}catch(e5){}}
}
function EUC_DEV442_validateMissionTemplate_(body){
  var text=body.getText(),required=['NOM','PRENOM','DISCIPLINE','CLASSE','PERIODE','DEBUT','FIN','DATE','LISTE_ELEVES'];
  var missing=required.filter(function(key){return text.indexOf('{{'+key+'}}')<0});
  if(missing.length)throw new Error('Le modèle d’ordre de mission est incomplet. Champs de fusion manquants : '+missing.map(function(x){return'{{'+x+'}}'}).join(', '));
}
function EUC_DEV436_pdfMission(q){
  var started=new Date().getTime();q=q||{};var g=EUC_DEV440_groupForPdf_(q);
  if(!g)throw new Error('Groupe de mission introuvable.');
  if(g.lignes.some(function(x){return !EUC_DEV368_t(x.transport)}))throw new Error('Choisissez un moyen de transport pour chaque élève avant de générer le PDF.');
  var model=EUC_DEV436_model_(q.modelId,g.famille),p=EUC_DEV368_prof(g.professeur),safe=(g.professeur+'_'+g.classe+'_'+g.periode).replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_');
  var copy=DriveApp.getFileById(model.documentId).makeCopy('TEMP_Ordre_de_mission_'+safe),id=copy.getId();
  try{
    var doc=DocumentApp.openById(id),body=doc.getBody(),date=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','dd/MM/yyyy');
    EUC_DEV442_validateMissionTemplate_(body);
    EUC_DEV436_replace_(body,'NOM',p.nom||g.professeur);EUC_DEV436_replace_(body,'PRENOM',p.prenom||'');
    EUC_DEV436_replace_(body,'DISCIPLINE',p.discipline||'Professeur');EUC_DEV436_replace_(body,'CLASSE',g.classe);
    EUC_DEV436_replace_(body,'PERIODE',g.periode);EUC_DEV436_replace_(body,'DEBUT',g.debut||'');EUC_DEV436_replace_(body,'FIN',g.fin||'');EUC_DEV436_replace_(body,'DATE',date);
    var range=body.findText('\\{\\{LISTE_ELEVES\\}\\}'),rows=[['Élève','Entreprise','Adresse','Transport']];
    g.lignes.forEach(function(x){rows.push([x.eleve,x.entreprise||'',x.adresse||'',x.transport||''])});
    if(range){var paragraph=range.getElement().getParent(),index=body.getChildIndex(paragraph);paragraph.removeFromParent();var inserted=EUC_DEV442_insertMissionTable_(body,index,rows),table=inserted.table;table.setBorderColor('#8fbdb3');for(var c=0;c<4;c++){table.getCell(0,c).setBackgroundColor('#e7f5f1').editAsText().setBold(true)}EUC_DEV438_compactMissionPage_(body,table,inserted.layout);EUC_DEV441_formatMissionSignature_(body)}
    else EUC_DEV436_replace_(body,'LISTE_ELEVES',g.lignes.map(function(x){return x.eleve}).join(' · '));
    doc.saveAndClose();
    var landscapeSectionIndex=EUC_DEV440_insertLandscapeSection_(id);
    doc=DocumentApp.openById(id);body=doc.getBody();EUC_DEV438_appendVisitRecap_(body,g);doc.saveAndClose();
    EUC_DEV440_styleLandscapeSection_(id,landscapeSectionIndex);
    var pdf=copy.getAs(MimeType.PDF).setName('Ordre_de_mission_'+safe+'.pdf');
    return{ok:true,name:pdf.getName(),mime:'application/pdf',base64:Utilities.base64Encode(pdf.getBytes()),modele:model.label,generationMs:new Date().getTime()-started};
  }finally{copy.setTrashed(true)}
}
