/**
 * DEV566 — import Yparéo des apprentis et futurs apprentis.
 *
 * Le fichier est analysé dans le navigateur puis envoyé sous forme de lignes.
 * Le serveur ne rapproche que des classes exactes et ne déduit jamais une
 * classe C depuis une classe G. L'écriture est verrouillée en DRY_RUN tant que
 * la propriété EUC_DEV566_YPAREO_IMPORT_MODE ne vaut pas exactement LIVE.
 */
var EUC_DEV566_YPAREO_MODE_KEY_='EUC_DEV566_YPAREO_IMPORT_MODE';
var EUC_DEV566_YPAREO_MAPPINGS_KEY_='EUC_DEV566_YPAREO_MAPPINGS';
var EUC_DEV566_YPAREO_REQUEST_PREFIX_='EUC_DEV566_YPAREO_REQUEST_';
var EUC_DEV566_YPAREO_ALLOWED_=['TPMMA','TPEEB','TSEC','CQPM'];

function EUC_DEV566_t_(value){return String(value==null?'':value).trim();}
function EUC_DEV566_n_(value){var n=Number(value);return isFinite(n)?n:0;}
function EUC_DEV566_norm_(value){return EUC_DEV566_t_(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();}
function EUC_DEV566_key_(value){return EUC_DEV566_norm_(value).replace(/\s+/g,'');}
function EUC_DEV566_pick_(row,names){row=row||{};var byKey={};Object.keys(row).forEach(function(key){byKey[EUC_DEV566_key_(key)]=row[key];});for(var i=0;i<names.length;i++){var value=byKey[EUC_DEV566_key_(names[i])];if(value!==undefined&&EUC_DEV566_t_(value)!=='')return value;}return'';}
function EUC_DEV566_date_(value){
  var text=EUC_DEV566_t_(value),m;if(!text)return'';
  if((m=text.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[1]+'-'+m[2]+'-'+m[3];
  if((m=text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)))return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return'';
}
function EUC_DEV566_defaultMappings_(){return[
  {source:'TPMMA',classe:'TPMMA'},
  {source:'TPEEB',classe:'TPEEB'},
  {source:'TSEC',classe:'TSEC'},
  {source:'CQPM',classe:'CQPM ASC'}
];}
function EUC_DEV566_validateMappings_(value){
  var out=[],seen={};(Array.isArray(value)?value:[]).forEach(function(item){var source=EUC_DEV566_norm_(item&&item.source),classe=EUC_DEV566_t_(item&&item.classe);if(!source||!classe||seen[source])return;seen[source]=true;out.push({source:source,classe:classe});});
  if(!out.length)throw new Error('La table de correspondance Yparéo est vide.');return out;
}
function EUC_DEV566_mappings_(){var raw='';try{raw=PropertiesService.getScriptProperties().getProperty(EUC_DEV566_YPAREO_MAPPINGS_KEY_)||'';}catch(e){}if(raw)try{return EUC_DEV566_validateMappings_(JSON.parse(raw));}catch(e2){}return EUC_DEV566_defaultMappings_();}
function EUC_DEV566_mode_(){try{return PropertiesService.getScriptProperties().getProperty(EUC_DEV566_YPAREO_MODE_KEY_)==='LIVE'?'LIVE':'DRY_RUN';}catch(e){return'DRY_RUN';}}
function EUC_DEV566_classes_(){
  var rows=[];try{rows=EUC_IMPORT_chargerClassesCamin_()||[];}catch(e){rows=[];}
  /* DEV578 : un même nom peut exister deux fois (ex. « 1MELEC G » du LP et « 1MELEC G » du GRETA, formation
   * continue). Plutôt que d'en choisir une d'office, les homonymes sont distingués par leur établissement :
   * « 1MELEC G (GRETA) » / « 1MELEC G (LP) » — et par leur numéro si l'établissement ne suffit pas.
   * Les classes au nom unique gardent leur libellé : les correspondances déjà enregistrées restent valables. */
  var liste=rows.map(function(row){return{id:EUC_DEV564_classId_(row),classe:EUC_DEV564_classLabel_(row),etab:String(row.etab||'').trim(),actif:row.actif!==false};}).filter(function(row){return row.id&&row.classe&&row.actif;}),compte={},compteEtab={};
  liste.forEach(function(r){var k=EUC_DEV566_key_(r.classe);compte[k]=(compte[k]||0)+1;var ke=k+'|'+r.etab.toUpperCase();compteEtab[ke]=(compteEtab[ke]||0)+1;});
  liste.forEach(function(r){var k=EUC_DEV566_key_(r.classe);if(compte[k]<2)return;r.classe=r.classe+(r.etab&&compteEtab[k+'|'+r.etab.toUpperCase()]<2?' ('+r.etab+')':' (n° '+r.id+')');});
  return liste.map(function(r){return{id:r.id,classe:r.classe,actif:true};}).sort(function(a,b){return a.classe.localeCompare(b.classe,'fr');});
}
function EUC_DEV566_importConfig(){EUC_DEV368_admin();return{ok:true,mode:EUC_DEV566_mode_(),mappings:EUC_DEV566_mappings_(),classes:EUC_DEV566_classes_(),niveau:'AUTRES_FORMATIONS',formats:['csv','xls','xlsx']};}
function EUC_DEV566_saveMappings(q){EUC_DEV368_admin();var mappings=EUC_DEV566_validateMappings_(q&&q.mappings);var classes={},unknown=[];EUC_DEV566_classes_().forEach(function(row){classes[EUC_DEV566_key_(row.classe)]=true;});mappings.forEach(function(row){if(!classes[EUC_DEV566_key_(row.classe)])unknown.push(row.classe);});if(unknown.length)throw new Error('Classe(s) cible(s) introuvable(s) : '+unknown.join(', ')+'.');PropertiesService.getScriptProperties().setProperty(EUC_DEV566_YPAREO_MAPPINGS_KEY_,JSON.stringify(mappings));return EUC_DEV566_importConfig();}

function EUC_DEV566_groupCode_(group,mappings){var key=EUC_DEV566_norm_(group),matches=[];(mappings||[]).forEach(function(row){if(key.indexOf(EUC_DEV566_norm_(row.source))>=0)matches.push(row);});return matches.length===1?matches[0]:null;}
function EUC_DEV566_line_(row,index,mappings,classByName){
  var group=EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_GROUPE_APPRENANT','GROUPE','CLASSE'])),mapping=EUC_DEV566_groupCode_(group,mappings),status=EUC_DEV566_norm_(EUC_DEV566_pick_(row,['STATUT_APPRENANT','STATUT'])),nom=EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_APPRENANT','NOM'])),prenom=EUC_DEV566_t_(EUC_DEV566_pick_(row,['PRENOM_APPRENANT','PRENOM'])),ine=EUC_DEV566_t_(EUC_DEV566_pick_(row,['INE_APPRENANT','NUMERO_NATIONAL','INE'])),birth=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_NAISSANCE_APPRENANT','DATE_NAISSANCE'])),siret=EUC_DEV566_t_(EUC_DEV566_pick_(row,['SIRET_ENTREPRISE','SIRET'])).replace(/\D/g,''),classe=mapping&&classByName[EUC_DEV566_key_(mapping.classe)],issues=[];
  if(!nom||!prenom)issues.push('Nom ou prénom manquant');if(!mapping)issues.push('Groupe Yparéo sans correspondance unique');if(mapping&&!classe)issues.push('Classe cible absente du référentiel');
  var future=/SANS ENTREPRISE|FUTUR/.test(status),apprentice=/APPRENTI/.test(status)&&!future;
  if(!future&&!apprentice)issues.push('Statut Yparéo non reconnu');if(apprentice&&siret.length!==14)issues.push('SIRET entreprise absent ou invalide');
  var debut=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_DEB_CONTRAT','DATE_DEBUT_CONTRAT','DEBUT_CONTRAT','DATE_DEBUT'])),fin=EUC_DEV566_date_(EUC_DEV566_pick_(row,['DATE_FIN_CONTRAT','FIN_CONTRAT','DATE_FIN']));if(apprentice&&(!debut||!fin))issues.push('Dates de contrat incomplètes');
  var adresse=['ADR1_ENTREPRISE','ADR2_ENTREPRISE','ADR3_ENTREPRISE','ADR4_ENTREPRISE'].map(function(name){return EUC_DEV566_t_(EUC_DEV566_pick_(row,[name]));}).filter(Boolean).join(' '),ma=[EUC_DEV566_t_(EUC_DEV566_pick_(row,['PRENOM_MA'])),EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_MA']))].filter(Boolean).join(' ');
  return{index:index,group:group,source:mapping&&mapping.source||'',classeId:classe&&classe.id||0,classe:classe&&classe.classe||mapping&&mapping.classe||'',nom:nom,prenom:prenom,ine:ine,dateNaissance:birth,statusSource:status,kind:future?'FUTUR_APPRENTI':(apprentice?'APPRENTI':'INCONNU'),issues:issues,siret:siret,debut:debut,fin:fin,nomEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_ENTREPRISE','RAISON_SOCIALE_ENTREPRISE'])),nomCommercial:EUC_DEV566_t_(EUC_DEV566_pick_(row,['NOM_COMMERCIAL_ENTREPRISE','ENSEIGNE_ENTREPRISE'])),adresse:adresse||EUC_DEV566_t_(EUC_DEV566_pick_(row,['ADRESSE_ENTREPRISE','ADRESSE'])),cp:EUC_DEV566_t_(EUC_DEV566_pick_(row,['CP_ENTREPRISE','CODE_POSTAL_ENTREPRISE','CODE_POSTAL'])),ville:EUC_DEV566_t_(EUC_DEV566_pick_(row,['VILLE_ENTREPRISE','VILLE'])),telEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['PORTABLE_ENTREPRISE','TEL_ENTREPRISE','TELEPHONE_ENTREPRISE'])),mailEntreprise:EUC_DEV566_t_(EUC_DEV566_pick_(row,['EMAIL_ENTREPRISE','MAIL_ENTREPRISE'])),responsableEntreprise:ma||EUC_DEV566_t_(EUC_DEV566_pick_(row,['MAITRE_APPRENTISSAGE','RESPONSABLE_ENTREPRISE'])),tuteur:ma||EUC_DEV566_t_(EUC_DEV566_pick_(row,['MAITRE_APPRENTISSAGE','TUTEUR'])),telTuteur:EUC_DEV566_t_(EUC_DEV566_pick_(row,['PORTABLE_MA','TEL_MAITRE_APPRENTISSAGE','TELEPHONE_TUTEUR'])),mailTuteur:EUC_DEV566_t_(EUC_DEV566_pick_(row,['EMAIL_MA','MAIL_MAITRE_APPRENTISSAGE','EMAIL_TUTEUR']))};
}
function EUC_DEV566_existingStudents_(anneeId){var out={ine:{},identity:{}};try{(EUC_IMPORT_lireRecordsBruts_('EUC_ELEVES_PFMP')||[]).forEach(function(record){var f=record.fields||record;if(Number(f.Annee_scolaire)!==Number(anneeId)||f.Actif===false)return;var ine=EUC_DEV566_key_(f.Numero_national),birth='';try{birth=EUC_SUIVI_dateISO_(f.Date_naissance)||'';}catch(e){birth=EUC_DEV566_date_(f.Date_naissance);}var identity=EUC_DEV566_key_(f.Nom)+'|'+EUC_DEV566_key_(f.Prenom_usage||f.Prenom)+'|'+birth;if(ine)out.ine[ine]=(out.ine[ine]||[]).concat([record]);out.identity[identity]=(out.identity[identity]||[]).concat([record]);});}catch(e2){}return out;}
function EUC_DEV566_analyze_(q){
  q=q||{};var year=EUC_DEV368_year(q.annee),rows=Array.isArray(q.rows)?q.rows:[];if(!rows.length)throw new Error('Le fichier Yparéo ne contient aucune ligne.');if(rows.length>1000)throw new Error('Un import est limité à 1 000 lignes.');var mappings=EUC_DEV566_validateMappings_(q.mappings||EUC_DEV566_mappings_()),classByName={};EUC_DEV566_classes_().forEach(function(row){classByName[EUC_DEV566_key_(row.classe)]=row;});var yearRow=EUC_IMPORT_lireAnnee_(year),existing=EUC_DEV566_existingStudents_(yearRow.id),lines=rows.map(function(row,index){var line=EUC_DEV566_line_(row,index+1,mappings,classByName),matches=line.ine?existing.ine[EUC_DEV566_key_(line.ine)]||[]:existing.identity[EUC_DEV566_key_(line.nom)+'|'+EUC_DEV566_key_(line.prenom)+'|'+line.dateNaissance]||[];if(matches.length>1)line.issues.push('Élève existant ambigu');if(matches.length===1){line.eleveId=EUC_DEV566_n_(matches[0].id);line.action='METTRE_A_JOUR';}else line.action='CREER';line.ready=!line.issues.length;return line;});return{ok:true,mode:EUC_DEV566_mode_(),annee:year,niveau:'AUTRES_FORMATIONS',lines:lines,total:lines.length,ready:lines.filter(function(line){return line.ready}).length,blocked:lines.filter(function(line){return!line.ready}).length,scope:'YPAREO_APPRENTISSAGE'};
}
function EUC_DEV566_analyze(q){EUC_DEV368_admin();return EUC_DEV566_analyze_(q);}
function EUC_DEV566_createStudent_(line,yearRow,lot){var now=EUC_IMPORT_nowGrist_(),birth=EUC_IMPORT_dateGrist_(line.dateNaissance),key='YPAREO|'+(line.ine||[EUC_DEV566_key_(line.nom),EUC_DEV566_key_(line.prenom),line.dateNaissance].join('|')),fields={Identifiant_import:key,Numero_national:line.ine||'',Nom:line.nom,Prenom:line.prenom,Prenom_usage:line.prenom,Date_naissance:birth,Classe:line.classeId,Code_classe_importe:line.classe,Annee_scolaire:yearRow.id,Source_Pronote:'YPAREO',Source_import:'YPAREO',Cle_rapprochement:key,Cle_inscription_annuelle:yearRow.id+'|'+key,Statut_rapprochement:'RAPPROCHE',Statut_scolarite:'ACTIF',Date_derniere_presence_import:now,Present_dernier_import:true,Actif:true,Date_creation:now,Date_modification:now,Identifiant_lot_import:lot,Numero_version:1};var result=EUC_ENT_grist('post','/tables/EUC_ELEVES_PFMP/records',{records:[{fields:fields}]});return EUC_DEV566_n_(result&&result.records&&result.records[0]&&result.records[0].id);}
function EUC_DEV566_updateStudentClass_(eleveId,line,lot){
  EUC_ENT_grist('patch','/tables/EUC_ELEVES_PFMP/records',{records:[{id:EUC_DEV566_n_(eleveId),fields:{Classe:line.classeId,Code_classe_importe:line.classe,Source_import:'YPAREO',Date_derniere_presence_import:EUC_IMPORT_nowGrist_(),Present_dernier_import:true,Actif:true,Date_modification:EUC_IMPORT_nowGrist_(),Identifiant_lot_import:lot}}]});
}
function EUC_DEV566_import(q){
  q=q||{};EUC_DEV368_admin();if(EUC_DEV566_mode_()!=='LIVE')throw new Error('Import Yparéo désactivé : prévisualisation uniquement (DRY_RUN).');if(q.confirmed!==true)throw new Error('La confirmation explicite de l’import est obligatoire.');var requestId=EUC_DEV566_key_(q.requestId);if(requestId.length<12)throw new Error('Identifiant de requête invalide.');var cache=CacheService.getScriptCache(),cacheKey=EUC_DEV566_YPAREO_REQUEST_PREFIX_+requestId;if(cache.get(cacheKey))return{ok:true,duplicate:true};var analysis=EUC_DEV566_analyze_(q);if(analysis.blocked)throw new Error(analysis.blocked+' ligne(s) doivent être corrigées avant import.');var yearRow=EUC_IMPORT_lireAnnee_(analysis.annee),created=0,updated=0,lot='YPAREO-'+new Date().toISOString();analysis.lines.forEach(function(line){var eleveId=line.eleveId;if(!eleveId){eleveId=EUC_DEV566_createStudent_(line,yearRow,lot);created++;}else{EUC_DEV566_updateStudentClass_(eleveId,line,lot);updated++;}if(!eleveId)throw new Error('Création de l’élève impossible.');EUC_DEV449_saveApprenti({eleveId:eleveId,classeId:line.classeId,annee:analysis.annee,nouveauContrat:line.kind==='APPRENTI',futurApprenti:line.kind==='FUTUR_APPRENTI',dateContrat:line.debut,debut:line.debut,fin:line.fin,siret:line.siret,nomEntreprise:line.nomEntreprise,nomCommercial:line.nomCommercial,adresse:line.adresse,cp:line.cp,ville:line.ville,telEntreprise:line.telEntreprise,mailEntreprise:line.mailEntreprise,responsableEntreprise:line.responsableEntreprise,tuteur:line.tuteur,telTuteur:line.telTuteur,mailTuteur:line.mailTuteur});});cache.put(cacheKey,'1',21600);return{ok:true,created:created,updated:updated,total:analysis.lines.length};
}
function EUC_DEV566_afficherImportYpareo(e){EUC_DEV368_admin();var t=HtmlService.createTemplateFromFile('Import_Ypareo_DEV566'),p=e&&e.parameter||{},b=EUC_DEV526_bootMissions_(p);b.params={annee:EUC_DEV368_t(p.annee)};t.bootJson=JSON.stringify(b);return t.evaluate().setTitle('Import apprentis Yparéo').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
