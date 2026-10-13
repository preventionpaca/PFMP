/**
 * DEV565 — attestations d'émargement / allocation de PFMP.
 *
 * Ce parcours est séparé de la génération initiale des conventions. Il ne
 * retient que les élèves scolaires disposant déjà d'une convention et d'une
 * entreprise. Un apprenti est exclu côté serveur, même si son identifiant est
 * injecté manuellement par le navigateur.
 */
var EUC_DEV565_ATTESTATION_TEMPLATE_KEY_='EUC_DEV565_ATTESTATION_EMAIL_TEMPLATE';
var EUC_DEV565_ATTESTATION_SETTINGS_KEY_='EUC_DEV565_ATTESTATION_EMAIL_SETTINGS';
var EUC_DEV565_ATTESTATION_STATUS_PREFIX_='DEV565_ATTESTATION_EMAIL_';
var EUC_DEV565_ATTESTATION_VARIABLES_=['ENTREPRISE','ELEVE','CLASSE','PERIODE','DEBUT','FIN','SEMAINES','EXPEDITEUR'];

function EUC_DEV565_weeks_(value){
  var weeks=Number(value)||0;
  if([3,4,5,6].indexOf(weeks)<0)throw new Error('Choisissez un modèle de 3, 4, 5 ou 6 semaines.');
  return weeks;
}

function EUC_DEV565_email_(value){
  var parts=String(value||'').split(/[;,\s]+/),found='';
  parts.some(function(part){part=String(part||'').trim().toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)){found=part;return true}return false});
  return found;
}

function EUC_DEV565_attestationCatalog(annee){
  EUC_DEV368_admin();
  var catalog=EUC_DEV368_catalog(annee),classes=(catalog.classes||[]).filter(function(c){return['BACPRO','BTS','CAP'].indexOf(EUC_DEV368_t(c.famille).toUpperCase())>=0;});
  return{ok:true,annee:catalog.annee,classes:classes};
}

function EUC_DEV565_attestationLine_(x,target){
  x=x||{};target=target||{};
  var email=EUC_DEV565_email_(x.courrielEntreprise||x.emailEntreprise||x.courrielResponsable||x.emailResponsable||x.courrielTuteur||x.emailTuteur||x.coordonneesEntreprise||x.contactEntreprise);
  return{
    eleveId:EUC_DEV368_n(x.eleveId),
    nom:EUC_DEV368_t(x.nom),prenom:EUC_DEV368_t(x.prenom),eleve:[EUC_DEV368_t(x.nom),EUC_DEV368_t(x.prenom)].filter(Boolean).join(' '),
    classeId:EUC_DEV368_n(target.classeId),classe:EUC_DEV368_t(target.classe),famille:EUC_DEV368_t(target.famille),
    periodeId:EUC_DEV368_n(target.periode&&target.periode.id),periode:EUC_DEV368_t(target.periode&&target.periode.libelle),debut:EUC_DEV368_t(target.periode&&target.periode.debut),fin:EUC_DEV368_t(target.periode&&target.periode.fin),
    entreprise:EUC_DEV368_t(x.entreprise),adresse:EUC_DEV368_t(x.adresseEntreprise),siret:EUC_DEV368_t(x.siretEntreprise||x.siret).replace(/\D/g,''),emailEntreprise:email,
    responsable:EUC_DEV368_t(x.responsableEntreprise||x.contactEntreprise||x.nomResponsableEntreprise),telephone:EUC_DEV368_t(x.telephoneEntreprise),
    diplome:EUC_DEV368_t(x.diplome||x.formation||x.libelleDiplome),professeurPrincipal:EUC_DEV368_t(x.professeurPrincipal),
    professeurCourriel:EUC_DEV565_email_(x.courrielProfesseurPrincipal||x.emailProfesseurPrincipal||x.professeurPrincipalCourriel||x.professeurPrincipalEmail),
    responsableCourriel:EUC_DEV565_email_(x.courrielResponsable||x.emailResponsable||x.courrielEntreprise||x.emailEntreprise)
  };
}

