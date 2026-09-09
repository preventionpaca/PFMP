/** Eucalyptus PFMP — v1.0.0-dev.92 — génération DOCX native depuis modèle Word maître stocké dans Drive. */
var EUC_DOCX_TEMPLATE_PROP_='EUC_PFMP_DOCX_TEMPLATE_ID';
var EUC_DOCX_ROOT_FOLDER_='Eucalyptus PFMP';
var EUC_DOCX_MODEL_FOLDER_='Modeles';
var EUC_DOCX_OUTPUT_FOLDER_='Conventions';
var EUC_DOCX_TEMPLATE_NAME_='Convention_PFMP_MODELE.docx';
var EUC_DOCX_MIME_='application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function EUC_DOCX_exigerAdmin_(){var ctx=EUC_PFMP_contexteAdmin_();if(!ctx||!ctx.autorise)throw new Error('Accès administrateur requis.');return ctx;}
function EUC_DOCX_folder_(parent,name){var it=parent.getFoldersByName(name);return it.hasNext()?it.next():parent.createFolder(name);}
function EUC_DOCX_root_(){return EUC_DOCX_folder_(DriveApp.getRootFolder(),EUC_DOCX_ROOT_FOLDER_);}
function EUC_DOCX_modelFolder_(){return EUC_DOCX_folder_(EUC_DOCX_root_(),EUC_DOCX_MODEL_FOLDER_);}
function EUC_DOCX_outputRoot_(){return EUC_DOCX_folder_(EUC_DOCX_root_(),EUC_DOCX_OUTPUT_FOLDER_);}
function EUC_DOCX_safeName_(v){return String(v||'').trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').substring(0,90)||'Sans_nom';}
function EUC_DOCX_fileByProp_(){var id=PropertiesService.getScriptProperties().getProperty(EUC_DOCX_TEMPLATE_PROP_);if(!id)return null;try{var f=DriveApp.getFileById(id);return f.isTrashed()?null:f;}catch(e){return null;}}
function EUC_DOCX_modeleInfo(){
  EUC_DOCX_exigerAdmin_();var f=EUC_DOCX_fileByProp_(),base='Mon Drive / '+EUC_DOCX_ROOT_FOLDER_+' / '+EUC_DOCX_MODEL_FOLDER_;
  if(!f)return {configure:false,emplacement:base,nom:'',url:'',id:''};
  return {configure:true,id:f.getId(),nom:f.getName(),url:f.getUrl(),taille:f.getSize(),maj:f.getLastUpdated().toISOString(),emplacement:base+' / '+f.getName()};
}
function EUC_DOCX_importerModele(payload){
  EUC_DOCX_exigerAdmin_();payload=payload||{};var name=EUC_DOCX_safeName_(payload.nom||EUC_DOCX_TEMPLATE_NAME_);if(!/\.docx$/i.test(name))name+='.docx';
  var b64=String(payload.base64||'').replace(/^data:[^,]+,/, '');if(!b64)throw new Error('Fichier Word manquant.');var bytes=Utilities.base64Decode(b64);
  if(bytes.length<1000)throw new Error('Le fichier DOCX paraît vide ou invalide.');if(bytes.length>5*1024*1024)throw new Error('Le modèle DOCX dépasse 5 Mo.');
  var folder=EUC_DOCX_modelFolder_(),old=EUC_DOCX_fileByProp_();if(old){try{old.setName('ARCHIVE_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Europe/Paris','yyyyMMdd_HHmmss')+'_'+old.getName());}catch(e){}}
  var f=folder.createFile(Utilities.newBlob(bytes,EUC_DOCX_MIME_,name));PropertiesService.getScriptProperties().setProperty(EUC_DOCX_TEMPLATE_PROP_,f.getId());return EUC_DOCX_modeleInfo();
}
function EUC_DOCX_xmlEscape_(v){return String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function EUC_DOCX_replaceAll_(text,map){Object.keys(map).forEach(function(k){text=text.split(k).join(EUC_DOCX_xmlEscape_(map[k]));});return text;}
function EUC_DOCX_qrBlob_(url){var q='https://quickchart.io/qr?size=300&margin=1&text='+encodeURIComponent(String(url||''));var r=UrlFetchApp.fetch(q,{muteHttpExceptions:true,followRedirects:true});if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error('Impossible de générer le QR code ('+r.getResponseCode()+').');return r.getBlob().setName('word/media/image1.png');}
function EUC_DOCX_destination_(data){var y=EUC_DOCX_folder_(EUC_DOCX_outputRoot_(),EUC_DOCX_safeName_(data.annee||'Annee'));return EUC_DOCX_folder_(y,EUC_DOCX_safeName_(data.classe||'Classe'));}
function EUC_DOCX_map_(data){return {
  '{{DATE_DEBUT}}':data.debutCourt||data.debut||'','{{DATE_FIN}}':data.finCourt||data.fin||'','{{JOURS}}':data.jours||0,'{{CLASSE}}':data.classe||'',
  '{{NOM_ELEVE}}':data.eleve.nom||'','{{PRENOM_ELEVE}}':data.eleve.prenom||'','{{DATE_NAISSANCE}}':data.eleve.dateNaissance||'','{{ADRESSE_ELEVE}}':data.eleve.adresse||'','{{CP_VILLE_ELEVE}}':[data.eleve.codePostal||'',data.eleve.ville||''].join(' ').trim(),'{{TEL_ELEVE}}':data.eleve.telephone||'','{{EMAIL_ELEVE}}':data.eleve.courriel||'','{{DIPLOME}}':data.diplome||data.eleve.formation||'',
  '{{ETABLISSEMENT}}':data.etablissement.libelle||'','{{ADRESSE_ETABLISSEMENT}}':data.etablissement.adresse||'','{{TEL_ETABLISSEMENT}}':data.etablissement.telephone||'','{{PROVISEUR}}':data.etablissement.proviseur||'','{{FONCTION_PROVISEUR}}':data.etablissement.fonctionProviseur||'','{{EMAIL_ETABLISSEMENT}}':data.etablissement.email||'','{{PROF_REFERENT}}':data.professeurReferent||'','{{EMAIL_PROF}}':data.professeurReferentEmail||'','{{REFERENCE}}':data.reference||''
};}
function EUC_DOCX_genererDepuisToken(token){
  EUC_DOCX_exigerAdmin_();token=String(token||'').trim();if(!token)throw new Error('Jeton de convention manquant.');var tpl=EUC_DOCX_fileByProp_();if(!tpl)throw new Error('Aucun modèle Word actif. Ouvrez « Paramètres de la convention » et installez le modèle DOCX maître.');
  var data=EUC_CONVENTION_donneesImpressionV80(token),map=EUC_DOCX_map_(data),parts=Utilities.unzip(tpl.getBlob()),out=[],foundDoc=false,foundQr=false,qr=EUC_DOCX_qrBlob_(data.formUrl);
  parts.forEach(function(b){var n=b.getName();if(n==='word/document.xml'){foundDoc=true;out.push(Utilities.newBlob(EUC_DOCX_replaceAll_(b.getDataAsString('UTF-8'),map),'application/xml',n));}else if(n==='word/media/image1.png'){foundQr=true;out.push(qr);}else out.push(b);});
  if(!foundDoc)throw new Error('Modèle DOCX invalide : word/document.xml introuvable.');if(!foundQr)throw new Error('Modèle DOCX invalide : emplacement QR introuvable.');
  var filename='Convention_'+EUC_DOCX_safeName_(data.eleve.nom)+'_'+EUC_DOCX_safeName_(data.eleve.prenom)+'_'+EUC_DOCX_safeName_(data.reference)+'.docx',folder=EUC_DOCX_destination_(data),old=folder.getFilesByName(filename);while(old.hasNext())old.next().setTrashed(true);
  var zipBlob=Utilities.zip(out,'archive.zip');
  var docxBlob=Utilities.newBlob(zipBlob.getBytes(),EUC_DOCX_MIME_,filename);
  var f=folder.createFile(docxBlob);
  return {ok:true,id:f.getId(),nom:f.getName(),url:f.getUrl(),folderUrl:folder.getUrl(),emplacement:'Mon Drive / '+EUC_DOCX_ROOT_FOLDER_+' / '+EUC_DOCX_OUTPUT_FOLDER_+' / '+EUC_DOCX_safeName_(data.annee)+' / '+EUC_DOCX_safeName_(data.classe),reference:data.reference};
}
function EUC_DOCX_genererLot(tokens){EUC_DOCX_exigerAdmin_();tokens=(tokens||[]).map(String).filter(Boolean);if(!tokens.length)throw new Error('Aucune convention à générer.');if(tokens.length>80)throw new Error('Lot trop important : maximum 80 conventions par génération.');var items=tokens.map(function(t){return EUC_DOCX_genererDepuisToken(t);});return {ok:true,total:items.length,items:items,folderUrl:items[0]&&items[0].folderUrl||''};}