function EUC_DEV565_attestationCandidates_(q){
  q=q||{};var weeks=EUC_DEV565_weeks_(q.weeks||3),targets=EUC_DEV368_targets(q),lines=[];
  if(!targets.length)throw new Error('Choisissez une classe et une période de PFMP.');
  targets.forEach(function(target){
    var detail=EUC_DEV374_missionDetail_(target.annee,target.famille,target.classeId,target.periode.id);
    (detail.lignes||[]).forEach(function(x){
      if(EUC_DEV374_isApprenti_(x)||!EUC_DEV374_missionEligible_(x))return;
      var line=EUC_DEV565_attestationLine_(x,target);
      if(!line.eleveId||!line.entreprise)return;
      lines.push(line);
    });
  });
  lines.sort(function(a,b){return a.eleve.localeCompare(b.eleve,'fr')});
  return{ok:true,weeks:weeks,annee:EUC_DEV368_year(q.annee),lignes:lines,total:lines.length,scope:'SCOLAIRES_UNIQUEMENT'};
}

function EUC_DEV565_attestationCandidates(q){EUC_DEV368_admin();return EUC_DEV565_attestationCandidates_(q)}

function EUC_DEV565_selectedAttestations_(q){
  q=q||{};var data=EUC_DEV565_attestationCandidates_(q),ids=Array.isArray(q.eleveIds)?q.eleveIds.map(EUC_DEV368_n).filter(Boolean):[],wanted={};
  ids.forEach(function(id){wanted[id]=true});
  var selected=ids.length?data.lignes.filter(function(line){return wanted[line.eleveId]}):data.lignes;
  if(!selected.length)throw new Error('Aucun élève scolaire éligible n’est sélectionné.');
  if(selected.length>40)throw new Error('Un lot est limité à 40 attestations.');
  return{data:data,lignes:selected};
}

function EUC_DEV565_setCellText_(cell,text,bold,size){
  var p=cell.getChild(0).asParagraph();p.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);var t=p.editAsText();t.setText(String(text==null?'':text));if(bold)t.setBold(true);if(size)t.setFontSize(size);return cell;
}

function EUC_DEV565_headerCell_(cell,text,align){
  EUC_DEV565_setCellText_(cell,text,true,8);cell.getChild(0).asParagraph().setAlignment(align||DocumentApp.HorizontalAlignment.LEFT);return cell;
}

function EUC_DEV565_appendAttestation_(body,line,weeks,addPageBreak){
  if(addPageBreak)body.appendPageBreak();
  var head=body.appendTable([['Lycée LES EUCALYPTUS\n7 Avenue des Eucalyptus\n06200 NICE','LES EUCALYPTUS\nLycée','Bureau des Entreprises\nbfe@lycee-les-eucalyptus.org']]);head.setBorderWidth(0);
  EUC_DEV565_headerCell_(head.getCell(0,0),head.getCell(0,0).getText(),DocumentApp.HorizontalAlignment.LEFT);
  EUC_DEV565_headerCell_(head.getCell(0,1),head.getCell(0,1).getText(),DocumentApp.HorizontalAlignment.CENTER);
  EUC_DEV565_headerCell_(head.getCell(0,2),head.getCell(0,2).getText(),DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('ATTESTATION DE FIN DE STAGE').setBold(true).setFontSize(14).setForegroundColor('#f36c21').setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(4).setSpacingAfter(3);
  body.appendParagraph('Période du '+(line.debut||'—')+' au '+(line.fin||'—')+' soit '+(weeks*5)+' jours').setBold(true).setFontSize(9).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(4);
  var meta=body.appendTable([[
    'Entreprise : '+(line.entreprise||'')+'\nSIRET : '+(line.siret||'')+'\n\nResponsable : '+(line.responsable||'')+'\nTél : '+(line.telephone||'')+'\nMail : '+(line.responsableCourriel||line.emailEntreprise||'')+'\n\nMerci de rectifier ou de compléter les informations',
    'Nom stagiaire : '+(line.nom||'')+'\nPrénom : '+(line.prenom||'')+'\n\nDiplôme préparé : '+(line.diplome||'')+'\nNiveau : '+(line.classe||'')
  ]]);meta.setBorderColor('#444444');try{meta.getRow(0).setMinimumHeight(82)}catch(e){}
  EUC_DEV565_setCellText_(meta.getCell(0,0),meta.getCell(0,0).getText(),false,8);EUC_DEV565_setCellText_(meta.getCell(0,1),meta.getCell(0,1).getText(),false,8);
  var ref=['Toute absence doit être signalée immédiatement auprès du professeur référent',line.professeurPrincipal,line.professeurCourriel].filter(Boolean).join(' — ');
  body.appendParagraph(ref).setBold(true).setFontSize(8).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(4).setSpacingAfter(4);
  var rows=[];
  for(var w=1;w<=weeks;w++){
    rows.push(['Semaine '+w,'Émargement élève','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Signature du tuteur']);
    rows.push(['','Matin','','','','','','']);
    rows.push(['','Après-midi','','','','','','']);
  }
  var table=body.appendTable(rows);table.setBorderColor('#555555');
  for(var rr=0;rr<table.getNumRows();rr++){
    var header=rr%3===0;try{table.getRow(rr).setMinimumHeight(header?15:19)}catch(e2){}
    for(var cc=0;cc<table.getRow(rr).getNumCells();cc++){
      var cell=table.getCell(rr,cc);try{cell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(1).setPaddingRight(1).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER)}catch(e3){}
      EUC_DEV565_setCellText_(cell,cell.getText(),header||cc<2,header?6:6);cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  }
  var certText='À compléter par le chef d’entreprise ou son représentant\n\nJe soussigné(e), ............................................................, atteste que l’élève '+line.eleve+' a effectué un stage de '+(weeks*5)+' jours du '+(line.debut||'—')+' au '+(line.fin||'—')+'.\n\nFait à .................................................... le .......... / .......... / ..........';
  var sig=body.appendTable([[certText,'Signature et cachet de l’entreprise']]);sig.setBorderColor('#555555');try{sig.getRow(0).setMinimumHeight(62)}catch(e4){}
  EUC_DEV565_setCellText_(sig.getCell(0,0),sig.getCell(0,0).getText(),false,7);EUC_DEV565_setCellText_(sig.getCell(0,1),sig.getCell(0,1).getText(),true,7);sig.getCell(0,1).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
}

function EUC_DEV565_buildPdf_(lines,weeks,title){
  var doc=DocumentApp.create(title),body=doc.getBody();try{body.setMarginTop(24).setMarginBottom(24).setMarginLeft(24).setMarginRight(24)}catch(e){}
  lines.forEach(function(line,index){EUC_DEV565_appendAttestation_(body,line,weeks,index>0)});doc.saveAndClose();
  var file=DriveApp.getFileById(doc.getId()),blob=file.getAs(MimeType.PDF).setName(title+'.pdf'),result={ok:true,name:title+'.pdf',mime:'application/pdf',base64:Utilities.base64Encode(blob.getBytes())};file.setTrashed(true);return result;
}

function EUC_DEV565_pdfAttestations(q){
  EUC_DEV368_admin();var selected=EUC_DEV565_selectedAttestations_(q),first=selected.lignes[0],safe=(first.classe+'_'+first.periode+'_'+selected.data.weeks+'sem').replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_');
  return EUC_DEV565_buildPdf_(selected.lignes,selected.data.weeks,'Attestations_PFMP_'+safe);
}

function EUC_DEV565_defaultEmailTemplate_(){return{subject:'[PFMP] Attestation de stage — {{ELEVE}} — {{CLASSE}}',body:'Bonjour,\n\nVous trouverez en pièce jointe l’attestation d’émargement de {{ELEVE}}, élève de {{CLASSE}}, accueilli(e) dans votre entreprise pour la période {{PERIODE}} ({{DEBUT}} au {{FIN}}).\n\nLe document correspond au modèle de {{SEMAINES}} semaines. Merci de le compléter, de le signer et d’y apposer le cachet de l’entreprise.\n\nSincères salutations,\n\n{{EXPEDITEUR}}'};}
function EUC_DEV565_defaultEmailSettings_(){return{expediteur:'Bureau des entreprises',cc:'bfe@lycee-les-eucalyptus.org'};}
function EUC_DEV565_validateEmailTemplate_(value){
  value=value||{};var subject=EUC_DEV368_t(value.subject),body=String(value.body==null?'':value.body).trim();if(!subject||!body)throw new Error('L’objet et le message sont obligatoires.');if(subject.length>250||body.length>10000)throw new Error('Le modèle de courriel est trop long.');
  var allowed={};EUC_DEV565_ATTESTATION_VARIABLES_.forEach(function(x){allowed[x]=true});var unknown=[],match,re=/\{\{([A-Z_]+)\}\}/g,text=subject+'\n'+body;while((match=re.exec(text)))if(!allowed[match[1]]&&unknown.indexOf(match[1])<0)unknown.push(match[1]);if(unknown.length)throw new Error('Variable(s) inconnue(s) : '+unknown.join(', ')+'.');return{subject:subject,body:body};
}
function EUC_DEV565_validateEmailSettings_(value){value=value||{};var d=EUC_DEV565_defaultEmailSettings_(),expediteur=EUC_DEV368_t(value.expediteur)||d.expediteur,cc=EUC_DEV565_email_(value.cc)||d.cc;if(expediteur.length>160)throw new Error('La signature est trop longue.');return{expediteur:expediteur,cc:cc};}
function EUC_DEV565_emailConfig_(){var props=PropertiesService.getScriptProperties(),tpl=EUC_DEV565_defaultEmailTemplate_(),settings=EUC_DEV565_defaultEmailSettings_();try{var a=props.getProperty(EUC_DEV565_ATTESTATION_TEMPLATE_KEY_);if(a)tpl=EUC_DEV565_validateEmailTemplate_(JSON.parse(a));}catch(e){}try{var b=props.getProperty(EUC_DEV565_ATTESTATION_SETTINGS_KEY_);if(b)settings=EUC_DEV565_validateEmailSettings_(JSON.parse(b));}catch(e2){}return{template:tpl,settings:settings};}
function EUC_DEV565_listAttestationEmailTemplate(){EUC_DEV368_admin();var cfg=EUC_DEV565_emailConfig_();return{ok:true,template:cfg.template,settings:cfg.settings,variables:EUC_DEV565_ATTESTATION_VARIABLES_.slice()};}
function EUC_DEV565_saveAttestationEmailTemplate(q){EUC_DEV368_admin();q=q||{};var tpl=EUC_DEV565_validateEmailTemplate_(q.template),settings=EUC_DEV565_validateEmailSettings_(q.settings),props=PropertiesService.getScriptProperties();props.setProperty(EUC_DEV565_ATTESTATION_TEMPLATE_KEY_,JSON.stringify(tpl));props.setProperty(EUC_DEV565_ATTESTATION_SETTINGS_KEY_,JSON.stringify(settings));return EUC_DEV565_listAttestationEmailTemplate();}
function EUC_DEV565_resetAttestationEmailTemplate(){EUC_DEV368_admin();var props=PropertiesService.getScriptProperties();props.deleteProperty(EUC_DEV565_ATTESTATION_TEMPLATE_KEY_);props.deleteProperty(EUC_DEV565_ATTESTATION_SETTINGS_KEY_);return EUC_DEV565_listAttestationEmailTemplate();}
function EUC_DEV565_render_(text,values){return String(text||'').replace(/\{\{([A-Z_]+)\}\}/g,function(all,key){return Object.prototype.hasOwnProperty.call(values,key)?String(values[key]||''):all});}
function EUC_DEV565_mailValues_(line,weeks,settings){return{ENTREPRISE:line.entreprise,ELEVE:line.eleve,CLASSE:line.classe,PERIODE:line.periode,DEBUT:line.debut,FIN:line.fin,SEMAINES:weeks,EXPEDITEUR:settings.expediteur};}
function EUC_DEV565_prepareAttestationEmails(q){
  EUC_DEV368_admin();var selected=EUC_DEV565_selectedAttestations_(q),cfg=EUC_DEV565_emailConfig_(),groups={};
  selected.lignes.forEach(function(line){var email=EUC_DEV565_email_(line.emailEntreprise);if(!email)return;var key=email;if(!groups[key])groups[key]={to:email,cc:cfg.settings.cc,entreprise:line.entreprise,eleves:[],lines:[]};groups[key].eleves.push({eleveId:line.eleveId,eleve:line.eleve});groups[key].lines.push(line);});
  var prepared=Object.keys(groups).map(function(k){var group=groups[k],first=group.lines[0],values=EUC_DEV565_mailValues_(first,selected.data.weeks,cfg.settings);values.ELEVE=group.lines.map(function(line){return line.eleve}).join(', ');values.CLASSE=group.lines.map(function(line){return line.classe}).filter(function(value,index,list){return list.indexOf(value)===index}).join(', ');group.subject=EUC_DEV565_render_(cfg.template.subject,values);group.body=EUC_DEV565_render_(cfg.template.body,values);delete group.lines;return group});return{ok:true,groups:prepared,withoutEmail:selected.lignes.filter(function(line){return!EUC_DEV565_email_(line.emailEntreprise)}).map(function(line){return{eleveId:line.eleveId,eleve:line.eleve,entreprise:line.entreprise}}),selected:selected.lignes.length};
}

function EUC_DEV565_emailStatus_(requestId){try{var raw=CacheService.getScriptCache().get(EUC_DEV565_ATTESTATION_STATUS_PREFIX_+requestId);return raw?JSON.parse(raw):{state:'UNKNOWN'}}catch(e){return{state:'UNKNOWN'}}}
function EUC_DEV565_storeEmailStatus_(requestId,state,details){var value=Object.assign({state:state,updatedAt:new Date().toISOString()},details||{});try{CacheService.getScriptCache().put(EUC_DEV565_ATTESTATION_STATUS_PREFIX_+requestId,JSON.stringify(value),21600)}catch(e){}return value;}
function EUC_DEV565_getAttestationEmailStatus(q){EUC_DEV368_admin();return EUC_DEV565_emailStatus_(EUC_DEV492_missionEmailRequestId_(q&&q.requestId));}

function EUC_DEV565_sendAttestationEmails(q){
  q=q||{};EUC_DEV368_admin();EUC_DEV492_assertMissionEmailChannel_();if(q.confirmed!==true)throw new Error('La confirmation explicite de l’envoi est obligatoire.');
  var requestId=EUC_DEV492_missionEmailRequestId_(q.requestId),previous=EUC_DEV565_emailStatus_(requestId);if(previous.state==='SENT')return{ok:true,recovered:true,requestId:requestId,sent:previous.sent||0};
  var selected=EUC_DEV565_selectedAttestations_(q),preview=EUC_DEV565_prepareAttestationEmails(q),byId={},lock=LockService.getScriptLock(),locked=false,sent=0;
  selected.lignes.forEach(function(line){byId[line.eleveId]=line});if(preview.withoutEmail.length)throw new Error('Certaines entreprises n’ont pas d’adresse électronique valide. Corrigez-les ou retirez ces élèves du lot.');
  try{
    EUC_DEV565_storeEmailStatus_(requestId,'PREPARING');lock.waitLock(10000);locked=true;var again=EUC_DEV565_emailStatus_(requestId);if(again.state==='SENT')return{ok:true,recovered:true,requestId:requestId,sent:again.sent||0};
    var quota=Number(MailApp.getRemainingDailyQuota()),needed=preview.groups.length;if(isFinite(quota)&&quota<needed)throw new Error('Quota quotidien de courriels insuffisant pour ce lot.');
    preview.groups.forEach(function(group){
      var attachments=[];group.eleves.forEach(function(student){var line=byId[student.eleveId],safe=(line.eleve+'_'+line.classe).replace(/[^A-Za-z0-9À-ÿ_-]+/g,'_'),pdf=EUC_DEV565_buildPdf_([line],selected.data.weeks,'Attestation_PFMP_'+safe);attachments.push(Utilities.newBlob(Utilities.base64Decode(pdf.base64),pdf.mime,pdf.name));});
      EUC_DEV565_storeEmailStatus_(requestId,'SENDING',{sent:sent,total:preview.groups.length});var options={to:group.to,cc:group.cc,subject:group.subject,body:group.body,name:'PFMP — Lycée Les Eucalyptus',attachments:attachments};MailApp.sendEmail(options);sent++;
    });
    EUC_DEV565_storeEmailStatus_(requestId,'SENT',{sent:sent,sentAt:new Date().toISOString()});
  }catch(error){EUC_DEV565_storeEmailStatus_(requestId,'ERROR',{sent:sent,message:String(error&&error.message||error).slice(0,500)});throw error;}finally{if(locked)lock.releaseLock()}
  return{ok:true,requestId:requestId,sent:sent,sentAt:new Date().toISOString()};
}

function EUC_DEV565_afficherAttestations(e){
  EUC_DEV368_admin();var t=HtmlService.createTemplateFromFile('Attestations_Stage_DEV565'),p=e&&e.parameter||{},b=EUC_DEV526_bootMissions_(p);b.params={annee:EUC_DEV368_t(p.annee),famille:EUC_DEV368_t(p.famille),classe:EUC_DEV368_t(p.classe),periode:EUC_DEV368_t(p.periode)};t.bootJson=JSON.stringify(b);return t.evaluate().setTitle('Attestations de stage PFMP').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
